"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Share2, Star } from "lucide-react"
import { ANALYTICS_BASE_URL } from "@/lib/analytics/config"
import { loadConfig, submitFeedback } from "@/lib/feedback/http"
import { DRAFT_KEY, readState, writeState } from "@/lib/feedback/storage"
import {
  BACKGROUND, DEVICES, OFFICE_TYPES, OPEN_QUESTIONS, PAY_INTEREST, PAY_WHO, PRICE_INDIVIDUAL, PRICE_TEAM, TEXT_LIMIT, USE_CONTEXT,
  rolesFor, validateAnswers, type Option,
} from "@/lib/feedback/questions"
import { DEFAULT_CONFIG, markDone } from "@/lib/feedback/schedule"

type Draft = {
  step: number; rating: number; background: string; role: string; devices: string[]; context: string; officeType: string
  payInterest: string; payWho: string; priceIndividual: string; priceTeam: string; improve: string; missing: string; other: string
}
const EMPTY: Draft = { step: 0, rating: 0, background: "", role: "", devices: ["android_app"], context: "", officeType: "", payInterest: "", payWho: "", priceIndividual: "", priceTeam: "", improve: "", missing: "", other: "" }
const STEPS = ["About you", "How you use it", "Premium", "Your ideas"]
const primary = "rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"

function Chips({ options, value, onChange, label, multi = false }: { options: Option[]; value: string | string[]; onChange: (v: string) => void; label: string; multi?: boolean }) {
  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = Array.isArray(value) ? value.includes(o.value) : value === o.value
        return (
          <button key={o.value} type="button" role={multi ? undefined : "radio"} aria-checked={multi ? undefined : on} aria-pressed={multi ? on : undefined}
            onClick={() => onChange(o.value)} className={`pill !whitespace-normal text-left ${on ? "active" : ""}`}>{o.label}</button>
        )
      })}
    </div>
  )
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div><h3 className="text-sm font-extrabold">{title}</h3>{hint ? <p className="muted text-xs">{hint}</p> : null}</div>
      {children}
    </div>
  )
}

