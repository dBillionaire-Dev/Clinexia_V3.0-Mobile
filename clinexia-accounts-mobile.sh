#!/usr/bin/env bash
# Adds Clinexia accounts, plans, premium lock, guest allowance, campaigns, feedback fixes and themed dialogs to the MOBILE app.
# Run from the repo root:  bash clinexia-accounts-mobile.sh      (safe to re-run; changed files are saved as <name>.bak)
# Needs the matching update on the website's backend (see docs/ACCOUNTS.md).
set -euo pipefail
[ -f capacitor.config.ts ] && [ -f components/app-shell.tsx ] || { echo "Run this from the Clinexia mobile repo root."; exit 1; }
w() { mkdir -p "$(dirname "$1")"; if [ -e "$1" ]; then cp "$1" "$1.bak"; fi; cat > "$1"; }

w 'app/account/organisation/page.tsx' <<'CLX_EOF_0'
"use client"
import { OrganisationScreen } from "@/components/organisation-screen"
export default function OrganisationPage() { return <OrganisationScreen /> }
CLX_EOF_0
w 'app/account/page.tsx' <<'CLX_EOF_1'
"use client"
import { AccountScreen } from "@/components/account-screen"
export default function AccountPage() { return <AccountScreen /> }
CLX_EOF_1
w 'app/login/page.tsx' <<'CLX_EOF_2'
"use client"
import { AuthScreen } from "@/components/auth-screen"
export default function LoginPage() { return <AuthScreen mode="login" /> }
CLX_EOF_2
w 'app/register/page.tsx' <<'CLX_EOF_3'
"use client"
import { AuthScreen } from "@/components/auth-screen"
export default function RegisterPage() { return <AuthScreen mode="signup" /> }
CLX_EOF_3
w 'app/tools/mass-volume/layout.tsx' <<'CLX_EOF_4'
import { PremiumGate } from "@/components/premium-gate"

// Premium locking for this tool (does nothing unless locking is switched on in the Clinexia server).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PremiumGate category="lab-solutions">{children}</PremiumGate>
}
CLX_EOF_4
w 'app/tools/mcfarland/layout.tsx' <<'CLX_EOF_5'
import { PremiumGate } from "@/components/premium-gate"

// Premium locking for this tool (does nothing unless locking is switched on in the Clinexia server).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PremiumGate category="microbiology">{children}</PremiumGate>
}
CLX_EOF_5
w 'app/tools/molar-mass/layout.tsx' <<'CLX_EOF_6'
import { PremiumGate } from "@/components/premium-gate"

// Premium locking for this tool (does nothing unless locking is switched on in the Clinexia server).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PremiumGate category="chemistry">{children}</PremiumGate>
}
CLX_EOF_6
w 'app/tools/serial-dilution/layout.tsx' <<'CLX_EOF_7'
import { PremiumGate } from "@/components/premium-gate"

// Premium locking for this tool (does nothing unless locking is switched on in the Clinexia server).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <PremiumGate category="lab-solutions">{children}</PremiumGate>
}
CLX_EOF_7
w 'components/access-badge.tsx' <<'CLX_EOF_8'
"use client"
import type { CalculatorGroup } from "@/lib/calculators/types"
import { isPremiumCalculator, hasSpecialty } from "@/lib/billing/access"
import { CATEGORY_SPECIALTY, SPECIALTY_LABELS } from "@/lib/billing/config"
import { useAccountSession } from "@/lib/billing/session"

