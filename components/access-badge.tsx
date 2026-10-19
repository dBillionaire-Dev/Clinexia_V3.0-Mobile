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