export function FeedbackForm() {
  const [d, setD] = useState<Draft>(EMPTY)
  const [version, setVersion] = useState(DEFAULT_CONFIG.version)
  const [ready, setReady] = useState(false)
  const [alreadySent, setAlreadySent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [shareNote, setShareNote] = useState("")

  useEffect(() => {
    let draft = EMPTY
    try { draft = { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") } } catch {}
    const fromPopup = Number(new URLSearchParams(window.location.search).get("rating"))
    if (Number.isInteger(fromPopup) && fromPopup >= 1 && fromPopup <= 5) draft = { ...draft, rating: fromPopup }
    setD(draft)
    void (async () => {
      const config = await loadConfig()
      const v = config?.version ?? DEFAULT_CONFIG.version
      setVersion(v)
      setAlreadySent(Boolean(readState(v).doneAt))
      setReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch {}
  }, [d, ready])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((p) => ({ ...p, [key]: value }))
  const toggleDevice = (v: string) => set("devices", d.devices.includes(v) ? d.devices.filter((x) => x !== v) : [...d.devices, v])
  const roles = useMemo(() => rolesFor(d.background), [d.background])
  const atWork = d.context === "office" || d.context === "both"
  const wouldPay = d.payInterest === "yes" || d.payInterest === "maybe"
  const stepReady = [
    Boolean(d.rating && d.background && d.role),
    Boolean(d.devices.length && d.context && (!atWork || d.officeType)),
    Boolean(d.payInterest && (!wouldPay || d.priceIndividual)),
    true,
  ]

  const send = async () => {
    setError("")
    const checked = validateAnswers({ ...d, officeType: d.officeType || undefined })
    if (!checked.ok) return setError(checked.error)
    setSending(true)
    const result = await submitFeedback(checked.value, version)
    setSending(false)
    if (!result.ok) return setError(result.error)
    writeState(markDone(readState(version), Date.now()))
    window.dispatchEvent(new Event("clinexia:feedback-done"))
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    setSent(true)
  }

  const share = async () => {
    const url = (process.env.NEXT_PUBLIC_SHARE_URL ?? ANALYTICS_BASE_URL).trim()
    try {
      if (navigator.share) await navigator.share({ title: "Clinexia", text: "Free clinical calculators that work offline.", url })
      else { await navigator.clipboard.writeText(url); setShareNote("Link copied.") }
    } catch {}
  }

  if (!ready) return <p className="muted text-sm">Loading…</p>

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Check size={30} /></div>
        <h1 className="text-2xl font-black">Thank you!</h1>
        <p className="muted text-sm">Your feedback has been sent. We read every response and use it to decide what to build next.</p>
        {d.rating >= 4 ? (
          <div className="card p-4">
            <p className="mb-3 text-sm">Know a colleague who would find Clinexia useful?</p>
            <button className={primary} onClick={() => void share()}><Share2 size={16} className="mr-2 inline" />Share Clinexia</button>
            {shareNote ? <p className="muted mt-2 text-xs">{shareNote}</p> : null}
          </div>
        ) : null}
        <Link href="/" className="pill inline-block">Back to Clinexia</Link>
      </div>
    )
  }

  if (alreadySent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-black">Thanks, you have already sent feedback</h1>
        <p className="muted text-sm">We appreciate it. If something has changed, you can send an updated answer.</p>
        <div className="flex justify-center gap-2">
          <button className={primary} onClick={() => setAlreadySent(false)}>Update my answers</button>
          <Link href="/" className="pill grid place-items-center">Back</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Help us improve Clinexia</h1>
        <p className="muted mt-1 text-sm">Four short steps, about a minute. Your answers are anonymous: no name, email or patient information.</p>
      </div>
      <div>
        <div className="muted mb-1 text-xs">Step {d.step + 1} of {STEPS.length}: {STEPS[d.step]}</div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((d.step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>

      <div className="card space-y-6 p-4">
        {d.step === 0 && (
          <>
            <Question title="How would you rate Clinexia?">
              <div className="flex gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={d.rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => set("rating", n)} className="rounded p-1 active:scale-110">
                    <Star size={36} className={n <= d.rating ? "fill-amber-400 text-amber-400" : "text-slate-400"} />
                  </button>
                ))}
              </div>
            </Question>
            <Question title="Do you work or study in healthcare?">
              <Chips label="Background" options={BACKGROUND} value={d.background} onChange={(v) => setD((p) => ({ ...p, background: v, role: "" }))} />
            </Question>
            {d.background ? (
              <Question title={d.background === "medical" ? "Which area are you in?" : "Which describes you best?"}>
                <Chips label="Role" options={roles} value={d.role} onChange={(v) => set("role", v)} />
              </Question>
            ) : null}
          </>
        )}
        {d.step === 1 && (
          <>
            <Question title="How do you use Clinexia?" hint="Choose all that apply.">
              <Chips multi label="Devices" options={DEVICES} value={d.devices} onChange={toggleDevice} />
            </Question>
            <Question title="Where do you use it?">
              <Chips label="Where" options={USE_CONTEXT} value={d.context} onChange={(v) => set("context", v)} />
            </Question>
            {atWork ? (
              <Question title="What kind of workplace?">
                <Chips label="Workplace" options={OFFICE_TYPES} value={d.officeType} onChange={(v) => set("officeType", v)} />
              </Question>
            ) : null}
          </>
        )}
        {d.step === 2 && (
          <>
            <Question title="Clinexia is free today. Would you pay for a premium version?" hint="Nothing is being sold yet. We are asking so we price it fairly.">
              <Chips label="Would pay" options={PAY_INTEREST} value={d.payInterest} onChange={(v) => set("payInterest", v)} />
            </Question>
            {wouldPay ? (
              <>
                <Question title="What would be a reasonable price for you, per month?" hint="In Nigerian naira.">
                  <Chips label="Price per month" options={PRICE_INDIVIDUAL} value={d.priceIndividual} onChange={(v) => set("priceIndividual", v)} />
                </Question>
                <Question title="Who would pay for it?">
                  <Chips label="Who pays" options={PAY_WHO} value={d.payWho} onChange={(v) => set("payWho", v)} />
                </Question>
                <Question title="If a facility bought 10 seats, what monthly price for the whole team would be reasonable?" hint="Optional. In Nigerian naira, for all 10 people together.">
                  <Chips label="Team price per month" options={PRICE_TEAM} value={d.priceTeam} onChange={(v) => set("priceTeam", v)} />
                </Question>
              </>
            ) : null}
          </>
        )}
        {d.step === 3 && (
          <>
            {OPEN_QUESTIONS.map((q) => (
              <Question key={q.id} title={q.label} hint="Optional">
                <textarea className="field" value={d[q.id]} onChange={(e) => set(q.id, e.target.value.slice(0, TEXT_LIMIT))} placeholder={q.placeholder} rows={3} maxLength={TEXT_LIMIT} />
              </Question>
            ))}
            <p className="muted text-xs">Please do not include patient details or personal information such as names, phone numbers or emails.</p>
          </>
        )}
      </div>

      {error ? <p role="alert" className="text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="flex items-center justify-between gap-2">
        <button className="pill disabled:opacity-50" disabled={d.step === 0 || sending} onClick={() => set("step", d.step - 1)}>Back</button>
        {d.step < STEPS.length - 1 ? (
          <button className={primary} disabled={!stepReady[d.step]} onClick={() => { setError(""); set("step", d.step + 1) }}>Next</button>
        ) : (
          <button className={primary} disabled={sending || !stepReady.every(Boolean)} onClick={() => void send()}>{sending ? "Sending…" : "Send feedback"}</button>
        )}
      </div>
    </div>
  )
}