/** Says at a glance what a tool needs: Free, or Premium for its specialty (All-access covers every specialty). Shown only while premium locking is on. */
export function AccessBadge({ id, category, className = "" }: { id: string; category: string; className?: string }) {
  const s = useAccountSession()
  if (!s.enabled || !s.enforced || !(category in CATEGORY_SPECIALTY)) return null
  const group = category as CalculatorGroup
  const base = `ml-1.5 inline-flex shrink-0 items-center rounded-full border px-2 py-[1px] align-middle text-[10px] font-extrabold ${className}`
  if (!isPremiumCalculator({ id, category: group })) return <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}>Free</span>
  const specialty = CATEGORY_SPECIALTY[group]
  const label = SPECIALTY_LABELS[specialty]
  const unlocked = Boolean(s.signedIn && s.entitlements && hasSpecialty(s.entitlements, specialty))
  return (
    <span title={`Included with ${label} premium and All-access premium`} className={`${base} ${unlocked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {unlocked ? "Unlocked" : "Premium"} · {label}
    </span>
  )
}
CLX_EOF_8
w 'components/account-menu.tsx' <<'CLX_EOF_9'
"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ClipboardList, LogIn, LogOut, User, UserPlus } from "lucide-react"
import { notifySessionChanged, signOutNow, useAccountSession } from "@/lib/billing/session"
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
        {s.signedIn && initial ? <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black text-[#073a68]">{initial}</span> : <User size={22} />}
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
CLX_EOF_9
w 'components/account-screen.tsx' <<'CLX_EOF_10'
"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { confirmDialog } from "@/components/app-dialogs"
import { accountsAvailable, apiCall } from "@/lib/billing/api"
import { ORGANISATION_TYPES, SPECIALTY_LABELS, type Specialty } from "@/lib/billing/config"
import { notifySessionChanged, signOutNow, useAccountSession } from "@/lib/billing/session"
import { PlanPicker } from "./plan-picker"

type Me = {
  user: { id: string; email: string }; market: "ng" | "intl"
  entitlements: { all: boolean; specialties: Specialty[] }
  subscription: { plan: string; specialties: Specialty[]; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null
  organisations: Array<{ orgId: string; role: string; name: string }>
}

function CreateOrganisation({ onCreated }: { onCreated: (orgId: string) => void }) {
  const [f, setF] = useState({ name: "", orgType: "", contactPhone: "", country: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("")
    const r = await apiCall<{ orgId: string }>("/api/billing/org", { body: { action: "create", ...f } })
    setBusy(false)
    if (r.ok) onCreated(r.data.orgId); else setError(r.error)
  }
  const label = "mb-1 block text-xs font-extrabold"
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block"><span className={label}>Organisation name</span><input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
      <label className="block"><span className={label}>Organisation type</span><select className="field" value={f.orgType} onChange={(e) => setF({ ...f, orgType: e.target.value })} required><option value="">Choose…</option>{ORGANISATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Phone (optional)</span><input className="field" value={f.contactPhone} onChange={(e) => setF({ ...f, contactPhone: e.target.value })} /></label>
        <label className="block"><span className={label}>Country (optional)</span><input className="field" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></label>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Create organisation"}</button>
    </form>
  )
}

export function AccountScreen() {
  const router = useRouter()
  const s = useAccountSession()
  const [me, setMe] = useState<Me | null | undefined>(undefined)
  const [invite, setInvite] = useState("")
  const [msg, setMsg] = useState("")
  const load = useCallback(async () => {
    const r = await apiCall<Me>("/api/account/me")
    setMe(r.ok ? r.data : null)
    notifySessionChanged()
  }, [])
  useEffect(() => { if (s.loading) return; if (!s.signedIn) { setMe(null); return } void load() }, [s.loading, s.signedIn, load])

  if (!accountsAvailable()) return <div className="page"><p className="card p-4 text-sm">Accounts are not available in this build.</p></div>
  if (s.loading || me === undefined) return <div className="page flex justify-center py-16"><Loader2 className="animate-spin" aria-label="Loading" /></div>
  if (!s.signedIn || !me)
    return (
      <div className="page space-y-3 text-center">
        <h1 className="text-xl font-black">Your Clinexia account</h1>
        <p className="muted text-sm">Sign in to see your plan, or create an account.</p>
        <Link href="/login?next=%2Faccount" className="primary block">Sign in</Link>
        <Link href="/register?next=%2Faccount" className="pill block py-3">Create account</Link>
      </div>
    )

  const sub = me.subscription
  async function acceptInvite() {
    const token = (() => { try { return new URL(invite.trim()).searchParams.get("token") } catch { return invite.trim() } })()
    if (!token) return setMsg("Paste the invitation link you were sent.")
    const r = await apiCall<{ orgId: string }>("/api/billing/org", { body: { action: "accept", token } })
    if (r.ok) { setInvite(""); setMsg("You have joined the organisation."); void load() } else setMsg(r.error)
  }
  return (
    <div className="page space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-black">Your account</h1>
        <p className="muted text-sm">{me.user.email} · {me.market === "intl" ? "International pricing (USD)" : "Nigeria pricing (₦)"}</p>
        <button className="pill" onClick={async () => { if (await confirmDialog({ title: "Sign out?", description: "You can sign back in any time.", confirmLabel: "Sign out" })) await signOutNow() }}>Sign out</button>
      </header>

      <section className="card space-y-2 p-4">
        <h2 className="font-black">What you can use</h2>
        <p className="muted text-sm">Free calculators and tools are always available.</p>
        <p className="text-sm font-semibold">{me.entitlements.all ? "All premium specialties." : me.entitlements.specialties.length ? me.entitlements.specialties.map((x) => SPECIALTY_LABELS[x]).join(", ") : "No premium specialties yet."}</p>
        {sub && <p className="muted text-xs">Your plan: {sub.plan === "all_access" ? "all-access" : sub.specialties.map((x) => SPECIALTY_LABELS[x]).join(", ")} · {sub.status}{sub.currentPeriodEnd ? ` · paid until ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : ""}{sub.cancelAtPeriodEnd ? " · will not continue" : ""}</p>}
        {sub && (sub.status === "active" || sub.status === "grace") && !sub.cancelAtPeriodEnd && (
          <button className="muted text-xs underline" onClick={async () => { if (await confirmDialog({ title: "Stop your plan?", description: "You keep access until the end of the month you have paid for. It will not renew.", confirmLabel: "Stop plan", destructive: true })) { await apiCall("/api/billing/cancel", { body: {} }); void load() } }}>Cancel at the end of the paid period</button>
        )}
      </section>

      {me.organisations.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-black">Your organisations</h2>
          <ul className="card divide-y divide-[color:var(--line)]">
            {me.organisations.map((o) => <li key={o.orgId} className="flex items-center justify-between gap-3 p-3 text-sm"><span>{o.name} <span className="muted">({o.role})</span></span><Link className="font-bold underline" href={`/account/organisation?org=${o.orgId}`}>Open</Link></li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3"><h2 className="font-black">{sub ? "Change or renew your plan" : "Choose a plan"}</h2><PlanPicker kind="individual" onPaid={() => void load()} /></section>

      <section className="space-y-3">
        <h2 className="font-black">Set up an organisation</h2>
        <p className="muted text-sm leading-5">For labs, pharmacies, hospitals, clinics and schools. You become the administrator and each staff member signs in with their own account.</p>
        <CreateOrganisation onCreated={(id) => router.push(`/account/organisation?org=${id}`)} />
      </section>

      <section className="space-y-2">
        <h2 className="font-black">Have an invitation?</h2>
        <input className="field" placeholder="Paste the invitation link" value={invite} onChange={(e) => setInvite(e.target.value)} />
        <button className="pill w-full py-3" onClick={acceptInvite}>Join organisation</button>
        {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
      </section>
    </div>
  )
}
CLX_EOF_10
w 'components/app-dialogs.tsx' <<'CLX_EOF_11'
"use client"

// Themed replacements for window.confirm / window.prompt, in the app's own style. Call from anywhere (no setup):
//   if (await confirmDialog({ title: "Sign out?" })) ...
//   const reason = await promptDialog({ title: "Why?", label: "Reason" })   // text, or null if cancelled
// The Android back button closes an open dialog (it cancels it).
import { useEffect, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"

export interface ConfirmOptions { title: string; description?: ReactNode; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }
export interface PromptOptions extends ConfirmOptions { label: string; placeholder?: string; multiline?: boolean; validate?: (value: string) => string | null }

function Modal({ opts, prompt, onDone }: { opts: ConfirmOptions | PromptOptions; prompt: boolean; onDone: (v: string | boolean | null) => void }) {
  const [value, setValue] = useState("")
  const [touched, setTouched] = useState(false)
  const p = opts as PromptOptions
  const cancel = () => onDone(prompt ? null : false)

  useEffect(() => {
    const root = document.documentElement
    const had = root.dataset.overlay
    root.dataset.overlay = "1"
    const onBack = () => cancel()
    window.addEventListener("convertlab:close-overlay", onBack)
    return () => { window.removeEventListener("convertlab:close-overlay", onBack); if (had) root.dataset.overlay = had; else delete root.dataset.overlay }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trimmed = value.trim()
  const error = !prompt ? null : p.validate ? p.validate(trimmed) : trimmed ? null : "This is required."
  const submit = () => { if (prompt) { setTouched(true); if (error) return; onDone(trimmed) } else onDone(true) }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:items-center" onClick={cancel}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit() }} role="alertdialog" aria-modal="true" aria-label={opts.title} className="card w-full max-w-sm space-y-3 p-4">
        <h2 className="text-base font-black">{opts.title}</h2>
        {opts.description ? <div className="muted text-sm leading-5">{opts.description}</div> : null}
        {prompt && (
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold">{p.label}</span>
            {p.multiline ? <textarea autoFocus rows={3} className="field" value={value} placeholder={p.placeholder} onChange={(e) => setValue(e.target.value)} /> : <input autoFocus className="field" value={value} placeholder={p.placeholder} onChange={(e) => setValue(e.target.value)} />}
            {touched && error ? <span role="alert" className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
          </label>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" className="pill flex-1 py-3" onClick={cancel}>{opts.cancelLabel ?? "Cancel"}</button>
          <button type="submit" className="primary flex-1" style={opts.destructive ? { background: "#dc2626", boxShadow: "none" } : undefined}>{opts.confirmLabel ?? (prompt ? "Continue" : "Confirm")}</button>
        </div>
      </form>
    </div>
  )
}

function show(opts: ConfirmOptions | PromptOptions, prompt: boolean): Promise<string | boolean | null> {
  if (typeof document === "undefined") return Promise.resolve(prompt ? null : false)
  return new Promise((resolve) => {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const root = createRoot(host)
    let settled = false
    const onDone = (v: string | boolean | null) => {
      if (settled) return
      settled = true
      resolve(v)
      window.setTimeout(() => { root.unmount(); host.remove() }, 0)
    }
    root.render(<Modal opts={opts} prompt={prompt} onDone={onDone} />)
  })
}

export const confirmDialog = (opts: ConfirmOptions) => show(opts, false) as Promise<boolean>
export const promptDialog = (opts: PromptOptions) => show(opts, true) as Promise<string | null>
CLX_EOF_11
w 'components/auth-form.tsx' <<'CLX_EOF_12'
"use client"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { apiCall } from "@/lib/billing/api"
import { notifySessionChanged } from "@/lib/billing/session"
import { setTokens, takeAuthNotice, type TokenSession } from "@/lib/billing/tokens"
import { BACKGROUND, rolesFor } from "@/lib/feedback/questions"

/** Sign in or create an account. Signing in stores the sign-in on this phone; signing up that needs email confirmation calls onNeedsConfirmation. */
export function AuthForm({ initialMode, onDone, onNeedsConfirmation, onSwitch }: { initialMode: "login" | "signup"; onDone: () => void; onNeedsConfirmation: (email: string) => void; onSwitch: (m: "login" | "signup") => void }) {
  const mode = initialMode
  const [type, setType] = useState<"individual" | "enterprise" | null>(null)
  const [f, setF] = useState({ email: "", password: "", fullName: "", background: "", role: "" })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  useEffect(() => { const n = takeAuthNotice(); if (n) setNotice(n) }, [])
  const set = (k: keyof typeof f, v: string) => setF((cur) => ({ ...cur, [k]: v, ...(k === "background" ? { role: "" } : {}) }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError("")
    const r = mode === "login"
      ? await apiCall<{ session?: TokenSession }>("/api/account/login", { auth: false, body: { email: f.email, password: f.password } })
      : await apiCall<{ signedIn?: boolean; session?: TokenSession }>("/api/account/signup", { auth: false, body: { ...f, accountType: type } })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    const session = r.data?.session
    if (session) { setTokens(session); notifySessionChanged(); return onDone() }
    if (mode === "signup") return onNeedsConfirmation(f.email.trim().toLowerCase())
    setError("Could not sign you in right now. Please try again.")
  }

  if (mode === "signup" && !type) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-black">Create your Clinexia account</h1>
        <p className="muted text-sm">Free tools stay free. You only pay if you choose a premium plan.</p>
        {([["individual", "Individual", "For you: your own email, role and plan."], ["enterprise", "Organisation", "For a lab, pharmacy, hospital, clinic or school with staff seats."]] as const).map(([v, t, d]) => (
          <button key={v} type="button" onClick={() => setType(v)} className="card block w-full p-4 text-left"><span className="block font-black">{t}</span><span className="muted block text-sm">{d}</span></button>
        ))}
        <button type="button" className="muted text-sm underline" onClick={() => onSwitch("login")}>I already have an account</button>
      </div>
    )
  }

  const label = "mb-1 block text-xs font-extrabold"
  return (
    <form onSubmit={submit} className="space-y-3">
      <h1 className="text-xl font-black">{mode === "login" ? "Sign in" : type === "enterprise" ? "Create the organisation administrator account" : "Create your account"}</h1>
      {notice && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{notice}</p>}
      {mode === "signup" && <label className="block"><span className={label}>Full name</span><input className="field" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" required /></label>}
      <label className="block"><span className={label}>Email</span><input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required /></label>
      <label className="block"><span className={label}>Password</span><input className="field" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? undefined : 10} required />
        {mode === "signup" && <span className="muted mt-1 block text-xs">At least 10 characters.</span>}</label>
      {mode === "signup" && type === "individual" && (
        <>
          <label className="block"><span className={label}>Do you work in healthcare?</span>
            <select className="field" value={f.background} onChange={(e) => set("background", e.target.value)} required><option value="">Choose…</option>{BACKGROUND.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select></label>
          {f.background && <label className="block"><span className={label}>What describes you best?</span>
            <select className="field" value={f.role} onChange={(e) => set("role", e.target.value)} required><option value="">Choose…</option>{rolesFor(f.background).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
            <span className="muted mt-1 block text-xs">For your profile only. It never changes what you can access.</span></label>}
        </>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : mode === "login" ? "Sign in" : "Create account"}</button>
      <div className="flex flex-wrap gap-4 text-sm"><button type="button" className="underline" onClick={() => { setType(null); onSwitch(mode === "login" ? "signup" : "login") }}>{mode === "login" ? "Create an account" : "I already have an account"}</button>{mode === "signup" && <button type="button" className="underline" onClick={() => setType(null)}>Back</button>}</div>
    </form>
  )
}
CLX_EOF_12
w 'components/auth-screen.tsx' <<'CLX_EOF_13'
"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MailCheck } from "lucide-react"
import { apiCall, accountsAvailable } from "@/lib/billing/api"
import { safeNextPath } from "@/lib/billing/guest"
import { useQuery } from "@/lib/billing/use-query"
import { AuthForm } from "./auth-form"

const SECONDS = 10

function CheckEmail({ email, loginHref }: { email: string; loginHref: string }) {
  const router = useRouter()
  const [left, setLeft] = useState(SECONDS)
  const [msg, setMsg] = useState("")
  useEffect(() => {
    if (left <= 0) { router.replace(loginHref); return }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left, loginHref, router])
  async function resend() { const r = await apiCall("/api/account/resend", { auth: false, body: { email } }); setMsg(r.ok ? "Sent again. It can take a minute to arrive." : r.error) }
  return (
    <div className="space-y-3 text-center" role="status">
      <MailCheck className="mx-auto text-[color:var(--blue)]" size={40} aria-hidden />
      <h1 className="text-xl font-black">Check your email</h1>
      <p className="muted text-sm leading-5">We sent a confirmation link to <span className="font-black text-[color:var(--ink)]">{email}</span>. Open it to confirm your account, then come back and sign in.</p>
      <p className="text-sm font-bold">Taking you to sign in in {left}s…</p>
      <button className="primary" onClick={() => router.replace(loginHref)}>Go to sign in now</button>
      <button className="pill w-full py-3" onClick={resend}>Resend email</button>
      {msg && <p className="muted text-xs">{msg}</p>}
      <p className="muted text-xs">Nothing there? Check your spam folder.</p>
    </div>
  )
}

/** /login and /register. After signing in, people go to where they were heading, otherwise Home (not the account page). */
export function AuthScreen({ mode: initial }: { mode: "login" | "signup" }) {
  const router = useRouter()
  const q = useQuery()
  const [mode, setMode] = useState(initial)
  const [pending, setPending] = useState<string | null>(null)
  if (!accountsAvailable()) return <div className="page"><p className="card p-4 text-sm">Accounts are not available in this build.</p></div>
  if (!q) return <div className="page" />
  const next = safeNextPath(q.get("next"))
  const done = () => router.replace(next ?? "/")
  const loginHref = `/login?registered=1${next ? `&next=${encodeURIComponent(next)}` : ""}`
  return (
    <div className="page space-y-4">
      {pending ? <CheckEmail email={pending} loginHref={loginHref} /> : (
        <>
          {q.get("registered") && mode === "login" && <p role="status" className="card p-3 text-sm font-semibold">Confirm your email using the link we sent, then sign in below.</p>}
          <AuthForm initialMode={mode} onDone={done} onNeedsConfirmation={setPending} onSwitch={setMode} />
        </>
      )}
    </div>
  )
}
CLX_EOF_13
w 'components/campaign-host.tsx' <<'CLX_EOF_14'
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
import type { Answers, Campaign, PublicCampaign } from "@/lib/campaigns/types"
import { CampaignForm, CampaignView } from "./campaign-view"

const KEY = "clinexia:campaigns:v1"
const SESSION_KEY = "clinexia:campaign-session"
const EXCLUDED = /^\/(login|register)(\/|$)/

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
  const list = useRef<PublicCampaign[] | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const loadedAt = useRef(Date.now())
  const card = useRef<HTMLDivElement | null>(null)

  const decide = useCallback(() => {
    if (!list.current || list.current.length === 0 || session.loading) return
    let shown = false
    try { shown = sessionStorage.getItem(SESSION_KEY) === "1" } catch { /* ignore */ }
    const stored = readAll()
    const full = list.current.map((c) => ({ ...c, title: "", status: "active" as const })) as Campaign[]
    const states = Object.fromEntries(full.map((c) => [c.id, normalizeState(stored[c.id], c.version)]))
    const pick = pickCampaign(full, states, { now: Date.now(), signedIn: session.signedIn, shownThisSession: shown })
    if (!pick) return
    try { sessionStorage.setItem(SESSION_KEY, "1") } catch { /* ignore */ }
    writeOne(pick.id, afterShown(states[pick.id], Date.now()))
    if (readPending().some((p) => p.id === pick.id)) unparkCampaign(pick.id)
    setFromMenu(false)
    setFormOpen(pick.kind === "form" && pick.presentation === "modal")
    setCampaign(list.current.find((c) => c.id === pick.id) ?? null)
  }, [session.loading, session.signedIn])

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
  }, [])

  useEffect(() => {
    if (EXCLUDED.test(pathname) || campaign || !loaded) return
    const wait = Math.max(0, 4000 - (Date.now() - loadedAt.current))
    const t = window.setTimeout(decide, wait + 300)
    return () => window.clearTimeout(t)
  }, [pathname, decide, campaign, loaded])

  useEffect(() => {
    const open = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      const item = readPending().find((p) => p.id === id)
      if (!item) return
      if (item.campaign.kind === "notice") unparkCampaign(item.id)
      setFromMenu(true); setFormOpen(item.campaign.kind === "form"); setCampaign(item.campaign)
    }
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [])

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
    if (!canFlyToAccount()) return close()
    parkCampaign(campaign, false) // saved now; the "!" lights up when the card lands
    const landed = flyToAccountIcon(card.current)
    close()
    void landed.then(() => { announcePending(); window.dispatchEvent(new Event(ARRIVED_EVENT)) })
  }
  const cta = () => { unparkCampaign(c.id); if (c.ctaUrl.startsWith("/")) router.push(c.ctaUrl); else void openExternal(c.ctaUrl); close() }
  const submit = async (answers: Answers): Promise<string | null> => {
    const r = await apiCall("/api/campaigns/respond", { auth: false, body: { campaignId: c.id, version: c.version, anonymousId: getAnonymousId(), platform: isNative() ? "android" : "mobile-web", website: "", answers } })
    if (r.ok) { writeOne(c.id, afterDone(state(), Date.now())); unparkCampaign(c.id); window.setTimeout(close, 2500); return null }
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
          {fromMenu && c.kind === "form" && <button type="button" className="muted text-xs underline" onClick={() => { unparkCampaign(c.id); close() }}>No thanks, remove this reminder</button>}
          {c.dismissible && <button type="button" className="pill w-full py-3" onClick={close}>Close</button>}
        </div>
      )}
    </Sheet>
  )
}
CLX_EOF_14
w 'components/campaign-view.tsx' <<'CLX_EOF_15'
"use client"
import { useState } from "react"
import { Loader2, Star, X } from "lucide-react"
import type { Answers, PublicCampaign, Question } from "@/lib/campaigns/types"

function Field({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: string | number | string[]) => void }) {
  const chip = (on: boolean) => `pill ${on ? "active" : ""}`
  if (q.type === "rating")
    return (
      <div className="flex gap-1" role="radiogroup" aria-label={q.label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => onChange(n)} className="p-1">
            <Star size={32} className={typeof value === "number" && n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
          </button>
        ))}
      </div>
    )
  if (q.type === "text") return <textarea rows={3} maxLength={1000} className="field" aria-label={q.label} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
  if (q.type === "yesno") return <div className="flex gap-2">{(["yes", "no"] as const).map((v) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={chip(value === v)}>{v === "yes" ? "Yes" : "No"}</button>)}</div>
  if (q.type === "choice") return <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={q.label}>{q.options?.map((o) => <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={chip(value === o)}>{o}</button>)}</div>
  const picked = Array.isArray(value) ? (value as string[]) : []
  return <div className="flex flex-wrap gap-2" role="group" aria-label={q.label}>{q.options?.map((o) => <button key={o} type="button" aria-pressed={picked.includes(o)} onClick={() => onChange(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o])} className={chip(picked.includes(o))}>{o}</button>)}</div>
}

