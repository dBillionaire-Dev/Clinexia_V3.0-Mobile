"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getAnonymousId } from "@/lib/analytics/client-id"
import { apiCall } from "@/lib/billing/api"
import { useAccountSession } from "@/lib/billing/session"
import { isNative, openExternal } from "@/lib/native"
import { canFlyToAccount, flyToAccountIcon } from "@/lib/campaigns/fly"
import { prunePending } from "@/lib/campaigns/pending"
import { afterDone, afterLater, afterShown, normalizeState, pickCampaign, type LocalState } from "@/lib/campaigns/schedule"
import { ARRIVED_EVENT, OPEN_EVENT, announcePending, parkCampaign, readPending, replacePending, unparkCampaign } from "@/lib/campaigns/store"
import type { Answers, Campaign, Platform, PublicCampaign } from "@/lib/campaigns/types"
import { CampaignForm, CampaignView } from "./campaign-view"

const KEY = "clinexia:campaigns:v1"
const SESSION_KEY = "clinexia:campaign-session"
const EXCLUDED = /^\/(login|register)(\/|$)/

const AWAY_MS = 10 * 60_000 // coming back after this long counts as a new visit, so newly published campaigns can appear
const platform = (): Platform => (isNative() ? "android" : "mobile_web")

type Ref = { id: string; version: number }
async function fetchState(): Promise<{ answered: Ref[]; parked: Ref[] } | null> {
  const r = await apiCall<{ answered?: Ref[]; parked?: Ref[] }>(`/api/campaigns/answered?aid=${encodeURIComponent(getAnonymousId())}`)
  return r.ok ? { answered: r.data?.answered ?? [], parked: r.data?.parked ?? [] } : null
}
const tellServerParked = (c: Ref, parked: boolean) => { void apiCall("/api/campaigns/park", { body: { campaignId: c.id, version: c.version, parked } }) }

const readAll = (): Record<string, unknown> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {} } catch { return {} } }
const writeOne = (id: string, st: LocalState) => { try { localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [id]: st })) } catch { /* storage unavailable */ } }

/** A sheet that slides up over the page. The Android back button closes it (when it can be closed). */
function Sheet({ cardRef, dismissible, onClose, children }: { cardRef: React.RefObject<HTMLDivElement | null>; dismissible: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.overlay = "1"
    const back = () => { if (dismissible) onClose() }
    window.addEventListener("convertlab:close-overlay", back)
    return () => { window.removeEventListener("convertlab:close-overlay", back); delete root.dataset.overlay }
  }, [dismissible, onClose])
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:items-center" onClick={() => { if (dismissible) onClose() }}>
      <div ref={cardRef} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="card max-h-[88vh] w-full max-w-md overflow-y-auto p-4">{children}</div>
    </div>
  )
}

/**
 * Shows notices and review forms the admin set up on the website: as a sheet, a bar under the header, or a small alert, on the
 * schedule and audience they chose. One per visit. "Remind me later" shrinks it into the profile icon (which gets a "!"), where
 * it can be reopened from the menu.
 */
