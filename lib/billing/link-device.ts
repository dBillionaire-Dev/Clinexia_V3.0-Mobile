// Ties this phone's anonymous analytics ID to the signed-in account, so the Clinexia admin sees the person's real name and their whole
// calculation history (including what they did before registering). Skipped when the person has switched analytics off in Settings.
import { getAnonymousId } from "@/lib/analytics/client-id"
import { analyticsEnabled } from "@/lib/analytics/track"
import { apiCall } from "./api"

const KEY = "clinexia:device-linked:v1"

/** Added to the sign-in and sign-up requests so the link is made at the moment of registering. */
export function deviceFields(): { anonymousId?: string } {
  try { return analyticsEnabled() ? { anonymousId: getAnonymousId() } : {} } catch { return {} }
}

/** Once per phone and account (covers accounts made before linking existed). */
export async function ensureDeviceLinked(email: string): Promise<void> {
  try {
    if (!analyticsEnabled()) return
    const key = email.toLowerCase()
    if (localStorage.getItem(KEY) === key) return
    const r = await apiCall("/api/account/link-device", { body: { anonymousId: getAnonymousId() } })
    if (r.ok) localStorage.setItem(KEY, key)
  } catch { /* try again next time */ }
}