export function CampaignForm({ campaign, onSubmit }: { campaign: PublicCampaign; onSubmit: (a: Answers) => Promise<string | null> }) {
  const [answers, setAnswers] = useState<Answers>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  async function send() {
    const missing = campaign.questions.find((q) => q.required && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0)))
    if (missing) return setError(`Please answer: ${missing.label}`)
    setBusy(true); setError("")
    const problem = await onSubmit(answers)
    setBusy(false)
    if (problem) setError(problem); else setSent(true)
  }
  if (sent) return <p role="status" className="py-4 text-center text-sm font-bold">Thank you. Your answer has been sent.</p>
  return (
    <div className="space-y-4">
      {campaign.questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-extrabold">{q.label}{q.required ? <span className="text-red-600"> *</span> : <span className="muted font-semibold"> (optional)</span>}</p>
          <Field q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        </div>
      ))}
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button className="primary" onClick={send} disabled={busy}>{busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Send"}</button>
    </div>
  )
}

export interface ViewProps {
  campaign: PublicCampaign
  variant: "modal" | "banner" | "toast"
  inlineForm: boolean
  onClose: () => void; onLater: () => void; onCta: () => void; onOpenForm: () => void
  onSubmit: (a: Answers) => Promise<string | null>
}

/** The content of a campaign. The caller decides where it sits (a sheet, a bar under the header, or a small alert above the tab bar). */
export function CampaignView({ campaign: c, variant, inlineForm, onClose, onLater, onCta, onOpenForm, onSubmit }: ViewProps) {
  const compact = variant !== "modal"
  const small = "pill px-3 py-2"
  return (
    <div className={compact ? "flex flex-wrap items-center gap-x-3 gap-y-2" : "space-y-3"}>
      <div className={compact ? "min-w-0 flex-1" : "space-y-1"}>
        <p className="text-sm font-black">{c.heading}</p>
        {c.body && <p className="muted whitespace-pre-line text-sm leading-5">{c.body}</p>}
      </div>
      {c.kind === "form" && inlineForm && <div className="w-full"><CampaignForm campaign={c} onSubmit={onSubmit} /></div>}
      <div className="flex flex-wrap items-center gap-2">
        {c.kind === "form" && !inlineForm && <button className={`${small} active`} onClick={onOpenForm}>Give feedback</button>}
        {c.ctaLabel && c.ctaUrl && <button className={`${small} ${c.kind === "form" ? "" : "active"}`} onClick={onCta}>{c.ctaLabel}</button>}
        {c.allowLater && <button className={small} onClick={onLater}>Remind me later</button>}
        {c.dismissible && (compact ? <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100" onClick={onClose} aria-label="Dismiss"><X size={16} /></button> : <button className={small} onClick={onClose}>Close</button>)}
      </div>
    </div>
  )
}
CLX_EOF_15
w 'components/guest-guard.tsx' <<'CLX_EOF_16'
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
 * While premium locking is on, a signed-out person gets GUEST_CALC_LIMIT calculations on this phone. After that the screen is
 * browse-only: links still work, anything else asks them to create an account.
 */
export function GuestGuard() {
  const s = useAccountSession()
  const pathname = usePathname() || "/"
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [note, setNote] = useState("")
  const open = useRef(false)
  const active = !s.loading && s.enabled && isGuestLimited({ enforced: s.enforced, signedIn: s.signedIn }, count) && !EXEMPT.test(pathname)

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
CLX_EOF_16
w 'components/organisation-screen.tsx' <<'CLX_EOF_17'
"use client"
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { confirmDialog } from "@/components/app-dialogs"
import { apiCall } from "@/lib/billing/api"
import { SPECIALTIES, SPECIALTY_LABELS, type Specialty } from "@/lib/billing/config"
import { useQuery } from "@/lib/billing/use-query"
import { PlanPicker } from "./plan-picker"

type Member = { userId: string; email: string; fullName: string; role: "owner" | "admin" | "staff"; allSpecialties: boolean; specialties: Specialty[] }
type Invite = { id: string; email: string; role: string; expiresAt: string }
type Dash = {
  org: { id: string; name: string; managedStatus: string; suspended: boolean }
  role: "owner" | "admin" | "staff"; subscriptionStatus: string
  plan: { plan: "specialty" | "all_access"; specialties: Specialty[]; currentPeriodEnd: string | null } | null
  members: Member[]; invitations: Invite[]; seats: { label: string }
}
const manages = (actor: Dash["role"], target: Member["role"]) => target !== "owner" && (actor === "owner" || (actor === "admin" && target === "staff"))

export function OrganisationScreen() {
  const router = useRouter()
  const q = useQuery()
  const orgId = q?.get("org") ?? ""
  const [d, setD] = useState<Dash | null | undefined>(undefined)
  const [error, setError] = useState("")
  const [links, setLinks] = useState<Array<{ email: string; link: string }>>([])
  const [skipped, setSkipped] = useState<Array<{ email: string; reason: string }>>([])
  const [invite, setInvite] = useState({ emails: "", role: "staff", all: true, specialties: [] as Specialty[] })
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState("")

  const load = useCallback(async () => {
    if (!orgId) return
    const r = await apiCall<Dash>(`/api/billing/org?orgId=${encodeURIComponent(orgId)}`)
    if (r.ok) setD(r.data); else { setD(null); setError(r.status === 401 ? "Please sign in first." : r.error) }
  }, [orgId])
  useEffect(() => { void load() }, [load])

  const act = async (body: Record<string, unknown>, ask?: Parameters<typeof confirmDialog>[0]) => {
    if (ask && !(await confirmDialog(ask))) return null
    setError("")
    const r = await apiCall<any>("/api/billing/org", { body: { orgId, ...body } })
    if (!r.ok) setError(r.error); else await load()
    return r
  }

  if (!q || d === undefined) return <div className="page flex justify-center py-16"><Loader2 className="animate-spin" aria-label="Loading" /></div>
  if (d === null) return <div className="page space-y-3"><p role="alert" className="text-sm font-semibold text-red-600">{error || "Organisation not found."}</p><Link className="underline text-sm" href="/account">Back to your account</Link></div>

  const isManager = d.role === "owner" || d.role === "admin"
  const assignable: Specialty[] = d.plan ? (d.plan.plan === "all_access" ? [...SPECIALTIES] : d.plan.specialties) : []
  const active = d.subscriptionStatus === "active" || d.subscriptionStatus === "grace"

  async function sendInvites(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const r = await act({ action: "invite", emails: invite.emails, role: invite.role, allSpecialties: invite.all, specialties: invite.specialties })
    setBusy(false)
    if (r?.ok) { setLinks(r.data.created); setSkipped(r.data.skipped); setInvite({ ...invite, emails: "" }) }
  }
  async function copy(link: string) { try { await navigator.clipboard.writeText(link); setCopied(link); window.setTimeout(() => setCopied(""), 2000) } catch { setCopied("") } }

  return (
    <div className="page space-y-6">
      <header>
        <Link href="/account" className="text-sm underline">← Your account</Link>
        <h1 className="mt-2 text-xl font-black">{d.org.name}</h1>
        <p className="muted text-sm">{d.seats.label} · Subscription: {d.subscriptionStatus}{d.plan?.currentPeriodEnd ? ` · paid until ${new Date(d.plan.currentPeriodEnd).toLocaleDateString()}` : ""}{d.org.suspended ? " · suspended" : ""}</p>
        {d.subscriptionStatus === "grace" && <p role="status" className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">Your subscription has ended. Access continues for a short grace period. Renew to keep it.</p>}
      </header>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

      <section className="space-y-2">
        <h2 className="font-black">{isManager ? "Members" : "Your access"}</h2>
        <ul className="card divide-y divide-[color:var(--line)]">
          {d.members.map((m) => (
            <li key={m.userId} className="space-y-1 p-3 text-sm">
              <div className="flex items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate font-bold">{m.fullName || m.email || "—"}</span><span className="muted block truncate text-xs">{m.email} · {m.role}</span></span></div>
              <p className="muted text-xs">{m.allSpecialties ? "Everything the plan covers" : m.specialties.map((x) => SPECIALTY_LABELS[x]).join(", ") || "None"}</p>
              {isManager && manages(d.role, m.role) && (
                <div className="flex gap-4 pt-1 text-xs font-bold">
                  <button className="underline" onClick={() => act({ action: "setSpecialties", userId: m.userId, allSpecialties: !m.allSpecialties, specialties: m.allSpecialties ? assignable.slice(0, 1) : [] })}>{m.allSpecialties ? "Limit access" : "Give full plan access"}</button>
                  <button className="text-red-600 underline" onClick={() => act({ action: "remove", userId: m.userId }, { title: `Remove ${m.fullName || m.email}?`, description: "They lose access straight away and their seat is freed.", confirmLabel: "Remove", destructive: true })}>Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {d.role !== "owner" && <button className="pill w-full py-3" onClick={async () => { const r = await act({ action: "leave" }, { title: "Leave this organisation?", description: "You will lose the access it gave you. An administrator can invite you again.", confirmLabel: "Leave", destructive: true }); if (r?.ok) router.push("/account") }}>Leave organisation</button>}
      </section>

      {isManager && (
        <section className="space-y-3">
          <h2 className="font-black">Invite staff</h2>
          {!active ? <p className="muted text-sm">Choose and pay for a plan below before inviting staff.</p> : (
            <form onSubmit={sendInvites} className="space-y-3">
              <label className="block"><span className="mb-1 block text-xs font-extrabold">Email addresses (one per line, or separated by commas)</span><textarea className="field min-h-24" value={invite.emails} onChange={(e) => setInvite({ ...invite, emails: e.target.value })} required /></label>
              {d.role === "owner" && <label className="block"><span className="mb-1 block text-xs font-extrabold">Role</span><select className="field" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={invite.all} onChange={(e) => setInvite({ ...invite, all: e.target.checked })} />Everything the organisation plan covers</label>
              {!invite.all && <div role="group" aria-label="Specialties" className="flex flex-wrap gap-2">{assignable.map((x) => <button key={x} type="button" aria-pressed={invite.specialties.includes(x)} onClick={() => setInvite({ ...invite, specialties: invite.specialties.includes(x) ? invite.specialties.filter((y) => y !== x) : [...invite.specialties, x] })} className={`pill ${invite.specialties.includes(x) ? "active" : ""}`}>{SPECIALTY_LABELS[x]}</button>)}</div>}
              <button className="primary" disabled={busy}>{busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Create invitations"}</button>
            </form>
          )}
          {links.length > 0 && (
            <div className="card space-y-2 p-3 text-sm">
              <p className="font-black">Send these private links (shown once; each works only for the invited email):</p>
              {links.map((l) => <div key={l.email} className="space-y-1"><span className="muted block text-xs">{l.email}</span><input readOnly className="field !py-2 text-xs" value={l.link} onFocus={(e) => e.currentTarget.select()} /><button type="button" className="pill" onClick={() => copy(l.link)}>{copied === l.link ? "Copied" : "Copy link"}</button></div>)}
            </div>
          )}
          {skipped.length > 0 && <ul className="muted text-sm">{skipped.map((x) => <li key={x.email}>{x.email}: {x.reason}</li>)}</ul>}
          {d.invitations.length > 0 && (
            <ul className="card divide-y divide-[color:var(--line)] text-sm">
              {d.invitations.map((i) => <li key={i.id} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 truncate">{i.email} <span className="muted text-xs">· {i.role} · expires {new Date(i.expiresAt).toLocaleDateString()}</span></span><button className="font-bold underline" onClick={() => act({ action: "revoke", inviteId: i.id })}>Revoke</button></li>)}
            </ul>
          )}
        </section>
      )}

      {d.role === "owner" && (
        <section className="space-y-3">
          <h2 className="font-black">Plan and billing</h2>
          <PlanPicker kind="enterprise" orgId={orgId} minSeats={Math.max(1, d.members.length + d.invitations.length)} onPaid={() => void load()} />
          <div className="card space-y-2 p-3 text-sm">
            <p className="font-black">Centrally managed organisations</p>
            <p className="muted text-xs leading-5">If your organisation manages staff centrally (for example with Microsoft Entra ID), you can ask Clinexia to review it for a discount. It applies only after Clinexia verifies it. Single sign-in is not available yet.</p>
            {d.org.managedStatus === "none" || d.org.managedStatus === "rejected" ? <button className="pill w-full py-3" onClick={() => act({ action: "requestManaged" })}>Request verification</button> : <p className="text-sm">Status: {d.org.managedStatus}</p>}
          </div>
          {active && <button className="muted text-sm underline" onClick={async () => { if (await confirmDialog({ title: "Stop the organisation plan?", description: "Everyone keeps access until the end of the paid month. It will not renew.", confirmLabel: "Stop plan", destructive: true })) { await apiCall("/api/billing/cancel", { body: { orgId } }); void load() } }}>Cancel at the end of the paid period</button>}
        </section>
      )}
    </div>
  )
}
CLX_EOF_17
w 'components/plan-picker.tsx' <<'CLX_EOF_18'
"use client"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { apiCall } from "@/lib/billing/api"
import { SPECIALTIES, SPECIALTY_LABELS, formatMoney, type Quote, type Specialty } from "@/lib/billing/config"
import { checkPendingPayment, pendingPayment, rememberPendingPayment, type PaymentCheck } from "@/lib/billing/payments"
import { notifySessionChanged } from "@/lib/billing/session"
import { openExternal } from "@/lib/native"

type Plan = "specialty" | "all_access"

/** Shows the exact server-computed price for the choice, then opens Paystack in the phone's browser. Prices are never worked out here. */
export function PlanPicker({ kind, orgId, minSeats = 1, onPaid }: { kind: "individual" | "enterprise"; orgId?: string; minSeats?: number; onPaid?: () => void }) {
  const [plan, setPlan] = useState<Plan>("specialty")
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [seats, setSeats] = useState(Math.max(1, minSeats))
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState("")
  const [paying, setPaying] = useState(false)
  const [waiting, setWaiting] = useState<boolean>(false)
  const [status, setStatus] = useState<PaymentCheck | "">("")

  useEffect(() => { setWaiting(pendingPayment() !== null) }, [])

  useEffect(() => {
    if (plan === "specialty" && specialties.length === 0) { setQuote(null); setError(""); return }
    let cancelled = false
    const t = window.setTimeout(async () => {
      const r = await apiCall<{ quote: Quote }>("/api/billing/quote", { body: { kind, plan, specialties, seats, orgId } })
      if (cancelled) return
      if (r.ok) { setQuote(r.data.quote); setError("") } else { setQuote(null); setError(r.error) }
    }, 250)
    return () => { cancelled = true; window.clearTimeout(t) }
  }, [kind, plan, specialties, seats, orgId])

  const toggle = (s: Specialty) => setSpecialties((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))

  async function pay() {
    setPaying(true); setError("")
    const r = await apiCall<{ authorizationUrl: string; reference: string }>("/api/billing/checkout", { body: { kind, plan, specialties, seats, orgId } })
    setPaying(false)
    if (!r.ok) return setError(r.error)
    rememberPendingPayment(r.data.reference)
    setWaiting(true); setStatus("")
    await openExternal(r.data.authorizationUrl) // Paystack opens in the phone's browser; coming back to the app confirms the payment
  }

  async function checkNow() {
    setStatus("pending")
    const result = await checkPendingPayment()
    setStatus(result)
    if (result === "paid") { setWaiting(false); notifySessionChanged(); onPaid?.() }
    if (result === "failed") setWaiting(false)
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Plan" className="grid gap-2 sm:grid-cols-2">
        {([["specialty", "Specialty premium", "Pick the specialties you need."], ["all_access", "All-access premium", "Every premium specialty."]] as const).map(([value, title, hint]) => (
          <button key={value} type="button" role="radio" aria-checked={plan === value} onClick={() => setPlan(value)} className={`card p-3 text-left ${plan === value ? "!border-[color:var(--blue)]" : ""}`}>
            <span className="block text-sm font-black">{title}</span><span className="muted block text-xs">{hint}</span>
          </button>
        ))}
      </div>
      {plan === "specialty" && (
        <div role="group" aria-label="Specialties" className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => <button key={s} type="button" aria-pressed={specialties.includes(s)} onClick={() => toggle(s)} className={`pill ${specialties.includes(s) ? "active" : ""}`}>{SPECIALTY_LABELS[s]}</button>)}
        </div>
      )}
      {kind === "enterprise" && (
        <label className="block text-sm"><span className="mb-1 block text-xs font-extrabold">Seats (one per staff member)</span>
          <input type="number" inputMode="numeric" min={minSeats} step={1} className="field !w-32" value={seats} onChange={(e) => setSeats(Math.max(minSeats, Math.floor(Number(e.target.value) || 1)))} /></label>
      )}
      <div className="card p-3 text-sm" aria-live="polite">
        {!quote && !error && <p className="muted">{plan === "specialty" ? "Choose at least one specialty to see the price." : "Calculating…"}</p>}
        {error && <p className="font-semibold text-red-600">{error}</p>}
        {quote && (
          <div className="space-y-1.5">
            {quote.lines.map((l) => <div key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span className="font-bold">{formatMoney(l.amountMinor, quote.currency)}</span></div>)}
            {quote.discount.applied && <div className="flex justify-between gap-3 text-emerald-700"><span>Managed organisation discount ({quote.discount.bps / 100}%)</span><span className="font-bold">−{formatMoney(quote.discount.amountMinor, quote.currency)}</span></div>}
            <div className="flex justify-between gap-3 border-t border-[color:var(--line)] pt-2 text-base font-black"><span>Total per month ({quote.currency})</span><span>{formatMoney(quote.totalMinor, quote.currency)}</span></div>
            {kind === "enterprise" && <p className="muted text-xs">Prices are per seat for {quote.seats} seat{quote.seats === 1 ? "" : "s"}. {quote.discount.reason}</p>}
            {quote.allAccessIsCheaper && <p className="muted text-xs">All-access costs the same or less than this selection.</p>}
          </div>
        )}
      </div>
      <p className="muted text-xs leading-5">Each payment covers one month and does not renew by itself. Changing to a different plan starts a new month from today; unused time on the old plan is not credited.</p>
      <button className="primary" onClick={pay} disabled={!quote || paying}>{paying ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Continue to payment"}</button>
      {waiting && (
        <div className="card space-y-2 p-3 text-sm" role="status">
          <p className="font-bold">Waiting for your payment</p>
          <p className="muted text-xs leading-5">Finish paying in your browser, then come back to Clinexia. We confirm it automatically, or tap the button.</p>
          <button className="pill w-full py-3" onClick={checkNow} disabled={status === "pending"}>{status === "pending" ? "Checking…" : "I have paid, check now"}</button>
          {status === "paid" && <p className="font-bold text-emerald-700">Payment confirmed. Your plan is active.</p>}
          {status === "failed" && <p className="font-semibold text-red-600">We could not confirm this payment. If money left your account, contact support with your Paystack receipt.</p>}
          {status === "error" && <p className="muted text-xs">Could not check right now. Try again in a moment.</p>}
          {status === "none" && <p className="muted text-xs">There is no payment waiting.</p>}
        </div>
      )}
    </div>
  )
}
CLX_EOF_18
w 'components/premium-gate.tsx' <<'CLX_EOF_19'
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Lock } from "lucide-react"
import type { CalculatorGroup } from "@/lib/calculators/types"
import { accessVerdict } from "@/lib/billing/access"
import { CATEGORY_SPECIALTY, SPECIALTY_LABELS } from "@/lib/billing/config"
import { useAccountSession } from "@/lib/billing/session"

/**
 * Wraps a tool. When premium locking is on and this person's plan does not include the tool's specialty, shows an upgrade screen
 * instead. The decision uses what the phone last learned from the server, so it works offline and without a flash.
 */
export function PremiumGate({ id = "", category, children }: { id?: string; category: CalculatorGroup; children: React.ReactNode }) {
  const s = useAccountSession()
  const here = encodeURIComponent(usePathname() || "/")
  if (!s.enabled || accessVerdict({ id, category }, s) !== "locked") return <>{children}</>
  const label = SPECIALTY_LABELS[CATEGORY_SPECIALTY[category]]
  return (
    <div className="page">
      <div className="card mx-auto max-w-md space-y-3 p-6 text-center" role="region" aria-label="Premium feature">
        <Lock className="mx-auto text-slate-400" size={32} aria-hidden />
        <h1 className="text-lg font-black">Premium: {label}</h1>
        <p className="muted text-sm leading-5">{s.signedIn ? "Your current plan does not include this specialty. Choose a plan to unlock it." : "Sign in to use this tool, or create an account and choose a plan that includes it."}</p>
        <div className="flex flex-col gap-2 pt-1">
          {s.signedIn ? <Link href="/account" className="primary text-center">See plans</Link> : <>
            <Link href={`/login?next=${here}`} className="primary text-center">Sign in</Link>
            <Link href={`/register?next=${here}`} className="pill py-3 text-center">Create account</Link>
          </>}
        </div>
        <Link href="/calculators" className="muted block text-xs underline">Browse free calculators</Link>
      </div>
    </div>
  )
}
CLX_EOF_19
w 'docs/ACCOUNTS.md' <<'CLX_EOF_20'
# Accounts, plans, campaigns (mobile)

This app has no server of its own. Accounts, plans, payments, campaigns and feedback all live on the **Clinexia website's backend**
(the repo with the admin screens), so everything is shared: someone who signs up here shows up in the website's admin (Accounts management,
marked "Android app"), a plan the admin sets appears here, and campaigns the admin creates are shown here.

## Needed to work
1. The web repo must have the matching update (accounts + mobile access) applied and its SQL run.
2. This app must know the website's address: build with `NEXT_PUBLIC_ANALYTICS_URL=https://www.clinexia.app` (the same variable analytics already use).
   Without it the profile icon and account screens stay hidden and nothing changes.
3. Premium locking is switched on or off **on the website** (`BILLING_ENFORCE_PREMIUM`). The app follows it. While it is off nothing is locked,
   no guest limit applies and no Free/Premium badges show.

## What is in the app
- Profile icon in the header: signed out = Sign in / Create account; signed in = My account / Sign out. A red "!" shows when a review form is parked.
- `/register` -> "Check your email" (10 seconds) -> `/login` -> Home (or the page they were heading to). `/account` opens from the menu or from a locked tool.
- Plans: pick specialties or all-access; the price is computed by the server (Nigeria in ₦, elsewhere in $, set by the admin). Payment opens Paystack in the
  phone's browser; coming back to the app confirms it automatically ("I have paid, check now" also works).
- Organisations: create one, invite staff (private links you copy and send), assign specialties, seats, cancel.
- Premium lock on specialty tools; Free / Premium badges on tool lists and tool pages. The decision uses what the phone last learned from the server,
  so it works offline and without a flash.
- Guests: 3 calculations per phone, then browse-only (links work; anything else asks them to create an account). Clearing the app's data resets it.
- Campaigns (admin > Campaigns on the website): notices and review forms as a sheet, a bar under the header or a small alert. "Remind me later" shrinks the
  card into the profile icon; the menu then offers "Complete feedback form".
- Feedback reminders: people who answered are not asked again (the server remembers per device and round); "Later" returns after the wait; a new round re-opens it.
- Themed confirm / prompt dialogs (`components/app-dialogs.tsx`) instead of the browser's.

## How the app signs in
`POST /api/account/login` returns the tokens (no cookies); the app stores them on the phone and sends `Authorization: Bearer <token>`; `/api/account/refresh` renews them.
Inside the Android app, requests use the phone's own network client (no browser rules). On the mobile website the website's server allows this site's address
(`https://clinexia-mobile.vercel.app`; others via `MOBILE_ALLOWED_ORIGINS` on the web repo).

## Limits
- The lock is a front-end lock: calculations still run on the phone.
- Email confirmation links open the website (set Supabase's Site URL / Redirect URLs as described in the web repo's docs/billing.md); after confirming, come back and sign in.
- Organisation invitation emails are not sent; copy the links from the organisation screen.
CLX_EOF_20
w 'lib/billing/access.ts' <<'CLX_EOF_21'
import type { CalculatorGroup } from "@/lib/calculators/types"
import { CATEGORY_SPECIALTY, FREE_CALCULATOR_IDS, FREE_CATEGORIES, PREMIUM_CALCULATOR_IDS, SPECIALTIES, type Specialty } from "./config"

/** What this phone last learned from the Clinexia server. Kept on the device so locking works offline and without a flash. */
export interface AccessSnapshot {
  enforced: boolean
  signedIn: boolean
  entitlements?: { all: boolean; specialties: Specialty[] }
}

export function isPremiumCalculator(calc: { id: string; category: CalculatorGroup }): boolean {
  if (FREE_CALCULATOR_IDS.has(calc.id)) return false
  if (PREMIUM_CALCULATOR_IDS.has(calc.id)) return true
  return !FREE_CATEGORIES.has(calc.category)
}

export const specialtyOf = (category: CalculatorGroup): Specialty => CATEGORY_SPECIALTY[category]

export const hasSpecialty = (e: NonNullable<AccessSnapshot["entitlements"]>, s: Specialty) => e.all || e.specialties.includes(s)

export type Verdict = "free" | "allowed" | "locked"

/**
 * - Locking off, or a free tool: free.
 * - Premium tool: allowed only when signed in with that specialty. If we do not know the person's plan yet (no answer from the
 *   server), we do not lock them out.
 */
export function accessVerdict(calc: { id: string; category: CalculatorGroup }, snap: AccessSnapshot): Verdict {
  if (!snap.enforced || !isPremiumCalculator(calc)) return "free"
  if (!snap.signedIn) return "locked"
  if (!snap.entitlements) return "allowed"
  return hasSpecialty(snap.entitlements, specialtyOf(calc.category)) ? "allowed" : "locked"
}

export const knownSpecialty = (s: string): s is Specialty => (SPECIALTIES as readonly string[]).includes(s)
CLX_EOF_21
w 'lib/billing/accounts.test.ts' <<'CLX_EOF_22'
import { describe, expect, it } from "vitest"
import { accessVerdict, isPremiumCalculator } from "./access"
import { CATEGORY_SPECIALTY, SPECIALTIES, formatMoney } from "./config"
import { GUEST_CALC_LIMIT, isGuestLimited, noteGuestCalculation, readGuestCount, safeNextPath, writeSessionState } from "./guest"
import { interpretApi } from "./interpret"
import { parseTokens, toTokens } from "./tokens"

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe("which tools are free and which are premium", () => {
  it("every category maps to a known specialty", () => { for (const s of Object.values(CATEGORY_SPECIALTY)) expect(SPECIALTIES as readonly string[]).toContain(s) })
  it("general is free, specialty tools are premium", () => {
    expect(isPremiumCalculator({ id: "bmi", category: "general" })).toBe(false)
    expect(isPremiumCalculator({ id: "egfr", category: "renal" })).toBe(true)
  })
  it("nothing is locked while the server has locking off", () => {
    expect(accessVerdict({ id: "egfr", category: "renal" }, { enforced: false, signedIn: false })).toBe("free")
  })
  it("premium tools need sign-in and the matching specialty", () => {
    const calc = { id: "egfr", category: "renal" as const }
    expect(accessVerdict(calc, { enforced: true, signedIn: false })).toBe("locked")
    expect(accessVerdict(calc, { enforced: true, signedIn: true, entitlements: { all: false, specialties: ["laboratory"] } })).toBe("locked")
    expect(accessVerdict(calc, { enforced: true, signedIn: true, entitlements: { all: false, specialties: ["renal"] } })).toBe("allowed")
    expect(accessVerdict(calc, { enforced: true, signedIn: true, entitlements: { all: true, specialties: [...SPECIALTIES] } })).toBe("allowed")
  })
  it("does not lock someone out when their plan is not known yet", () => {
    expect(accessVerdict({ id: "egfr", category: "renal" }, { enforced: true, signedIn: true })).toBe("allowed")
  })
  it("free tools stay free for everyone", () => {
    expect(accessVerdict({ id: "bmi", category: "general" }, { enforced: true, signedIn: false })).toBe("free")
  })
})

describe("guest allowance (3 calculations on this phone)", () => {
  it("counts only guests while locking is on", () => {
    const s = memory()
    expect(noteGuestCalculation(s).counted).toBe(false)
    writeSessionState(s, { enforced: true, signedIn: true })
    noteGuestCalculation(s); expect(readGuestCount(s)).toBe(0)
    writeSessionState(s, { enforced: false, signedIn: false })
    noteGuestCalculation(s); expect(readGuestCount(s)).toBe(0)
  })
  it("a guest gets exactly three, then is limited", () => {
    const s = memory(); writeSessionState(s, { enforced: true, signedIn: false })
    expect(noteGuestCalculation(s)).toMatchObject({ counted: true, count: 1, remaining: 2, limited: false })
    expect(noteGuestCalculation(s)).toMatchObject({ count: 2, remaining: 1 })
    expect(noteGuestCalculation(s)).toMatchObject({ count: 3, remaining: 0, limited: true })
    expect(noteGuestCalculation(s)).toMatchObject({ counted: false, limited: true })
    expect(GUEST_CALC_LIMIT).toBe(3)
  })
  it("limited needs a guest, locking on, and the count reached", () => {
    expect(isGuestLimited({ enforced: true, signedIn: false }, 3)).toBe(true)
    expect(isGuestLimited({ enforced: true, signedIn: true }, 3)).toBe(false)
    expect(isGuestLimited({ enforced: false, signedIn: false }, 3)).toBe(false)
    expect(isGuestLimited(null, 3)).toBe(false)
  })
  it("survives broken storage and tampering", () => {
    expect(noteGuestCalculation({ getItem: () => { throw new Error("x") }, setItem: () => { throw new Error("x") } } as any).counted).toBe(false)
    const s = memory(); s.setItem("clinexia:guest-calcs", "999"); expect(readGuestCount(s)).toBe(3)
  })
})

describe("after signing in", () => {
  it("returns to a path inside the app, otherwise Home", () => {
    expect(safeNextPath("/calculators/renal/egfr")).toBe("/calculators/renal/egfr")
    for (const bad of ["https://evil.com", "//evil.com", "/login", "/register?x=1", "", undefined]) expect(safeNextPath(bad)).toBeNull()
  })
})

describe("talking to the server", () => {
  it("reads the server's own message", () => {
    expect(interpretApi({ status: 401, data: { error: "Email or password is incorrect." } })).toEqual({ ok: false, status: 401, error: "Email or password is incorrect." })
    expect(interpretApi({ status: 503, data: { error: "Could not sign you in right now.", hint: "Run the SQL" } })).toMatchObject({ ok: false, error: "Could not sign you in right now. (Run the SQL)" })
  })
  it("says offline when there is no reply, and gives plain messages otherwise", () => {
    expect(interpretApi(null)).toMatchObject({ ok: false, status: 0 })
    expect(interpretApi({ status: 429, data: null })).toMatchObject({ error: "Too many attempts. Please try again later." })
    expect(interpretApi({ status: 500, data: "<html>" })).toMatchObject({ ok: false })
  })
  it("passes success data through", () => { expect(interpretApi({ status: 200, data: { a: 1 } })).toEqual({ ok: true, data: { a: 1 } }) })
})

describe("the sign-in kept on the phone", () => {
  it("round-trips and rejects junk", () => {
    const t = toTokens({ access_token: "a", refresh_token: "r", expires_in: 100 }, 1000)
    expect(t).toEqual({ access: "a", refresh: "r", expiresAt: 101_000 })
    expect(parseTokens(JSON.stringify(t))).toEqual(t)
    expect(parseTokens("junk")).toBeNull(); expect(parseTokens(null)).toBeNull(); expect(parseTokens('{"access":1}')).toBeNull()
  })
})

describe("money", () => { it("formats naira and dollars", () => { expect(formatMoney(250_000, "NGN")).toBe("₦2,500"); expect(formatMoney(650, "USD")).toBe("$6.50") }) })
CLX_EOF_22
w 'lib/billing/api.ts' <<'CLX_EOF_23'
// Talks to the Clinexia website's server (accounts, plans, campaigns). Inside the Android app it uses the phone's own network client
// (no browser rules); on the mobile website it uses fetch (the server allows this site's address). Signs requests with the stored
// token and renews it automatically.
import { CapacitorHttp } from "@capacitor/core"
import { ANALYTICS_BASE_URL } from "@/lib/analytics/config"
import { isNative } from "@/lib/native"
import { clearTokens, getTokens, setAuthNotice, setTokens } from "./tokens"

export const API_BASE = ANALYTICS_BASE_URL
/** Accounts need the website's address, set at build time with NEXT_PUBLIC_ANALYTICS_URL (the same one analytics use). */
export const accountsAvailable = () => API_BASE.length > 0

import { interpretApi, type ApiResult } from "./interpret"
export type { ApiResult }
type Raw = { status: number; data: unknown } | null

const parse = (d: unknown): unknown => { if (typeof d !== "string") return d; try { return JSON.parse(d) } catch { return null } }

async function send(method: "GET" | "POST", path: string, body: unknown, token?: string): Promise<Raw> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Clinexia-Client": isNative() ? "android" : "mobile-web" }
  if (token) headers.Authorization = `Bearer ${token}`
  const url = `${API_BASE}${path}`
  try {
    if (isNative()) {
      const r = await CapacitorHttp.request({ url, method, headers, data: method === "POST" ? body ?? {} : undefined, connectTimeout: 10000, readTimeout: 20000 })
      return { status: r.status, data: parse(r.data) }
    }
    const r = await fetch(url, { method, headers, body: method === "POST" ? JSON.stringify(body ?? {}) : undefined, cache: "no-store" })
    return { status: r.status, data: await r.json().catch(() => null) }
  } catch { return null }
}

let refreshing: Promise<boolean> | null = null
/** Trades the refresh token for a new access token. If the server says the sign-in is over, this phone signs out. */
function refresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const t = getTokens()
    if (!t) return false
    const res = await send("POST", "/api/account/refresh", { refresh_token: t.refresh })
    if (res && res.status === 200 && res.data && typeof res.data === "object" && (res.data as { session?: unknown }).session) {
      setTokens((res.data as { session: { access_token: string; refresh_token: string; expires_in?: number } }).session)
      return true
    }
    if (res && (res.status === 401 || res.status === 403)) {
      const msg = res.data && typeof res.data === "object" ? (res.data as { error?: unknown }).error : null
      if (res.status === 403 && typeof msg === "string") setAuthNotice(msg) // e.g. the account was suspended
      clearTokens()
      if (typeof window !== "undefined") window.dispatchEvent(new Event("clinexia:session-changed"))
    }
    return false
  })().finally(() => { refreshing = null })
  return refreshing
}

export async function apiCall<T = unknown>(path: string, opts: { body?: unknown; auth?: boolean } = {}): Promise<ApiResult<T>> {
  if (!accountsAvailable()) return { ok: false, status: 0, error: "Accounts are not available in this build." }
  const method = opts.body === undefined ? "GET" : "POST"
  let t = opts.auth === false ? null : getTokens()
  if (t && t.expiresAt - Date.now() < 60_000) { await refresh(); t = getTokens() }
  let res = await send(method, path, opts.body, t?.access)
  if (res?.status === 401 && t && (await refresh())) res = await send(method, path, opts.body, getTokens()?.access)
  return interpretApi<T>(res)
}
CLX_EOF_23
w 'lib/billing/config.ts' <<'CLX_EOF_24'
// Plans and access rules shared with the Clinexia website (the website's server is the source of truth for prices and entitlements;
// this app only needs the names, the category-to-specialty map and the free/premium designation to label and lock tools).
import type { CalculatorGroup } from "@/lib/calculators/types"

export const SPECIALTIES = ["laboratory", "pharmacy", "nursing", "renal", "cardiology", "oncology", "general-medicine"] as const
export type Specialty = (typeof SPECIALTIES)[number]

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  laboratory: "Laboratory medicine", pharmacy: "Pharmacy", nursing: "Nursing", renal: "Renal / nephrology", cardiology: "Cardiology", oncology: "Oncology & transplant", "general-medicine": "General medicine",
}

/** Typed over CalculatorGroup so a new category cannot be added without deciding which specialty it belongs to. */
export const CATEGORY_SPECIALTY: Record<CalculatorGroup, Specialty> = {
  general: "general-medicine", renal: "renal", chemistry: "laboratory", hematology: "laboratory", microbiology: "laboratory", "lab-solutions": "laboratory",
  spectrophotometry: "laboratory", dosing: "pharmacy", oncology: "oncology", "stem-cell-transplant": "oncology", cardiovascular: "cardiology",
}

/** Same default as the website: "general" is free, every other category is premium once premium locking is switched on. */
export const FREE_CATEGORIES: ReadonlySet<CalculatorGroup> = new Set<CalculatorGroup>(["general"])
export const FREE_CALCULATOR_IDS: ReadonlySet<string> = new Set<string>()
export const PREMIUM_CALCULATOR_IDS: ReadonlySet<string> = new Set<string>()

export const ORGANISATION_TYPES = [
  { value: "laboratory", label: "Laboratory" }, { value: "hospital", label: "Hospital" }, { value: "pharmacy", label: "Pharmacy" },
  { value: "clinic", label: "Clinic / health centre" }, { value: "university", label: "University / school" }, { value: "other_healthcare", label: "Other healthcare organisation" },
] as const

export type Currency = "NGN" | "USD"
export function formatMoney(minor: number, currency: Currency): string {
  const major = (minor / 100).toLocaleString(currency === "USD" ? "en-US" : "en-NG", { minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 })
  return `${currency === "USD" ? "$" : "₦"}${major}`
}

export interface Quote {
  currency: Currency; market: "ng" | "intl"; kind: "individual" | "enterprise"; plan: "specialty" | "all_access"; specialties: Specialty[]; seats: number
  lines: Array<{ label: string; amountMinor: number }>; subtotalMinor: number
  discount: { applied: boolean; bps: number; amountMinor: number; reason: string }; totalMinor: number; allAccessIsCheaper: boolean
}
CLX_EOF_24
w 'lib/billing/guest.ts' <<'CLX_EOF_25'
// Guest allowance: a person who is not signed in gets GUEST_CALC_LIMIT calculations on this phone. Only active while the Clinexia
// server says premium locking is on. A front-end limit: clearing the app's data resets it.
export const GUEST_CALC_LIMIT = 3
export const GUEST_KEY = "clinexia:guest-calcs"
export const SESSION_STATE_KEY = "clinexia:session-state"

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface SessionState { enforced: boolean; signedIn: boolean }

export function readSessionState(s: StorageLike): SessionState | null {
  try {
    const raw = s.getItem(SESSION_STATE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw)
    return typeof j?.enforced === "boolean" && typeof j?.signedIn === "boolean" ? { enforced: j.enforced, signedIn: j.signedIn } : null
  } catch { return null }
}
export function writeSessionState(s: StorageLike, state: SessionState): void {
  try { s.setItem(SESSION_STATE_KEY, JSON.stringify(state)) } catch { /* storage unavailable */ }
}
export function readGuestCount(s: StorageLike): number {
  try {
    const n = Number.parseInt(s.getItem(GUEST_KEY) ?? "0", 10)
    return Number.isFinite(n) && n > 0 ? Math.min(n, GUEST_CALC_LIMIT) : 0
  } catch { return 0 }
}
export const isGuestLimited = (state: SessionState | null, count: number) => Boolean(state && state.enforced && !state.signedIn && count >= GUEST_CALC_LIMIT)

export interface GuestTally { counted: boolean; count: number; limit: number; remaining: number; limited: boolean }

export function noteGuestCalculation(s: StorageLike): GuestTally {
  const state = readSessionState(s)
  const count = readGuestCount(s)
  const base = { limit: GUEST_CALC_LIMIT, count, remaining: Math.max(0, GUEST_CALC_LIMIT - count), limited: isGuestLimited(state, count) }
  if (!state || !state.enforced || state.signedIn || count >= GUEST_CALC_LIMIT) return { ...base, counted: false }
  const next = count + 1
  try { s.setItem(GUEST_KEY, String(next)) } catch { return { ...base, counted: false } }
  return { counted: true, count: next, limit: GUEST_CALC_LIMIT, remaining: GUEST_CALC_LIMIT - next, limited: next >= GUEST_CALC_LIMIT }
}

/** Where to go after signing in: a path inside the app, otherwise Home. */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const p = raw.trim()
  if (p.length === 0 || p.length > 300 || !p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\") || /[\r\n]/.test(p)) return null
  if (/^\/(login|register)(\/|\?|$)/.test(p)) return null
  return p
}

/** Call once per finished calculation. Never throws. */
export function countGuestCalculation(): void {
  try {
    const tally = noteGuestCalculation(window.localStorage)
    if (tally.counted) window.dispatchEvent(new CustomEvent("clinexia:guest-calc", { detail: tally }))
  } catch { /* must never break calculating */ }
}
CLX_EOF_25
w 'lib/billing/interpret.ts' <<'CLX_EOF_26'
// Turns the Clinexia server's reply into something a person can read. Pure, so it is tested.
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }
type Raw = { status: number; data: unknown } | null

export function interpretApi<T>(res: Raw): ApiResult<T> {
  if (!res) return { ok: false, status: 0, error: "You appear to be offline. Please check your connection and try again." }
  if (res.status >= 200 && res.status < 300) return { ok: true, data: res.data as T }
  const d = res.data && typeof res.data === "object" ? (res.data as { error?: unknown; hint?: unknown }) : {}
  const message = typeof d.error === "string" ? d.error : res.status === 429 ? "Too many attempts. Please try again later." : res.status >= 500 ? "Something went wrong on our side. Please try again." : "Something went wrong. Please try again."
  return { ok: false, status: res.status, error: message + (typeof d.hint === "string" ? ` (${d.hint})` : "") }
}

CLX_EOF_26
w 'lib/billing/payments.ts' <<'CLX_EOF_27'
// A plan is paid for in the phone's browser (Paystack). When the person comes back to the app, this asks the server whether the
// payment went through; the server only switches the plan on after Paystack confirms it.
import { apiCall } from "./api"

const KEY = "clinexia:pending-payment:v1"
const MAX_AGE_MS = 24 * 3600 * 1000

export function rememberPendingPayment(reference: string) { try { localStorage.setItem(KEY, JSON.stringify({ reference, at: Date.now() })) } catch { /* ignore */ } }
export function pendingPayment(): { reference: string; at: number } | null {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? "null")
    return j && typeof j.reference === "string" && typeof j.at === "number" && Date.now() - j.at < MAX_AGE_MS ? j : null
  } catch { return null }
}
export const clearPendingPayment = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }

export type PaymentCheck = "none" | "paid" | "pending" | "failed" | "error"
export async function checkPendingPayment(): Promise<PaymentCheck> {
  const p = pendingPayment()
  if (!p) return "none"
  const r = await apiCall<{ status: "paid" | "pending" | "failed" }>("/api/billing/verify", { body: { reference: p.reference } })
  if (!r.ok) return r.status === 404 ? (clearPendingPayment(), "failed") : "error"
  if (r.data.status === "paid" || r.data.status === "failed") clearPendingPayment()
  return r.data.status
}
CLX_EOF_27
w 'lib/billing/session.ts' <<'CLX_EOF_28'
"use client"

// One shared, cached answer to "is someone signed in, and what is switched on?" for the header icon, free/premium badges, locking and
// the guest allowance. The last answer is kept on the phone, so locking works offline and without a flash.
import { useEffect, useSyncExternalStore } from "react"
import { listenAppActive } from "@/lib/native"
import type { AccessSnapshot } from "./access"
import { accountsAvailable, apiCall } from "./api"
import { writeSessionState } from "./guest"
import { checkPendingPayment } from "./payments"
import { clearTokens, hasTokens } from "./tokens"

export interface AccountSession extends AccessSnapshot { loading: boolean; enabled: boolean; email?: string }

const SNAP_KEY = "clinexia:session-snapshot:v1"
const LOADING: AccountSession = { loading: true, enabled: false, enforced: false, signedIn: false }
let snapshot: AccountSession = LOADING
let started = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function persist(s: AccountSession) {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({ enforced: s.enforced, signedIn: s.signedIn, email: s.email, entitlements: s.entitlements }))
    writeSessionState(localStorage, { enforced: s.enforced, signedIn: s.signedIn })
  } catch { /* storage unavailable */ }
}

