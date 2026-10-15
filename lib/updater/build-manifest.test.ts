import { describe, expect, it } from "vitest"
import { buildManifest, versionCodeFromName } from "./build-manifest.mjs"
import { parseManifest } from "./version"

const SHA = "B".repeat(64)
const input = { versionName: "3.0.5", apkUrl: "https://github.com/o/r/releases/download/v3.0.5/Clinexia-3.0.5.apk", sha256: SHA, releaseNotes: " Fixes \n" }

describe("buildManifest", () => {
  it("derives versionCode like android-setup.mjs and produces a manifest the app accepts", () => {
    const m = buildManifest(input)
    expect(m.versionCode).toBe(versionCodeFromName("3.0.5"))
    expect(m).toMatchObject({ sha256: SHA.toLowerCase(), releaseNotes: "Fixes", minSupportedVersion: 0, mandatory: false })
    expect(parseManifest(m)).not.toBeNull()
  })
  it("rejects bad input", () => {
    expect(() => buildManifest({ ...input, apkUrl: "http://x/a.apk" })).toThrow()
    expect(() => buildManifest({ ...input, sha256: "abc" })).toThrow()
    expect(() => buildManifest({ ...input, minSupportedVersion: 99999 })).toThrow()
  })
  it("passes mandatory and a minimum version through", () => {
    expect(buildManifest({ ...input, mandatory: "true", minSupportedVersion: "30004" })).toMatchObject({ mandatory: true, minSupportedVersion: 30004 })
  })
})
