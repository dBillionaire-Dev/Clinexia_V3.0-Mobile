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
