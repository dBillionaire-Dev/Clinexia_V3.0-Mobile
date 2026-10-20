"use client"
import { useEffect, useState } from "react"
import { enablePush, pushState, type PushState } from "@/lib/push"
import { isNative } from "@/lib/native"

/** Lets the person turn phone notifications on (Android app only). */
export function NotificationsCard() {
  const [state, setState] = useState<PushState | "loading">("loading")
  const [busy, setBusy] = useState(false)
  useEffect(() => { void pushState().then(setState) }, [])
  if (!isNative() || state === "loading" || state === "unsupported") return null
  return (
    <section className="card space-y-2 p-4">
      <h2 className="font-black">Notifications</h2>
      {state === "granted" && <p className="muted text-sm">Notifications are on for this phone. You will hear about new features and messages from the Clinexia team.</p>}
      {state === "denied" && <p className="muted text-sm leading-5">Notifications are blocked. To turn them on, open Android Settings, then Apps, Clinexia, Notifications.</p>}
      {state === "prompt" && (
        <>
          <p className="muted text-sm leading-5">Get a notification for new features and messages from the Clinexia team, even when the app is closed.</p>
          <button className="primary" disabled={busy} onClick={async () => { setBusy(true); setState(await enablePush()); setBusy(false) }}>{busy ? "Turning on…" : "Turn on notifications"}</button>
        </>
      )}
    </section>
  )
}
