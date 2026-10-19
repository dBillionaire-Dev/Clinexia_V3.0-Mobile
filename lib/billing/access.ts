import type { CalculatorGroup } from "@/lib/calculators/types"
import { CATEGORY_SPECIALTY, FREE_CALCULATOR_IDS, FREE_CATEGORIES, PREMIUM_CALCULATOR_IDS, SPECIALTIES, type Specialty } from "./config"

/** What this phone last learned from the Clinexia server. Kept on the device so locking works offline and without a flash. */
export interface AccessSnapshot {
  enforced: boolean
  signedIn: boolean
  entitlements?: { all: boolean; specialties: Specialty[] }
}

export function isPremiumCalculator(calc: { id: string; category: CalculatorGroup }): boolean {
  if (FREE_CALCULATOR_IDS.has(calc.id)) return false
  if (PREMIUM_CALCULATOR_IDS.has(calc.id)) return true
  return !FREE_CATEGORIES.has(calc.category)
}

export const specialtyOf = (category: CalculatorGroup): Specialty => CATEGORY_SPECIALTY[category]

export const hasSpecialty = (e: NonNullable<AccessSnapshot["entitlements"]>, s: Specialty) => e.all || e.specialties.includes(s)

export type Verdict = "free" | "allowed" | "locked"

/**
 * - Locking off, or a free tool: free.
 * - Premium tool: allowed only when signed in with that specialty. If we do not know the person's plan yet (no answer from the
 *   server), we do not lock them out.
 */
export function accessVerdict(calc: { id: string; category: CalculatorGroup }, snap: AccessSnapshot): Verdict {
  if (!snap.enforced || !isPremiumCalculator(calc)) return "free"
  if (!snap.signedIn) return "locked"
  if (!snap.entitlements) return "allowed"
  return hasSpecialty(snap.entitlements, specialtyOf(calc.category)) ? "allowed" : "locked"
}

export const knownSpecialty = (s: string): s is Specialty => (SPECIALTIES as readonly string[]).includes(s)