function restore(): AccountSession | null {
  try {
    const j = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "null")
    if (!j || typeof j.enforced !== "boolean") return null
    return { loading: true, enabled: true, enforced: j.enforced, signedIn: j.signedIn === true && hasTokens(), email: j.email, entitlements: j.entitlements }
  } catch { return null }
}

export async function refreshAccountSession(): Promise<void> {
  if (!accountsAvailable()) { snapshot = { loading: false, enabled: false, enforced: false, signedIn: false }; emit(); return }
  const res = await apiCall<{ enabled?: boolean; enforced?: boolean; signedIn?: boolean; email?: string; entitlements?: AccessSnapshot["entitlements"] }>("/api/account/session")
  if (res.ok) {
    const d = res.data
    if (d.signedIn !== true && hasTokens()) clearTokens() // the server no longer accepts this sign-in (ended or suspended)
    snapshot = { loading: false, enabled: d.enabled === true, enforced: d.enforced === true, signedIn: d.signedIn === true && hasTokens(), email: d.email, entitlements: d.entitlements }
    persist(snapshot)
  } else {
    snapshot = { ...snapshot, loading: false, enabled: snapshot.enabled || snapshot.loading === false } // offline: keep the last known answer
  }
  emit()
}

export const notifySessionChanged = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("clinexia:session-changed")) }

