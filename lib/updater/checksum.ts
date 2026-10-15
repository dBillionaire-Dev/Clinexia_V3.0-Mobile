// SHA-256 helpers. The authoritative verification of the downloaded APK runs natively while streaming
// (android/.../Sha256.java); these mirror its rules for manifest validation and tests.

/** Lower-cased 64-char hex, or null when the value is not a SHA-256 hex string. */
export function normalizeSha256(value: string): string | null {
  const v = value.trim().toLowerCase()
  return /^[0-9a-f]{64}$/.test(v) ? v : null
}

export function sha256Matches(expected: string, actual: string): boolean {
  const a = normalizeSha256(expected)
  const b = normalizeSha256(actual)
  if (!a || !b) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data as unknown as ArrayBuffer)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

/** Verifies bytes against an expected checksum string. */
export async function verifyChecksum(data: Uint8Array, expected: string): Promise<boolean> {
  return sha256Matches(expected, await sha256Hex(data))
}
