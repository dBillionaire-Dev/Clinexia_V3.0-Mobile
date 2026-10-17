# Clinexia: the clinical toolkit for Android

Medical calculators, drug dosing, unit conversions, laboratory tools and reference ranges in one fast app that works **offline**. One Next.js codebase, packaged for **Android** with Capacitor and also usable as a web app / PWA. No account needed.

> **Version** 3.0.0 · **Status** pre-release · **Package manager** pnpm
>
> **Important:** Clinexia is a calculation and reference utility. It is **not** a medical device, not a prescribing system and not a substitute for clinical judgement. Read [Safety](#2-safety-and-intended-use) before relying on any result.

## Contents
1. [What it is](#1-what-it-is)
2. [Safety and intended use](#2-safety-and-intended-use)
3. [User guide](#3-user-guide)
4. [Notes for clinical users](#4-notes-for-clinical-users)
5. [Developer guide](#5-developer-guide)
6. [Releasing and distribution](#6-releasing-and-distribution)
7. [Contributing](#7-contributing)
8. [Troubleshooting](#8-troubleshooting)
9. [Roadmap and known limits](#9-roadmap-and-known-limits)
10. [Glossary](#10-glossary)
11. [Licence and credits](#11-licence-and-credits)

---

## 1. What it is

Clinexia (formerly Clinexia) started as a laboratory conversion tool and grew into a complete clinical toolkit:

| Area | What you get |
|---|---|
| **Calculators** | **155** in **11** categories: General, Renal, Clinical Chemistry, Hematology, Microbiology, Laboratory Solutions, Spectrophotometry, Drug Dosing, Oncology, Cardiovascular, Stem Cell & Transplant |
| **Drug dosing** | **57** dosing tools in five groups (General Dosing, Antimalarial, Antibiotic, Renal Adjustment, Therapeutic Drug Monitoring). Single-drug tools show the dose in **mg** and, when you enter the product strength, the volume in **mL** per dose |
| **Estimators** | 15 tools that estimate a value from an equation (eGFR, body surface area, ideal weight, osmolality and more) |
| **Conversions** | 9 categories: mass, volume, length, temperature, pressure, energy, time, mass concentration, molar concentration |
| **Lab tools** | Dilution and solutions, serial dilution, mass ↔ volume, molar ↔ mass concentration, spectrophotometry, microbiology, McFarland standards |
| **References** | Hematology and chemistry reference ranges |
| **Your data** | History, favorites and settings stay on the device |

Principles: **local first** (no account, calculations never leave the device), **one product** (every tool shares the same layout and result card), **show the working** (formula, notes, limitations and a versioned source), and **logic separate from UI** (calculation code never depends on React).

---

## 2. Safety and intended use

- Clinexia gives **calculations and estimates for educational and clinical reference use**.
- It does **not** diagnose, prescribe, or replace clinical judgement, local protocols, a formulary, product information or validated laboratory procedures.
- **Verify before acting**, especially for medicines, children, pregnancy, kidney or liver impairment and high-risk drugs. Cross-check against your local guideline or the product label.
- **Estimates are not measurements.** Estimators are population equations and can be wrong for an individual.
- **Sources have versions and dates.** Guidance published after a reference's last-verified date is not reflected.
- **Do not enter patient-identifying information.**

---

## 3. User guide

### 3.1 Getting the app
- **Android:** install from Google Play when it is listed, from the beta invitation link, or from a signed APK on the website (allow installs from your browser or file manager once; Android may warn about apps from outside the Play Store).
- **Web:** open the web app in any modern browser and use *Install app* / *Add to Home screen* to install it.

### 3.2 Finding your way around
- **Bottom bar:** Home, Calculators, Convert, History, Tools (the lab tools list).
- **☰ menu** (top left): Home, Calculators, Convert, History, Lab Tools, Estimators, References, Favorites, Settings, About.
- **🔍 search** (top right): opens a search over calculators from any screen.
- **Android back button:** closes the menu or search first, then goes back one screen, and exits on Home.

### 3.3 Using a calculator
1. **Calculators** → pick a category → pick a calculator. In big categories such as **Drug Dosing**, tabs under the header jump between groups and stay in view while you scroll.
2. Fill in the fields. The grey *e.g.* text is only a hint and is **not** entered for you.
3. Check each **unit dropdown** (kg / lb, cm / in, mg/dL / mmol/L…). Units are converted for you.
4. Tap **Calculate**. A required field left empty shows a message instead of being treated as zero.
5. Read the **result card**: the main value with its unit, secondary values, the working, an interpretation and any warnings.
6. Tap **♡** to add the calculator to **Favorites**, and **↺** to clear the inputs.
7. Open **Clinical notes & sources** for the formula, notes, limitations and the versioned source.

### 3.4 Drug doses: mg per dose and mL per dose
Single-drug dosing calculators report the dose of **one administration in mg**. For a liquid or injection, also fill the optional **Product strength** fields with the label strength, for example *125 mg* in *5 mL*, or *500 mg* in *2 mL*. The result then shows:

- **Dose per administration** (mg), and
- **Volume per dose** (mL), with the strength used, and a range when the dose is a range.

Rules: enter **both** parts of the strength or **neither**; with no strength, no volume is shown and nothing is assumed. For products with two active ingredients (for example amoxicillin-clavulanate, piperacillin-tazobactam), enter the strength of the component the dose is calculated for. Warnings appear for very large (over 30 mL) or very small (under 0.1 mL) volumes. Always check the label, the concentration after reconstitution or dilution, and the measuring device.

Not included on purpose: tablet-band regimens, fixed-dose combinations, fluids, infusion rates and multi-drug protocols.

### 3.5 Converting units
**Convert** → choose a category chip → choose *From* and *To* → enter a value → **Convert**. Use the swap button to reverse the units. Results are saved to History.

### 3.6 Lab tools, estimators and references
- **Tools** (bottom bar) lists Estimators, Dilution & solutions, Serial dilution, Mass ↔ Volume, Molar ↔ Mass concentration, Spectrophotometry, Microbiology calculations, McFarland standards and Reference ranges.
- **Estimators** lists the calculators that estimate a value from an equation.

### 3.7 History and favorites
**History** lists your recent calculations and conversions (**Clear** removes them). **Favorites** lists the calculators you pinned with ♡.

### 3.8 Settings
| Setting | Effect |
|---|---|
| Theme | System, Light or Dark |
| Font size | Small, Medium or Large |
| Offline mode | Caches the web version for offline use (browser only; the Android app is always offline) |
| Auto-save history | Saves calculations and conversions automatically |
| Share anonymous usage statistics | Sends an anonymous usage count (see Privacy). On by default and you can turn it off |

### 3.9 Privacy
- No account. History, favorites and settings stay on the device.
- If sharing is on, the app sends an **anonymous count**: a random installation ID, which tool was used, the app version and when. It never sends what you typed, your results or your history. See the web app's `/privacy` page for the full policy.
- Clearing the app's storage or reinstalling creates a new random ID.

### 3.10 FAQ
- **The inputs are empty. Is that a bug?** No. Grey hints show the kind of value expected. This avoids a forgotten number being replaced by a default.
- **Why no volume in mL?** You did not enter the product strength, or the calculator is one of the excluded kinds (see 3.4).
- **Does it work offline?** Yes. The Android app contains everything it needs.

---

## 4. Notes for clinical users

- **Result contents:** value and unit, secondary values, working, interpretation, warnings.
- **Units and limits:** inputs have sensible minimum and maximum values. Out-of-range or non-finite results are rejected instead of shown.
- **Rounding:** display is rounded sensibly; calculations use unrounded values. Volumes per dose keep full precision until display.
- **Sources:** every calculator lists its formula, limitations and a reference with version, population and last-verified date. Statuses: **current**, **supporting** (read the note) and **review-needed** (extra caution).
- **Good practice:** confirm units, confirm the population matches, read limitations and warnings, cross-check high-risk doses independently, and record decisions in the patient record by your own procedures.
- **Laboratory tools** calculate arithmetic only. They do not validate your method, instrument or reagents.
- **Report a wrong result** with the calculator name, the exact inputs and units, what you got, what you expected and the source. Use the "Wrong result or reference" issue form.

---

## 5. Developer guide

### 5.1 Stack
Next.js 16 (App Router, static export), React 19, TypeScript (strict), Tailwind CSS 3, Lucide icons, Vitest, Capacitor 8 (Android) with the App, Browser, Haptics, Keyboard, Splash Screen and Status Bar plugins. Package manager: **pnpm**.

### 5.2 Quick start
```bash
pnpm install
pnpm dev          # http://localhost:3000
```
Requirements: **Node 22+**, pnpm. For Android work: **Android Studio** (SDK and a JDK 21; Java 25 does not work with this project's Gradle, and `pnpm release:apk` picks a suitable JDK for you).

| Script | Does |
|---|---|
| `pnpm dev` / `pnpm build` | development server / type-check and static export to `out/` |
| `pnpm typecheck` / `pnpm test` | `tsc --noEmit` / Vitest |
| `pnpm build:android` | `next build` then `cap sync android` |
| `pnpm android:open` / `android:dev` | open Android Studio / run on a device |
| `pnpm keystore:create` | create the release signing key |
| `pnpm release:apk` / `release:aab` / `release:all` | signed APK / AAB / both into `dist/` |
| `pnpm release:firebase` | upload the APK to Firebase App Distribution |

Before any merge: `pnpm typecheck && pnpm test && pnpm build`.

### 5.3 Structure
```
app/                 routes (home, calculators, convert, history, tools, estimators, favorites, references, settings, about)
components/          app-shell, calculator-runner, tool-row, native-bridge, analytics-sync, external-link
lib/calculators/     business logic, no React: types, registry, helpers, definitions/*.ts (+ tests), dose-volume, safety and references
lib/conversions/     conversion engine and data
lib/analytics/       anonymous usage statistics (outbox, batching, native HTTP)
lib/native.ts        Capacitor bridge (status bar, back button, haptics, links)
lib/client-store.ts  localStorage: favorites, history, settings
scripts/             release tooling (signing, APK/AAB, Firebase)
docs/RELEASE.md      step-by-step release guide
store/play/          Google Play listing text and graphics
android/             Capacitor Android project
```

### 5.4 Architecture
- **Registry-driven:** pages read from `lib/calculators/registry.ts`. One generic `calculator-runner` renders every calculator from its definition.
- **Static export:** no API routes or server actions; the Android app bundles `out/`.
- **Platform code is isolated:** only `lib/native.ts` imports Capacitor plugins, loaded lazily behind `Capacitor.isNativePlatform()`.
- **Dose volumes:** `lib/calculators/dose-volume.ts` wraps the supported dosing calculators, adds the optional strength inputs and the mL output. Calculators whose main number is a daily dose or a range report `perDoseMg` themselves; the rest use their primary mg value.
- **Storage keys** (`convertlab:*`) keep their original names so existing users do not lose data after the rename.

### 5.5 Adding a calculator
1. Write a `CalculatorDefinition` in `lib/calculators/definitions/` (`calculate` must be pure, throw on invalid input, and use `num`, `safeDivide`, `round`…). Give it `limitations` and keep wording descriptive.
2. Register it in `lib/calculators/registry.ts` (and add a sub-category label in `types.ts` if you add one).
3. Add reference metadata (`dosing-references.ts` for dosing).
4. Add tests next to it: a worked example **from the source**, each unit option, boundaries and invalid input.
5. For a single-drug dose calculator, add its id to `lib/calculators/dose-volume.ts` (and return `perDoseMg` if its main number is not the per-dose mg).
6. `pnpm typecheck && pnpm test && pnpm build`.

### 5.6 Android development
```bash
pnpm build && pnpm exec cap add android        # once
pnpm dev                                        # terminal 1
CAPACITOR_SERVER_URL=http://10.0.2.2:3000 pnpm exec cap sync android   # terminal 2: emulator live reload
pnpm android:open                               # then press Run in Android Studio
```
Real bundled build: `unset CAPACITOR_SERVER_URL; pnpm build:android; pnpm android:open`. **Never ship with `CAPACITOR_SERVER_URL` set**: the release script refuses.

### 5.7 Anonymous usage statistics
Android only, only when `NEXT_PUBLIC_ANALYTICS_URL` was set at build time (`.env.production`, see `.env.example`), and only if the user has not switched it off. Events are queued locally (500 max), sent in batches of 100 with Capacitor's native HTTP client, plus a presence heartbeat while the app is open. Inputs, results and history are never sent. `pnpm dev` reads no `.env.production`, so development never reports.

### 5.8 Testing
`pnpm test` runs ~600 tests (calculators, conversions, registry, analytics, dose volumes). Tests prove the code does what it was written to do; they do **not** prove a formula is clinically right, which is what sources and review are for.

---

## 6. Releasing and distribution
See **[docs/RELEASE.md](docs/RELEASE.md)** for the complete guide: signing key, signed **APK** and **AAB**, direct APK download (with checksum), **Firebase App Distribution** for testers, **Google Play** (`store/play/` has the listing text, data-safety answers and graphics) and the Windows/Microsoft Store route (packaged from the web app with PWABuilder).

---

## 7. Contributing
Open an issue first for anything non-trivial, branch from `main`, use Conventional Commits, and run `pnpm typecheck && pnpm test && pnpm build`. Clinical changes need an attributable source with version, a worked example from it as a test, stated population and limits, and no weakened warnings. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Issue forms exist for **wrong results**, **new calculators**, **bugs** and **feature requests**.

## 8. Troubleshooting
| Problem | Fix |
|---|---|
| `android platform has not been added yet` | `pnpm build && pnpm exec cap add android` |
| Gradle: *does not contain a Gradle build* | `rm -rf android && pnpm build && pnpm exec cap add android`, then commit it |
| Stuck on the splash screen (emulator) | dev server unreachable: run `pnpm dev`, `allowedDevOrigins` must include `10.0.2.2`, re-sync with `CAPACITOR_SERVER_URL` set |
| Release build loads the dev server | `unset CAPACITOR_SERVER_URL` and rebuild |
| Old screens or icon after a change | uninstall the app; for the web version, clear site data |
| App id mismatch after the rename | `rm -rf android` and recreate it (the app id is now `com.clinexia.app`) |

## 9. Roadmap and known limits
Planned: final logo and icon set, Google Play release (closed test first), converter home with large category cards, tablet layouts, accessibility audit with TalkBack, optional IndexedDB storage.
Known limits: tested on an emulator, so test on your own devices; some calculators have category-level references only; no iOS build is configured yet; the usage-statistics count is approximate (a reinstall creates a new ID).

## 10. Glossary
**eGFR** estimated glomerular filtration rate · **CrCl** creatinine clearance · **BSA** body surface area · **FENa** fractional excretion of sodium · **MAP** mean arterial pressure · **QTc** corrected QT interval · **CFU** colony-forming units · **PWA** progressive web app · **APK / AAB** Android install file / Google Play bundle · **IARC** international age-rating system.

## 11. Licence and credits
**Licence:** not chosen yet. Until a licence file is added, all rights are reserved by the author. **Maintainer:** Ebenezer Ekunke ([@dBillionaire-Dev](https://github.com/dBillionaire-Dev)), Nex.Dev. Reference material comes from the organisations named in each calculator's *Clinical notes & sources* panel. Built with Next.js, React, Tailwind CSS, Lucide, Vitest and Capacitor.

<sub>Clinexia is a calculation and reference utility for educational and clinical reference use. It is not a medical device and does not replace clinical judgement, local protocols, product information or validated laboratory procedures. Always verify results before acting on them.</sub>

<!-- clinexia-updater -->
## In-app updates (APKs outside Google Play)

**How the app is built:** a Next.js static export (`out/`) wrapped by **Capacitor 8**, with the native Android project committed in `android/` (package `com.clinexia.app`). It is not React Native or a TWA.

### What it does
On start (a few seconds after launch, at most once per 12 hours) and from **Settings → App updates → Check for updates**, the app fetches `version.json` over HTTPS (8 s timeout) through a small native plugin. Offline or on any error it does nothing, and the app stays fully offline-capable.

If `versionCode` is newer, a dialog shows the version name and release notes with **[Update now] [Later]**. If `mandatory` is true, or the installed build is below `minSupportedVersion`, only **[Update now]** is shown. Update now:
1. checks the "install unknown apps" permission; if missing, explains why and deep-links to Clinexia's settings screen, then continues when you come back;
2. downloads the APK to app-private storage with a progress bar;
3. verifies its SHA-256 while streaming; on a mismatch it deletes the file and shows a clear error;
4. opens the system installer through a FileProvider URI. It never installs silently.

Downloaded files are deleted after failures, on cancel and at the next cold start. The only request data is `versionCode` and `platform=android` in the manifest URL; no personal data or calculator input is sent.

### `version.json`
```json
{
  "versionCode": 30005,
  "versionName": "3.0.5",
  "apkUrl": "https://github.com/<owner>/<repo>/releases/download/v3.0.5/Clinexia-3.0.5.apk",
  "sha256": "<64 hex characters>",
  "releaseNotes": "What changed",
  "minSupportedVersion": 30000,
  "mandatory": false
}
```
Default location: the `main` branch of this repo (`https://raw.githubusercontent.com/dBillionaire-Dev/Clinexia_V3.0-Mobile/main/version.json`). To host it elsewhere (for example on your website), set `NEXT_PUBLIC_UPDATE_MANIFEST_URL` at build time. `versionCode` is `major*10000 + minor*100 + patch` of `package.json`.

### Build flavors (Google Play safe)
- **`direct`**: APK distributed outside Play. Contains the updater and the `REQUEST_INSTALL_PACKAGES` permission (declared only in `android/app/src/direct/`).
- **`play`**: Google Play bundle. The updater is a no-op stub, the permission is absent, and the Settings row is hidden.

`pnpm release:apk` builds `direct`; `pnpm release:aab` builds `play`.

### Releasing
```bash
pnpm version:bump patch                 # bumps package.json, lib/app-info.ts and the version labels
pnpm release:update --notes "What changed"           # dry run: signed APK, sha256, shows version.json, publishes nothing
pnpm release:update --notes "What changed" --publish # uploads to GitHub Releases, verifies the upload, then updates version.json
```
Options: `--notes-file`, `--min-supported <versionCode>`, `--mandatory`, `--skip-build`. Full checklist: `docs/UPDATES.md`.

**Always sign with the same release keystore.** Android refuses to update an app signed with a different key, and that check, not the SHA-256, is what protects users if a download host were ever compromised. The SHA-256 protects against corrupted or truncated downloads.

### Tests
`pnpm test` includes `lib/updater/*.test.ts` (version comparison, forced-update rules, 12-hour throttle, manifest validation, checksum verification, `version.json` builder). The native SHA-256 code has a JUnit test: `cd android && ./gradlew testDirectDebugUnitTest`.

<!-- clinexia-feedback -->
## User feedback in the Android app

The app asks for a star rating once someone has really used it (3 or more calculations, or 3 or more different days), then opens a short anonymous survey. Answers go to the website's admin panel (`/admin/feedback` in the web repo), which also controls whether the popup is on, how long "Later" waits, and when to ask everyone again.

### What people see
- A small card above the bottom bar: **How is Clinexia working for you?** with five stars and **Later**. Never in the first minute, never offline, and never if usage statistics are switched off in Settings.
- A star tap opens the four-step survey with that rating filled in: about you (healthcare or not, area), how you use it (devices, personal or work, kind of workplace), premium (would you pay, a reasonable monthly price in naira, who pays, an optional monthly price for a 10-seat team) and up to three optional open questions. The Android app is already ticked as a device.
- **Later** brings the card back after the configured number of hours, at most the configured number of times. Sending feedback ends it for good. A draft is kept on the phone.
- **Settings → Feedback → Send feedback** opens the survey at any time. People who rate 4 or 5 stars see a **Share Clinexia** button afterwards (set `NEXT_PUBLIC_SHARE_URL` at build time to share a specific address; it defaults to `NEXT_PUBLIC_ANALYTICS_URL`).

### How it connects
It uses the same website address as the usage statistics (`NEXT_PUBLIC_ANALYTICS_URL`) and the phone's own network client, so no extra setup. With that variable unset (development builds) the popup and the Settings row do not appear. Debug builds are stored as `development` and are hidden in the admin panel, which shows production answers only.

**Needs the web side first:** run `supabase/feedback.sql` in the web project and deploy the web repo's `proxy.ts` change that stops redirecting `/api/` calls on the website hosts. Without that change, the website answers the phone with a redirect that a POST does not follow.

### Tests
`lib/feedback/feedback.test.ts` covers the answer rules, when the popup shows, Later, done and new rounds, the server config check and how replies are turned into messages.
