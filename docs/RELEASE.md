# Releasing Clinexia on Android

Several ways to get the app to people. They all start from the same signed build.

| Channel | Best for | Command |
|---|---|---|
| **Direct APK** | Anyone, right now, from your website | `pnpm release:apk` |
| **Firebase App Distribution** | Testers and early users by invitation link | `pnpm release:apk` then `pnpm release:firebase` |
| **Google Play** | Everyone, with automatic updates | `pnpm release:aab`, then upload in Play Console |
| **Palm Store** | Tecno, Infinix and itel phones | `pnpm release:apk`, then upload in the Palm Store console (section 5b) |
| **Windows (Microsoft Store)** | Windows PCs | Packaged from the web app with PWABuilder (see the web repository README) |

## 0. Requirements (once)
- **Android Studio** (it installs the Android SDK and a JDK). Then: `export ANDROID_HOME=$HOME/Android/Sdk`
- **A JDK from 21 to 24 (21 is best).** Java 25 does not work with this project's Gradle (`Unsupported class file major version 69`). You do not need to change your system Java: `pnpm release:apk` looks for a suitable JDK itself (Android Studio's bundled one, JetBrains Toolbox, SDKMAN, `/usr/lib/jvm`...) and tells Gradle to use it. To force one: `CLINEXIA_JDK_HOME=/path/to/jdk-21 pnpm release:apk`
- The app runs on **Android 7.0 (API 24) or newer**
- **Node.js 22+** and **pnpm**
- The Android project created with the Clinexia app id: `pnpm build && pnpm exec cap add android`
- `.env.production` with `NEXT_PUBLIC_ANALYTICS_URL=https://<your app address>` (see `.env.example`)

## 1. Create your signing key (once, and back it up)
```bash
pnpm keystore:create
```
It creates `clinexia-release.jks` and `keystore.properties` (both git-ignored). **Copy the `.jks` file and its password somewhere safe outside this repository.** With **Play App Signing** (recommended, turned on in Play Console) this is only your *upload* key and Google can reset it if you lose it. For APKs you distribute yourself, the key is permanent: lose it and your users cannot update, they must uninstall and reinstall.

## 2. Build
```bash
pnpm release:apk     # dist/Clinexia-<version>.apk and .sha256
pnpm release:aab     # dist/Clinexia-<version>.aab   (for Google Play)
pnpm release:all     # both
```
- The version comes from `package.json` (`version`). **Raise it for every release.** `3.0.0` becomes `versionCode 30000`, `3.1.4` becomes `30104`, which always grows, as Google Play requires.
- The script refuses to build if `CAPACITOR_SERVER_URL` is set or if a dev-server URL was baked into the app.
- `DEBUG_APK=1 pnpm release:apk` makes a test-only debug APK that needs no keystore. Never publish it.
- Always install the APK on a real phone and check it before you share it.

## 3. Direct APK download (from your website)
1. Create a **GitHub Release** (or any file host) and upload `dist/Clinexia-<version>.apk`.
2. Copy the direct download link of the file.
3. On the website (Vercel → Environment Variables) set `NEXT_PUBLIC_APK_URL`, `NEXT_PUBLIC_APK_SHA256` (the build prints it) and `NEXT_PUBLIC_APK_VERSION`, then redeploy. The landing page shows the download, the checksum and install steps.

People installing an APK from outside Google Play must allow installs from their browser or file manager once, and Play Protect may show a warning. The landing page explains this.

