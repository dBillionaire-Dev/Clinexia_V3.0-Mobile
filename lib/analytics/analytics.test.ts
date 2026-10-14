import { describe, expect, it } from "vitest"
import { createOutbox, OUTBOX_CAP } from "./outbox"
import { BATCH_SIZE, flushEvents, interpretResponse, type SendResult } from "./sync"
import { getAnonymousId } from "./client-id"
import type { CalculationEvent } from "./types"

function memory() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}
let n = 0
const ev = (over: Partial<CalculationEvent> = {}): CalculationEvent => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  anonymousId: "anon", calculatorId: "bmi", calculatorName: "BMI", category: "general",
  occurredAt: new Date(1_700_000_000_000 + n * 1000).toISOString(),
  appVersion: "3.0.4", wasOffline: false, source: "android", environment: "test", ...over,
})
const done = (events: CalculationEvent[]): SendResult => ({ kind: "done", finished: events.map((e) => e.id) })

describe("anonymous id", () => {
  it("is created once and then reused", () => {
    const s = memory()
    const a = getAnonymousId(s)
    expect(a).toMatch(/^[0-9a-f-]{36}$/)
    expect(getAnonymousId(s)).toBe(a)
  })
})

describe("outbox", () => {
  it("queues, de-duplicates by id and removes accepted events", () => {
    const box = createOutbox(memory())
    const a = ev(); const b = ev()
    box.add(a); box.add(a); box.add(b)
    expect(box.pending()).toHaveLength(2)
    box.remove([a.id])
    expect(box.pending().map((e) => e.id)).toEqual([b.id])
  })
  it("returns oldest first and survives corrupt storage", () => {
    const s = memory()
    s.setItem("convertlab:analytics-outbox:v1", "{not json")
    const box = createOutbox(s)
    expect(box.pending()).toEqual([])
    const late = ev({ occurredAt: "2030-01-01T00:00:00.000Z" }); const early = ev({ occurredAt: "2020-01-01T00:00:00.000Z" })
    box.add(late); box.add(early)
    expect(box.pending()[0].id).toBe(early.id)
  })
  it("drops the oldest events past the cap", () => {
    const box = createOutbox(memory(), "k", 3)
    const all = [ev(), ev(), ev(), ev(), ev()]
    all.forEach((e) => box.add(e))
    expect(box.pending().map((e) => e.id)).toEqual(all.slice(-3).map((e) => e.id))
  })
  it("holds a few days of offline use (cap is 5000)", () => {
    expect(OUTBOX_CAP).toBe(5000)
  })
  it("when storage is full, sheds the oldest events and keeps the newest", () => {
    // A store that refuses to hold more than ~2 events' worth of text.
    const m = new Map<string, string>()
    const small = {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { if (v.length > 900) throw new Error("QuotaExceededError"); m.set(k, v) },
    }
    const box = createOutbox(small, "k", 1000)
    const all = Array.from({ length: 8 }, () => ev())
    all.forEach((e) => box.add(e))
    const kept = box.pending().map((e) => e.id)
    expect(kept.length).toBeGreaterThan(0)
    expect(kept[kept.length - 1]).toBe(all[all.length - 1].id)
  })
})

describe("interpretResponse", () => {
  it("treats a network failure as retry", () => {
    expect(interpretResponse(null)).toEqual({ kind: "retry" })
  })
  it("collects accepted and rejected ids from a 2xx, as an object or a JSON string", () => {
    expect(interpretResponse({ status: 200, data: { accepted: ["a"], rejected: ["b"] } })).toEqual({ kind: "done", finished: ["a", "b"] })
    expect(interpretResponse({ status: 200, data: JSON.stringify({ accepted: ["a"] }) })).toEqual({ kind: "done", finished: ["a"] })
  })
  it("a 2xx with no ids finishes nothing, so events stay queued", () => {
    expect(interpretResponse({ status: 200, data: {} })).toEqual({ kind: "done", finished: [] })
    expect(interpretResponse({ status: 200, data: "oops" })).toEqual({ kind: "done", finished: [] })
  })
  it("maps bad-payload statuses to invalid and server trouble to retry", () => {
    for (const status of [400, 413, 422]) expect(interpretResponse({ status, data: null })).toEqual({ kind: "invalid" })
    for (const status of [401, 429, 500, 502, 503]) expect(interpretResponse({ status, data: null })).toEqual({ kind: "retry" })
  })
})

