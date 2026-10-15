import { describe, expect, it } from "vitest"
import { CHECK_INTERVAL_MS, isForced, isNewer, parseManifest, shouldCheckNow, versionCodeFromName } from "./version"

const SHA = "a".repeat(64)
const base = {
  versionCode: 30005,
  versionName: "3.0.5",
  apkUrl: "https://github.com/o/r/releases/download/v3.0.5/Clinexia-3.0.5.apk",
  sha256: SHA,
  releaseNotes: "Fixes",
  minSupportedVersion: 30000,
  mandatory: false,
}

describe("isNewer", () => {
  it("compares versionCode, not the name", () => {
    expect(isNewer({ versionCode: 30005 }, 30004)).toBe(true)
    expect(isNewer({ versionCode: 30004 }, 30004)).toBe(false)
    expect(isNewer({ versionCode: 30003 }, 30004)).toBe(false)
  })
  it("handles minor/major jumps from the version formula", () => {
    expect(versionCodeFromName("3.0.4")).toBe(30004)
    expect(versionCodeFromName("3.1.0")).toBe(30100)
    expect(isNewer({ versionCode: versionCodeFromName("3.1.0") }, versionCodeFromName("3.0.99"))).toBe(true)
  })
})

describe("isForced", () => {
  it("is false for an optional update on a supported build", () => {
    expect(isForced({ mandatory: false, minSupportedVersion: 30000 }, 30004)).toBe(false)
  })
  it("is true when mandatory", () => {
    expect(isForced({ mandatory: true, minSupportedVersion: 0 }, 30004)).toBe(true)
  })
  it("is true when the installed build is below minSupportedVersion", () => {
    expect(isForced({ mandatory: false, minSupportedVersion: 30005 }, 30004)).toBe(true)
    expect(isForced({ mandatory: false, minSupportedVersion: 30004 }, 30004)).toBe(false)
  })
})

describe("shouldCheckNow", () => {
  const now = 1_000_000_000_000
  it("checks when there was no previous check", () => expect(shouldCheckNow(null, now)).toBe(true))
  it("skips within 12 hours and checks after", () => {
    expect(shouldCheckNow(now - CHECK_INTERVAL_MS + 1, now)).toBe(false)
    expect(shouldCheckNow(now - CHECK_INTERVAL_MS, now)).toBe(true)
  })
  it("recovers from a clock that moved backwards", () => expect(shouldCheckNow(now + 5000, now)).toBe(true))
})

describe("parseManifest", () => {
  it("accepts a valid manifest and normalizes the checksum", () => {
    expect(parseManifest({ ...base, sha256: SHA.toUpperCase() })).toEqual(base)
  })
  it("rejects non-HTTPS download URLs", () => {
    expect(parseManifest({ ...base, apkUrl: "http://example.com/a.apk" })).toBeNull()
    expect(parseManifest({ ...base, apkUrl: "file:///sdcard/a.apk" })).toBeNull()
  })
  it("rejects malformed checksums and versions", () => {
    expect(parseManifest({ ...base, sha256: "abc" })).toBeNull()
    expect(parseManifest({ ...base, versionCode: "30005" })).toBeNull()
    expect(parseManifest({ ...base, versionCode: 3.5 })).toBeNull()
    expect(parseManifest({ ...base, versionName: "" })).toBeNull()
  })
  it("rejects non-objects", () => {
    expect(parseManifest(null)).toBeNull()
    expect(parseManifest("x")).toBeNull()
  })
  it("defaults optional fields safely", () => {
    const { releaseNotes, minSupportedVersion, mandatory, ...rest } = base
    expect(parseManifest(rest)).toMatchObject({ releaseNotes: "", minSupportedVersion: 0, mandatory: false })
  })
  it("treats mandatory only when exactly true", () => {
    expect(parseManifest({ ...base, mandatory: "true" })!.mandatory).toBe(false)
  })
})
