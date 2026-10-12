// Prepares android/app/build.gradle for releases: version from package.json and release signing from keystore.properties.
// Safe to run repeatedly. Run after `cap sync` (the release script does it for you).
import fs from "node:fs"

const gradle = "android/app/build.gradle"
if (!fs.existsSync(gradle)) {
  console.error("✗ android/ not found. Create it with:  pnpm build && pnpm exec cap add android")
  process.exit(1)
}
let g = fs.readFileSync(gradle, "utf8")
// Built from parts on purpose: the brand rename tool would otherwise rewrite this check.
const OLD_APP_ID = ["com", "convertlab", "app"].join(".")
if (g.includes(OLD_APP_ID)) {
  console.error(`✗ android/ still uses the old app id (${OLD_APP_ID}). Recreate it:  rm -rf android && pnpm build && pnpm exec cap add android`)
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
const [major, minor, patch] = String(pkg.version || "1.0.0").split(".").map((n) => parseInt(n, 10) || 0)
const versionName = process.env.VERSION_NAME || pkg.version || "1.0.0"
// 3.0.0 -> 30000, 3.1.4 -> 30104: grows with every semver bump, which is what Google Play requires.
const versionCode = parseInt(process.env.VERSION_CODE || String(major * 10000 + minor * 100 + patch), 10)

g = g.replace(/versionCode \d+/, `versionCode ${versionCode}`).replace(/versionName "[^"]*"/, `versionName "${versionName}"`)

if (!g.includes("clinexia-signing")) {
  const header = `// clinexia-signing: release signing comes from ../keystore.properties (never commit that file)
def keystorePropertiesFile = rootProject.file("../keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }
}

`
  const signing = `    signingConfigs {
        release {
            if (keystoreProperties['storeFile']) {
                def ks = new File(keystoreProperties['storeFile'])
                storeFile ks.isAbsolute() ? ks : rootProject.file("../" + keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
`
  if (!g.includes("\nandroid {") || !g.includes("    buildTypes {\n        release {\n            minifyEnabled false")) {
    console.error("✗ android/app/build.gradle has an unexpected layout; add the signing configuration by hand (see docs/RELEASE.md).")
    process.exit(1)
  }
  g = g.replace("\nandroid {", "\n" + header + "android {")
  g = g.replace("    buildTypes {\n        release {\n            minifyEnabled false", signing + "    buildTypes {\n        release {\n            if (keystoreProperties['storeFile']) {\n                signingConfig signingConfigs.release\n            }\n            minifyEnabled false")
}

fs.writeFileSync(gradle, g)
console.log(`  android/app/build.gradle: versionName ${versionName}, versionCode ${versionCode}, signing ${fs.existsSync("keystore.properties") ? "enabled (keystore.properties found)" : "NOT configured (no keystore.properties)"}`)
