"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isNative, openExternal } from "@/lib/native"
import { refreshRegistration, startPush, type PushMessage } from "@/lib/push"
import { useAccountSession } from "@/lib/billing/session"

/** Wires phone notifications into the app: registers the phone, shows a notification that arrives while the app is open, and opens
 * the link of one the person taps. Renders nothing unless a notification is on screen. */
export function PushBridge() {
  const router = useRouter()
  const s = useAccountSession()
  const [msg, setMsg] = useState<PushMessage | null>(null)

  useEffect(() => {
    if (!isNative()) return
    void startPush({
      onForeground: (m) => setMsg(m),
      onOpen: (url) => { if (url.startsWith("/")) router.push(url); else void openExternal(url) },
    })
  }, [router])

  // Signing in or out re-registers, so "signed-in people" notices reach exactly the right phones.
  useEffect(() => { if (isNative() && !s.loading) void refreshRegistration() }, [s.signedIn, s.loading])

  useEffect(() => {
    if (!msg) return
    const t = window.setTimeout(() => setMsg(null), 9000)
    return () => window.clearTimeout(t)
  }, [msg])

  if (!msg) return null
  const open = () => { const url = msg.url; setMsg(null); if (url.startsWith("/")) router.push(url); else if (url) void openExternal(url) }
  return (
    <div role="alert" className="card fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+72px)] z-[60] mx-auto max-w-md space-y-1 p-3 shadow-xl">
      <p className="text-sm font-black">{msg.title}</p>
      {msg.body && <p className="muted text-sm leading-5">{msg.body}</p>}
      <div className="flex gap-2 pt-1">{msg.url && <button className="pill active px-3 py-2" onClick={open}>Open</button>}<button className="pill px-3 py-2" onClick={() => setMsg(null)}>Dismiss</button></div>
    </div>
  )
}
