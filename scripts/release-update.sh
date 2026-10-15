#!/usr/bin/env bash
# Release checklist for APKs distributed outside Google Play.
#   1. pnpm version:bump patch            bump version (versionCode is derived: major*10000 + minor*100 + patch)
#   2. pnpm release:update                dry run: builds the signed APK, computes sha256, shows version.json. Publishes nothing.
#   3. pnpm release:update --publish      uploads the APK to a GitHub Release, verifies the upload, then updates version.json
# Options: --notes "text" | --notes-file file   --min-supported <versionCode>   --mandatory   --skip-build
# Needs: release keystore (keystore.properties), Node, and for --publish the GitHub CLI (gh auth login) and git push access.
# Order matters: the APK is uploaded and verified BEFORE version.json changes, so no phone is ever told about an APK that is not there yet.
set -euo pipefail
cd "$(dirname "$0")/.."

PUBLISH=0; SKIP_BUILD=0; NOTES=""; NOTES_FILE=""; MIN=""; MANDATORY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --publish) PUBLISH=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --notes) NOTES="$2"; shift ;;
    --notes-file) NOTES_FILE="$2"; shift ;;
    --min-supported) MIN="$2"; shift ;;
    --mandatory) MANDATORY=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done
die() { echo "✗ $*" >&2; exit 1; }
command -v node >/dev/null || die "Node is required."

VERSION="$(node -p "require('./package.json').version")"
TAG="v$VERSION"
grep -q "APP_VERSION = \"$VERSION\"" lib/app-info.ts || die "lib/app-info.ts does not say $VERSION. Run: pnpm version:bump <x.y.z>"
REPO="${APK_REPO:-}"
if [ -z "$REPO" ] && git remote get-url origin >/dev/null 2>&1; then
  REPO="$(git remote get-url origin | sed -E 's#^(git@github.com:|https://github.com/)##; s#\.git$##')"
fi
REPO="${REPO:-dBillionaire-Dev/Clinexia_V3.0-Mobile}"
APK="dist/Clinexia-$VERSION.apk"
URL="https://github.com/$REPO/releases/download/$TAG/Clinexia-$VERSION.apk"
echo "▶ Releasing $VERSION ($TAG) to $REPO"

if [ "$PUBLISH" = "1" ]; then
  command -v gh >/dev/null || die "GitHub CLI (gh) is required for --publish. Install it and run: gh auth login"
  gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1 && die "Release $TAG already exists. Bump the version (pnpm version:bump patch)."
  [ -z "$(git status --porcelain --untracked-files=no)" ] || die "Uncommitted changes. Commit them first so the tag matches the code."
fi

if [ "$SKIP_BUILD" = "0" ]; then
  echo "▶ Building the release-signed APK (direct flavor)"
  bash scripts/release-android.sh apk
fi
[ -f "$APK" ] || die "$APK not found."

ARGS=(--apk "$APK" --url "$URL" --out dist/version.json)
[ -n "$NOTES_FILE" ] && ARGS+=(--notes-file "$NOTES_FILE")
[ -n "$NOTES" ] && ARGS+=(--notes "$NOTES")
[ -n "$MIN" ] && ARGS+=(--min "$MIN")
[ "$MANDATORY" = "1" ] && ARGS+=(--mandatory)
node scripts/make-version-json.mjs "${ARGS[@]}"
echo; cat dist/version.json; echo

if [ "$PUBLISH" = "0" ]; then
  echo "▶ Dry run finished. Nothing was uploaded. Re-run with --publish to release."
  exit 0
fi

SHA="$(node -p "require('./dist/version.json').sha256")"
echo "▶ Uploading to GitHub Releases"
gh release create "$TAG" "$APK" "$APK.sha256" --repo "$REPO" --title "Clinexia $VERSION" --notes "${NOTES:-Clinexia $VERSION}"

echo "▶ Verifying the uploaded file"
GOT="$( curl -fsSL "$URL" | { sha256sum 2>/dev/null || shasum -a 256; } | cut -d' ' -f1 )"
[ "$GOT" = "$SHA" ] || die "Uploaded APK checksum ($GOT) differs from the local one ($SHA). version.json was NOT updated."
echo "  ✓ checksum matches"

echo "▶ Publishing version.json"
cp dist/version.json version.json
git add version.json
git commit -m "release: $VERSION (version.json)"
git push
echo "✓ Done. Phones will see $VERSION within about 12 hours, or immediately via Settings → Check for updates."
echo "  Raw file: https://raw.githubusercontent.com/$REPO/main/version.json (GitHub may cache it for a few minutes)"
