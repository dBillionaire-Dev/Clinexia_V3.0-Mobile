#!/usr/bin/env bash
# Uploads the signed APK to Firebase App Distribution so testers get it by invitation link.   Usage: pnpm release:firebase [path-to-apk]
# One-time setup is in docs/RELEASE.md. Needs:
#   FIREBASE_APP_ID   e.g. 1:1234567890:android:abcdef123456   (Firebase console → Project settings → Your apps)
#   FIREBASE_GROUPS   tester group alias(es), comma separated, e.g. testers
# and a login:  npx firebase-tools login   (or GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account JSON, for CI)
# No google-services.json is needed: App Distribution works without the Firebase SDK in the app.
set -euo pipefail
cd "$(dirname "$0")/.."

APK="${1:-$(ls -1t dist/Clinexia-*.apk 2>/dev/null | grep -v DEBUG | head -1 || true)}"
[ -n "$APK" ] && [ -f "$APK" ] || { echo "✗ No APK found. Build one first:  pnpm release:apk"; exit 1; }
case "$APK" in *DEBUG*) echo "✗ Refusing to distribute a DEBUG build."; exit 1;; esac
: "${FIREBASE_APP_ID:?Set FIREBASE_APP_ID (Firebase console → Project settings → Your apps → App ID)}"
: "${FIREBASE_GROUPS:?Set FIREBASE_GROUPS (the tester group alias, e.g. testers)}"

NOTES="${RELEASE_NOTES:-$(git log -5 --pretty='- %s' 2>/dev/null || echo 'New build')}"
echo "▶ Uploading $(basename "$APK") to Firebase App Distribution (groups: $FIREBASE_GROUPS)"
npx --yes firebase-tools appdistribution:distribute "$APK" \
  --app "$FIREBASE_APP_ID" \
  --groups "$FIREBASE_GROUPS" \
  --release-notes "$NOTES"
echo
echo "✓ Uploaded. Public invite link for the landing page:"
echo "  Firebase console → App Distribution → Testers & Groups → your group → Invite links → copy,"
echo "  then set NEXT_PUBLIC_FIREBASE_DIST_URL on the website and redeploy."
