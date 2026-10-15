# Release checklist: APK outside Google Play

1. **Bump the version**: `pnpm version:bump patch` (or `minor`, `major`, `x.y.z`). The Android `versionCode` is derived from it (`major*10000 + minor*100 + patch`) and written into `build.gradle` by `scripts/android-setup.mjs` during the build.
2. **Commit** the bump (the publish step refuses to run with uncommitted tracked changes so the release tag matches the code).
3. **Dry run**: `pnpm release:update --notes "What changed"`
   - builds the release-signed `direct` APK with your keystore (`keystore.properties`),
   - computes the SHA-256,
   - prints the `version.json` it would publish.
   Install `dist/Clinexia-<version>.apk` on a phone that has the *previous* version and check that the update dialog appears (point the app at a test manifest with `NEXT_PUBLIC_UPDATE_MANIFEST_URL` when building the old version).
4. **Publish**: `pnpm release:update --notes "What changed" --publish`
   - creates the GitHub Release `v<version>` and uploads the APK and its `.sha256`,
   - downloads the uploaded APK again and checks the checksum,
   - only then commits and pushes `version.json`.
5. **Force an upgrade** when needed: add `--mandatory`, or `--min-supported <versionCode>` to require everyone below that build to update.
6. **Roll back a bad release**: edit `version.json` on `main` to point at the previous good APK (its `versionCode` must be higher than what phones have, so publish a *new* higher version rather than reusing an old one).

Google Play: build the bundle with `pnpm release:aab` (the `play` flavor). It has no updater and no install permission.

Manual equivalent of step 4: bump → `pnpm release:apk` → `sha256sum dist/Clinexia-<v>.apk` → upload to GitHub Releases → write `version.json` (`node scripts/make-version-json.mjs --apk … --url …`) → commit and push it.

## Automatic releases from GitHub (optional)

Workflow: `.github/workflows/release-apk.yml`. Releasing becomes: bump, commit, `git tag -a v3.0.6 -m "notes"`, `git push && git push origin v3.0.6`.

### One-time setup
1. **Environment.** Repo → Settings → Environments → New environment → name it `release`. Optionally restrict *Deployment branches and tags* to the tag pattern `v*`, and add yourself as a *Required reviewer* if you want a manual approval click per release.
2. **Keystore secrets** (add them to the `release` environment, not the repo):
   - `ANDROID_KEYSTORE_BASE64`: the keystore file, base64-encoded: `base64 -w0 clinexia-release.jks`
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEY_ALIAS`: the values in your local `keystore.properties`
3. **Variable** (Settings → Secrets and variables → Actions → Variables): `NEXT_PUBLIC_ANALYTICS_URL` = your deployed web app address (the same value as in your local `.env.production`).
4. **Workflow permissions.** Settings → Actions → General → Workflow permissions. The workflow asks for `contents: write` itself; if an organization policy forces read-only, allow read and write here.
5. **Branch protection.** The workflow pushes `version.json` straight to `main`. If `main` requires pull requests, allow `github-actions[bot]` to bypass, or the last step will fail (the APK is already uploaded by then; fix the rule and re-run).

With the GitHub CLI (replace OWNER/REPO):
```bash
gh api -X PUT repos/OWNER/REPO/environments/release
base64 -w0 clinexia-release.jks | gh secret set ANDROID_KEYSTORE_BASE64 --env release --repo OWNER/REPO
gh secret set ANDROID_KEYSTORE_PASSWORD --env release --repo OWNER/REPO     # paste when prompted
gh secret set ANDROID_KEY_PASSWORD --env release --repo OWNER/REPO
gh secret set ANDROID_KEY_ALIAS --env release --repo OWNER/REPO
gh variable set NEXT_PUBLIC_ANALYTICS_URL --body "https://your-web-app" --repo OWNER/REPO
```
Keep the keystore file and passwords backed up outside GitHub too; the secrets cannot be read back.
