"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { UPDATE_EVENT } from "@/lib/updater/config"
import { checkForUpdates, type UpdateAvailableDetail } from "@/lib/updater/controller"
import { ClinexiaUpdater } from "@/lib/updater/native"

type Phase = "prompt" | "permission" | "downloading" | "installing" | "error"

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`

/**
 * In-app update dialog (APK builds distributed outside Google Play). Mounted once in the app shell.
 * Checks automatically (at most every 12 hours) a few seconds after start, and when Settings asks.
 * It never installs silently: the system installer opens and the user confirms there.
 */
export function UpdatePrompt() {
  const [detail, setDetail] = useState<UpdateAvailableDetail | null>(null)
  const [phase, setPhase] = useState<Phase>("prompt")
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null)
  const [error, setError] = useState("")
  const busy = useRef(false)

  useEffect(() => {
    const onAvailable = (e: Event) => {
      setDetail((e as CustomEvent<UpdateAvailableDetail>).detail)
      setPhase("prompt")
      setError("")
    }
    window.addEventListener(UPDATE_EVENT, onAvailable)
    const timer = window.setTimeout(() => void checkForUpdates({ manual: false }), 4000)
    return () => {
      window.removeEventListener(UPDATE_EVENT, onAvailable)
      window.clearTimeout(timer)
    }
  }, [])

  const fail = useCallback((message: string) => {
    busy.current = false
    setError(message)
    setPhase("error")
    void ClinexiaUpdater.cleanup().catch(() => {})
  }, [])

  const start = useCallback(async () => {
    if (!detail || busy.current) return
    busy.current = true
    try {
      // Ask for the "install unknown apps" permission first, so nobody downloads for nothing.
      const { granted } = await ClinexiaUpdater.canInstall()
      if (!granted) {
        busy.current = false
        setPhase("permission")
        return
      }
      setPhase("downloading")
      setProgress(null)
      const sub = await ClinexiaUpdater.addListener("downloadProgress", (p) => setProgress(p))
      try {
        await ClinexiaUpdater.downloadUpdate({ url: detail.manifest.apkUrl, sha256: detail.manifest.sha256, versionCode: detail.manifest.versionCode })
      } finally {
        void sub.remove()
      }
      await ClinexiaUpdater.installUpdate({ versionCode: detail.manifest.versionCode })
      busy.current = false
      setPhase("installing")
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === "CHECKSUM_MISMATCH") fail("The downloaded file did not match its checksum, so it was deleted and nothing was installed. Please try again later.")
      else if (code === "INSTALL_PERMISSION") { busy.current = false; setPhase("permission") }
      else if (code === "DOWNLOAD_FAILED") fail("The download failed. Check your connection and try again.")
      else fail("Could not open the installer. Please try again.")
    }
  }, [detail, fail])

  // Back from the system settings screen: continue automatically.
  useEffect(() => {
    if (phase !== "permission") return
    let remove: (() => void) | undefined
    void import("@capacitor/app").then(async ({ App }) => {
      const sub = await App.addListener("resume", () => void start())
      remove = () => void sub.remove()
    })
    return () => remove?.()
  }, [phase, start])

  if (!detail) return null
  const { manifest, forced } = detail
  const pct = progress && progress.total > 0 ? Math.min(100, Math.round((progress.received / progress.total) * 100)) : null
  const later = () => { setDetail(null); void ClinexiaUpdater.cleanup().catch(() => {}) }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="update-title" className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-4">
      <div className="card w-full max-w-sm space-y-3 bg-white p-5 shadow-2xl dark:bg-slate-900">
        {phase === "prompt" && (
          <>
            <h2 id="update-title" className="text-lg font-extrabold">Update available</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Clinexia {manifest.versionName} is ready.{forced ? " This update is required to keep using the app." : ""}
            </p>
            {manifest.releaseNotes ? <div className="max-h-40 overflow-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{manifest.releaseNotes}</div> : null}
          </>
        )}
        {phase === "permission" && (
          <>
            <h2 id="update-title" className="text-lg font-extrabold">Allow installing updates</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Clinexia is installed outside Google Play, so Android needs your permission before it can open the installer for an update. Turn on “Allow from this source” for Clinexia, then come back and the update will continue.
            </p>
          </>
        )}
        {phase === "downloading" && (
          <>
            <h2 id="update-title" className="text-lg font-extrabold">Downloading {manifest.versionName}…</h2>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct ?? 5}%` }} />
            </div>
            <p className="text-xs text-slate-500">{progress ? (progress.total > 0 ? `${mb(progress.received)} of ${mb(progress.total)} · checking integrity when done` : mb(progress.received)) : "Starting…"}</p>
          </>
        )}
        {phase === "installing" && (
          <>
            <h2 id="update-title" className="text-lg font-extrabold">Opening the installer…</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Confirm the install in the Android screen. Your history and settings are kept.</p>
          </>
        )}
        {phase === "error" && (
          <>
            <h2 id="update-title" className="text-lg font-extrabold">Update failed</h2>
            <p role="alert" className="text-sm text-red-600">{error}</p>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {phase === "prompt" && (
            <>
              {!forced && <button onClick={later} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">Later</button>}
              <button onClick={() => void start()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Update now</button>
            </>
          )}
          {phase === "permission" && (
            <>
              {!forced && <button onClick={later} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">Cancel</button>}
              <button onClick={() => void ClinexiaUpdater.openInstallSettings().catch(() => fail("Could not open settings."))} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Open settings</button>
            </>
          )}
          {phase === "installing" && !forced && <button onClick={later} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">Close</button>}
          {phase === "error" && (
            <>
              {!forced && <button onClick={later} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">Close</button>}
              <button onClick={() => void start()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Try again</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
