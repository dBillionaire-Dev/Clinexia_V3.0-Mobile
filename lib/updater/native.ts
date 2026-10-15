import { registerPlugin } from "@capacitor/core"

export interface ClinexiaUpdaterPlugin {
  isEnabled(): Promise<{ enabled: boolean }>
  fetchManifest(options: { url: string; versionCode: number }): Promise<{ body: string }>
  downloadUpdate(options: { url: string; sha256: string; versionCode: number }): Promise<void>
  canInstall(): Promise<{ granted: boolean }>
  openInstallSettings(): Promise<void>
  installUpdate(options: { versionCode: number }): Promise<void>
  cleanup(): Promise<void>
  addListener(
    eventName: "downloadProgress",
    listener: (progress: { received: number; total: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>
}

/** Native plugin. In the Google Play flavor it only answers isEnabled() = false. */
export const ClinexiaUpdater = registerPlugin<ClinexiaUpdaterPlugin>("ClinexiaUpdater")