export function useAccountSession(): AccountSession {
  const value = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => snapshot,
    () => LOADING,
  )
  useEffect(() => {
    if (started) return
    started = true
    const last = restore()
    if (last) { snapshot = last; emit() }
    void refreshAccountSession()
    let at = Date.now()
    const again = () => {
      if (document.visibilityState !== "visible" || Date.now() - at < 3000) return
      at = Date.now()
      void checkPendingPayment().then(() => refreshAccountSession())
    }
    document.addEventListener("visibilitychange", again)
    window.addEventListener("focus", again)
    window.addEventListener("clinexia:session-changed", () => void refreshAccountSession())
    void listenAppActive(again) // Android: back from the browser after paying, or from another app
  }, [])
  return value
}

export async function signOutNow(): Promise<void> {
  if (hasTokens()) await apiCall("/api/account/logout", { body: {} }).catch(() => undefined) // ends the session on the server (best effort)
  clearTokens()
  writeSessionState(localStorage, { enforced: snapshot.enforced, signedIn: false })
  snapshot = { ...snapshot, signedIn: false, email: undefined, entitlements: undefined }
  persist(snapshot)
  emit()
  notifySessionChanged()
}
CLX_EOF_28
w 'lib/billing/tokens.ts' <<'CLX_EOF_29'
// The sign-in kept on this phone: an access token (short life) and a refresh token. The website receives them once at sign-in and
// the app sends the access token with every request. Stored in the app's private storage.
const KEY = "clinexia:auth:v1"
const NOTICE_KEY = "clinexia:auth:notice"

