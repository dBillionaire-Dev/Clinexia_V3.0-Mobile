# Contributing to Clinexia

Thank you for helping. Clinexia is used for clinical and laboratory work, so we welcome code, clinical corrections, new calculators, accessibility fixes and documentation, and we hold clinical content to a higher bar than ordinary code.

The full technical guide is in the [README](README.md#6-developer-guide). This file is the short version of how to contribute.

## Ways to help

| I want to… | Do this |
|---|---|
| Report a **wrong result, unit or reference** | Open an issue with the **"Wrong result or reference"** form. This is the most valuable report you can send |
| Suggest a **new calculator** | Open the **"New calculator"** form. A source and a worked example are required |
| Report a **bug** (layout, crash, Android behaviour) | Open the **"Bug report"** form |
| Suggest a **feature or improvement** | Open the **"Feature request"** form |
| Report a **security or privacy** concern | **Do not open a public issue.** See [SECURITY.md](SECURITY.md) |
| Fix something yourself | Follow the workflow below |

## Ground rules

1. **Patient safety first.** If a change could make a result wrong or a warning weaker, it needs extra scrutiny and a source.
2. **Local-first and private.** No accounts, remote fonts or remote scripts, and no analytics, tracking or backend calls other than the documented anonymous usage statistics. No patient-identifying data stored or logged.
3. **One product.** Use the shared components and design tokens. Do not give a single calculator its own one-off layout.
4. **Logic stays out of the UI.** Calculation and conversion code lives in `lib/` as pure functions with tests.
5. **Be respectful.** Assume good faith and keep feedback about the work. Contributors range from first-timers to practising clinicians.

## Set up

Requirements: Node.js 22+, pnpm. For Android work: Android Studio Otter (2025.2.1) or newer. Details are in the [README](README.md#62-prerequisites).

```bash
git clone <repo-url>
cd <project-folder>
pnpm install
pnpm dev
```

Before every push:

```bash
pnpm typecheck && pnpm test && pnpm build
```

## Workflow

1. **Open an issue first** for anything non-trivial (a new calculator, a new screen, a change to a formula), so we can agree on the approach.
2. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>` or `chore/<topic>`.
3. Make small, focused commits using [Conventional Commits](https://www.conventionalcommits.org/): `feat: add shock index calculator`, `fix: correct FENa rounding`, `docs: clarify import behaviour`.
4. Run the checks above.
5. Open a pull request using the template. Include screenshots for UI changes, in **light and dark**.
6. Respond to review. Clinical changes may be reviewed by a second person with clinical knowledge, which can take longer.

## Clinical change policy

Wrong numbers can hurt people. For anything touching a formula, threshold, dose, unit or reference:

1. **Every formula or threshold needs an attributable source** (guideline, product label, peer-reviewed paper, or an official calculator) with its **version or year**, recorded as reference metadata.
2. **Include at least one worked example from the source** as a test, using the source's own numbers.
3. **State the population and limits** (age, weight range, renal function, setting) in `limitations`, and enforce them with input `min` / `max` and warnings where possible.
4. **Never change an existing formula silently.** Explain the change and its source in the pull request, and update the reference's version and last-verified date.
5. **Never remove or weaken a disclaimer or safety warning.**
6. **No prescriptive wording.** Results describe ("value in the high range"), they do not instruct ("give X").
7. If a source is out of date or uncertain, mark its reference **`review-needed`** so users can see it.
8. Where possible, get a **second reviewer with clinical knowledge**.

Do not copy text, tables or code from copyrighted calculators, apps or guidelines. Implement the published formula yourself and cite it.

## Adding a calculator (summary)

The complete walkthrough, with a code example, is in the [README](README.md#67-adding-a-calculator).

1. Write a `CalculatorDefinition` in the right file under `lib/calculators/definitions/`.
2. Register it in `lib/calculators/registry.ts`.
3. Add the sub-category label in `types.ts` if you introduce one.
4. Add reference metadata (`dosing-references.ts` or the chemistry reference map).
5. Add tests next to the definition: a worked example from the source, each unit option, boundaries, and invalid input.
6. Run `pnpm typecheck && pnpm test && pnpm build`.

`calculate` must be pure, must throw on invalid input, and must use the helpers (`num`, `safeDivide`, `round`, …) instead of ad-hoc parsing.

## Pull request checklist

- [ ] `pnpm typecheck`, `pnpm test` and `pnpm build` pass
- [ ] New or changed logic has tests, including a worked example from a source
- [ ] UI uses the shared components and tokens, works in light and dark, and keeps 44 px touch targets
- [ ] No new network calls, analytics or tracking beyond the documented anonymous usage statistics
- [ ] No patient-identifying data stored or logged
- [ ] Docs updated if behaviour changed
- [ ] Clinical changes follow the policy above

## Releases and the Android app

Maintainers handle releases (version bump, signing, Play Console). Please do not commit keystores, `local.properties`, `.env` files or a `CAPACITOR_SERVER_URL` baked into `android/`. See the [README](README.md#69-android-and-capacitor).

## Licence of contributions

By submitting a contribution you agree that it may be distributed under the repository's licence (see `LICENSE`, if present; otherwise the maintainer's terms in the README).
