import { CapacitorHttp } from "@capacitor/core"
import { ANALYTICS_APP_VERSION, ANALYTICS_BASE_URL, ANALYTICS_ENVIRONMENT, ANALYTICS_SOURCE } from "@/lib/analytics/config"
import { getAnonymousId } from "@/lib/analytics/client-id"
import { analyticsAvailable } from "@/lib/analytics/http"
import type { FeedbackAnswers } from "./questions"
import { parseConfig, type FeedbackConfig } from "./schedule"

const TIMEOUT_MS = 8000
const CONFIG_KEY = "clinexia:feedback:config"
const CONFIG_TTL_MS = 6 * 60 * 60 * 1000

export type SubmitResult = { ok: true } | { ok: false; error: string }

/** Turns the server's reply into something a person can read. Pure, so it is tested. */
export function interpretSubmit(res: { status: number; data: unknown } | null): SubmitResult {
  if (!res) return { ok: false, error: "You seem to be offline. Your answers are saved on this phone, so you can send them when you are back online." }
  if (res.status >= 200 && res.status < 300) return { ok: true }
  if (res.status === 429) return { ok: false, error: "Too many attempts. Please try again later." }
  const message = res.data && typeof res.data === "object" ? (res.data as { error?: unknown }).error : undefined
  if ((res.status === 400 || res.status === 422) && typeof message === "string") return { ok: false, error: message }
  return { ok: false, error: "Could not send your feedback. Please try again." }
}

/** Uses the phone's own network client (like the usage statistics), so the website needs no special rules for the app. */
export const feedbackAvailable = analyticsAvailable

export async function loadConfig(): Promise<FeedbackConfig | null> {
  if (!feedbackAvailable()) return null
  let cached: { at: number; config: FeedbackConfig } | null = null
  try {
    const raw = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "null")
    const config = parseConfig(raw?.config)
    if (config && typeof raw.at === "number") cached = { at: raw.at, config }
  } catch {}
  if (cached && Date.now() - cached.at < CONFIG_TTL_MS) return cached.config
  try {
    const res = await CapacitorHttp.get({ url: `${ANALYTICS_BASE_URL}/api/feedback/config`, connectTimeout: TIMEOUT_MS, readTimeout: TIMEOUT_MS })
    const config = res.status === 200 ? parseConfig(res.data) : null
    if (!config) return cached?.config ?? null
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ at: Date.now(), config }))
    } catch {}
    return config
  } catch {
    return cached?.config ?? null
  }
}

export async function submitFeedback(answers: FeedbackAnswers, version: number): Promise<SubmitResult> {
  if (!feedbackAvailable()) return { ok: false, error: "Feedback is not available in this build." }
  try {
    const res = await CapacitorHttp.post({
      url: `${ANALYTICS_BASE_URL}/api/feedback`,
      headers: { "Content-Type": "application/json" },
      data: {
        anonymousId: getAnonymousId(),
        surveyVersion: version,
        platform: ANALYTICS_SOURCE,
        appVersion: ANALYTICS_APP_VERSION,
        environment: ANALYTICS_ENVIRONMENT,
        website: "",
        answers,
      },
      connectTimeout: TIMEOUT_MS,
      readTimeout: TIMEOUT_MS,
    })
    return interpretSubmit({ status: res.status, data: res.data })
  } catch {
    return interpretSubmit(null)
  }
}