## 4. Firebase App Distribution (testers)
One-time setup:
1. Create a project in the [Firebase console](https://console.firebase.google.com).
2. **Add app → Android**, package name **`com.clinexia.app`**. You can skip downloading `google-services.json`: App Distribution does not need it.
3. **Release & Monitor → App Distribution → Get started**. Create a tester group (alias, for example `testers`).
4. Copy the **App ID** (Project settings → Your apps), which looks like `1:1234567890:android:abcdef123456`.
5. Log in on your computer: `npx firebase-tools login`.

Each release:
```bash
export FIREBASE_APP_ID="1:1234567890:android:abcdef123456"
export FIREBASE_GROUPS="testers"
pnpm release:firebase
```
Testers get an email. For a public join link: App Distribution → Testers & Groups → your group → **Invite links**. Set it as `NEXT_PUBLIC_FIREBASE_DIST_URL` on the website.

## 5. Google Play
1. Create a [Play Console](https://play.google.com/console) developer account (one-time fee; new personal accounts must run a closed test with testers before going public. Check Google's current rules).
2. **Create app**: name *Clinexia: Clinical Toolkit*, free, app.
3. Turn on **Play App Signing** when you upload the first bundle.
4. Upload `dist/Clinexia-<version>.aab` to **Testing → Internal testing** first.
5. Fill the store listing from `store/play/listing.md` and upload the graphics in `store/play/`.
6. **App content**: privacy policy URL (`https://<your app address>/privacy`), Data safety (`store/play/data-safety.md`), content rating, target audience (18+), ads (none), health apps declaration.
7. Test, then promote the release to production.
8. When the listing is live, set `NEXT_PUBLIC_PLAY_STORE_URL` on the website and redeploy.

## 5b. Palm Store (Tecno, Infinix and itel phones)
Palm Store is Transsion's app store, preinstalled on Tecno, Infinix and itel phones, which many clinicians and students carry. It uses the same signed build as every other channel.

I could not find public documentation of the Palm Store developer portal, so confirm each step below in the console rather than assuming it matches Google Play.
1. `pnpm release:apk` to build `dist/Clinexia-<version>.apk`.
2. Create a Palm Store developer account and complete whatever identity or company verification it asks for.
3. Create the app with package name **`com.clinexia.app`** and upload the signed APK. Check whether it also accepts an AAB.
4. Fill the listing from `store/palm/listing.md` (it marks every field that needs checking), add the privacy policy URL (`https://<your app address>/privacy`) and answer the data questions using `store/play/data-safety.md`.
5. Submit for review, then test the version that goes live on a Tecno, Infinix or itel phone.
6. When the listing is live, set `NEXT_PUBLIC_PALM_STORE_URL` on the website and redeploy.

**Android version:** Clinexia needs **Android 7.0 (API 24) or newer** (Capacitor 8 requires it). Phones on Android 6 or older cannot install it, and that includes some older Tecno and itel models.

Always sign with the same keystore. An app signed with a different key cannot update a copy that was installed from another channel.

## 6. Checklist for every release
- [ ] `pnpm typecheck && pnpm test` pass
- [ ] Version raised in `package.json`
- [ ] `unset CAPACITOR_SERVER_URL`
- [ ] Built on a clean checkout, installed on a real phone, and tried: a calculator, a dose with mg and mL, the back button, dark mode
- [ ] Release notes written
- [ ] The keystore is backed up
- [ ] The build printed `Analytics will report to: https://<your app address>` (the script checks this for you)

## Troubleshooting
| Problem | Fix |
|---|---|
| `No suitable JDK found` | Install a JDK 21 (Android Studio bundles one, or SDKMAN: `sdk install java 21-tem`), or point to one: `CLINEXIA_JDK_HOME=/path/to/jdk-21 pnpm release:apk` |
| `Unsupported class file major version 69` | Gradle was started on Java 25. The release script now avoids this by choosing Java 21 to 24. If it still happens, set `CLINEXIA_JDK_HOME` to a JDK 21 and run `rm -rf android/.gradle` once |
| `NEXT_PUBLIC_ANALYTICS_URL is not set` / `must start with https://` / `placeholder` | Put your deployed web app address (https) in `.env.production`. The build refuses to make an APK that would report no usage. `ALLOW_NO_ANALYTICS=1` overrides this on purpose |
| `Android SDK not found` | `export ANDROID_HOME=$HOME/Android/Sdk` |
| `No keystore.properties` | `pnpm keystore:create`, or `DEBUG_APK=1` for a test build |
| `android/ still uses the old app id` | `rm -rf android && pnpm build && pnpm exec cap add android` |
| Play says the version code was already used | Raise `version` in `package.json` |
| App opens but is blank | A dev-server URL was baked in: `unset CAPACITOR_SERVER_URL`, rebuild |
