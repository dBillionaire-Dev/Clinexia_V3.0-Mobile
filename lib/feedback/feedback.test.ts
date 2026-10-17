import { describe, expect, it } from "vitest"
import { PRICE_INDIVIDUAL, PRICE_TEAM, TEXT_LIMIT, validateAnswers } from "./questions"
import {
  DAY_MS,
  HOUR_MS,
  DEFAULT_CONFIG,
  MIN_PAGE_AGE_MS,
  decidePrompt,
  excludedRoute,
  freshState,
  isEngaged,
  markDone,
  normalizeState,
  parseConfig,
  pauseForHours,
  recordVisit,
  snooze,
  stopAsking,
  type FeedbackConfig,
  type PromptContext,
} from "./schedule"
import { interpretSubmit } from "./http"

const valid = {
  rating: 5,
  background: "medical",
  role: "laboratory",
  devices: ["phone_browser"],
  context: "office",
  officeType: "laboratory",
  payInterest: "yes",
  payWho: "workplace",
  priceIndividual: "3.5_5",
  priceTeam: "35_50",
  improve: " faster loading ",
}

describe("validateAnswers", () => {
  it("accepts a complete answer and tidies the text", () => {
    const r = validateAnswers(valid)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.improve).toBe("faster loading")
  })
  it("needs a 1-5 rating", () => {
    for (const rating of [0, 6, 2.5, "x", undefined]) expect(validateAnswers({ ...valid, rating }).ok).toBe(false)
  })
  it("role must belong to the chosen background", () => {
    expect(validateAnswers({ ...valid, background: "non_medical", role: "laboratory" }).ok).toBe(false)
    expect(validateAnswers({ ...valid, background: "non_medical", role: "student" }).ok).toBe(true)
  })
  it("asks for the workplace kind only when it is work use, and drops it for personal use", () => {
    expect(validateAnswers({ ...valid, officeType: undefined }).ok).toBe(false)
    const personal = validateAnswers({ ...valid, context: "personal", officeType: "hospital" })
    expect(personal.ok && personal.value.officeType).toBeFalsy()
  })
  it("asks for a price only when someone would (maybe) pay, and drops prices for 'no'", () => {
    expect(validateAnswers({ ...valid, priceIndividual: undefined }).ok).toBe(false)
    const no = validateAnswers({ ...valid, payInterest: "no", priceIndividual: undefined })
    expect(no.ok).toBe(true)
    const noWithPrice = validateAnswers({ ...valid, payInterest: "no" })
    expect(noWithPrice.ok && noWithPrice.value.priceIndividual).toBeFalsy()
  })
  it("rejects values that are not on the lists, and needs at least one known device", () => {
    expect(validateAnswers({ ...valid, devices: ["fax_machine"] }).ok).toBe(false)
    expect(validateAnswers({ ...valid, payInterest: "sure" }).ok).toBe(false)
    expect(validateAnswers({ ...valid, devices: ["phone_browser", "bogus", "phone_browser"] })).toMatchObject({ ok: true, value: { devices: ["phone_browser"] } })
  })
  it("limits and cleans free text, and treats blank as nothing", () => {
    const r = validateAnswers({ ...valid, improve: "a".repeat(5000), missing: "   ", other: "x\u0000y" })
    expect(r.ok && r.value.improve?.length).toBe(TEXT_LIMIT)
    expect(r.ok && r.value.missing).toBeUndefined()
    expect(r.ok && r.value.other).toBe("xy")
  })
  it("rejects non-objects", () => {
    expect(validateAnswers(null).ok).toBe(false)
    expect(validateAnswers("hi").ok).toBe(false)
  })
})

const config: FeedbackConfig = { enabled: true, version: 1, remindAfterHours: 8, maxReminders: 3 }
const NOW = 1_800_000_000_000
const ctx = (over: Partial<PromptContext> = {}): PromptContext => ({
  config,
  state: freshState(1),
  now: NOW,
  engaged: true,
  online: true,
  pageAgeMs: MIN_PAGE_AGE_MS + 1,
  onExcludedRoute: false,
  ...over,
})

