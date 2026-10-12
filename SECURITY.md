# Security and safety policy

Clinexia is an offline-first calculator and reference app with **no accounts** and only an optional anonymous usage count sent to the Clinexia web backend, so its security surface is small. It is still used in clinical settings, so we take both **security** and **patient-safety** reports seriously.

## Two kinds of report

| Kind | Examples | Where to report |
|---|---|---|
| **Patient safety** | A wrong dose, formula, unit conversion, threshold or reference. A missing or weakened warning | A **public issue** using the **"Wrong result or reference"** form, so others are warned and it can be fixed quickly |
| **Security or privacy** | Stored data readable by other apps, a vulnerable dependency, malicious code, an exposed secret or signing key, unexpected network traffic, a way to execute untrusted content | **Privately**, as described below. Please do **not** open a public issue |

If you are unsure, report it privately.

## How to report a security or privacy issue

Use GitHub's **private vulnerability reporting**: open the repository's **Security** tab and choose **Report a vulnerability**.

Please include:

- what you found and where (file, screen, or Android component);
- steps to reproduce, and the app version and platform (Android version, or browser);
- the impact you believe it has;
- any suggested fix.

This is maintained by an individual, so responses are best-effort. We aim to acknowledge reports within a week and to keep you informed until the issue is resolved. Please give us a reasonable chance to fix a problem before disclosing it publicly. We are happy to credit you in the fix if you wish.

## Supported versions

Clinexia is pre-release. Fixes are made on the latest `main` branch, and only the most recent release will be supported once the app is published.

## Scope notes

- **In scope:** this repository's code, its build configuration, the Android wrapper (`android/`, Capacitor configuration), and its dependencies as used here.
- **Data:** history, favorites, recent searches and settings are stored in the device's local storage, unencrypted, and never leave the device. Anyone with access to an unlocked device or its app data can read them. This is by design. Please do not enter patient-identifying information.
- **Analytics:** the Android app can send an anonymous installation ID and which tool was used to the web backend over HTTPS (see the README, section 6.13). Reports about that traffic or that backend are in scope.
- **Out of scope:** issues in third-party websites linked from source references, or in your own device's operating system.

## Hardening reminders for contributors

- Never commit keystores (`*.jks`, `*.keystore`), `local.properties`, `.env` files or API keys.
- Do not add analytics, tracking, remote scripts or remote fonts beyond the documented anonymous usage statistics.
- Do not ship a release with `CAPACITOR_SERVER_URL` set. Check that `android/app/src/main/assets/capacitor.config.json` contains no `url`.
- Keep dependencies current, and run `pnpm audit` before releases.
