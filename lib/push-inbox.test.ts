import { describe, expect, it } from "vitest"
import { markSeen, parseSeen, unseen } from "./push-inbox"

const msg = (id: string, at: string) => ({ id, title: id, body: "", url: "", createdAt: at })
const NOW = Date.parse("2026-11-10T12:00:00Z")

describe("notifications that last until the person closes them", () => {
  it("shows each notification until it is closed, oldest first, and never twice", () => {
    const list = [msg("b", "2026-11-09T10:00:00Z"), msg("a", "2026-11-08T10:00:00Z")]
    expect(unseen(list, [], NOW).map((m) => m.id)).toEqual(["a", "b"])
    expect(unseen(list, markSeen([], "a"), NOW).map((m) => m.id)).toEqual(["b"])
    expect(unseen(list, ["a", "b"], NOW)).toEqual([])
  })
  it("drops notifications older than a week", () => { expect(unseen([msg("old", "2026-10-01T00:00:00Z")], [], NOW)).toEqual([]) })
  it("keeps a bounded, safe list of what was seen", () => {
    expect(parseSeen("junk")).toEqual([]); expect(parseSeen('[1,"a"]')).toEqual(["a"])
    let seen: string[] = []; for (let i = 0; i < 80; i++) seen = markSeen(seen, `m${i}`)
    expect(seen.length).toBe(50); expect(markSeen(["a"], "a")).toEqual(["a"])
  })
})
