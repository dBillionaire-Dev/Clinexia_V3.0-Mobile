// Guest allowance: a person who is not signed in gets GUEST_CALC_LIMIT calculations on this phone. Active while the Clinexia
// server requires an account (admin setting, or premium locking). A front-end limit: clearing the app's data resets it.
export const GUEST_CALC_LIMIT = 3
export const GUEST_KEY = "clinexia:guest-calcs"
export const SESSION_STATE_KEY = "clinexia:session-state"

export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
// guestLimit: the administrator requires an account after GUEST_CALC_LIMIT free calculations. Older saved states only have `enforced`, which meant the same thing.
export interface SessionState { enforced: boolean; guestLimit?: boolean; signedIn: boolean }
export const guestLimitOn = (s: SessionState | null) => Boolean(s && (s.guestLimit ?? s.enforced))

export function readSessionState(s: StorageLike): SessionState | null {
  try {
    const raw = s.getItem(SESSION_STATE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw)
    return typeof j?.enforced === "boolean" && typeof j?.signedIn === "boolean" ? { enforced: j.enforced, signedIn: j.signedIn, ...(typeof j.guestLimit === "boolean" ? { guestLimit: j.guestLimit } : {}) } : null
  } catch { return null }
}
export function writeSessionState(s: StorageLike, state: SessionState): void {
  try { s.setItem(SESSION_STATE_KEY, JSON.stringify(state)) } catch { /* storage unavailable */ }
}
export function readGuestCount(s: StorageLike): number {
  try {
    const n = Number.parseInt(s.getItem(GUEST_KEY) ?? "0", 10)
    return Number.isFinite(n) && n > 0 ? Math.min(n, GUEST_CALC_LIMIT) : 0
  } catch { return 0 }
}
export const isGuestLimited = (state: SessionState | null, count: number) => Boolean(state && guestLimitOn(state) && !state.signedIn && count >= GUEST_CALC_LIMIT)

export interface GuestTally { counted: boolean; count: number; limit: number; remaining: number; limited: boolean }

export function noteGuestCalculation(s: StorageLike): GuestTally {
  const state = readSessionState(s)
  const count = readGuestCount(s)
  const base = { limit: GUEST_CALC_LIMIT, count, remaining: Math.max(0, GUEST_CALC_LIMIT - count), limited: isGuestLimited(state, count) }
  if (!state || !guestLimitOn(state) || state.signedIn || count >= GUEST_CALC_LIMIT) return { ...base, counted: false }
  const next = count + 1
  try { s.setItem(GUEST_KEY, String(next)) } catch { return { ...base, counted: false } }
  return { counted: true, count: next, limit: GUEST_CALC_LIMIT, remaining: GUEST_CALC_LIMIT - next, limited: next >= GUEST_CALC_LIMIT }
}

/** Where to go after signing in: a path inside the app, otherwise Home. */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const p = raw.trim()
  if (p.length === 0 || p.length > 300 || !p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\") || /[\r\n]/.test(p)) return null
  if (/^\/(login|register)(\/|\?|$)/.test(p)) return null
  return p
}

/** Call once per finished calculation. Never throws. */
export function countGuestCalculation(): void {
  try {
    const tally = noteGuestCalculation(window.localStorage)
    if (tally.counted) window.dispatchEvent(new CustomEvent("clinexia:guest-calc", { detail: tally }))
  } catch { /* must never break calculating */ }
}
