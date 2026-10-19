"use client"

// Themed replacements for window.confirm / window.prompt, in the app's own style. Call from anywhere (no setup):
//   if (await confirmDialog({ title: "Sign out?" })) ...
//   const reason = await promptDialog({ title: "Why?", label: "Reason" })   // text, or null if cancelled
// The Android back button closes an open dialog (it cancels it).
import { useEffect, useState, type ReactNode } from "react"
import { createRoot } from "react-dom/client"

export interface ConfirmOptions { title: string; description?: ReactNode; confirmLabel?: string; cancelLabel?: string; destructive?: boolean }
export interface PromptOptions extends ConfirmOptions { label: string; placeholder?: string; multiline?: boolean; validate?: (value: string) => string | null }

function Modal({ opts, prompt, onDone }: { opts: ConfirmOptions | PromptOptions; prompt: boolean; onDone: (v: string | boolean | null) => void }) {
  const [value, setValue] = useState("")
  const [touched, setTouched] = useState(false)
  const p = opts as PromptOptions
  const cancel = () => onDone(prompt ? null : false)

  useEffect(() => {
    const root = document.documentElement
    const had = root.dataset.overlay
    root.dataset.overlay = "1"
    const onBack = () => cancel()
    window.addEventListener("convertlab:close-overlay", onBack)
    return () => { window.removeEventListener("convertlab:close-overlay", onBack); if (had) root.dataset.overlay = had; else delete root.dataset.overlay }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trimmed = value.trim()
  const error = !prompt ? null : p.validate ? p.validate(trimmed) : trimmed ? null : "This is required."
  const submit = () => { if (prompt) { setTouched(true); if (error) return; onDone(trimmed) } else onDone(true) }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:items-center" onClick={cancel}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit() }} role="alertdialog" aria-modal="true" aria-label={opts.title} className="card w-full max-w-sm space-y-3 p-4">
        <h2 className="text-base font-black">{opts.title}</h2>
        {opts.description ? <div className="muted text-sm leading-5">{opts.description}</div> : null}
        {prompt && (
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold">{p.label}</span>
            {p.multiline ? <textarea autoFocus rows={3} className="field" value={value} placeholder={p.placeholder} onChange={(e) => setValue(e.target.value)} /> : <input autoFocus className="field" value={value} placeholder={p.placeholder} onChange={(e) => setValue(e.target.value)} />}
            {touched && error ? <span role="alert" className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
          </label>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" className="pill flex-1 py-3" onClick={cancel}>{opts.cancelLabel ?? "Cancel"}</button>
          <button type="submit" className="primary flex-1" style={opts.destructive ? { background: "#dc2626", boxShadow: "none" } : undefined}>{opts.confirmLabel ?? (prompt ? "Continue" : "Confirm")}</button>
        </div>
      </form>
    </div>
  )
}

function show(opts: ConfirmOptions | PromptOptions, prompt: boolean): Promise<string | boolean | null> {
  if (typeof document === "undefined") return Promise.resolve(prompt ? null : false)
  return new Promise((resolve) => {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const root = createRoot(host)
    let settled = false
    const onDone = (v: string | boolean | null) => {
      if (settled) return
      settled = true
      resolve(v)
      window.setTimeout(() => { root.unmount(); host.remove() }, 0)
    }
    root.render(<Modal opts={opts} prompt={prompt} onDone={onDone} />)
  })
}

export const confirmDialog = (opts: ConfirmOptions) => show(opts, false) as Promise<boolean>
export const promptDialog = (opts: PromptOptions) => show(opts, true) as Promise<string | null>
