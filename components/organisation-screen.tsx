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
