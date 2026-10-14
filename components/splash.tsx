"use client"
import { useEffect } from "react"
import { SPLASH_CSS, SPLASH_HTML, SPLASH_ID, runSplash } from "@/lib/splash"

/**
 * Animated launch splash (Android app). The markup and styles are static, so the overlay is already in the HTML
 * and covers the screen from the first paint. See lib/splash.ts for the sequence and the timings.
 */
export function Splash() {
  useEffect(() => { runSplash() }, [])
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      <div id={SPLASH_ID} aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPLASH_HTML }} />
    </>
  )
}
