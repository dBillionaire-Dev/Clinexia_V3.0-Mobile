// Copies the Clinexia launcher icons and splash images (resources/android/res) into the Android project.
// Run on every release build, so the icons come back even if the android/ folder is ever regenerated with `cap add android`.
import fs from "node:fs"
import path from "node:path"

const SRC = path.join("resources", "android", "res")
const DST = path.join("android", "app", "src", "main", "res")

if (!fs.existsSync(SRC)) {
  console.log("  (no resources/android/res, keeping the default icons)")
  process.exit(0)
}
if (!fs.existsSync(DST)) {
  console.error("  ✗ android/app/src/main/res not found. Run: pnpm exec cap add android")
  process.exit(1)
}

let copied = 0
function copyTree(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name)
    const b = path.join(to, entry.name)
    if (entry.isDirectory()) {
      fs.mkdirSync(b, { recursive: true })
      copyTree(a, b)
    } else {
      fs.copyFileSync(a, b)
      copied += 1
    }
  }
}
copyTree(SRC, DST)
console.log(`  ✓ Clinexia icons and splash installed (${copied} files)`)
