// A plan is paid for in the phone's browser (Paystack). When the person comes back to the app, this asks the server whether the
// payment went through; the server only switches the plan on after Paystack confirms it.
import { apiCall } from "./api"

const KEY = "clinexia:pending-payment:v1"
const MAX_AGE_MS = 24 * 3600 * 1000

export function rememberPendingPayment(reference: string) { try { localStorage.setItem(KEY, JSON.stringify({ reference, at: Date.now() })) } catch { /* ignore */ } }
export function pendingPayment(): { reference: string; at: number } | null {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? "null")
    return j && typeof j.reference === "string" && typeof j.at === "number" && Date.now() - j.at < MAX_AGE_MS ? j : null
  } catch { return null }
}
export const clearPendingPayment = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }

export type PaymentCheck = "none" | "paid" | "pending" | "failed" | "error"
export async function checkPendingPayment(): Promise<PaymentCheck> {
  const p = pendingPayment()
  if (!p) return "none"
  const r = await apiCall<{ status: "paid" | "pending" | "failed" }>("/api/billing/verify", { body: { reference: p.reference } })
  if (!r.ok) return r.status === 404 ? (clearPendingPayment(), "failed") : "error"
  if (r.data.status === "paid" || r.data.status === "failed") clearPendingPayment()
  return r.data.status
}
