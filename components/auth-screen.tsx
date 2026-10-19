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
