"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { getHistory } from "@/lib/client-store"
import { analyticsEnabled } from "@/lib/analytics/track"
import { loadConfig } from "@/lib/feedback/http"
import { localDay, readState, writeState } from "@/lib/feedback/storage"
import {
  MIN_PAGE_AGE_MS, decidePrompt, excludedRoute, isEngaged, pauseForHours, recordVisit, snooze,
  type FeedbackConfig, type FeedbackState,
} from "@/lib/feedback/schedule"

/**
 * Asks for a star rating once someone has really used Clinexia (3+ calculations, or 3+ different days).
 * "Later" brings it back after a while (a few times at most); sending feedback ends it for good.
 * A star tap opens the short feedback page with that rating filled in. Skipped when usage statistics are switched
 * off in Settings (the Feedback row in Settings still works for anyone who wants to write).
 */
export function FeedbackPrompt() {
  const pathname = usePathname()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [hover, setHover] = useState(0)
  const loadedAt = useRef(Date.now())
  const config = useRef<FeedbackConfig | null>(null)
  const state = useRef<FeedbackState | null>(null)

  const evaluate = useCallback(() => {
    const c = config.current
    const s = state.current
    if (!c || !s) return
    let calculations: number | null = null
    try {
      calculations = getHistory().length
    } catch {}
    const verdict = decidePrompt({
      config: c,
      state: s,
      now: Date.now(),
      engaged: isEngaged({ calculations, visitDays: s.visitDays.length }),
      online: navigator.onLine !== false,
      pageAgeMs: Date.now() - loadedAt.current,
      onExcludedRoute: excludedRoute(window.location.pathname),
    })
    setVisible(verdict.show)
  }, [])

  useEffect(() => {
    if (!analyticsEnabled()) return
    let cancelled = false
    void (async () => {
      const loaded = await loadConfig()
      if (cancelled || !loaded) return
      config.current = loaded
      state.current = recordVisit(readState(loaded.version), localDay())
      writeState(state.current)
      evaluate()
    })()
    return () => { cancelled = true }
  }, [evaluate])

  useEffect(() => {
    if (excludedRoute(pathname)) { setVisible(false); return }
    const wait = Math.max(0, MIN_PAGE_AGE_MS - (Date.now() - loadedAt.current)) + 400
    const timer = window.setTimeout(evaluate, wait)
    return () => window.clearTimeout(timer)
  }, [pathname, evaluate])

  const save = (next: FeedbackState) => { state.current = next; writeState(next); setVisible(false) }

  if (!visible || !config.current || !state.current) return null

  const rate = (stars: number) => {
    save(pauseForHours(state.current as FeedbackState, Date.now(), 1)) // starting the form does not use up a "Later"
    router.push(`/feedback?rating=${stars}`)
  }

  return (
    <div role="dialog" aria-label="Rate Clinexia" className="card fixed inset-x-3 z-[45] mx-auto max-w-sm p-4 shadow-2xl" style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 10px)" }}>
      <h3 className="text-sm font-extrabold">How is Clinexia working for you?</h3>
      <p className="muted mb-3 mt-1 text-xs">Tap a star. It takes about a minute and helps us make it better.</p>
      <div className="mb-3 flex justify-center gap-1" onPointerLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`} onPointerEnter={() => setHover(n)} onClick={() => rate(n)} className="rounded p-1 active:scale-110">
            <Star size={34} className={n <= hover ? "fill-amber-400 text-amber-400" : "text-slate-400"} />
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <button className="pill" onClick={() => save(snooze(state.current as FeedbackState, config.current as FeedbackConfig, Date.now()))}>Later</button>
      </div>
    </div>
  )
}
