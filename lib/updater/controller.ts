import { isNative } from "@/lib/native"
import { LAST_CHECK_KEY, UPDATE_EVENT, UPDATE_MANIFEST_URL } from "./config"
import { ClinexiaUpdater } from "./native"
import { isForced, isNewer, parseManifest, shouldCheckNow, type UpdateManifest } from "./version"

export type CheckStatus = "unsupported" | "throttled" | "up-to-date" | "available" | "unavailable"
export interface UpdateAvailableDetail { manifest: UpdateManifest; forced: boolean; currentVersionCode: number }

export async function updaterEnabled(): Promise<boolean> {
  if (!isNative()) return false
  try {
    return (await ClinexiaUpdater.isEnabled()).enabled === true
  } catch {
    return false
  }
}

export async function currentVersionCode(): Promise<number> {
  const { App } = await import("@capacitor/app")
  const info = await App.getInfo()
  return parseInt(info.build, 10) || 0
}

function readLastCheck(): number | null {
  try {
    const raw = localStorage.getItem(LAST_CHECK_KEY)
    return raw ? Number(raw) : null
  } catch {
    return null
  }
}

/**
 * Checks version.json. Automatic checks run at most once per 12 hours; a manual check always runs.
 * Fails silently when offline (returns "unavailable"); the app never depends on this succeeding.
 * The request carries only versionCode and platform (added natively).
 */
export async function checkForUpdates({ manual }: { manual: boolean }): Promise<CheckStatus> {
  if (!(await updaterEnabled())) return "unsupported"
  if (!manual && !shouldCheckNow(readLastCheck(), Date.now())) return "throttled"
  try {
    const versionCode = await currentVersionCode()
    const { body } = await ClinexiaUpdater.fetchManifest({ url: UPDATE_MANIFEST_URL, versionCode })
    const manifest = parseManifest(JSON.parse(body))
    if (!manifest) return "unavailable"
    try {
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))
    } catch {}
    if (!isNewer(manifest, versionCode)) return "up-to-date"
    const detail: UpdateAvailableDetail = { manifest, forced: isForced(manifest, versionCode), currentVersionCode: versionCode }
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail }))
    return "available"
  } catch {
    return "unavailable"
  }
}
