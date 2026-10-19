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
