"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { apiCall, accountsAvailable } from "@/lib/billing/api"
import { useAccountSession } from "@/lib/billing/session"
import { isNative, listenAppActive, openExternal } from "@/lib/native"
import { refreshRegistration, startPush, type PushMessage } from "@/lib/push"
import { markSeen, parseSeen, unseen, type InboxMessage } from "@/lib/push-inbox"

const SEEN_KEY = "clinexia:push-seen:v1"
type Shown = PushMessage & { how: "tap" | "foreground" | "inbox" }

const readSeen = () => { try { return parseSeen(localStorage.getItem(SEEN_KEY)) } catch { return [] } }
const writeSeen = (ids: string[]) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)) } catch { /* ignore */ } }

/**
 * Phone notifications inside the app. Every notification stays on screen until the person closes it:
 *  - one tapped in the notification bar opens the app and shows as a pop-up with the full message;
 *  - one that arrives while the app is open shows at the top;
 *  - ones that were missed or swiped away are fetched from the server and shown when the app opens.
 */
export function PushBridge() {
  const router = useRouter()
  const s = useAccountSession()
  const [queue, setQueue] = useState<Shown[]>([])
  const idsInQueue = useRef(new Set<string>())

  const add = useCallback((m: Shown) => {
    if (m.id && (idsInQueue.current.has(m.id) || readSeen().includes(m.id))) return // already shown, or already closed
    if (m.id) idsInQueue.current.add(m.id)
    setQueue((q) => (q.some((x) => x.title === m.title && x.body === m.body && x.id === m.id) ? q : [...q, m]))
  }, [])

  const close = useCallback((m: Shown) => {
    if (m.id) writeSeen(markSeen(readSeen(), m.id))
    idsInQueue.current.delete(m.id)
    setQueue((q) => q.filter((x) => x !== m))
  }, [])

  const fetchInbox = useCallback(async () => {
    if (!accountsAvailable()) return
    const r = await apiCall<{ messages?: InboxMessage[] }>("/api/push/recent")
    if (!r.ok) return
    for (const m of unseen(r.data?.messages ?? [], readSeen(), Date.now())) add({ ...m, how: "inbox" })
  }, [add])

  useEffect(() => {
    if (isNative()) void startPush({ onForeground: (m) => add({ ...m, how: "foreground" }), onOpen: (m) => add({ ...m, how: "tap" }) })
  }, [add])

  // Missed notifications: when the app opens, when someone signs in or out, and when it is brought back.
  useEffect(() => { if (!s.loading) void fetchInbox() }, [s.loading, s.signedIn, fetchInbox])
  useEffect(() => {
    const again = () => { if (document.visibilityState === "visible") void fetchInbox() }
    document.addEventListener("visibilitychange", again)
    void listenAppActive(again)
    return () => document.removeEventListener("visibilitychange", again)
  }, [fetchInbox])

  // Signing in or out re-registers the phone, so "signed-in people" notices reach exactly the right phones.
  useEffect(() => { if (isNative() && !s.loading) void refreshRegistration() }, [s.signedIn, s.loading])

  const top = queue[0]
  const sheet = top?.how === "tap"
  useEffect(() => {
    if (!sheet) return
    const root = document.documentElement
    root.dataset.overlay = "1"
    const back = () => { if (top) close(top) }
    window.addEventListener("convertlab:close-overlay", back)
    return () => { window.removeEventListener("convertlab:close-overlay", back); delete root.dataset.overlay }
  }, [sheet, top, close])

  if (!top) return null
  const open = () => { const url = top.url; close(top); if (url.startsWith("/")) router.push(url); else if (url) void openExternal(url) }
  const body = (
    <div className="space-y-2">
      <p className="text-sm font-black">{top.title}</p>
      {top.body && <p className="muted whitespace-pre-line text-sm leading-5">{top.body}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {top.url && <button className="pill active px-3 py-2" onClick={open}>Open</button>}
        <button className="pill px-3 py-2" onClick={() => close(top)}>Close</button>
        {queue.length > 1 && <span className="muted text-xs">+{queue.length - 1} more</span>}
      </div>
    </div>
  )
  return sheet ? (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/50 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:items-center">
      <div role="alertdialog" aria-modal="true" aria-label={top.title} className="card w-full max-w-md p-4">{body}</div>
    </div>
  ) : (
    <div role="alert" className="card fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+72px)] z-[60] mx-auto max-w-md p-3 shadow-xl">{body}</div>
  )
}
