#!/usr/bin/env bash
# Builds the Android release.
#   pnpm release:apk     signed APK  -> dist/Clinexia-<version>.apk  (+ .sha256)   direct download, Firebase App Distribution, Palm Store
#   pnpm release:aab     signed AAB  -> dist/Clinexia-<version>.aab                Google Play
#   pnpm release:all     both
# DEBUG_APK=1 pnpm release:apk builds an installable DEBUG apk without a keystore (testing only, never publish it).
# CLINEXIA_JDK_HOME=/path/to/jdk-21 forces a specific JDK. ALLOW_NO_ANALYTICS=1 allows a build that reports no usage.
set -euo pipefail
cd "$(dirname "$0")/.."

WHAT="${1:-apk}"
case "$WHAT" in apk|aab|all) ;; *) echo "usage: release-android.sh [apk|aab|all]"; exit 1;; esac

die() { echo "✗ $*" >&2; exit 1; }

[ -z "${CAPACITOR_SERVER_URL:-}" ] || die "CAPACITOR_SERVER_URL is set. A release must bundle the app, not load your dev server. Run: unset CAPACITOR_SERVER_URL"
command -v pnpm >/dev/null 2>&1 || die "pnpm is required."

# --- JDK: Gradle here runs on Java 21 to 24 (21 best). Java 25 breaks it, so never trust plain `java` on the PATH.
# shellcheck source=scripts/find-jdk.sh
. scripts/find-jdk.sh
echo "▶ JDK"
clinexia_use_jdk || exit 1

# --- Android SDK
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] && [ -f android/local.properties ]; then SDK="$(sed -n 's/^sdk.dir=//p' android/local.properties | head -1)"; fi
if [ -z "$SDK" ]; then for d in "$HOME/Android/Sdk" "$HOME/Library/Android/sdk"; do [ -d "$d" ] && SDK="$d" && break; done; fi
[ -n "$SDK" ] && [ -d "$SDK" ] || die "Android SDK not found. Install it through Android Studio, then: export ANDROID_HOME=\$HOME/Android/Sdk"
export ANDROID_HOME="$SDK"

DEBUG="${DEBUG_APK:-0}"
if [ "$DEBUG" != "1" ] && [ ! -f keystore.properties ]; then
  die "No keystore.properties. Create your signing key first:  pnpm keystore:create   (or DEBUG_APK=1 for a test-only debug apk)"
fi

# --- Analytics: the app is a static export, so the backend address is fixed at BUILD time.
# Without it the app reports nothing, and your dashboard never sees this build's users.
ANALYTICS_URL="${NEXT_PUBLIC_ANALYTICS_URL:-}"
if [ -z "$ANALYTICS_URL" ]; then
  for f in .env.production.local .env.local .env.production .env; do
    if [ -f "$f" ]; then
      v="$(sed -n 's/^NEXT_PUBLIC_ANALYTICS_URL=//p' "$f" | tail -1 | tr -d '\r"'"'"' ')"
      [ -n "$v" ] && { ANALYTICS_URL="$v"; break; }
    fi
  done
fi
if [ "${ALLOW_NO_ANALYTICS:-0}" != "1" ]; then
  [ -n "$ANALYTICS_URL" ] || die "NEXT_PUBLIC_ANALYTICS_URL is not set, so this APK would report no usage. Put it in .env.production (see .env.example), or ALLOW_NO_ANALYTICS=1 to build without analytics."
  case "$ANALYTICS_URL" in
    https://*) ;;
    *) die "NEXT_PUBLIC_ANALYTICS_URL must start with https:// (Android blocks plain http in release builds, so usage would never arrive). Got: $ANALYTICS_URL" ;;
  esac
  case "$ANALYTICS_URL" in
    *your-web-app*|*.example|*.example/*) die "NEXT_PUBLIC_ANALYTICS_URL is still the placeholder from .env.example ($ANALYTICS_URL). Set it to your deployed web app address." ;;
  esac
  echo "▶ Analytics will report to: $ANALYTICS_URL"
else
  echo "▶ Analytics: OFF for this build (ALLOW_NO_ANALYTICS=1)"
fi

VERSION="$(node -p "require('./package.json').version")"
mkdir -p dist

echo "▶ 1/4  Building the web bundle (static export)"
pnpm build
[ -f out/index.html ] || die "out/index.html missing: the web build failed."
if [ "${ALLOW_NO_ANALYTICS:-0}" != "1" ]; then
  HOSTPART="${ANALYTICS_URL#*://}"
  grep -rqF "$HOSTPART" out/_next 2>/dev/null || die "The analytics address ($HOSTPART) is not inside the built app, so it would report nothing. Check .env.production and rebuild (delete .next and out first)."
  echo "  ✓ analytics address is baked into the build"
fi

echo "▶ 2/4  Syncing the Android project"
[ -d android ] || pnpm exec cap add android
pnpm exec cap sync android
if grep -q '"url"' android/app/src/main/assets/capacitor.config.json 2>/dev/null; then
  die "android/.../capacitor.config.json contains a server url (a dev server got baked in). Run: unset CAPACITOR_SERVER_URL && pnpm exec cap sync android"
fi
node scripts/android-setup.mjs
node scripts/android-icons.mjs

echo "▶ 3/4  Building with Gradle (JDK: $JAVA_HOME)"
cd android
chmod +x gradlew
GRADLE_LOG="$(mktemp)"
trap 'rm -f "$GRADLE_LOG"' EXIT
# -Dorg.gradle.java.home makes Gradle's own daemon use the chosen JDK too, not just the launcher script.
gradle_run() { ./gradlew --no-daemon "-Dorg.gradle.java.home=$JAVA_HOME" "$@" 2>&1 | tee "$GRADLE_LOG"; }
if [ "$DEBUG" = "1" ]; then
  TASKS=(assembleDebug)
else
  case "$WHAT" in apk) TASKS=(assembleRelease) ;; aab) TASKS=(bundleRelease) ;; all) TASKS=(assembleRelease bundleRelease) ;; esac
fi
if ! gradle_run "${TASKS[@]}"; then
  echo >&2
  if grep -q "Unsupported class file major version" "$GRADLE_LOG"; then
    echo "✗ Gradle was started on a JDK it does not support. The JDK used was: $JAVA_HOME" >&2
    echo "  Use Java 21: CLINEXIA_JDK_HOME=/path/to/jdk-21 pnpm release:apk" >&2
  elif grep -q "SDK location not found\|licenses have not been accepted" "$GRADLE_LOG"; then
    echo "✗ Android SDK problem. Open Android Studio once and accept the SDK licences, or run: \$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses" >&2
  else
    echo "✗ Gradle failed. The error is above. If you send it to support, include the first 'What went wrong' block." >&2
  fi
  exit 1
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
