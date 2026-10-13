# Palm Store listing: Clinexia

Palm Store is Transsion's app store, preinstalled on Tecno, Infinix and itel phones. It is a good channel for reaching clinicians and students on those phones.

I could not find public documentation of the Palm Store developer portal, so anything that depends on its rules is marked **(confirm in the console)**. Check each one when you create the listing instead of assuming it matches Google Play.

## What to submit
| Item | Value |
|---|---|
| Package name | `com.clinexia.app` |
| Build | the signed APK from `pnpm release:apk` (`dist/Clinexia-<version>.apk`). Whether Palm Store accepts an AAB as well: **(confirm in the console)** |
| Signing key | the same keystore you use for every other channel. An app signed with a different key cannot update a copy installed from another channel |
| Minimum Android version | **Android 7.0 (API 24)**. Phones on Android 6 or older, including some older Tecno and itel models, cannot install it |
| Price | Free, no ads, no in-app purchases |
| Developer account requirements (identity, company or ID verification) | **(confirm in the console)** |
| Review time and resubmission rules | **(confirm in the console)** |

## App name
```
Clinexia: Clinical Toolkit
```

## Short description
```
Clinical calculators, drug doses in mg and mL, unit conversions. Works offline.
```

## Full description
```
Clinexia is a complete clinical toolkit for your phone. Calculators, drug dosing, unit conversions and reference tools, in one fast app that works without an internet connection.

WHAT YOU GET
• 150+ calculators across renal, cardiovascular, hematology, clinical chemistry, microbiology, oncology, stem cell and transplant, general clinical and laboratory work
• Drug dosing helpers for weight-based and body-surface-based doses. Single-drug dose calculators show the dose in mg for one administration and, when you enter the product strength from the label (for example 125 mg in 5 mL), the volume in mL per dose. Nothing is assumed: no strength entered, no volume shown
• Estimators such as eGFR, creatinine clearance, body surface area and ideal body weight, clearly labelled as estimates
• Unit conversions for mass, volume, length, temperature, pressure, energy, time, mass concentration and molar concentration
• Laboratory tools: dilutions, solution preparation, spectrophotometry, microbiology counts and McFarland standards
• Reference ranges for hematology and clinical chemistry
• Every calculator shows its formula, notes, limitations and a versioned source, so you can check the original

DESIGNED FOR REAL USE
• Works offline: everything is built into the app
• No account and no sign-up
• Light, dark or system theme, and adjustable text size
• History and favorites stay on your device
• Fast search across calculators

REQUIRES
Android 7.0 or newer.

FOR
Clinicians, nurses, pharmacists, laboratory staff, medical and nursing students, and anyone who needs reliable clinical arithmetic.

PRIVACY
No account. Your inputs, results, history and favorites stay on your device. The app can send an anonymous usage count (a random installation ID and which tool was used, never what you typed). You can turn it off in Settings.

IMPORTANT
Clinexia is a calculation and reference utility for educational and clinical reference use, for qualified professionals. It does not replace clinical judgement, local protocols, product information or validated laboratory procedures. Always verify results before acting on them.
```

## Other fields
| Field | Value |
|---|---|
| Category | Medical, or the closest Health category offered **(confirm in the console)** |
| Contact email | (your support email) |
| Website | your landing page address |
| Privacy policy URL | `https://<your app address>/privacy` |
| Terms of use URL (if asked) | `https://<your app address>/terms` |
| Target audience | 18 and over (professional and reference tool) |
| Data collected | Anonymous usage statistics: a random installation ID, which tool was used and when, app version. Optional, can be turned off in Settings. Same answers as `store/play/data-safety.md` |
| Age or content rating | Lowest rating expected: no violence, sexual content, gambling or user-generated content **(confirm the questionnaire in the console)** |

## Graphics
Palm Store may want different sizes from Google Play **(confirm in the console)**. Start from the files in `store/play/` (`icon-512.png`, `feature-graphic.png`, `screenshots/`) and resize if asked.

## After it is live
Set `NEXT_PUBLIC_PALM_STORE_URL` on the website (Vercel → Environment Variables) to the listing address and redeploy. The landing page then shows a Palm Store button.
