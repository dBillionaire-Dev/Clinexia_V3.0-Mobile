"use client"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { confirmDialog } from "@/components/app-dialogs"
import { apiCall } from "@/lib/billing/api"
import { notifySessionChanged } from "@/lib/billing/session"
import { clearTokens, setAuthNotice } from "@/lib/billing/tokens"
import { preparePhoto } from "@/lib/avatar-client"
import { BACKGROUND, rolesFor } from "@/lib/feedback/questions"
import { PasswordInput } from "./password-input"
import { UserAvatar } from "./user-avatar"

export interface ProfileData { fullName: string; accountType: "individual" | "enterprise"; background: string | null; role: string | null }
const label = "mb-1 block text-xs font-extrabold"

/** Your photo, your details and your password, on the account screen. */
export function ProfileSettings({ email, avatarUrl, avatarSource, profile, onChanged }: { email: string; avatarUrl?: string; avatarSource?: "upload" | "google"; profile: ProfileData | null; onChanged: () => void }) {
  const router = useRouter()
  const file = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoMsg, setPhotoMsg] = useState("")
  const [d, setD] = useState({ fullName: profile?.fullName ?? "", background: profile?.background ?? "", role: profile?.role ?? "" })
  const [detailsBusy, setDetailsBusy] = useState(false)
  const [detailsMsg, setDetailsMsg] = useState("")
  const [pw, setPw] = useState({ current: "", next: "", again: "" })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState("")
  const initial = (profile?.fullName || email).trim().charAt(0).toUpperCase()

  async function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    setPhotoBusy(true); setPhotoMsg("")
    const prepared = await preparePhoto(f)
    if (!prepared.ok) { setPhotoBusy(false); return setPhotoMsg(prepared.error) }
    const r = await apiCall("/api/account/avatar", { body: { image: prepared.image } })
    setPhotoBusy(false)
    if (r.ok) { setPhotoMsg("Photo saved."); notifySessionChanged(); onChanged() } else setPhotoMsg(r.error)
  }
  async function removePhoto() {
    if (!(await confirmDialog({ title: "Remove your photo?", description: "Your initial (or your Google photo, if you signed in with Google) will show instead.", confirmLabel: "Remove" }))) return
    setPhotoBusy(true); setPhotoMsg("")
    const r = await apiCall("/api/account/avatar", { body: { remove: true } })
    setPhotoBusy(false)
    if (r.ok) { setPhotoMsg("Photo removed."); notifySessionChanged(); onChanged() } else setPhotoMsg(r.error)
  }
  async function saveDetails(e: React.FormEvent) {
    e.preventDefault()
    setDetailsBusy(true); setDetailsMsg("")
    const r = await apiCall("/api/account/profile", { body: d })
    setDetailsBusy(false)
    if (r.ok) { setDetailsMsg("Saved."); onChanged() } else setDetailsMsg(r.error)
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pw.next !== pw.again) return setPwError("The two new passwords do not match.")
    setPwBusy(true); setPwError("")
    const r = await apiCall("/api/account/password", { body: { current: pw.current, next: pw.next } })
    if (r.ok) { clearTokens(); setAuthNotice("Your password was changed. Sign in with the new password."); notifySessionChanged(); router.push("/login"); return }
    setPwBusy(false); setPwError(r.error)
  }

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-4">
        <h2 className="font-black">Your photo</h2>
        <div className="flex items-center gap-4">
          <UserAvatar url={avatarUrl} initial={initial} size={72} fallbackClassName="bg-[#073a68] text-white" />
          <div className="space-y-2 text-sm">
            <input ref={file} type="file" accept="image/*" className="hidden" onChange={choose} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="pill" disabled={photoBusy} onClick={() => file.current?.click()}>{photoBusy ? <Loader2 size={14} className="inline animate-spin" /> : avatarUrl ? "Change photo" : "Upload photo"}</button>
              {avatarUrl && avatarSource === "upload" && <button type="button" className="muted text-xs underline" disabled={photoBusy} onClick={removePhoto}>Remove photo</button>}
            </div>
            <p className="muted text-xs">{avatarSource === "google" ? "Showing your Google photo. Upload one to use a different picture. " : ""}JPEG or PNG, up to 2 MB.</p>
            {photoMsg && <p role="status" className="text-xs font-semibold">{photoMsg}</p>}
          </div>
        </div>
      </section>

      {profile && (
        <form onSubmit={saveDetails} className="card space-y-3 p-4">
          <h2 className="font-black">Your details</h2>
          <label className="block"><span className={label}>Full name</span><input className="field" value={d.fullName} onChange={(e) => setD({ ...d, fullName: e.target.value })} autoComplete="name" required /></label>
          <p className="muted text-xs">Email: {email}. This is what you sign in with, so it cannot be changed here.</p>
          {profile.accountType === "individual" && (
            <>
              <label className="block"><span className={label}>Do you work in healthcare?</span>
                <select className="field" value={d.background} onChange={(e) => setD({ ...d, background: e.target.value, role: "" })} required><option value="">Choose…</option>{BACKGROUND.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select></label>
              {d.background && <label className="block"><span className={label}>What describes you best?</span>
                <select className="field" value={d.role} onChange={(e) => setD({ ...d, role: e.target.value })} required><option value="">Choose…</option>{rolesFor(d.background).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                <span className="muted mt-1 block text-xs">For your profile only. It never changes what you can access.</span></label>}
            </>
          )}
          <div className="flex flex-wrap items-center gap-3"><button className="primary" disabled={detailsBusy}>{detailsBusy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Save details"}</button>{detailsMsg && <span role="status" className="text-sm font-semibold">{detailsMsg}</span>}</div>
        </form>
      )}

      <form onSubmit={changePassword} className="card space-y-3 p-4">
        <h2 className="font-black">Change your password</h2>
        <label className="block"><span className={label}>Current password</span><PasswordInput value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required /></label>
        <label className="block"><span className={label}>New password</span><PasswordInput value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" minLength={10} required /><span className="muted mt-1 block text-xs">At least 10 characters.</span></label>
        <label className="block"><span className={label}>Repeat the new password</span><PasswordInput value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} autoComplete="new-password" minLength={10} required /></label>
        <p className="muted text-xs">You will be signed out everywhere and sign in again with the new password.</p>
        {pwError && <p role="alert" className="text-sm font-semibold text-red-600">{pwError}</p>}
        <button className="primary" disabled={pwBusy}>{pwBusy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Change password"}</button>
      </form>
    </div>
  )
}
