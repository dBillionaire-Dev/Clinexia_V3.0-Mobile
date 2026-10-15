import { isNative } from "@/lib/native"
import { LAST_CHECK_KEY, PENDING_KEY, UPDATE_EVENT, UPDATE_MANIFEST_URL } from "./config"
import { ClinexiaUpdater } from "./native"
import { isForced, isNewer, parseManifest, parsePending, shouldCheckNow, type UpdateManifest } from "./version"

export type CheckStatus = "unsupported" | "throttled" | "up-to-date" | "available" | "unavailable"
export interface UpdateAvailableDetail { manifest: UpdateManifest; forced: boolean; currentVersionCode: number; manual: boolean }

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

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
}

function announce(manifest: UpdateManifest, versionCode: number, manual: boolean) {
  const detail: UpdateAvailableDetail = { manifest, forced: isForced(manifest, versionCode), currentVersionCode: versionCode, manual }
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail }))
}

/**
 * Works offline: if an earlier check found an update that is still newer than the installed build,
 * announce it again. This is what prompts the user on every launch until they update.
 */
export async function announcePendingUpdate(): Promise<boolean> {
  if (!(await updaterEnabled())) return false
  try {
    const versionCode = await currentVersionCode()
    const manifest = parsePending(readStorage(PENDING_KEY), versionCode)
    if (!manifest) {
      writeStorage(PENDING_KEY, null)
      return false
    }
    announce(manifest, versionCode, false)
    return true
  } catch {
    return false
  }
}

function readLastCheck(): number | null {
  const raw = readStorage(LAST_CHECK_KEY)
  return raw ? Number(raw) : null
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
    writeStorage(LAST_CHECK_KEY, String(Date.now()))
    if (!isNewer(manifest, versionCode)) {
      writeStorage(PENDING_KEY, null)
      return "up-to-date"
    }
    writeStorage(PENDING_KEY, JSON.stringify(manifest))
    announce(manifest, versionCode, manual)
    return "available"
  } catch {
    return "unavailable"
  }
}
