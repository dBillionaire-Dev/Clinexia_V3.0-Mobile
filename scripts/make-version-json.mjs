#!/usr/bin/env node
// Generates version.json for the in-app updater.
//   node scripts/make-version-json.mjs --apk dist/Clinexia-3.0.5.apk --url https://github.com/o/r/releases/download/v3.0.5/Clinexia-3.0.5.apk \
//        [--notes "text" | --notes-file RELEASE_NOTES.md] [--min <versionCode>] [--mandatory] [--out dist/version.json]
import crypto from "node:crypto"
import fs from "node:fs"
import { buildManifest } from "../lib/updater/build-manifest.mjs"

const args = process.argv.slice(2)
const get = (name) => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : undefined }
const has = (name) => args.includes(name)

const apk = get("--apk")
const url = get("--url")
if (!apk || !url) { console.error("usage: make-version-json.mjs --apk <file> --url <https url> [--notes ..|--notes-file ..] [--min N] [--mandatory] [--out file]"); process.exit(1) }
if (!fs.existsSync(apk)) { console.error(`APK not found: ${apk}`); process.exit(1) }

const sha256 = await new Promise((resolve, reject) => {
  const hash = crypto.createHash("sha256")
  fs.createReadStream(apk).on("data", (c) => hash.update(c)).on("end", () => resolve(hash.digest("hex"))).on("error", reject)
})
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
const notesFile = get("--notes-file")
const releaseNotes = notesFile ? fs.readFileSync(notesFile, "utf8") : (get("--notes") ?? "")

const manifest = buildManifest({
  versionName: pkg.version,
  apkUrl: url,
  sha256,
  releaseNotes,
  minSupportedVersion: get("--min"),
  mandatory: has("--mandatory"),
})
const out = get("--out") ?? "version.json"
fs.mkdirSync(out.includes("/") ? out.slice(0, out.lastIndexOf("/")) : ".", { recursive: true })
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n")
console.log(`wrote ${out}: versionCode ${manifest.versionCode}, sha256 ${manifest.sha256}`)
