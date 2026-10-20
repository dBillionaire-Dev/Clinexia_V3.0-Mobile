// Phone notifications (Firebase Cloud Messaging) for the Android app. The notification plugin is reached by name, so this file
// compiles even before the plugin is installed; until it is (and the app is rebuilt) every call quietly reports "unsupported".
import { registerPlugin } from "@capacitor/core"
import { getAnonymousId } from "@/lib/analytics/client-id"
import { apiCall } from "@/lib/billing/api"
import { isNative } from "@/lib/native"

interface Handle { remove(): Promise<void> }
interface PushPlugin {
  checkPermissions(): Promise<{ receive: string }>
  requestPermissions(): Promise<{ receive: string }>
  register(): Promise<void>
  addListener(event: string, cb: (e: any) => void): Promise<Handle>
}
const Push = registerPlugin<PushPlugin>("PushNotifications")
const TOKEN_KEY = "clinexia:push-token"

export type PushState = "unsupported" | "granted" | "denied" | "prompt"
export interface PushMessage { title: string; body: string; url: string }

export async function pushState(): Promise<PushState> {
  if (!isNative()) return "unsupported"
  try {
    const r = await Push.checkPermissions()
    return r.receive === "granted" ? "granted" : r.receive === "denied" ? "denied" : "prompt"
  } catch { return "unsupported" }
}

/** Asks Android for permission (once) and signs this phone up for notifications. */
export async function enablePush(): Promise<PushState> {
  if (!isNative()) return "unsupported"
  try {
    let r = await Push.checkPermissions()
    if (r.receive !== "granted" && r.receive !== "denied") r = await Push.requestPermissions()
    if (r.receive !== "granted") return "denied"
    await Push.register()
    return "granted"
  } catch { return "unsupported" }
}

const rememberedToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }

/** Tells the Clinexia server this phone's notification address. While someone is signed in the phone is linked to their account. */
export async function sendToken(token: string): Promise<void> {
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* ignore */ }
  await apiCall("/api/push/register", { body: { token, anonymousId: getAnonymousId() } })
}
/** After signing in or out, register again so the link to the account is right. */
export async function refreshRegistration(): Promise<void> { const t = rememberedToken(); if (t) await sendToken(t) }

let started = false
/** Listens for notifications. Safe to call more than once. If notifications were already allowed, registers straight away. */
export async function startPush(on: { onForeground: (m: PushMessage) => void; onOpen: (url: string) => void }): Promise<void> {
  if (started || !isNative()) return
  started = true
  try {
    await Push.addListener("registration", (e) => { if (e?.value) void sendToken(String(e.value)) })
    await Push.addListener("pushNotificationReceived", (n) => on.onForeground({ title: n?.title ?? "", body: n?.body ?? "", url: String(n?.data?.url ?? "") }))
    await Push.addListener("pushNotificationActionPerformed", (a) => { const url = String(a?.notification?.data?.url ?? ""); if (url) on.onOpen(url) })
    if ((await pushState()) === "granted") await Push.register()
  } catch { /* the plugin is not installed in this build */ }
}
