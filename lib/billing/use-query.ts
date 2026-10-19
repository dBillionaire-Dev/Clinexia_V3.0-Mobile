"use client"
import { useEffect, useState } from "react"

/** Reads ?name=value from the address after the page has loaded (the app is a static export, so there is no server to read it). */
export function useQuery(): URLSearchParams | null {
  const [q, setQ] = useState<URLSearchParams | null>(null)
  useEffect(() => setQ(new URLSearchParams(window.location.search)), [])
  return q
}
