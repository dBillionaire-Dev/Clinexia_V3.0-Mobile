a## What changed and why

<!-- A short description. Link the issue: Closes #123 -->

## Type

- [ ] Bug fix
- [ ] New calculator / conversion / tool
- [ ] Change to an existing formula, threshold or reference (**clinical change**)
- [ ] UI / UX
- [ ] Documentation
- [ ] Build / tooling

## Clinical changes only (delete if not applicable)

- **Source and version/year:**
- **Link:**
- **Worked example from the source (inputs → expected result):**
- **Population and limits stated in `limitations`:** 
- **Reviewed by a second person with clinical knowledge?** yes / no

## Screenshots (UI changes, light **and** dark)

## Checklist

- [ ] `pnpm typecheck`, `pnpm test` and `pnpm build` pass
- [ ] New or changed logic has tests, including a worked example from a source
- [ ] UI uses the shared components and tokens, works in light and dark, and keeps 44 px touch targets
- [ ] No new network calls, analytics or tracking beyond the documented anonymous usage statistics
- [ ] No patient-identifying data stored or logged
- [ ] No disclaimer or safety warning removed or weakened
- [ ] Docs updated if behaviour changed