describe("when the popup shows", () => {
  it("shows to an engaged, online person after the first minute", () => {
    expect(decidePrompt(ctx()).show).toBe(true)
  })
  it("stays away until the app has been used", () => {
    expect(decidePrompt(ctx({ engaged: false })).show).toBe(false)
    expect(isEngaged({ calculations: 3, visitDays: 0 })).toBe(true)
    expect(isEngaged({ calculations: 2, visitDays: 2 })).toBe(false)
    expect(isEngaged({ calculations: null, visitDays: 3 })).toBe(true)
  })
  it("waits for the first minute, and for a connection, and for normal pages", () => {
    expect(decidePrompt(ctx({ pageAgeMs: 5000 })).show).toBe(false)
    expect(decidePrompt(ctx({ online: false })).show).toBe(false)
    expect(decidePrompt(ctx({ onExcludedRoute: true })).show).toBe(false)
    for (const p of ["/admin", "/admin/feedback", "/feedback", "/diagnostics", "/welcome"]) expect(excludedRoute(p)).toBe(true)
    expect(excludedRoute("/calculators/renal")).toBe(false)
    expect(excludedRoute("/feedbacks-are-fun")).toBe(false)
  })
  it("is off while paused", () => {
    expect(decidePrompt(ctx({ config: { ...config, enabled: false } })).show).toBe(false)
    expect(DEFAULT_CONFIG.enabled).toBe(false)
  })
})

describe("later, done and never again", () => {
  it("Later hides it and brings it back after the configured hours", () => {
    const later = snooze(freshState(1), config, NOW)
    expect(decidePrompt(ctx({ state: later })).show).toBe(false)
    expect(decidePrompt(ctx({ state: later, now: NOW + 7 * HOUR_MS })).show).toBe(false)
    expect(decidePrompt(ctx({ state: later, now: NOW + 8 * HOUR_MS })).show).toBe(true)
  })
  it("the wait follows the setting, so 1 hour and 72 hours both work", () => {
    expect(decidePrompt(ctx({ state: snooze(freshState(1), { ...config, remindAfterHours: 1 }, NOW), now: NOW + HOUR_MS })).show).toBe(true)
    const long = snooze(freshState(1), { ...config, remindAfterHours: 72 }, NOW)
    expect(decidePrompt(ctx({ state: long, now: NOW + 71 * HOUR_MS })).show).toBe(false)
    expect(decidePrompt(ctx({ state: long, now: NOW + 72 * HOUR_MS })).show).toBe(true)
  })
  it("a high maximum keeps asking through many Laters, and the limit still ends it", () => {
    const many = { ...config, maxReminders: 50 }
    let s = freshState(1)
    for (let i = 0; i < 49; i++) s = snooze(s, many, NOW + i * 10 * HOUR_MS)
    expect(s.stoppedAt).toBeNull()
    s = snooze(s, many, NOW + 500 * HOUR_MS)
    expect(s.stoppedAt).not.toBeNull()
  })
  it("stops for good after the maximum number of Laters", () => {
    let s = freshState(1)
    for (let i = 0; i < 3; i++) s = snooze(s, config, NOW + i * 10 * DAY_MS)
    expect(s.stoppedAt).not.toBeNull()
    expect(decidePrompt(ctx({ state: s, now: NOW + 100 * DAY_MS })).show).toBe(false)
  })
  it("never returns once answered or once the person says stop", () => {
    expect(decidePrompt(ctx({ state: markDone(freshState(1), NOW), now: NOW + 365 * DAY_MS })).show).toBe(false)
    expect(decidePrompt(ctx({ state: stopAsking(freshState(1), NOW), now: NOW + 365 * DAY_MS })).show).toBe(false)
  })
  it("a short pause after starting the form does not use up a reminder", () => {
    const paused = pauseForHours(freshState(1), NOW, 1)
    expect(paused.laterCount).toBe(0)
    expect(decidePrompt(ctx({ state: paused, now: NOW + HOUR_MS - 1 })).show).toBe(false)
    expect(decidePrompt(ctx({ state: paused, now: NOW + HOUR_MS })).show).toBe(true)
  })
  it("a new round (higher version) asks everyone again but keeps their visit history", () => {
    const answered = recordVisit(markDone(freshState(1), NOW), "2026-10-01")
    const next = normalizeState(answered, { version: 2 })
    expect(next).toMatchObject({ version: 2, doneAt: null, stoppedAt: null, laterCount: 0, visitDays: ["2026-10-01"] })
    expect(decidePrompt(ctx({ config: { ...config, version: 2 }, state: next })).show).toBe(true)
  })
  it("repairs damaged saved state", () => {
    expect(normalizeState("junk", config)).toEqual(freshState(1))
    expect(normalizeState({ version: 1, laterCount: -4, nextAt: "x", visitDays: [1, "2026-01-01"] }, config)).toMatchObject({ laterCount: 0, nextAt: 0, visitDays: ["2026-01-01"] })
  })
  it("records each visit day once and keeps the latest 14", () => {
    let s = freshState(1)
    for (let d = 1; d <= 20; d++) s = recordVisit(recordVisit(s, `2026-01-${String(d).padStart(2, "0")}`), `2026-01-${String(d).padStart(2, "0")}`)
    expect(s.visitDays).toHaveLength(14)
    expect(s.visitDays[13]).toBe("2026-01-20")
  })
})

