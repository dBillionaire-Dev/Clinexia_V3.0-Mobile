#!/usr/bin/env bash
# Creates your release signing key and keystore.properties.   Usage: pnpm keystore:create
# KEEP THE .jks FILE AND ITS PASSWORDS SAFE AND BACKED UP OUTSIDE THIS REPOSITORY. Both are git-ignored.
# If you use Play App Signing (recommended), this is only your UPLOAD key: Google can reset it if it is lost.
# Without Play App Signing, losing it means you can never update the app.
set -euo pipefail
cd "$(dirname "$0")/.."

find_keytool() {
  if command -v keytool >/dev/null 2>&1; then command -v keytool; return; fi
  for d in "${JAVA_HOME:-}" "$HOME/android-studio/jbr" "/opt/android-studio/jbr" "/usr/local/android-studio/jbr" "/snap/android-studio/current/android-studio/jbr" "/Applications/Android Studio.app/Contents/jbr/Contents/Home"; do
    [ -n "$d" ] && [ -x "$d/bin/keytool" ] && { echo "$d/bin/keytool"; return; }
  done
  return 1
}
KEYTOOL="$(find_keytool)" || { echo "✗ keytool not found. Install Android Studio (it bundles a JDK) or set JAVA_HOME."; exit 1; }

STORE_FILE="${KEYSTORE_FILE:-clinexia-release.jks}"
ALIAS="${KEY_ALIAS:-clinexia}"
if [ -f "$STORE_FILE" ] || [ -f keystore.properties ]; then
  echo "✗ $STORE_FILE or keystore.properties already exists. Refusing to overwrite a signing key. Move them away first if you really want a new one."
  exit 1
fi

read -r -s -p "Choose a keystore password (min 6 characters): " STOREPASS; echo
read -r -s -p "Repeat it: " STOREPASS2; echo
[ "$STOREPASS" = "$STOREPASS2" ] || { echo "✗ Passwords do not match."; exit 1; }
[ "${#STOREPASS}" -ge 6 ] || { echo "✗ Use at least 6 characters."; exit 1; }
read -r -p "Your name or organisation (for the certificate) [Clinexia]: " CN; CN="${CN:-Clinexia}"
read -r -p "Two-letter country code [NG]: " CC; CC="${CC:-NG}"

export STOREPASS
"$KEYTOOL" -genkeypair -v -keystore "$STORE_FILE" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass:env STOREPASS -keypass:env STOREPASS -dname "CN=$CN, C=$CC"

umask 077
cat > keystore.properties <<PROPS
storeFile=$STORE_FILE
storePassword=$STOREPASS
keyAlias=$ALIAS
keyPassword=$STOREPASS
PROPS
unset STOREPASS

echo
echo "✓ Created $STORE_FILE and keystore.properties (both git-ignored)."
echo "  NOW: copy $STORE_FILE and the password to a safe place outside this repository (password manager + an offline copy)."
echo "  Then build:  pnpm release:apk"
