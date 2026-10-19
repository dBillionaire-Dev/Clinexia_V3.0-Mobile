import { CapacitorHttp } from "@capacitor/core"
import { getAnonymousId } from "@/lib/analytics/client-id"
import { ANALYTICS_BASE_URL } from "@/lib/analytics/config"
import { analyticsAvailable } from "@/lib/analytics/http"

/** Has this phone already answered this round? Stored on the server, so it still holds if the app's saved state was lost. */
export async function checkAnsweredOnServer(version: number): Promise<boolean> {
  if (!analyticsAvailable()) return false
  try {
    const res = await CapacitorHttp.get({ url: `${ANALYTICS_BASE_URL}/api/feedback/answered?v=${version}&aid=${encodeURIComponent(getAnonymousId())}`, connectTimeout: 8000, readTimeout: 8000 })
    return res.status === 200 && (typeof res.data === "string" ? JSON.parse(res.data) : res.data)?.answered === true
  } catch { return false }
}
