"use client"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { apiCall } from "@/lib/billing/api"

/** "Forgot password?": the Clinexia server emails a reset link. The link opens the website page where the new password is chosen; then sign in here. */
export function ForgotPassword({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError("")
    const r = await apiCall("/api/account/forgot", { auth: false, body: { email } })
    setBusy(false)
    if (r.ok) setSent(true)
    else setError(r.status === 404 ? "The Clinexia server does not have accounts switched on yet. Please try again later." : r.error)
  }
  if (sent) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-black">Check your email</h1>
        <p role="status" className="text-sm">We have sent a link to choose a new password to <strong>{email.trim().toLowerCase()}</strong>. Open it, set the new password, then come back here and sign in. It can take a few minutes; check spam too.</p>
        <button type="button" className="underline text-sm" onClick={onBack}>Back to sign in</button>
      </div>
    )
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <h1 className="text-xl font-black">Forgot your password?</h1>
      <p className="muted text-sm">Enter your email and we will send you a link to choose a new one.</p>
      <label className="block"><span className="mb-1 block text-xs font-extrabold">Email</span><input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Send reset link"}</button>
      <button type="button" className="underline text-sm" onClick={onBack}>Back to sign in</button>
    </form>
  )
}
