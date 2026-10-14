import { describe, expect, it } from "vitest"
import { SPLASH_CSS, SPLASH_HTML, SPLASH_ID, SPLASH_INIT, SPLASH_TIMING } from "./splash"

type Env = { native?: boolean; seen?: boolean; query?: string }

/** Runs the inline <head> script against stand-in browser globals and returns the attribute it set (or null). */
function runInit({ native = false, seen = false, query = "" }: Env): string | null {
  const attrs: Record<string, string> = {}
  const documentStub = { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v } } }
  const windowStub = native ? { Capacitor: { isNativePlatform: () => true } } : {}
  const sessionStub = { getItem: () => (seen ? "1" : null) }
  new Function("document", "window", "location", "sessionStorage", SPLASH_INIT)(documentStub, windowStub, { search: query }, sessionStub)
  return attrs["data-splash"] ?? null
}

describe("splash markup", () => {
  it("spells Clinexia, one span per letter, in order", () => {
    const letters = [...SPLASH_HTML.matchAll(/<span class="clx-l" data-i="(\d)">(.)<\/span>/g)]
    expect(letters.map((m) => m[2]).join("")).toBe("Clinexia")
    expect(letters.map((m) => Number(m[1]))).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
  it("contains every element the animation looks up", () => {
    for (const cls of ["clx-bg", "clx-mark", "clx-beat", "clx-base", "clx-scan", "clx-word"]) expect(SPLASH_HTML).toContain(`class="${cls}"`)
  })
  it("hides the real header logo and name only while the splash is playing", () => {
    expect(SPLASH_CSS).toContain('html[data-splash="1"] [data-clx]{opacity:0}')
    expect(SPLASH_CSS).toContain(`#${SPLASH_ID}{display:none}`)
  })
})

describe("splash start rules (inline head script)", () => {
  it("plays on the first launch inside the Android app", () => {
    expect(runInit({ native: true })).toBe("1")
  })
  it("does not replay in the same session", () => {
    expect(runInit({ native: true, seen: true })).toBeNull()
  })
  it("never plays in a regular browser or the PWA", () => {
    expect(runInit({})).toBeNull()
  })
  it("can be previewed in any browser with ?splash=1", () => {
    expect(runInit({ query: "?splash=1" })).toBe("1")
    expect(runInit({ query: "?a=1&splash=1", seen: true })).toBe("1")
  })
})

describe("splash timeline", () => {
  const T = SPLASH_TIMING
  it("lands only after the heartbeat and after the last letter has arrived", () => {
    const lastLetterEnd = T.letterStart + 7 * T.letterStagger + T.letterMs
    expect(T.landAt).toBeGreaterThanOrEqual(T.beatDelay + T.beatMs)
    expect(T.landAt).toBeGreaterThanOrEqual(lastLetterEnd)
  })
  it("always finishes well before the safety fallback", () => {
    expect(T.landAt + T.landMs).toBeLessThan(T.fallbackMs)
  })
  it("stays short enough for a splash", () => {
    expect(T.landAt + T.landMs).toBeLessThanOrEqual(2600)
  })
})
