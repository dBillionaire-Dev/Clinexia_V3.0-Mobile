"use client"
import { getSettings } from "@/lib/client-store"
import { getAnonymousId } from "./client-id"
import { createOutbox } from "./outbox"
import { flushEvents } from "./sync"
import { analyticsAvailable, sendEvents, sendPresence } from "./http"
import { ANALYTICS_APP_VERSION, ANALYTICS_ENVIRONMENT, ANALYTICS_SOURCE } from "./config"

/** Analytics run only in the Android app, only when a backend URL was configured at build time, and only if the user has not opted out. */
export function analyticsEnabled(): boolean {
  return analyticsAvailable() && getSettings().analytics
}

const RETRY_DELAYS_MS = [15_000, 60_000, 5 * 60_000]

const outbox = () => createOutbox(localStorage)
let inFlight: Promise<number> | null = null
let rerunRequested = false
let retryTimer: ReturnType<typeof setTimeout> | null = null
let consecutiveFailures = 0

function scheduleRetry() {
  if (retryTimer) return
  const delay = RETRY_DELAYS_MS[Math.min(consecutiveFailures, RETRY_DELAYS_MS.length - 1)]
  consecutiveFailures += 1
  retryTimer = setTimeout(() => {
    retryTimer = null
    void syncAnalytics()
  }, delay)
}

function resetBackoff() {
  consecutiveFailures = 0
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
}

/**
 * Uploads everything queued. An event queued while an upload is already running is picked up by a follow-up pass
 * (previously it waited for the next heartbeat or app launch). A temporary failure schedules an automatic retry.
 */
export function syncAnalytics(): Promise<number> {
  if (!analyticsEnabled()) return Promise.resolve(0)
  if (inFlight) { rerunRequested = true; return inFlight }

  inFlight = (async () => {
    let total = 0
    do {
      rerunRequested = false
      const box = outbox()
      const result = await flushEvents({ pending: box.pending, remove: box.remove, send: sendEvents })
      total += result.sent
      if (result.retry) scheduleRetry()
      else resetBackoff()
    } while (rerunRequested)
    return total
  })().finally(() => { inFlight = null })

  return inFlight
}

/** If the user switched sharing off, delete anything still queued from before so it can never be sent later. */
export function purgeIfOptedOut(): void {
  try {
    if (getSettings().analytics) return
    const box = outbox()
    if (box.pending().length) box.clear()
    resetBackoff()
  } catch {}
}

/** Records that a calculator or converter was used. Never includes inputs or results. Never throws. */
export async function trackCalculation(e: { calculatorId: string; calculatorName: string; category: string }) {
  try {
    if (!analyticsEnabled()) return
    outbox().add({
      id: crypto.randomUUID(),
      anonymousId: getAnonymousId(),
      calculatorId: e.calculatorId,
      calculatorName: e.calculatorName,
      category: e.category,
      occurredAt: new Date().toISOString(),
      appVersion: ANALYTICS_APP_VERSION,
      wasOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
      source: ANALYTICS_SOURCE,
      environment: ANALYTICS_ENVIRONMENT,
    })
    void syncAnalytics()
  } catch {
    // Analytics must never break a calculator.
  }
}

export async function sendPresenceHeartbeat(): Promise<void> {
  try {
    if (!analyticsEnabled()) return
    await sendPresence({ anonymousId: getAnonymousId(), source: ANALYTICS_SOURCE, environment: ANALYTICS_ENVIRONMENT, appVersion: ANALYTICS_APP_VERSION })
  } catch {}
}
