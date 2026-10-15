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
