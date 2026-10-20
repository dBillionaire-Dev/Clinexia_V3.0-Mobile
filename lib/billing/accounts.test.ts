import { describe, expect, it } from "vitest"
import { accessVerdict, isPremiumCalculator } from "./access"
import { CATEGORY_SPECIALTY, SPECIALTIES, formatMoney } from "./config"
import { GUEST_CALC_LIMIT, isGuestLimited, noteGuestCalculation, readGuestCount, safeNextPath, writeSessionState } from "./guest"
import { interpretApi } from "./interpret"
import { parseTokens, toTokens } from "./tokens"

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe("which tools are free and which are premium", () => {
  it("every category maps to a known specialty", () => { for (const s of Object.values(CATEGORY_SPECIALTY)) expect(SPECIALTIES as readonly string[]).toContain(s) })
  it("general is free, specialty tools are premium", () => {
    expect(isPremiumCalculator({ id: "bmi", category: "general" })).toBe(false)
    expect(isPremiumCalculator({ id: "egfr", category: "renal" })).toBe(true)
  })
  it("nothing is locked while the server has locking off", () => {
    expect(accessVerdict({ id: "egfr", category: "renal" }, { enforced: false, signedIn: false })).toBe("free")
  })
  it("premium tools need sign-in and the matching specialty", () => {
    const calc = { id: "egfr", category: "renal" as const }
    expect(accessVerdict(calc, { enforced: true, signedIn: false })).toBe("locked")
    expect(accessVerdict(calc, { enforced: true, signedIn: true, entitlements: { all: false, specialties: ["laboratory"] } })).toBe("locked")
    expect(accessVerdict(calc, { enforced: true, signedIn: true, entitlements: { all: false, specialties: ["renal"] } })).toBe("allowed")
    expect(accessVerdict(calc, { enforced: true, signedIn: true, entitlements: { all: true, specialties: [...SPECIALTIES] } })).toBe("allowed")
  })
  it("does not lock someone out when their plan is not known yet", () => {
    expect(accessVerdict({ id: "egfr", category: "renal" }, { enforced: true, signedIn: true })).toBe("allowed")
  })
  it("free tools stay free for everyone", () => {
    expect(accessVerdict({ id: "bmi", category: "general" }, { enforced: true, signedIn: false })).toBe("free")
  })
})

describe("guest allowance (3 calculations on this phone)", () => {
  it("counts only guests while locking is on", () => {
    const s = memory()
    expect(noteGuestCalculation(s).counted).toBe(false)
    writeSessionState(s, { enforced: true, signedIn: true })
    noteGuestCalculation(s); expect(readGuestCount(s)).toBe(0)
    writeSessionState(s, { enforced: false, signedIn: false })
    noteGuestCalculation(s); expect(readGuestCount(s)).toBe(0)
  })
  it("a guest gets exactly three, then is limited", () => {
    const s = memory(); writeSessionState(s, { enforced: true, signedIn: false })
    expect(noteGuestCalculation(s)).toMatchObject({ counted: true, count: 1, remaining: 2, limited: false })
    expect(noteGuestCalculation(s)).toMatchObject({ count: 2, remaining: 1 })
    expect(noteGuestCalculation(s)).toMatchObject({ count: 3, remaining: 0, limited: true })
    expect(noteGuestCalculation(s)).toMatchObject({ counted: false, limited: true })
    expect(GUEST_CALC_LIMIT).toBe(3)
  })
  it("limited needs a guest, locking on, and the count reached", () => {
    expect(isGuestLimited({ enforced: true, signedIn: false }, 3)).toBe(true)
    expect(isGuestLimited({ enforced: true, signedIn: true }, 3)).toBe(false)
    expect(isGuestLimited({ enforced: false, signedIn: false }, 3)).toBe(false)
    expect(isGuestLimited(null, 3)).toBe(false)
  })
  it("survives broken storage and tampering", () => {
    expect(noteGuestCalculation({ getItem: () => { throw new Error("x") }, setItem: () => { throw new Error("x") } } as any).counted).toBe(false)
    const s = memory(); s.setItem("clinexia:guest-calcs", "999"); expect(readGuestCount(s)).toBe(3)
  })
})

describe("after signing in", () => {
  it("returns to a path inside the app, otherwise Home", () => {
    expect(safeNextPath("/calculators/renal/egfr")).toBe("/calculators/renal/egfr")
    for (const bad of ["https://evil.com", "//evil.com", "/login", "/register?x=1", "", undefined]) expect(safeNextPath(bad)).toBeNull()
  })
})

describe("talking to the server", () => {
  it("reads the server's own message", () => {
    expect(interpretApi({ status: 401, data: { error: "Email or password is incorrect." } })).toEqual({ ok: false, status: 401, error: "Email or password is incorrect." })
    expect(interpretApi({ status: 503, data: { error: "Could not sign you in right now.", hint: "Run the SQL" } })).toMatchObject({ ok: false, error: "Could not sign you in right now. (Run the SQL)" })
  })
  it("says offline when there is no reply, and gives plain messages otherwise", () => {
    expect(interpretApi(null)).toMatchObject({ ok: false, status: 0 })
    expect(interpretApi({ status: 429, data: null })).toMatchObject({ error: "Too many attempts. Please try again later." })
    expect(interpretApi({ status: 500, data: "<html>" })).toMatchObject({ ok: false })
  })
  it("explains a redirect instead of a vague failure", () => { expect(interpretApi({ status: 308, data: null })).toMatchObject({ ok: false, status: 308 }); expect((interpretApi({ status: 308, data: null }) as any).error).toContain("www.clinexia.app") })
  it("passes success data through", () => { expect(interpretApi({ status: 200, data: { a: 1 } })).toEqual({ ok: true, data: { a: 1 } }) })
})

describe("the sign-in kept on the phone", () => {
  it("round-trips and rejects junk", () => {
    const t = toTokens({ access_token: "a", refresh_token: "r", expires_in: 100 }, 1000)
    expect(t).toEqual({ access: "a", refresh: "r", expiresAt: 101_000 })
    expect(parseTokens(JSON.stringify(t))).toEqual(t)
    expect(parseTokens("junk")).toBeNull(); expect(parseTokens(null)).toBeNull(); expect(parseTokens('{"access":1}')).toBeNull()
  })
})

describe("money", () => { it("formats naira and dollars", () => { expect(formatMoney(250_000, "NGN")).toBe("₦2,500"); expect(formatMoney(650, "USD")).toBe("$6.50") }) })
