"use client"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export type Group = { id: string; name: string; members: number }
type Result = { email: string; name: string; status: string; message?: string; emailed?: boolean }
type Act = (body: Record<string, unknown>, ask?: { title: string; description?: string; confirmLabel?: string; destructive?: boolean }) => Promise<{ ok: boolean; data?: any; error?: string } | null>

const STATUS: Record<string, string> = { created: "Account created", has_account: "Already has an account", no_capacity: "No free seats", invalid: "Not added", duplicate: "Listed twice", error: "Failed" }
const label = "mb-1 block text-xs font-extrabold"

/** The organisation directory on the phone: groups, and adding people (one at a time or a pasted spreadsheet). */
export function OrgDirectory({ role, groups, act }: { role: "owner" | "admin" | "staff"; groups: Group[]; act: Act }) {
  const [newGroup, setNewGroup] = useState("")
  const [names, setNames] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<"one" | "sheet">("one")
  const [one, setOne] = useState({ name: "", email: "", role: "staff", groupId: "" })
  const [csv, setCsv] = useState("")
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Result[] | null>(null)
  const [mailOff, setMailOff] = useState(false)

  async function addGroup(e: React.FormEvent) {
    e.preventDefault()
    const r = await act({ action: "groupCreate", name: newGroup })
    if (r?.ok) setNewGroup("")
  }
  async function submitPeople(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setResults(null)
    const r = await act(mode === "one" ? { action: "addPeople", rows: [{ name: one.name, email: one.email, role: one.role }], groupId: one.groupId } : { action: "addPeople", csv })
    setBusy(false)
    if (r?.ok) {
      setResults(r.data.results); setMailOff(r.data.emailConfigured === false)
      if (mode === "one") setOne({ ...one, name: "", email: "" }); else setCsv("")
    }
  }
  async function readFile(f: File | undefined) {
    if (!f) return
    if (f.size > 200_000) return setResults([{ email: "", name: "", status: "invalid", message: "That file is too large. Keep it under 200 KB." }])
    setCsv(await f.text())
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-black">Groups</h2>
        <p className="muted text-xs">Groups (departments, wards, teams) organise your members. Choose each member's group in the list above.</p>
        {groups.map((g) => (
          <div key={g.id} className="card space-y-2 p-3">
            <input className="field" aria-label={`Name of group ${g.name}`} value={names[g.id] ?? g.name} maxLength={60} onChange={(e) => setNames({ ...names, [g.id]: e.target.value })} />
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="muted">{g.members} member{g.members === 1 ? "" : "s"}</span>
              {(names[g.id] ?? g.name) !== g.name && <button className="underline" onClick={() => act({ action: "groupRename", groupId: g.id, name: names[g.id] })}>Save name</button>}
              <button className="text-red-600 underline" onClick={() => act({ action: "groupDelete", groupId: g.id }, { title: `Delete the group “${g.name}”?`, description: "Its members stay in the organisation, with no group.", confirmLabel: "Delete", destructive: true })}>Delete</button>
            </div>
          </div>
        ))}
        <form onSubmit={addGroup} className="flex gap-2"><input className="field" placeholder="New group name" value={newGroup} maxLength={60} onChange={(e) => setNewGroup(e.target.value)} required /><button className="pill px-4">Add</button></form>
      </section>

      <section className="space-y-3">
        <h2 className="font-black">Add people</h2>
        <p className="muted text-xs">Create accounts for your staff yourself. Each person gets an email to choose their own password, and uses one seat. People who already have a Clinexia account must be invited instead.</p>
        <div className="flex gap-4 text-sm font-bold" role="tablist">
          <button role="tab" aria-selected={mode === "one"} className={mode === "one" ? "underline" : "muted"} onClick={() => setMode("one")}>One person</button>
          <button role="tab" aria-selected={mode === "sheet"} className={mode === "sheet" ? "underline" : "muted"} onClick={() => setMode("sheet")}>Spreadsheet (up to 50)</button>
        </div>
        <form onSubmit={submitPeople} className="space-y-3">
          {mode === "one" ? (
            <>
              <label className="block"><span className={label}>Full name</span><input className="field" value={one.name} onChange={(e) => setOne({ ...one, name: e.target.value })} required minLength={2} maxLength={100} /></label>
              <label className="block"><span className={label}>Email</span><input className="field" type="email" value={one.email} onChange={(e) => setOne({ ...one, email: e.target.value })} required /></label>
              <label className="block"><span className={label}>Group</span><select className="field" value={one.groupId} onChange={(e) => setOne({ ...one, groupId: e.target.value })}><option value="">No group</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
              {role === "owner" && <label className="block"><span className={label}>Role</span><select className="field" value={one.role} onChange={(e) => setOne({ ...one, role: e.target.value })}><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>}
            </>
          ) : (
            <>
              <label className="block"><span className={label}>Paste your spreadsheet (first row: name, email, and optionally role, group)</span><textarea className="field min-h-32 font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={"name,email,role,group\nAda Obi,ada@example.com,staff,Laboratory"} required /></label>
              <label className="block text-sm underline">Load a .csv file<input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = "" }} /></label>
            </>
          )}
          <button className="primary" disabled={busy}>{busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : mode === "one" ? "Create account" : "Create accounts"}</button>
        </form>
        {results && (
          <div className="card space-y-2 p-3 text-sm" role="status">
            {mailOff && <p className="text-amber-800">Email is not set up on the server, so nobody was emailed. Use “Send password email” on a member once it is.</p>}
            <ul className="space-y-1">{results.map((r, i) => <li key={`${r.email}-${i}`}><strong>{r.email || "—"}</strong>: {STATUS[r.status] ?? r.status}{r.status === "created" ? (r.emailed ? ", email sent" : ", email not sent") : r.message ? `. ${r.message}` : ""}</li>)}</ul>
          </div>
        )}
      </section>
    </div>
  )
}
