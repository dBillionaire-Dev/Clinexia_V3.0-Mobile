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