export function CampaignHost() {
  const pathname = usePathname() || "/"
  const router = useRouter()
  const session = useAccountSession()
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [fromMenu, setFromMenu] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [synced, setSynced] = useState(false)
  const [again, setAgain] = useState(0)
  const syncedFor = useRef("")
  const list = useRef<PublicCampaign[] | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const loadedAt = useRef(Date.now())
  const card = useRef<HTMLDivElement | null>(null)

  const unpark = useCallback((c: Ref) => {
    if (readPending().some((p) => p.id === c.id)) unparkCampaign(c.id)
    if (session.signedIn) tellServerParked(c, false)
  }, [session.signedIn])

  const decide = useCallback(() => {
    if (!list.current || list.current.length === 0 || session.loading) return
    let shown = false
    try { shown = sessionStorage.getItem(SESSION_KEY) === "1" } catch { /* ignore */ }
    const stored = readAll()
    const full = list.current.map((c) => ({ ...c, title: "", status: "active" as const })) as Campaign[]
    const states = Object.fromEntries(full.map((c) => [c.id, normalizeState(stored[c.id], c.version)]))
    const pick = pickCampaign(full, states, { now: Date.now(), signedIn: session.signedIn, shownThisSession: shown, platform: platform() })
    if (!pick) return
    try { sessionStorage.setItem(SESSION_KEY, "1") } catch { /* ignore */ }
    writeOne(pick.id, afterShown(states[pick.id], Date.now()))
    unpark(pick)
    setFromMenu(false)
    setFormOpen(pick.kind === "form" && pick.presentation === "modal")
    setCampaign(list.current.find((c) => c.id === pick.id) ?? null)
  }, [session.loading, session.signedIn, unpark])

  useEffect(() => {
    let cancelled = false
    void apiCall<{ campaigns?: PublicCampaign[] }>("/api/campaigns/active", { auth: false }).then((r) => {
      if (cancelled || !r.ok || !Array.isArray(r.data?.campaigns)) return
      list.current = r.data.campaigns
      const now = readPending()
      const kept = prunePending(now, r.data.campaigns)
      if (kept.length !== now.length) replacePending(kept)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [again])

  // Coming back to the app after a while counts as a new visit: look for newly published campaigns.
  useEffect(() => {
    let hiddenAt = 0
    const onVisible = () => {
      if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return }
      if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) {
        hiddenAt = 0
        try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
        syncedFor.current = ""
        setSynced(false)
        setAgain((n) => n + 1)
      }
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  // Agree with the server about what this person (on any device) has answered or parked.
  useEffect(() => {
    if (!loaded || session.loading) return
    const key = `${session.signedIn}:${again}`
    if (syncedFor.current === key) return
    syncedFor.current = key
    void fetchState().then((state) => {
      if (state && list.current) {
        const stored = readAll()
        const answeredIds = new Set<string>()
        for (const a of state.answered) {
          const c = list.current.find((x) => x.id === a.id && x.version === a.version)
          if (!c) continue
          answeredIds.add(c.id)
          writeOne(c.id, afterDone(normalizeState(stored[c.id], c.version), Date.now()))
          if (readPending().some((p) => p.id === c.id)) unparkCampaign(c.id)
        }
        let added = false
        for (const p of state.parked) {
          const c = list.current.find((x) => x.id === p.id && x.version === p.version)
          if (c && !answeredIds.has(c.id) && !readPending().some((q) => q.id === c.id)) { parkCampaign(c, false); added = true }
        }
        if (added) announcePending()
      }
      setSynced(true)
    })
  }, [loaded, session.loading, session.signedIn, again])

  useEffect(() => {
    if (EXCLUDED.test(pathname) || campaign || !loaded || !synced) return
    const wait = Math.max(0, 4000 - (Date.now() - loadedAt.current))
    const t = window.setTimeout(decide, wait + 300)
    return () => window.clearTimeout(t)
  }, [pathname, decide, campaign, loaded, synced, again])

  useEffect(() => {
    const open = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      const item = readPending().find((p) => p.id === id)
      if (!item) return
      if (item.campaign.kind === "notice") unpark(item)
      setFromMenu(true); setFormOpen(item.campaign.kind === "form"); setCampaign(item.campaign)
    }
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [unpark])

  const close = useCallback(() => { window.clearTimeout(timer.current); setCampaign(null); setFormOpen(false); setFromMenu(false) }, [])

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (campaign && !fromMenu && campaign.presentation !== "modal" && campaign.durationSeconds && !formOpen) timer.current = window.setTimeout(close, campaign.durationSeconds * 1000)
    return () => window.clearTimeout(timer.current)
  }, [campaign, formOpen, fromMenu, close])

  if (!campaign || EXCLUDED.test(pathname)) return null
  const c: PublicCampaign = fromMenu ? { ...campaign, presentation: "modal", allowLater: false, durationSeconds: null, dismissible: true } : campaign
  const state = () => normalizeState(readAll()[c.id], c.version)

  const later = () => {
    writeOne(c.id, afterLater(state(), c, Date.now()))
    if (session.signedIn) tellServerParked(c, true)
    if (!canFlyToAccount()) return close()
    parkCampaign(campaign, false) // saved now; the "!" lights up when the card lands
    const landed = flyToAccountIcon(card.current)
    close()
    void landed.then(() => { announcePending(); window.dispatchEvent(new Event(ARRIVED_EVENT)) })
  }
  const cta = () => { unpark(c); if (c.ctaUrl.startsWith("/")) router.push(c.ctaUrl); else void openExternal(c.ctaUrl); close() }
  const submit = async (answers: Answers): Promise<string | null> => {
    const r = await apiCall("/api/campaigns/respond", { auth: false, body: { campaignId: c.id, version: c.version, anonymousId: getAnonymousId(), platform: isNative() ? "android" : "mobile-web", website: "", answers } })
    if (r.ok) { writeOne(c.id, afterDone(state(), Date.now())); unpark(c); window.setTimeout(close, 2500); return null }
    return r.error
  }
  const view = (variant: "modal" | "banner" | "toast", inlineForm: boolean) => (
    <CampaignView campaign={c} variant={variant} inlineForm={inlineForm} onClose={close} onLater={later} onCta={cta} onOpenForm={() => setFormOpen(true)} onSubmit={submit} />
  )

  if (c.presentation === "banner" && !formOpen)
    return <div ref={card} role="region" aria-label={c.heading} className="border-b border-[color:var(--line)] bg-blue-50 px-4 py-3"><div className="mx-auto max-w-2xl">{view("banner", false)}</div></div>
  if (c.presentation === "toast" && !formOpen)
    return <div ref={card} role="status" className="card fixed inset-x-3 z-[45] mx-auto max-w-md p-3 shadow-xl" style={{ bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 8px)" }}>{view("toast", false)}</div>

  return (
    <Sheet cardRef={card} dismissible={c.dismissible} onClose={close}>
      {c.presentation === "modal" && !fromMenu ? view("modal", true) : (
        <div className="space-y-3">
          <p className="text-base font-black">{c.heading}</p>
          {c.body && <p className="muted whitespace-pre-line text-sm leading-5">{c.body}</p>}
          {c.kind === "form" ? <CampaignForm campaign={c} onSubmit={submit} /> : null}
          {fromMenu && c.kind === "form" && <button type="button" className="muted text-xs underline" onClick={() => { unpark(c); close() }}>No thanks, remove this reminder</button>}
          {c.dismissible && <button type="button" className="pill w-full py-3" onClick={close}>Close</button>}
        </div>
      )}
    </Sheet>
  )
}
