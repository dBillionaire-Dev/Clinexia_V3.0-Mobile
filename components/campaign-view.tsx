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
