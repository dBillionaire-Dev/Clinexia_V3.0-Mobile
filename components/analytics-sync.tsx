"use client"
import { useEffect } from "react"
import { purgeIfOptedOut, sendPresenceHeartbeat, syncAnalytics } from "@/lib/analytics/track"
import { listenAppActive } from "@/lib/native"

const HEARTBEAT_MS = 60_000

/**
 * While the app is on screen: a presence heartbeat every minute and a flush of any queued usage events.
 * Also flushes the moment the connection returns and the moment the app is reopened from the background,
 * so calculations made offline reach the dashboard without waiting for the next minute.
 */
export function AnalyticsSync() {
  useEffect(() => {
    const visible = () => document.visibilityState === "visible"
    const ping = () => {
      purgeIfOptedOut()
      if (visible()) { void sendPresenceHeartbeat(); void syncAnalytics() }
    }

    ping()
    const timer = window.setInterval(ping, HEARTBEAT_MS)
    const onVisible = () => ping()
    const onOnline = () => ping()
    const onSettings = () => ping()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)
    window.addEventListener("convertlab:settings", onSettings)

    // Android resume is more reliable than visibilitychange inside some WebViews.
    let offActive = () => {}
    let dead = false
    void listenAppActive(ping).then((off) => { if (dead) off(); else offActive = off })

    return () => {
      dead = true
      offActive()
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
      window.removeEventListener("convertlab:settings", onSettings)
    }
  }, [])
  return null
}