export interface Tokens { access: string; refresh: string; expiresAt: number }
export interface TokenSession { access_token: string; refresh_token: string; expires_in?: number }

export function parseTokens(raw: string | null): Tokens | null {
  try {
    const j = JSON.parse(raw ?? "null")
    return j && typeof j.access === "string" && typeof j.refresh === "string" && typeof j.expiresAt === "number" ? { access: j.access, refresh: j.refresh, expiresAt: j.expiresAt } : null
  } catch { return null }
}
export const toTokens = (s: TokenSession, now = Date.now()): Tokens => ({ access: s.access_token, refresh: s.refresh_token, expiresAt: now + (s.expires_in ?? 3600) * 1000 })

export const getTokens = (): Tokens | null => { try { return parseTokens(localStorage.getItem(KEY)) } catch { return null } }
export const setTokens = (s: TokenSession) => { try { localStorage.setItem(KEY, JSON.stringify(toTokens(s))) } catch { /* ignore */ } }
export const clearTokens = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
export const hasTokens = () => getTokens() !== null

/** Why the phone was signed out (for example the account was suspended), shown once on the sign-in screen. */
export const setAuthNotice = (m: string) => { try { localStorage.setItem(NOTICE_KEY, m) } catch { /* ignore */ } }
export function takeAuthNotice(): string | null { try { const m = localStorage.getItem(NOTICE_KEY); if (m) localStorage.removeItem(NOTICE_KEY); return m } catch { return null } }
CLX_EOF_29
w 'lib/billing/use-query.ts' <<'CLX_EOF_30'
"use client"
import { useEffect, useState } from "react"

/** Reads ?name=value from the address after the page has loaded (the app is a static export, so there is no server to read it). */
export function useQuery(): URLSearchParams | null {
  const [q, setQ] = useState<URLSearchParams | null>(null)
  useEffect(() => setQ(new URLSearchParams(window.location.search)), [])
  return q
}
CLX_EOF_30
w 'lib/campaigns/campaigns.test.ts' <<'CLX_EOF_31'
import { describe, expect, it } from "vitest"
import type { Campaign } from "./types"
import { isLive } from "./types"
import { addPending, parsePending, prunePending, removePending, MAX_PENDING } from "./pending"
import { afterDone, afterLater, afterShown, freshState, normalizeState, pickCampaign, shouldShow } from "./schedule"

const NOW = Date.parse("2026-11-01T12:00:00Z")
const H = 3_600_000
const D = 86_400_000
const base: Campaign = { id: "c1", version: 1, title: "Q4 review", kind: "form", presentation: "modal", heading: "Tell us", body: "", ctaLabel: "", ctaUrl: "", audience: "everyone", frequency: "once", repeatDays: 7, allowLater: true, laterHours: 8, durationSeconds: null, dismissible: true, startsAt: null, endsAt: null, status: "active",
  questions: [{ id: "q1", type: "rating", label: "How is it?", required: true }] }
const camp = (over: Partial<Campaign> = {}): Campaign => ({ ...base, ...over })
const ctx = (over: any = {}) => ({ now: NOW, signedIn: false, shownThisSession: false, ...over })

describe("scheduling: starts and ends by the clock", () => {
  it("is live only while active and inside its window", () => {
    expect(isLive(camp({ startsAt: new Date(NOW + H).toISOString() }), NOW)).toBe(false)
    expect(isLive(camp({ startsAt: new Date(NOW - H).toISOString() }), NOW)).toBe(true)
    expect(isLive(camp({ endsAt: new Date(NOW - 1).toISOString() }), NOW)).toBe(false)
    expect(isLive(camp({ status: "paused" }), NOW)).toBe(false)
    expect(isLive(camp({ status: "draft" }), NOW)).toBe(false)
  })
  it("a scheduled campaign starts by itself when its time arrives", () => {
    const c = camp({ startsAt: new Date(NOW + 2 * H).toISOString() })
    expect(shouldShow(c, freshState(1), ctx()).show).toBe(false)
    expect(shouldShow(c, freshState(1), ctx({ now: NOW + 3 * H })).show).toBe(true)
  })
})