describe("config and price bands (hours, naira)", () => {
  it("reads the server config in hours and keeps it in range", () => {
    expect(parseConfig({ enabled: true, version: 2, remindAfterHours: 8, maxReminders: 50 })).toEqual({ enabled: true, version: 2, remindAfterHours: 8, maxReminders: 50 })
    expect(parseConfig({ enabled: true, version: 1, remindAfterHours: 0, maxReminders: 99 })).toMatchObject({ remindAfterHours: 1, maxReminders: 50 })
    expect(parseConfig({ enabled: true, version: 1, remindAfterHours: 99999, maxReminders: -2 })).toMatchObject({ remindAfterHours: 8760, maxReminders: 0 })
  })
  it("still understands an older server that sent days", () => {
    expect(parseConfig({ enabled: true, version: 1, remindAfterDays: 7, maxReminders: 3 })).toMatchObject({ remindAfterHours: 168 })
  })
  it("rejects a config with no usable wait", () => {
    expect(parseConfig({ enabled: true, version: 1, maxReminders: 3 })).toBeNull()
    expect(parseConfig(null)).toBeNull()
  })
  it("price bands are in naira, every value is unique, and each list is ordered low to high", () => {
    for (const bands of [PRICE_INDIVIDUAL, PRICE_TEAM]) {
      expect(new Set(bands.map((b) => b.value)).size).toBe(bands.length)
      expect(bands.map((b) => b.mid)).toEqual([...bands.map((b) => b.mid)].sort((a, b) => a - b))
      for (const b of bands.slice(1)) expect(b.label).toContain("₦")
    }
  })
  it("the form accepts the naira band values", () => {
    expect(validateAnswers({ ...valid, priceIndividual: "6_10", priceTeam: "over_100" }).ok).toBe(true)
    expect(validateAnswers({ ...valid, priceIndividual: "3_5" }).ok).toBe(false) // an old dollar band is no longer valid
  })
})

describe("reply from the server", () => {
  it("success, offline, rate limit and a readable validation message", () => {
    expect(interpretSubmit({ status: 204, data: "" })).toEqual({ ok: true })
    expect(interpretSubmit(null)).toMatchObject({ ok: false })
    expect(interpretSubmit({ status: 429, data: {} })).toMatchObject({ ok: false, error: expect.stringContaining("Too many") })
    expect(interpretSubmit({ status: 422, data: { error: "Please choose a rating from 1 to 5." } })).toEqual({ ok: false, error: "Please choose a rating from 1 to 5." })
    expect(interpretSubmit({ status: 500, data: null })).toMatchObject({ ok: false })
  })
})
