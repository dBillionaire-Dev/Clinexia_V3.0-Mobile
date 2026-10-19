// Turns the Clinexia server's reply into something a person can read. Pure, so it is tested.
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }
type Raw = { status: number; data: unknown } | null

export function interpretApi<T>(res: Raw): ApiResult<T> {
  if (!res) return { ok: false, status: 0, error: "You appear to be offline. Please check your connection and try again." }
  if (res.status >= 200 && res.status < 300) return { ok: true, data: res.data as T }
  const d = res.data && typeof res.data === "object" ? (res.data as { error?: unknown; hint?: unknown }) : {}
  const message = typeof d.error === "string" ? d.error : res.status === 429 ? "Too many attempts. Please try again later." : res.status >= 500 ? "Something went wrong on our side. Please try again." : "Something went wrong. Please try again."
  return { ok: false, status: res.status, error: message + (typeof d.hint === "string" ? ` (${d.hint})` : "") }
}

