"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ClipboardList, LogIn, LogOut, User, UserPlus } from "lucide-react"
import { notifySessionChanged, signOutNow, useAccountSession } from "@/lib/billing/session"
import { UserAvatar } from "./user-avatar"
import { ARRIVED_EVENT, OPEN_EVENT, usePendingCampaigns } from "@/lib/campaigns/store"

/**
 * Header profile icon. Signed out: sign in / create account. Signed in: your account and sign out. Hidden when accounts are not
 * available in this build. A red "!" appears when a review form was parked with "Remind me later"; the menu then offers to complete it.
 */
export function AccountMenu() {
  const s = useAccountSession()
  const pending = usePendingCampaigns()
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let t: number | undefined
    const arrived = () => { setPulse(true); window.clearTimeout(t); t = window.setTimeout(() => setPulse(false), 1600) }
    window.addEventListener(ARRIVED_EVENT, arrived)
    return () => { window.removeEventListener(ARRIVED_EVENT, arrived); window.clearTimeout(t) }
  }, [])

  // Closes on a tap elsewhere and on the Android back button.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    root.dataset.overlay = "1"
    const away = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const back = () => setOpen(false)
    document.addEventListener("pointerdown", away)
    window.addEventListener("convertlab:close-overlay", back)
    return () => { document.removeEventListener("pointerdown", away); window.removeEventListener("convertlab:close-overlay", back); delete root.dataset.overlay }
  }, [open])

  if (!s.enabled) return null
  const count = pending.length
  const initial = s.email?.trim().charAt(0).toUpperCase()
  const item = "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-slate-100"

  return (
    <div ref={box} className="relative">
      <button
        data-account-trigger=""
        aria-label={`${s.signedIn ? "Your account" : "Sign in or create an account"}${count ? `, ${count} thing${count === 1 ? "" : "s"} waiting for you` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`relative grid h-9 w-9 place-items-center rounded-xl text-white/95 transition-transform hover:bg-white/10 ${pulse ? "scale-110" : ""}`}
      >
        {s.signedIn && initial ? <UserAvatar url={s.avatarUrl} initial={initial} size={28} /> : <User size={22} />}
        {count > 0 && (
          <span aria-hidden className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center">
            {pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/70" />}
            <span className={`relative grid h-4 w-4 place-items-center rounded-full bg-red-600 text-[10px] font-black leading-none text-white ${pulse ? "animate-bounce" : ""}`}>!</span>
          </span>
        )}
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 top-12 z-50 w-64 space-y-0.5 p-1.5 text-[color:var(--ink)] shadow-2xl">
          {pending.map((p) => (
            <button key={p.id} role="menuitem" className={`${item} items-start`} onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { id: p.id } })) }}>
              <ClipboardList size={16} className="mt-0.5 shrink-0 text-red-600" />
              <span className="min-w-0"><span className="block">{p.campaign.kind === "form" ? "Complete feedback form" : "You have a message"}</span><span className="muted block truncate text-xs font-semibold">{p.campaign.heading}</span></span>
            </button>
          ))}
          {count > 0 && <div className="my-1 border-t border-[color:var(--line)]" />}
          {s.signedIn ? (
            <>
              <div className="muted truncate px-3 py-1.5 text-xs font-semibold">{s.email}</div>
              <Link href="/account" role="menuitem" className={item} onClick={() => setOpen(false)}><User size={16} />My account</Link>
              <button role="menuitem" className={item} onClick={async () => { setOpen(false); await signOutNow(); notifySessionChanged() }}><LogOut size={16} />Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" role="menuitem" className={item} onClick={() => setOpen(false)}><LogIn size={16} />Sign in</Link>
              <Link href="/register" role="menuitem" className={item} onClick={() => setOpen(false)}><UserPlus size={16} />Create account</Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
