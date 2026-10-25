"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { confirmDialog } from "@/components/app-dialogs"
import { GUEST_CALC_LIMIT, isGuestLimited, readGuestCount } from "@/lib/billing/guest"
import { useAccountSession } from "@/lib/billing/session"

const EXEMPT = /^\/(login|register|account)(\/|$)/
const FIELDS = 'input,textarea,select,button,[contenteditable="true"],[role="button"],[role="switch"],[role="checkbox"],[role="radio"],[role="tab"]'

/**
 * While an account is required (admin setting, or premium locking), a signed-out person gets GUEST_CALC_LIMIT calculations on this phone. After that the screen is
 * browse-only: links still work, anything else asks them to create an account.
 */
export function GuestGuard() {
  const s = useAccountSession()
  const pathname = usePathname() || "/"
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [note, setNote] = useState("")
  const open = useRef(false)
  const active = !s.loading && s.enabled && isGuestLimited({ enforced: s.enforced, guestLimit: s.guestLimit, signedIn: s.signedIn }, count) && !EXEMPT.test(pathname)

  const ask = useCallback(async (title: string) => {
    if (open.current) return
    open.current = true
    const here = window.location.pathname
    const yes = await confirmDialog({ title, description: `Guests can run ${GUEST_CALC_LIMIT} calculations on each phone. Create a free account to keep going.`, confirmLabel: "Create account", cancelLabel: "Not now" })
    open.current = false
    if (yes) router.push(`/register?next=${encodeURIComponent(here)}`)
  }, [router])

  useEffect(() => {
    const sync = () => { try { setCount(readGuestCount(window.localStorage)) } catch { setCount(0) } }
    sync()
    let t: number | undefined
    const onCalc = (e: Event) => {
      sync()
      const d = (e as CustomEvent<{ remaining: number; limited: boolean }>).detail
      if (!d) return
      if (d.limited) { void ask("That was your last free calculation"); return }
      setNote(`${d.remaining} free calculation${d.remaining === 1 ? "" : "s"} left on this phone. Create a free account to keep going.`)
      window.clearTimeout(t); t = window.setTimeout(() => setNote(""), 4500)
    }
    window.addEventListener("clinexia:guest-calc", onCalc)
    window.addEventListener("storage", sync)
    return () => { window.removeEventListener("clinexia:guest-calc", onCalc); window.removeEventListener("storage", sync); window.clearTimeout(t) }
  }, [ask])

  useEffect(() => {
    if (!active) return
    const blocked = (e: Event) => {
      const target = e.target as Element | null
      const main = document.getElementById("main-content")
      if (!target?.closest || !main || !main.contains(target)) return // header, tab bar, menus and dialogs keep working
      if (target.closest("a[href]")) return // navigating is always allowed
      if (e instanceof KeyboardEvent) {
        const typing = e.key === "Enter" || e.key === " " || e.key.length === 1
        if (!typing || e.ctrlKey || e.metaKey || !target.closest(FIELDS)) return
      } else if (!target.closest(FIELDS) && e.type !== "submit") return
      e.preventDefault(); e.stopPropagation()
      if (e.type === "click" || e.type === "submit" || e.type === "keydown") void ask("Create a free account to continue")
    }
    const types = ["pointerdown", "mousedown", "click", "keydown", "beforeinput", "submit"] as const
    types.forEach((t) => document.addEventListener(t, blocked, true))
    return () => types.forEach((t) => document.removeEventListener(t, blocked, true))
  }, [active, ask])

  const above = { bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 8px)" }
  return (
    <>
      {note && !active && <div role="status" className="card fixed inset-x-3 z-[45] mx-auto max-w-sm p-3 text-xs font-bold shadow-xl" style={above}>{note}</div>}
      {active && (
        <div role="region" aria-label="Free calculations used" className="card fixed inset-x-3 z-[45] mx-auto max-w-md space-y-2 p-3 shadow-xl" style={above}>
          <p className="text-xs font-bold leading-4">You have used your {GUEST_CALC_LIMIT} free calculations on this phone. You can keep browsing; create a free account to keep calculating.</p>
          <div className="flex gap-2"><Link href={`/register?next=${encodeURIComponent(pathname)}`} className="primary flex-1 py-2 text-center text-sm">Create account</Link><Link href={`/login?next=${encodeURIComponent(pathname)}`} className="pill flex-1 py-2 text-center">Sign in</Link></div>
        </div>
      )}
    </>
  )
}
