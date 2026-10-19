"use client"

// One shared, cached answer to "is someone signed in, and what is switched on?" for the header icon, free/premium badges, locking and
// the guest allowance. The last answer is kept on the phone, so locking works offline and without a flash.
import { useEffect, useSyncExternalStore } from "react"
import { listenAppActive } from "@/lib/native"
import type { AccessSnapshot } from "./access"
import { accountsAvailable, apiCall } from "./api"
import { writeSessionState } from "./guest"
import { checkPendingPayment } from "./payments"
import { clearTokens, hasTokens } from "./tokens"

export interface AccountSession extends AccessSnapshot { loading: boolean; enabled: boolean; email?: string }

const SNAP_KEY = "clinexia:session-snapshot:v1"
const LOADING: AccountSession = { loading: true, enabled: false, enforced: false, signedIn: false }
let snapshot: AccountSession = LOADING
let started = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function persist(s: AccountSession) {
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({ enforced: s.enforced, signedIn: s.signedIn, email: s.email, entitlements: s.entitlements }))
    writeSessionState(localStorage, { enforced: s.enforced, signedIn: s.signedIn })
  } catch { /* storage unavailable */ }
}

function restore(): AccountSession | null {
  try {
    const j = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "null")
    if (!j || typeof j.enforced !== "boolean") return null
    return { loading: true, enabled: true, enforced: j.enforced, signedIn: j.signedIn === true && hasTokens(), email: j.email, entitlements: j.entitlements }
  } catch { return null }
}

export async function refreshAccountSession(): Promise<void> {
  if (!accountsAvailable()) { snapshot = { loading: false, enabled: false, enforced: false, signedIn: false }; emit(); return }
  const res = await apiCall<{ enabled?: boolean; enforced?: boolean; signedIn?: boolean; email?: string; entitlements?: AccessSnapshot["entitlements"] }>("/api/account/session")
  if (res.ok) {
    const d = res.data
    if (d.signedIn !== true && hasTokens()) clearTokens() // the server no longer accepts this sign-in (ended or suspended)
    snapshot = { loading: false, enabled: d.enabled === true, enforced: d.enforced === true, signedIn: d.signedIn === true && hasTokens(), email: d.email, entitlements: d.entitlements }
    persist(snapshot)
  } else {
    snapshot = { ...snapshot, loading: false, enabled: snapshot.enabled || snapshot.loading === false } // offline: keep the last known answer
  }
  emit()
}

export const notifySessionChanged = () => { if (typeof window !== "undefined") window.dispatchEvent(new Event("clinexia:session-changed")) }

export function useAccountSession(): AccountSession {
  const value = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => snapshot,
    () => LOADING,
  )
  useEffect(() => {
    if (started) return
    started = true
    const last = restore()
    if (last) { snapshot = last; emit() }
    void refreshAccountSession()
    let at = Date.now()
    const again = () => {
      if (document.visibilityState !== "visible" || Date.now() - at < 3000) return
      at = Date.now()
      void checkPendingPayment().then(() => refreshAccountSession())
    }
    document.addEventListener("visibilitychange", again)
    window.addEventListener("focus", again)
    window.addEventListener("clinexia:session-changed", () => void refreshAccountSession())
    void listenAppActive(again) // Android: back from the browser after paying, or from another app
  }, [])
  return value
}

export async function signOutNow(): Promise<void> {
  if (hasTokens()) await apiCall("/api/account/logout", { body: {} }).catch(() => undefined) // ends the session on the server (best effort)
  clearTokens()
  writeSessionState(localStorage, { enforced: snapshot.enforced, signedIn: false })
  snapshot = { ...snapshot, signedIn: false, email: undefined, entitlements: undefined }
  persist(snapshot)
  emit()
  notifySessionChanged()
}