describe("flushEvents", () => {
  it("sends in batches of 100 and removes finished ids", async () => {
    const box = createOutbox(memory(), "k", 1000)
    for (let i = 0; i < 250; i++) box.add(ev())
    const sizes: number[] = []
    const r = await flushEvents({
      pending: box.pending, remove: box.remove,
      send: async (batch) => { sizes.push(batch.length); return done(batch) },
    })
    expect(sizes).toEqual([BATCH_SIZE, BATCH_SIZE, 50])
    expect(r).toEqual({ sent: 250, retry: false })
    expect(box.pending()).toHaveLength(0)
  })
  it("keeps everything and stops when the server has a temporary problem", async () => {
    const box = createOutbox(memory(), "k", 1000)
    for (let i = 0; i < 150; i++) box.add(ev())
    let calls = 0
    const r = await flushEvents({ pending: box.pending, remove: box.remove, send: async () => { calls++; return { kind: "retry" } } })
    expect(r).toEqual({ sent: 0, retry: true })
    expect(calls).toBe(1)
    expect(box.pending()).toHaveLength(150)
  })
  it("only removes the ids the server finished, and asks for a retry for the rest", async () => {
    const box = createOutbox(memory())
    const a = ev(); const b = ev()
    box.add(a); box.add(b)
    const r = await flushEvents({ pending: box.pending, remove: box.remove, send: async () => ({ kind: "done", finished: [a.id] }) })
    expect(box.pending().map((e) => e.id)).toEqual([b.id])
    expect(r.retry).toBe(true)
  })
  it("deletes events the server permanently rejected instead of resending them forever", async () => {
    const box = createOutbox(memory())
    const good = ev(); const bad = ev()
    box.add(good); box.add(bad)
    const r = await flushEvents({
      pending: box.pending, remove: box.remove,
      send: async () => ({ kind: "done", finished: [good.id, bad.id] }),
    })
    expect(box.pending()).toHaveLength(0)
    expect(r.retry).toBe(false)
  })
  it("a poison event at the front cannot block the events behind it", async () => {
    const box = createOutbox(memory(), "k", 1000)
    const poison = ev({ occurredAt: "2020-01-01T00:00:00.000Z" })
    const good = [ev(), ev(), ev(), ev()]
    box.add(poison); good.forEach((e) => box.add(e))
    const stored: string[] = []
    const r = await flushEvents({
      pending: box.pending, remove: box.remove,
      send: async (batch) => {
        if (batch.some((e) => e.id === poison.id)) return { kind: "invalid" }
        batch.forEach((e) => stored.push(e.id))
        return done(batch)
      },
    })
    expect(stored.sort()).toEqual(good.map((e) => e.id).sort())
    expect(box.pending()).toHaveLength(0)
    expect(r.retry).toBe(false)
  })
  it("keeps the rest queued if a temporary failure happens while isolating a bad batch", async () => {
    const box = createOutbox(memory())
    const [a, b, c] = [ev(), ev(), ev()]
    ;[a, b, c].forEach((e) => box.add(e))
    let call = 0
    const r = await flushEvents({
      pending: box.pending, remove: box.remove,
      send: async (batch) => {
        call++
        if (call === 1) return { kind: "invalid" }
        if (batch[0].id === a.id) return done(batch)
        return { kind: "retry" }
      },
    })
    expect(r.retry).toBe(true)
    expect(box.pending().map((e) => e.id)).toEqual([b.id, c.id])
  })
})
