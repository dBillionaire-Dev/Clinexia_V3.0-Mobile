import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Production: the static export in `out/` is bundled into the app (no server).
 * Development, live reload from the Android emulator:
 *   CAPACITOR_SERVER_URL=http://10.0.2.2:3000 pnpm exec cap sync android
 * Leave CAPACITOR_SERVER_URL unset (`unset CAPACITOR_SERVER_URL`) for release builds so nothing dev-only ships.
 */
const devUrl = process.env.CAPACITOR_SERVER_URL

const config: CapacitorConfig = {
  appId: "com.clinexia.app",
  appName: "Clinexia",
  webDir: "out",
  backgroundColor: "#073a68",
  server: {
    androidScheme: "https",
    ...(devUrl ? { url: devUrl, cleartext: devUrl.startsWith("http://") } : {}),
  },
  plugins: {
    SplashScreen: { launchShowDuration: 2500, launchAutoHide: true, backgroundColor: "#073a68", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#073a68", overlaysWebView: false },
    Keyboard: { resize: "body", resizeOnFullScreen: true },
  },
}

export default config
