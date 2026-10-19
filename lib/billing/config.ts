// Plans and access rules shared with the Clinexia website (the website's server is the source of truth for prices and entitlements;
// this app only needs the names, the category-to-specialty map and the free/premium designation to label and lock tools).
import type { CalculatorGroup } from "@/lib/calculators/types"

export const SPECIALTIES = ["laboratory", "pharmacy", "nursing", "renal", "cardiology", "oncology", "general-medicine"] as const
export type Specialty = (typeof SPECIALTIES)[number]

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  laboratory: "Laboratory medicine", pharmacy: "Pharmacy", nursing: "Nursing", renal: "Renal / nephrology", cardiology: "Cardiology", oncology: "Oncology & transplant", "general-medicine": "General medicine",
}

/** Typed over CalculatorGroup so a new category cannot be added without deciding which specialty it belongs to. */
export const CATEGORY_SPECIALTY: Record<CalculatorGroup, Specialty> = {
  general: "general-medicine", renal: "renal", chemistry: "laboratory", hematology: "laboratory", microbiology: "laboratory", "lab-solutions": "laboratory",
  spectrophotometry: "laboratory", dosing: "pharmacy", oncology: "oncology", "stem-cell-transplant": "oncology", cardiovascular: "cardiology",
}

/** Same default as the website: "general" is free, every other category is premium once premium locking is switched on. */
export const FREE_CATEGORIES: ReadonlySet<CalculatorGroup> = new Set<CalculatorGroup>(["general"])
export const FREE_CALCULATOR_IDS: ReadonlySet<string> = new Set<string>()
export const PREMIUM_CALCULATOR_IDS: ReadonlySet<string> = new Set<string>()

export const ORGANISATION_TYPES = [
  { value: "laboratory", label: "Laboratory" }, { value: "hospital", label: "Hospital" }, { value: "pharmacy", label: "Pharmacy" },
  { value: "clinic", label: "Clinic / health centre" }, { value: "university", label: "University / school" }, { value: "other_healthcare", label: "Other healthcare organisation" },
] as const

export type Currency = "NGN" | "USD"
export function formatMoney(minor: number, currency: Currency): string {
  const major = (minor / 100).toLocaleString(currency === "USD" ? "en-US" : "en-NG", { minimumFractionDigits: minor % 100 ? 2 : 0, maximumFractionDigits: 2 })
  return `${currency === "USD" ? "$" : "₦"}${major}`
}

export interface Quote {
  currency: Currency; market: "ng" | "intl"; kind: "individual" | "enterprise"; plan: "specialty" | "all_access"; specialties: Specialty[]; seats: number
  lines: Array<{ label: string; amountMinor: number }>; subtotalMinor: number
  discount: { applied: boolean; bps: number; amountMinor: number; reason: string }; totalMinor: number; allAccessIsCheaper: boolean
}
