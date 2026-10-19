// Talks to the Clinexia website's server (accounts, plans, campaigns). Inside the Android app it uses the phone's own network client
// (no browser rules); on the mobile website it uses fetch (the server allows this site's address). Signs requests with the stored
// token and renews it automatically.
import { CapacitorHttp } from "@capacitor/core"
import { ANALYTICS_BASE_URL } from "@/lib/analytics/config"
import { isNative } from "@/lib/native"
import { clearTokens, getTokens, setAuthNotice, setTokens } from "./tokens"

export const API_BASE = ANALYTICS_BASE_URL
/** Accounts need the website's address, set at build time with NEXT_PUBLIC_ANALYTICS_URL (the same one analytics use). */
export const accountsAvailable = () => API_BASE.length > 0

import { interpretApi, type ApiResult } from "./interpret"
export type { ApiResult }
type Raw = { status: number; data: unknown } | null

const parse = (d: unknown): unknown => { if (typeof d !== "string") return d; try { return JSON.parse(d) } catch { return null } }

async function send(method: "GET" | "POST", path: string, body: unknown, token?: string): Promise<Raw> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Clinexia-Client": isNative() ? "android" : "mobile-web" }
  if (token) headers.Authorization = `Bearer ${token}`
  const url = `${API_BASE}${path}`
  try {
    if (isNative()) {
      const r = await CapacitorHttp.request({ url, method, headers, data: method === "POST" ? body ?? {} : undefined, connectTimeout: 10000, readTimeout: 20000 })
      return { status: r.status, data: parse(r.data) }
    }
    const r = await fetch(url, { method, headers, body: method === "POST" ? JSON.stringify(body ?? {}) : undefined, cache: "no-store" })
    return { status: r.status, data: await r.json().catch(() => null) }
  } catch { return null }
}

let refreshing: Promise<boolean> | null = null
/** Trades the refresh token for a new access token. If the server says the sign-in is over, this phone signs out. */
function refresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const t = getTokens()
    if (!t) return false
    const res = await send("POST", "/api/account/refresh", { refresh_token: t.refresh })
    if (res && res.status === 200 && res.data && typeof res.data === "object" && (res.data as { session?: unknown }).session) {
      setTokens((res.data as { session: { access_token: string; refresh_token: string; expires_in?: number } }).session)
      return true
    }
    if (res && (res.status === 401 || res.status === 403)) {
      const msg = res.data && typeof res.data === "object" ? (res.data as { error?: unknown }).error : null
      if (res.status === 403 && typeof msg === "string") setAuthNotice(msg) // e.g. the account was suspended
      clearTokens()
      if (typeof window !== "undefined") window.dispatchEvent(new Event("clinexia:session-changed"))
    }
    return false
  })().finally(() => { refreshing = null })
  return refreshing
}

export async function apiCall<T = unknown>(path: string, opts: { body?: unknown; auth?: boolean } = {}): Promise<ApiResult<T>> {
  if (!accountsAvailable()) return { ok: false, status: 0, error: "Accounts are not available in this build." }
  const method = opts.body === undefined ? "GET" : "POST"
  let t = opts.auth === false ? null : getTokens()
  if (t && t.expiresAt - Date.now() < 60_000) { await refresh(); t = getTokens() }
  let res = await send(method, path, opts.body, t?.access)
  if (res?.status === 401 && t && (await refresh())) res = await send(method, path, opts.body, getTokens()?.access)
  return interpretApi<T>(res)
}
