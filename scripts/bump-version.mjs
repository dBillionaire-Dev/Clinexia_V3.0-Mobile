#!/usr/bin/env node
// Bumps the app version everywhere it is written by hand. The Android versionCode is derived from it
// (major*10000 + minor*100 + patch) by scripts/android-setup.mjs at build time.
//   node scripts/bump-version.mjs patch|minor|major|3.0.5
import fs from "node:fs"
import { versionCodeFromName } from "../lib/updater/build-manifest.mjs"

const arg = process.argv[2]
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
const [maj, min, pat] = pkg.version.split(".").map(Number)
const next = { patch: `${maj}.${min}.${pat + 1}`, minor: `${maj}.${min + 1}.0`, major: `${maj + 1}.0.0` }[arg] ?? arg
if (!/^\d+\.\d+\.\d+$/.test(next ?? "")) { console.error("usage: bump-version.mjs patch|minor|major|x.y.z"); process.exit(1) }
if (versionCodeFromName(next) <= versionCodeFromName(pkg.version)) { console.error(`New version ${next} must be higher than ${pkg.version}`); process.exit(1) }

const old = pkg.version
pkg.version = next
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n")
const edits = [
  ["lib/app-info.ts", `"${old}"`, `"${next}"`],
  ["app/settings/page.tsx", `Clinexia v${old}`, `Clinexia v${next}`],
  ["components/app-shell.tsx", `v${old} mobile`, `v${next} mobile`],
]
for (const [file, from, to] of edits) {
  if (!fs.existsSync(file)) continue
  const text = fs.readFileSync(file, "utf8")
  if (file !== "lib/app-info.ts" && text.includes("APP_VERSION")) { console.log(`  = ${file}: reads APP_VERSION, nothing to change`); continue }
  if (!text.includes(from)) { console.warn(`  ! ${file}: "${from}" not found, check it by hand`); continue }
  fs.writeFileSync(file, text.split(from).join(to))
  console.log(`  ✓ ${file}`)
}
console.log(`Version ${old} → ${next} (versionCode ${versionCodeFromName(next)}). Now: pnpm release:update`)
