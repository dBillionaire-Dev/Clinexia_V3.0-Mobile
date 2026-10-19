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
