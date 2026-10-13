import { Capacitor } from "@capacitor/core"

export function isNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform()
}

/** Status bar styling and splash hide. Does nothing on the web. */
export async function initNative() {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar")
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: "#073a68" })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch {}
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen")
    await SplashScreen.hide()
  } catch {}
}

/** Android hardware back button. Returns an unsubscribe function. */
export async function listenBackButton(handler: (canGoBack: boolean) => void): Promise<() => void> {
  if (!isNative()) return () => {}
  const { App } = await import("@capacitor/app")
  const sub = await App.addListener("backButton", ({ canGoBack }) => handler(canGoBack))
  return () => { void sub.remove() }
}

/** Calls the handler every time the app comes back to the foreground (Android resume). Returns an unsubscribe function. */
export async function listenAppActive(handler: () => void): Promise<() => void> {
  if (!isNative()) return () => {}
  const { App } = await import("@capacitor/app")
  const sub = await App.addListener("appStateChange", ({ isActive }) => { if (isActive) handler() })
  return () => { void sub.remove() }
}

export async function exitApp() {
  if (!isNative()) return
  const { App } = await import("@capacitor/app")
  await App.exitApp()
}

/** A light tap (Android app only). */
export async function haptic(kind: "light" | "success" = "light") {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics")
    if (kind === "success") await Haptics.notification({ type: NotificationType.Success })
    else await Haptics.impact({ style: ImpactStyle.Light })
  } catch {}
}

/** External links open in the in-app browser on Android, a new tab on the web. */
export async function openExternal(url: string) {
  if (isNative()) {
    const { Browser } = await import("@capacitor/browser")
    await Browser.open({ url })
  } else {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}
