import { normalizeState, type FeedbackState } from "./schedule"

const STATE_KEY = "clinexia:feedback:v1"
export const DRAFT_KEY = "clinexia:feedback:draft"

export function readState(version: number): FeedbackState {
  let raw: unknown = null
  try {
    raw = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null")
  } catch {}
  return normalizeState(raw, { version })
}

export function writeState(state: FeedbackState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {}
}

export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
