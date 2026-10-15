"use client"
import { useEffect, useState } from "react"
import { APP_VERSION } from "@/lib/app-info"
import { checkForUpdates, updaterEnabled } from "@/lib/updater/controller"

/** "Check for updates" row for Settings. Renders nothing on the web or in the Google Play build. */
export function UpdateSettings() {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    void updaterEnabled().then(setEnabled)
  }, [])
  if (!enabled) return null

  async function check() {
    setBusy(true)
    setMessage("")
    const status = await checkForUpdates({ manual: true })
    setBusy(false)
    if (status === "up-to-date") setMessage("You have the latest version.")
    else if (status === "unavailable") setMessage("Could not check for updates. Are you online?")
  }

  return (
    <>
      <h2 className="section-title">App updates</h2>
      <div className="card flex items-center gap-3 p-4">
        <div className="flex-1">
          <div className="text-sm font-bold">Version {APP_VERSION}</div>
          <div className="text-[11px] text-slate-500">{message || "Updates are only downloaded when you ask or confirm."}</div>
        </div>
        <button onClick={() => void check()} disabled={busy} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">
          {busy ? "Checking…" : "Check for updates"}
        </button>
      </div>
    </>
  )
}
