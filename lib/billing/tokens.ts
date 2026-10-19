// The sign-in kept on this phone: an access token (short life) and a refresh token. The website receives them once at sign-in and
// the app sends the access token with every request. Stored in the app's private storage.
const KEY = "clinexia:auth:v1"
const NOTICE_KEY = "clinexia:auth:notice"

export interface Tokens { access: string; refresh: string; expiresAt: number }
export interface TokenSession { access_token: string; refresh_token: string; expires_in?: number }

export function parseTokens(raw: string | null): Tokens | null {
  try {
    const j = JSON.parse(raw ?? "null")
    return j && typeof j.access === "string" && typeof j.refresh === "string" && typeof j.expiresAt === "number" ? { access: j.access, refresh: j.refresh, expiresAt: j.expiresAt } : null
  } catch { return null }
}
export const toTokens = (s: TokenSession, now = Date.now()): Tokens => ({ access: s.access_token, refresh: s.refresh_token, expiresAt: now + (s.expires_in ?? 3600) * 1000 })

export const getTokens = (): Tokens | null => { try { return parseTokens(localStorage.getItem(KEY)) } catch { return null } }
export const setTokens = (s: TokenSession) => { try { localStorage.setItem(KEY, JSON.stringify(toTokens(s))) } catch { /* ignore */ } }
export const clearTokens = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
export const hasTokens = () => getTokens() !== null

/** Why the phone was signed out (for example the account was suspended), shown once on the sign-in screen. */
export const setAuthNotice = (m: string) => { try { localStorage.setItem(NOTICE_KEY, m) } catch { /* ignore */ } }
export function takeAuthNotice(): string | null { try { const m = localStorage.getItem(NOTICE_KEY); if (m) localStorage.removeItem(NOTICE_KEY); return m } catch { return null } }
