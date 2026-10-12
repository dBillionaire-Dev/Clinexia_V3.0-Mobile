import { APP_VERSION } from "@/lib/app-info"

/**
 * Base URL of the Clinexia web backend that receives anonymous usage statistics
 * (the deployed web app, which owns /api/analytics and /api/analytics/presence).
 * Set at BUILD time (the app is a static export):  NEXT_PUBLIC_ANALYTICS_URL=https://your-site.example
 * Unset = analytics are completely off (this is the default in development).
 */
export const ANALYTICS_BASE_URL = (process.env.NEXT_PUBLIC_ANALYTICS_URL ?? "").trim().replace(/\/+$/, "")

/** "development" for dev builds so emulator testing never pollutes production numbers. */
export const ANALYTICS_ENVIRONMENT =
  process.env.NEXT_PUBLIC_APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development")

export const ANALYTICS_APP_VERSION = APP_VERSION
export const ANALYTICS_SOURCE = "android" as const

export const ANALYTICS_ENDPOINTS = {
  events: `${ANALYTICS_BASE_URL}/api/analytics`,
  presence: `${ANALYTICS_BASE_URL}/api/analytics/presence`,
}
