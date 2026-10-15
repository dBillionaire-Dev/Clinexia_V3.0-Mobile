import { describe, expect, it } from "vitest"
import { normalizeSha256, sha256Hex, sha256Matches, verifyChecksum } from "./checksum"

// Same vectors as android/.../Sha256Test.java
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
const bytes = (s: string) => new TextEncoder().encode(s)

describe("checksum", () => {
  it("hashes known vectors", async () => {
    expect(await sha256Hex(bytes("abc"))).toBe(ABC)
    expect(await sha256Hex(new Uint8Array())).toBe(EMPTY)
  })
  it("verifies matching content, ignoring case and whitespace", async () => {
    expect(await verifyChecksum(bytes("abc"), ABC)).toBe(true)
    expect(await verifyChecksum(bytes("abc"), ` ${ABC.toUpperCase()}\n`)).toBe(true)
  })
  it("aborts on a mismatch (tampered or truncated file)", async () => {
    expect(await verifyChecksum(bytes("abd"), ABC)).toBe(false)
    expect(await verifyChecksum(bytes("ab"), ABC)).toBe(false)
  })
  it("never matches malformed expected values", () => {
    expect(sha256Matches("deadbeef", ABC)).toBe(false)
    expect(sha256Matches("", "")).toBe(false)
    expect(normalizeSha256(ABC.replace("a", "g"))).toBeNull()
  })
})
