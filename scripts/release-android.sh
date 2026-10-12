#!/usr/bin/env bash
# Builds the Android release.
#   pnpm release:apk     signed APK  -> dist/Clinexia-<version>.apk  (+ .sha256)   direct download and Firebase App Distribution
#   pnpm release:aab     signed AAB  -> dist/Clinexia-<version>.aab                Google Play
#   pnpm release:all     both
# DEBUG_APK=1 pnpm release:apk builds an installable DEBUG apk without a keystore (testing only, never publish it).
set -euo pipefail
cd "$(dirname "$0")/.."

WHAT="${1:-apk}"
case "$WHAT" in apk|aab|all) ;; *) echo "usage: release-android.sh [apk|aab|all]"; exit 1;; esac

die() { echo "✗ $*" >&2; exit 1; }

[ -z "${CAPACITOR_SERVER_URL:-}" ] || die "CAPACITOR_SERVER_URL is set. A release must bundle the app, not load your dev server. Run: unset CAPACITOR_SERVER_URL"
command -v pnpm >/dev/null 2>&1 || die "pnpm is required."

# --- JDK (Android Studio bundles one) and Android SDK
if ! command -v java >/dev/null 2>&1 && [ -z "${JAVA_HOME:-}" ]; then
  for d in "$HOME/android-studio/jbr" "/opt/android-studio/jbr" "/usr/local/android-studio/jbr" "/snap/android-studio/current/android-studio/jbr" "/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
    [ -x "$d/bin/java" ] && { export JAVA_HOME="$d"; export PATH="$JAVA_HOME/bin:$PATH"; break; }
  done
fi
command -v java >/dev/null 2>&1 || die "Java not found. Install Android Studio (it bundles a JDK) or set JAVA_HOME."
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] && [ -f android/local.properties ]; then SDK="$(sed -n 's/^sdk.dir=//p' android/local.properties | head -1)"; fi
if [ -z "$SDK" ]; then for d in "$HOME/Android/Sdk" "$HOME/Library/Android/sdk"; do [ -d "$d" ] && SDK="$d" && break; done; fi
[ -n "$SDK" ] && [ -d "$SDK" ] || die "Android SDK not found. Install it through Android Studio, then: export ANDROID_HOME=\$HOME/Android/Sdk"
export ANDROID_HOME="$SDK"

DEBUG="${DEBUG_APK:-0}"
if [ "$DEBUG" != "1" ] && [ ! -f keystore.properties ]; then
  die "No keystore.properties. Create your signing key first:  pnpm keystore:create   (or DEBUG_APK=1 for a test-only debug apk)"
fi

VERSION="$(node -p "require('./package.json').version")"
mkdir -p dist

echo "▶ 1/4  Building the web bundle (static export)"
pnpm build
[ -f out/index.html ] || die "out/index.html missing: the web build failed."

echo "▶ 2/4  Syncing the Android project"
[ -d android ] || pnpm exec cap add android
pnpm exec cap sync android
if grep -q '"url"' android/app/src/main/assets/capacitor.config.json 2>/dev/null; then
  die "android/.../capacitor.config.json contains a server url (a dev server got baked in). Run: unset CAPACITOR_SERVER_URL && pnpm exec cap sync android"
fi
node scripts/android-setup.mjs

echo "▶ 3/4  Building with Gradle"
cd android
chmod +x gradlew
if [ "$DEBUG" = "1" ]; then
  ./gradlew --no-daemon assembleDebug
else
  case "$WHAT" in apk) ./gradlew --no-daemon assembleRelease ;; aab) ./gradlew --no-daemon bundleRelease ;; all) ./gradlew --no-daemon assembleRelease bundleRelease ;; esac
fi
cd ..

echo "▶ 4/4  Collecting files in dist/"
sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
verify() {
  local apksigner; apksigner="$(ls -1 "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1 || true)"
  if [ -n "$apksigner" ]; then "$apksigner" verify --print-certs "$1" >/dev/null 2>&1 && echo "  ✓ signature verified: $(basename "$1")" || echo "  ⚠ apksigner could not verify $(basename "$1")"; fi
}
if [ "$DEBUG" = "1" ]; then
  cp android/app/build/outputs/apk/debug/app-debug.apk "dist/Clinexia-$VERSION-DEBUG.apk"
  echo "  dist/Clinexia-$VERSION-DEBUG.apk (debug build: for your own testing only)"
else
  if [ "$WHAT" = "apk" ] || [ "$WHAT" = "all" ]; then
    SRC="android/app/build/outputs/apk/release/app-release.apk"
    [ -f "$SRC" ] || die "Signed APK not found ($SRC). Is keystore.properties valid?"
    cp "$SRC" "dist/Clinexia-$VERSION.apk"
    echo "$(sha "dist/Clinexia-$VERSION.apk")  Clinexia-$VERSION.apk" > "dist/Clinexia-$VERSION.apk.sha256"
    verify "dist/Clinexia-$VERSION.apk"
  fi
  if [ "$WHAT" = "aab" ] || [ "$WHAT" = "all" ]; then
    SRC="android/app/build/outputs/bundle/release/app-release.aab"
    [ -f "$SRC" ] || die "Signed AAB not found ($SRC)."
    cp "$SRC" "dist/Clinexia-$VERSION.aab"
  fi
fi

echo
ls -lh dist | sed 's/^/  /'
if [ -f "dist/Clinexia-$VERSION.apk.sha256" ]; then
  echo
  echo "  For the landing page (Vercel → Environment Variables), after you upload the APK somewhere (a GitHub Release is ideal):"
  echo "    NEXT_PUBLIC_APK_URL=<direct link to Clinexia-$VERSION.apk>"
  echo "    NEXT_PUBLIC_APK_SHA256=$(cut -d' ' -f1 "dist/Clinexia-$VERSION.apk.sha256")"
  echo "    NEXT_PUBLIC_APK_VERSION=$VERSION"
fi