describe("who sees it, and how often", () => {
  it("respects the audience", () => {
    expect(shouldShow(camp({ audience: "guests" }), freshState(1), ctx({ signedIn: true })).show).toBe(false)
    expect(shouldShow(camp({ audience: "guests" }), freshState(1), ctx({ signedIn: false })).show).toBe(true)
    expect(shouldShow(camp({ audience: "signed_in" }), freshState(1), ctx({ signedIn: false })).show).toBe(false)
  })
  it("once: shown a single time", () => {
    const c = camp()
    const seen = afterShown(freshState(1), NOW)
    expect(shouldShow(c, seen, ctx({ now: NOW + D })).show).toBe(false)
  })
  it("every visit: again next visit, but not twice in one visit", () => {
    const c = camp({ frequency: "every_visit" })
    const seen = afterShown(freshState(1), NOW)
    expect(shouldShow(c, seen, ctx({ now: NOW + D })).show).toBe(true)
    expect(shouldShow(c, seen, ctx({ now: NOW + D, shownThisSession: true })).show).toBe(false)
  })
  it("every N days: only after N days", () => {
    const c = camp({ frequency: "every_days", repeatDays: 3 })
    const seen = afterShown(freshState(1), NOW)
    expect(shouldShow(c, seen, ctx({ now: NOW + 2 * D })).show).toBe(false)
    expect(shouldShow(c, seen, ctx({ now: NOW + 3 * D })).show).toBe(true)
  })
  it("people who answered never see it again, whatever the frequency", () => {
    const c = camp({ frequency: "every_visit" })
    expect(shouldShow(c, afterDone(freshState(1), NOW), ctx({ now: NOW + 30 * D })).show).toBe(false)
  })
  it("'Later' brings it back after the wait, even for a show-once campaign", () => {
    const c = camp({ laterHours: 6 })
    const later = afterLater(afterShown(freshState(1), NOW), c, NOW)
    expect(shouldShow(c, later, ctx({ now: NOW + 5 * H })).show).toBe(false)
    expect(shouldShow(c, later, ctx({ now: NOW + 7 * H })).show).toBe(true)
  })
  it("a new version ('show again to everyone') reaches people who already answered", () => {
    const answered = afterDone(freshState(1), NOW)
    const stored = normalizeState(answered, 2)
    expect(shouldShow({ ...camp(), version: 2 }, stored, ctx({ now: NOW + D })).show).toBe(true)
  })
  it("shows one campaign at a time, newest first", () => {
    const a = { ...camp({ startsAt: new Date(NOW - 5 * D).toISOString() }), id: "a" }
    const b = { ...camp({ startsAt: new Date(NOW - 1 * D).toISOString() }), id: "b" }
    expect(pickCampaign([a, b], {}, ctx())?.id).toBe("b")
    expect(pickCampaign([a, b], { b: afterDone(freshState(1), NOW) }, ctx())?.id).toBe("a")
    expect(pickCampaign([], {}, ctx())).toBeNull()
  })
})


describe("parked behind the profile icon ('Remind me later')", () => {
  const pub = (id: string, version = 1) => { const { title: _t, status: _s, ...c } = { ...camp(), id, version } as any; return c }
  it("adds a campaign once, newest first, and replaces an older copy of the same one", () => {
    let list = addPending([], pub("a"), 1)
    list = addPending(list, pub("b"), 2)
    list = addPending(list, pub("a", 2), 3)
    expect(list.map((p) => p.id)).toEqual(["a", "b"])
    expect(list[0].version).toBe(2)
  })
  it("keeps only a handful", () => {
    let list: any[] = []
    for (let i = 0; i < 9; i++) list = addPending(list, pub(`c${i}`), i)
    expect(list).toHaveLength(MAX_PENDING)
  })
  it("removes one when it is completed or dismissed", () => {
    const list = addPending(addPending([], pub("a"), 1), pub("b"), 2)
    expect(removePending(list, "a").map((p) => p.id)).toEqual(["b"])
  })
  it("drops campaigns that ended, were paused or deleted, or were re-versioned", () => {
    const list = addPending(addPending([], pub("a"), 1), pub("b"), 2)
    expect(prunePending(list, [{ id: "a", version: 1 }]).map((p) => p.id)).toEqual(["a"])
    expect(prunePending(list, [{ id: "a", version: 2 }, { id: "b", version: 1 }]).map((p) => p.id)).toEqual(["b"])
    expect(prunePending(list, [])).toEqual([])
  })
  it("reads storage safely", () => {
    const stored = JSON.stringify(addPending([], pub("a"), 1))
    expect(parsePending(stored)).toHaveLength(1)
    expect(parsePending(null)).toEqual([])
    expect(parsePending("not json")).toEqual([])
    expect(parsePending('[{"id":1}]')).toEqual([])
    expect(parsePending('{"a":1}')).toEqual([])
  })
})
CLX_EOF_31
w 'lib/campaigns/fly.ts' <<'CLX_EOF_32'
// The "disappears into the profile icon" animation: a copy of the card shrinks and flies to the icon while fading out.
// Returns once it has landed (or at once when there is nothing to animate or the person prefers reduced motion).
export const ACCOUNT_TRIGGER = "[data-account-trigger]"

export function canFlyToAccount(): boolean {
  return typeof document !== "undefined" && document.querySelector(ACCOUNT_TRIGGER) !== null
}

