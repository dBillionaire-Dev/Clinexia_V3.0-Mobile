// Pure update-decision logic (no I/O) so it can be unit-tested.
import { normalizeSha256 } from "./checksum"

export interface UpdateManifest {
  versionCode: number
  versionName: string
  apkUrl: string
  sha256: string
  releaseNotes: string
  minSupportedVersion: number
  mandatory: boolean
}

export const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0

/** Validates untrusted JSON from version.json. Returns null when anything is missing or unsafe. */
export function parseManifest(raw: unknown): UpdateManifest | null {
  if (!raw || typeof raw !== "object") return null
  const m = raw as Record<string, unknown>
  const sha256 = normalizeSha256(typeof m.sha256 === "string" ? m.sha256 : "")
  if (!isInt(m.versionCode) || !sha256) return null
  if (typeof m.versionName !== "string" || !m.versionName.trim()) return null
  if (typeof m.apkUrl !== "string" || !m.apkUrl.startsWith("https://")) return null
  try {
    new URL(m.apkUrl)
  } catch {
    return null
  }
  return {
    versionCode: m.versionCode,
    versionName: m.versionName.trim().slice(0, 40),
    apkUrl: m.apkUrl,
    sha256,
    releaseNotes: typeof m.releaseNotes === "string" ? m.releaseNotes.slice(0, 4000) : "",
    minSupportedVersion: isInt(m.minSupportedVersion) ? m.minSupportedVersion : 0,
    mandatory: m.mandatory === true,
  }
}

/** versionCode is the only authority for "newer"; names are for display. */
export function isNewer(manifest: Pick<UpdateManifest, "versionCode">, currentVersionCode: number): boolean {
  return manifest.versionCode > currentVersionCode
}

/** Forced = flagged mandatory, or the installed build is below the minimum supported one. */
export function isForced(manifest: Pick<UpdateManifest, "mandatory" | "minSupportedVersion">, currentVersionCode: number): boolean {
  return manifest.mandatory || currentVersionCode < manifest.minSupportedVersion
}

/** Automatic checks run at most once per interval; a missing or future timestamp means "check now". */
export function shouldCheckNow(lastCheckMs: number | null, nowMs: number, intervalMs = CHECK_INTERVAL_MS): boolean {
  if (lastCheckMs === null || !Number.isFinite(lastCheckMs)) return true
  if (lastCheckMs > nowMs) return true
  return nowMs - lastCheckMs >= intervalMs
}

/** Same formula as scripts/android-setup.mjs: major*10000 + minor*100 + patch. */
export function versionCodeFromName(name: string): number {
  const [major, minor, patch] = name.split(".").map((n) => parseInt(n, 10) || 0)
  return major * 10000 + minor * 100 + patch
}
