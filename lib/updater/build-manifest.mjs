// Builds version.json. Shared by scripts/make-version-json.mjs and the tests.
export function versionCodeFromName(name) {
  const [major, minor, patch] = String(name).split(".").map((n) => parseInt(n, 10) || 0)
  return major * 10000 + minor * 100 + patch
}

export function buildManifest({ versionName, apkUrl, sha256, releaseNotes = "", minSupportedVersion, mandatory = false }) {
  if (!/^https:\/\//.test(apkUrl)) throw new Error("apkUrl must be an https:// URL")
  if (!/^[0-9a-fA-F]{64}$/.test(sha256)) throw new Error("sha256 must be 64 hex characters")
  const versionCode = versionCodeFromName(versionName)
  const min = minSupportedVersion === undefined || minSupportedVersion === "" ? 0 : Number(minSupportedVersion)
  if (!Number.isInteger(min) || min < 0) throw new Error("minSupportedVersion must be a non-negative integer versionCode")
  if (min > versionCode) throw new Error("minSupportedVersion cannot be higher than this release's versionCode")
  return {
    versionCode,
    versionName,
    apkUrl,
    sha256: sha256.toLowerCase(),
    releaseNotes: String(releaseNotes).trim(),
    minSupportedVersion: min,
    mandatory: mandatory === true || mandatory === "true",
  }
}