export function flyToAccountIcon(card: HTMLElement | null): Promise<void> {
  const target = typeof document === "undefined" ? null : (document.querySelector(ACCOUNT_TRIGGER) as HTMLElement | null)
  if (!card || !target || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return Promise.resolve()

  const from = card.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  if (from.width === 0 || from.height === 0) return Promise.resolve()

  // Copy what the card looks like, not its classes (the pop-up's centring classes would fight the animation).
  const cs = getComputedStyle(card)
  const ghost = card.cloneNode(true) as HTMLElement
  ghost.className = ""
  ghost.removeAttribute("id")
  Object.assign(ghost.style, {
    position: "fixed", left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, margin: "0", boxSizing: "border-box",
    transform: "none", translate: "none", scale: "none", pointerEvents: "none", zIndex: "2147483000", overflow: "hidden", transformOrigin: "center center",
    background: cs.backgroundColor === "rgba(0, 0, 0, 0)" ? "hsl(var(--background))" : cs.backgroundColor, color: cs.color, border: cs.border, borderRadius: cs.borderRadius, boxShadow: cs.boxShadow, padding: cs.padding,
  })
  ghost.setAttribute("aria-hidden", "true")
  document.body.appendChild(ghost)

  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const scale = Math.max(0.03, Math.min(0.12, to.width / from.width))
  const animation = ghost.animate(
    [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1, borderRadius: cs.borderRadius },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 24}px) scale(${Math.max(scale * 3, 0.3)})`, opacity: 0.9, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0.15, borderRadius: "9999px" },
    ],
    { duration: 700, easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" },
  )
  return animation.finished.then(() => undefined, () => undefined).finally(() => ghost.remove())
}
CLX_EOF_32
w 'lib/campaigns/pending.ts' <<'CLX_EOF_33'
// "Remind me later" parks a campaign behind the profile icon. This is the list of parked ones (pure rules; storage is in use-pending.ts).
import type { Campaign } from "./types"

export type PendingCampaign = Omit<Campaign, "title" | "status">
export interface PendingItem { id: string; version: number; addedAt: number; campaign: PendingCampaign }

export const MAX_PENDING = 5

export function addPending(list: PendingItem[], campaign: PendingCampaign, now: number): PendingItem[] {
  const rest = list.filter((p) => p.id !== campaign.id)
  return [{ id: campaign.id, version: campaign.version, addedAt: now, campaign }, ...rest].slice(0, MAX_PENDING)
}

export const removePending = (list: PendingItem[], id: string): PendingItem[] => list.filter((p) => p.id !== id)

/** Keeps only campaigns that are still live and unchanged. Ended, paused, deleted or re-versioned ones disappear from the menu. */
export function prunePending(list: PendingItem[], live: Array<Pick<Campaign, "id" | "version">>): PendingItem[] {
  return list.filter((p) => live.some((l) => l.id === p.id && l.version === p.version))
}

export function parsePending(raw: string | null): PendingItem[] {
  if (!raw) return []
  try {
    const j = JSON.parse(raw)
    if (!Array.isArray(j)) return []
    return j
      .filter((p) => p && typeof p.id === "string" && Number.isInteger(p.version) && typeof p.addedAt === "number" && p.campaign && typeof p.campaign.heading === "string" && (p.campaign.kind === "form" || p.campaign.kind === "notice"))
      .slice(0, MAX_PENDING)
  } catch {
    return []
  }
}
CLX_EOF_33
w 'lib/campaigns/schedule.ts' <<'CLX_EOF_34'
// When a campaign is shown to one person on one device. Pure; the browser keeps the small per-campaign state.
import { audienceMatches, isLive, type Campaign } from "./types"

export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000

export interface LocalState { version: number; seenAt: number | null; lastShownAt: number | null; doneAt: number | null; nextAt: number }
export const freshState = (version: number): LocalState => ({ version, seenAt: null, lastShownAt: null, doneAt: null, nextAt: 0 })

/** Saved state counts only for the same version of the campaign. Raising the version ("show again to everyone") starts everyone fresh. */
export function normalizeState(raw: unknown, version: number): LocalState {
  if (!raw || typeof raw !== "object") return freshState(version)
  const s = raw as Partial<LocalState>
  if (s.version !== version) return freshState(version)
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null)
  return { version, seenAt: num(s.seenAt), lastShownAt: num(s.lastShownAt), doneAt: num(s.doneAt), nextAt: num(s.nextAt) ?? 0 }
}

export interface ShowContext { now: number; signedIn: boolean; shownThisSession: boolean }

export function shouldShow(c: Campaign, st: LocalState, ctx: ShowContext): { show: boolean; reason: string } {
  if (!isLive(c, ctx.now)) return { show: false, reason: "not live" }
  if (!audienceMatches(c, ctx.signedIn)) return { show: false, reason: "different audience" }
  if (st.doneAt) return { show: false, reason: "already answered" }
  if (ctx.shownThisSession) return { show: false, reason: "already shown this visit" }
  if (ctx.now < st.nextAt) return { show: false, reason: "reminder not due" }
  if (st.nextAt > 0) return { show: true, reason: "reminder due" } // they asked to be reminded ("Later")
  if (c.frequency === "once") return st.seenAt ? { show: false, reason: "shown once already" } : { show: true, reason: "first time" }
  if (c.frequency === "every_visit") return { show: true, reason: "every visit" }
  if (!st.lastShownAt || ctx.now - st.lastShownAt >= c.repeatDays * DAY_MS) return { show: true, reason: "repeat interval passed" }
  return { show: false, reason: "shown recently" }
}

export const afterShown = (st: LocalState, now: number): LocalState => ({ ...st, seenAt: st.seenAt ?? now, lastShownAt: now, nextAt: st.nextAt > 0 && now >= st.nextAt ? 0 : st.nextAt })
export const afterLater = (st: LocalState, c: Pick<Campaign, "laterHours">, now: number): LocalState => ({ ...st, nextAt: now + c.laterHours * HOUR_MS })
export const afterDone = (st: LocalState, now: number): LocalState => ({ ...st, doneAt: now, nextAt: 0 })

/** One at a time: newest start first. */
export function pickCampaign(list: Campaign[], states: Record<string, LocalState>, ctx: ShowContext): Campaign | null {
  const ordered = [...list].sort((a, b) => Date.parse(b.startsAt ?? "1970-01-01") - Date.parse(a.startsAt ?? "1970-01-01"))
  for (const c of ordered) if (shouldShow(c, states[c.id] ?? freshState(c.version), ctx).show) return c
  return null
}
CLX_EOF_34
w 'lib/campaigns/store.ts' <<'CLX_EOF_35'
"use client"

// The parked campaigns, shared between the host (which parks them) and the profile menu (which shows them).
import { useSyncExternalStore } from "react"
import { addPending, parsePending, removePending, type PendingCampaign, type PendingItem } from "./pending"

const KEY = "clinexia:campaigns:pending:v1"
export const PENDING_EVENT = "clinexia:campaign-pending-changed"
export const ARRIVED_EVENT = "clinexia:campaign-arrived"
export const OPEN_EVENT = "clinexia:open-campaign"

let cachedRaw: string | null = null
let cachedList: PendingItem[] = []
const EMPTY: PendingItem[] = []

export function readPending(): PendingItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw !== cachedRaw) { cachedRaw = raw; cachedList = parsePending(raw) }
    return cachedList
  } catch {
    return EMPTY
  }
}

const save = (list: PendingItem[], notify: boolean) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage unavailable */ }
  if (notify) window.dispatchEvent(new Event(PENDING_EVENT))
}

/** `notify: false` stores it without lighting the "!" yet, so the badge can appear when the card lands in the icon. */
export const parkCampaign = (c: PendingCampaign, notify = true) => save(addPending(readPending(), c, Date.now()), notify)
export const unparkCampaign = (id: string) => save(removePending(readPending(), id), true)
export const announcePending = () => window.dispatchEvent(new Event(PENDING_EVENT))
export const replacePending = (list: PendingItem[]) => save(list, true)

export function usePendingCampaigns(): PendingItem[] {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(PENDING_EVENT, cb)
      window.addEventListener("storage", cb)
      return () => { window.removeEventListener(PENDING_EVENT, cb); window.removeEventListener("storage", cb) }
    },
    readPending,
    () => EMPTY,
  )
}
CLX_EOF_35
w 'lib/campaigns/types.ts' <<'CLX_EOF_36'
// Notices and review forms the Clinexia admin sets up on the website. The app receives only what it needs to show them.
export type QuestionType = "rating" | "text" | "choice" | "multi" | "yesno"
export interface Question { id: string; type: QuestionType; label: string; options?: string[]; required: boolean }
export type Answers = Record<string, string | number | string[]>

export interface Campaign {
  id: string; version: number; title: string
  kind: "notice" | "form"; presentation: "modal" | "banner" | "toast"
  heading: string; body: string; ctaLabel: string; ctaUrl: string; questions: Question[]
  audience: "everyone" | "guests" | "signed_in"; frequency: "once" | "every_visit" | "every_days"; repeatDays: number
  allowLater: boolean; laterHours: number; durationSeconds: number | null; dismissible: boolean
  startsAt: string | null; endsAt: string | null; status: "draft" | "active" | "paused"
}
export type PublicCampaign = Omit<Campaign, "title" | "status">

export function isLive(c: Pick<Campaign, "status" | "startsAt" | "endsAt">, now: number): boolean {
  if (c.status !== "active") return false
  if (c.startsAt && Date.parse(c.startsAt) > now) return false
  if (c.endsAt && Date.parse(c.endsAt) <= now) return false
  return true
}
export const audienceMatches = (c: Pick<Campaign, "audience">, signedIn: boolean) => c.audience === "everyone" || (c.audience === "signed_in" ? signedIn : !signedIn)
CLX_EOF_36
w 'lib/feedback/answered.ts' <<'CLX_EOF_37'
import { CapacitorHttp } from "@capacitor/core"
import { getAnonymousId } from "@/lib/analytics/client-id"
import { ANALYTICS_BASE_URL } from "@/lib/analytics/config"
import { analyticsAvailable } from "@/lib/analytics/http"

/** Has this phone already answered this round? Stored on the server, so it still holds if the app's saved state was lost. */
export async function checkAnsweredOnServer(version: number): Promise<boolean> {
  if (!analyticsAvailable()) return false
  try {
    const res = await CapacitorHttp.get({ url: `${ANALYTICS_BASE_URL}/api/feedback/answered?v=${version}&aid=${encodeURIComponent(getAnonymousId())}`, connectTimeout: 8000, readTimeout: 8000 })
    return res.status === 200 && (typeof res.data === "string" ? JSON.parse(res.data) : res.data)?.answered === true
  } catch { return false }
}
CLX_EOF_37
w 'lib/feedback/preserve.test.ts' <<'CLX_EOF_38'
import { describe, expect, it } from "vitest"
import { preserveCompletion } from "./preserve"
import { decidePrompt, freshState, markDone, snooze, DEFAULT_CONFIG } from "./schedule"

const config = { ...DEFAULT_CONFIG, enabled: true, version: 2 }
const NOW = 1_700_000_000_000
const ctx = (state: ReturnType<typeof freshState>, now = NOW) => ({ config, state, now, engaged: true, online: true, pageAgeMs: 10 * 60_000, onExcludedRoute: false })

describe("answers are never erased by a stale copy", () => {
  it("keeps a recorded answer when an older state (no answer) is written afterwards", () => {
    const stored = markDone(freshState(2), NOW)
    const stale = snooze(freshState(2), config, NOW) // the popup's old in-memory copy, after tapping Later
    const merged = preserveCompletion(stored, stale)
    expect(merged.doneAt).toBe(NOW)
    expect(decidePrompt(ctx(merged, NOW + 30 * 86_400_000)).show).toBe(false)
  })
  it("keeps 'do not ask again' too", () => {
    const merged = preserveCompletion({ ...freshState(2), stoppedAt: NOW }, freshState(2))
    expect(merged.stoppedAt).toBe(NOW)
  })
  it("a new round starts fresh: people who answered an earlier round are asked again", () => {
    const merged = preserveCompletion(markDone(freshState(1), NOW), freshState(2))
    expect(merged.doneAt).toBeNull()
    expect(decidePrompt(ctx(merged)).show).toBe(true)
  })
  it("people who tapped Later are asked again after the wait, and not before", () => {
    const later = snooze(freshState(2), config, NOW)
    expect(decidePrompt(ctx(later, NOW + 1 * 3_600_000)).show).toBe(false)
    expect(decidePrompt(ctx(later, NOW + (config.remindAfterHours + 1) * 3_600_000)).show).toBe(true)
  })
  it("ignores junk in storage", () => {
    expect(preserveCompletion("junk", freshState(2)).doneAt).toBeNull()
    expect(preserveCompletion(null, freshState(2)).doneAt).toBeNull()
  })
})
CLX_EOF_38
w 'lib/feedback/preserve.ts' <<'CLX_EOF_39'
// A saved answer must never be erased by an older copy of the state. The popup stays mounted while someone fills in the form,
// so without this it could write its stale copy (no answer yet) over the answer the form had just recorded.
import type { FeedbackState } from "./schedule"

export function preserveCompletion(stored: unknown, next: FeedbackState): FeedbackState {
  if (!stored || typeof stored !== "object") return next
  const s = stored as Partial<FeedbackState>
  if (s.version !== next.version) return next // a different round is a fresh start
  return {
    ...next,
    doneAt: next.doneAt ?? (typeof s.doneAt === "number" ? s.doneAt : null),
    stoppedAt: next.stoppedAt ?? (typeof s.stoppedAt === "number" ? s.stoppedAt : null),
  }
}
CLX_EOF_39

python3 - <<'PYEOF_BLOCK'
import os, shutil, sys

def load(path):
    if not os.path.exists(path):
        sys.exit(f"Missing {path}. Run this from the repo root.")
    return open(path, encoding="utf-8").read()

def patch(path, edits, import_after, import_line, label=None, append=None):
    """edits: (old, new, expected_count). Writes nothing for this file unless every expected text is found."""
    s = load(path)
    if import_line in s:
        print(f"skip    {path} ({label or 'already patched'})")
        return
    for old, _, n in edits:
        if s.count(old) != n:
            sys.exit(f"Could not patch {path}: expected {n} match(es) of\n  {old[:100]!r}\nbut found {s.count(old)}. The file has changed; nothing was written for it.")
    if import_after not in s:
        sys.exit(f"Could not patch {path}: import anchor not found: {import_after}")
    shutil.copyfile(path, path + ".bak")
    for old, new, _ in edits:
        s = s.replace(old, new)
    s = s.replace(import_after, import_after + "\n" + import_line, 1)
    if append:
        s = s.rstrip() + "\n" + append
    open(path, "w", encoding="utf-8").write(s)
    print(f"patched {path}" + (f" ({label})" if label else ""))

def edit_only(path, edits, label=None):
    s = load(path)
    if all(new in s for _, new, _ in edits):
        print(f"skip    {path} ({label or 'already patched'})")
        return
    for old, _, n in edits:
        if s.count(old) != n:
            sys.exit(f"Could not patch {path}: expected {n} match(es) of\n  {old[:100]!r}\nbut found {s.count(old)}. Nothing was written for it.")
    shutil.copyfile(path, path + ".bak")
    for old, new, _ in edits:
        s = s.replace(old, new)
    open(path, "w", encoding="utf-8").write(s)
    print(f"patched {path}" + (f" ({label})" if label else ""))

# 1. app shell: profile icon, campaigns, guest guard, drawer link
patch("components/app-shell.tsx", [
    ('<button aria-label="Search" onClick={()=>setSearch(true)}', '<AccountMenu/>\n    <button aria-label="Search" onClick={()=>setSearch(true)}', 1),
    ('  <main>{children}</main>', '  <CampaignHost/>\n  <main id="main-content">{children}</main>', 1),
    ('  <FeedbackPrompt/>', '  <FeedbackPrompt/>\n  <GuestGuard/>', 1),
    ('{href:"/settings",label:"Settings"}', '{href:"/account",label:"Account"},{href:"/settings",label:"Settings"}', 1),
], 'import { FeedbackPrompt } from "@/components/feedback-prompt"',
   'import { AccountMenu } from "@/components/account-menu"\nimport { CampaignHost } from "@/components/campaign-host"\nimport { GuestGuard } from "@/components/guest-guard"', "profile icon, campaigns, guest guard")

# 2. the guest allowance counts every finished calculation (even when analytics are switched off)
patch("lib/analytics/track.ts", [
    ('export async function trackCalculation(e: { calculatorId: string; calculatorName: string; category: string }) {\n  try {',
     'export async function trackCalculation(e: { calculatorId: string; calculatorName: string; category: string }) {\n  countGuestCalculation() // guest allowance: counts only while premium locking is on and nobody is signed in\n  try {', 1),
], 'import { getAnonymousId } from "./client-id"', 'import { countGuestCalculation } from "@/lib/billing/guest"', "guest count")

# 3. premium lock + badges on the calculator page
patch("components/calculator-runner.tsx", [
    ('export function CalculatorRunner({id}:{id:string}){', 'function CalculatorRunnerInner({id}:{id:string}){', 1),
    ('{def.category.replaceAll("-"," ")}</div>', '{def.category.replaceAll("-"," ")}<AccessBadge id={def.id} category={def.category}/></div>', 1),
    ('{r.name}<span className="mt-1 block text-[11px] font-normal text-slate-500">', '{r.name}<AccessBadge id={r.id} category={r.category}/><span className="mt-1 block text-[11px] font-normal text-slate-500">', 1),
], 'import { ExternalAnchor } from "@/components/external-link"',
   'import { AccessBadge } from "@/components/access-badge"\nimport { PremiumGate } from "@/components/premium-gate"', "lock and badges",
   append='/** Public entry point: the calculator behind the premium lock (does nothing unless locking is switched on in the Clinexia server). */\nexport function CalculatorRunner({id}:{id:string}){\n const def=getCalculatorById(id)\n return def ? <PremiumGate id={def.id} category={def.category}><CalculatorRunnerInner id={id}/></PremiumGate> : <CalculatorRunnerInner id={id}/>\n}\n')

# 4. Free / Premium badge on every tool row (lists, search results, favourites, recent)
patch("components/tool-row.tsx", [
    ('{tool.shortName??tool.name}</span>', '{tool.shortName??tool.name}<AccessBadge id={tool.id} category={tool.category}/></span>', 1),
], 'import { categoryMeta,toneStyle } from "@/lib/ui-meta"', 'import { AccessBadge } from "@/components/access-badge"', "badge")

# 5. feedback reminders: an answer is never erased or ignored
patch("lib/feedback/storage.ts", [
    ('''export function writeState(state: FeedbackState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {}
}''', '''export function writeState(state: FeedbackState): void {
  try {
    // Never let an older copy of the state erase an answer that was already recorded.
    let stored: unknown = null
    try {
      stored = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null")
    } catch {}
    localStorage.setItem(STATE_KEY, JSON.stringify(preserveCompletion(stored, state)))
  } catch {}
}''', 1),
], 'import { normalizeState, type FeedbackState } from "./schedule"', 'import { preserveCompletion } from "./preserve"', "keep answers")

patch("components/feedback-prompt.tsx", [
    ('''    const c = config.current
    const s = state.current
    if (!c || !s) return''', '''    const c = config.current
    if (!c) return
    // Judge from what is saved right now: the form may have recorded an answer since this popup loaded.
    const s = readState(c.version)
    state.current = s''', 1),
    ('''      writeState(state.current)
      evaluate()''', '''      writeState(state.current)
      // An answer already stored on the server for this phone and round counts, even if the app's saved state was lost.
      void checkAnsweredOnServer(loaded.version).then((answered) => {
        if (!answered) return
        writeState(markDone(readState(loaded.version), Date.now()))
        state.current = readState(loaded.version)
        setVisible(false)
      })
      evaluate()''', 1),
    ('  const save = (next: FeedbackState) => {', '''  // The form announces when it is sent, so the popup goes away at once and cannot come back for this round.
  useEffect(() => {
    const refresh = () => { setVisible(false); evaluate() }
    window.addEventListener("clinexia:feedback-done", refresh)
    return () => window.removeEventListener("clinexia:feedback-done", refresh)
  }, [evaluate])

  const save = (next: FeedbackState) => {''', 1),
    ('save(pauseForHours(state.current as FeedbackState, Date.now(), 1))', 'save(pauseForHours(readState((config.current as FeedbackConfig).version), Date.now(), 1))', 1),
    ('save(snooze(state.current as FeedbackState, config.current as FeedbackConfig, Date.now()))', 'save(snooze(readState((config.current as FeedbackConfig).version), config.current as FeedbackConfig, Date.now()))', 1),
], 'import { loadConfig } from "@/lib/feedback/http"', 'import { checkAnsweredOnServer } from "@/lib/feedback/answered"', "reminders")

# Repos that already ran an earlier version of this script are missing the markDone import: add it if it is not there.
import re
_p = "components/feedback-prompt.tsx"
_s = load(_p)
if "markDone(" in _s and not re.search(r"\bmarkDone\b[^\n]*from [\"']@/lib/feedback/schedule[\"']", _s) and not re.search(r"import \{[^}]*\bmarkDone\b[^}]*\} from", _s, re.S):
    _anchor = 'import { checkAnsweredOnServer } from "@/lib/feedback/answered"'
    if _anchor not in _s:
        sys.exit(f"Could not add the markDone import to {_p}: anchor not found.")
    shutil.copyfile(_p, _p + ".bak")
    open(_p, "w", encoding="utf-8").write(_s.replace(_anchor, _anchor + '\nimport { markDone } from "@/lib/feedback/schedule"', 1))
    print(f"patched {_p} (markDone import)")

edit_only("components/feedback-form.tsx", [
    ('    writeState(markDone(readState(version), Date.now()))\n', '    writeState(markDone(readState(version), Date.now()))\n    window.dispatchEvent(new Event("clinexia:feedback-done"))\n', 1),
], "announce answer")
PYEOF_BLOCK

echo "Added/updated 40 files. Next: npx tsc --noEmit and npm test, then build with NEXT_PUBLIC_ANALYTICS_URL set. See docs/ACCOUNTS.md"
