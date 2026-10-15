import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { APP_VERSION } from "./app-info"

describe("app version", () => {
  it("lib/app-info.ts matches package.json (the one source every screen reads)", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"))
    expect(APP_VERSION).toBe(pkg.version)
  })
  it("no screen hardcodes a version number", () => {
    for (const file of ["app/about/page.tsx", "app/settings/page.tsx", "components/app-shell.tsx"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/v\d+\.\d+\.\d+/)
    }
  })
})
