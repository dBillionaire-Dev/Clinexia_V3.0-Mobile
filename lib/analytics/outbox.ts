import type { CalculationEvent } from "./types"

type KV = Pick<Storage, "getItem" | "setItem">

export const OUTBOX_KEY = "convertlab:analytics-outbox:v1"
// 500 was too small: a heavy user working offline for a few days could outgrow it and the oldest events were silently
// dropped. Each queued event is roughly 350 bytes, so 5000 is about 1.7 MB, well inside what the WebView allows.
export const OUTBOX_CAP = 5000

/** Small persistent queue so events survive being offline or the app closing. Oldest are dropped past the cap. */
export function createOutbox(storage: KV, key = OUTBOX_KEY, cap = OUTBOX_CAP) {
  function read(): CalculationEvent[] {
    try {
      const raw = storage.getItem(key)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? (parsed as CalculationEvent[]) : []
    } catch {
      return []
    }
  }
  function write(events: CalculationEvent[]) {
    let list = events.slice(-cap)
    // If storage is full, shed the OLDEST half and try again, so the newest events are never the ones lost.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        storage.setItem(key, JSON.stringify(list))
        return
      } catch {
        if (!list.length) return
        list = list.slice(Math.ceil(list.length / 2))
      }
    }
  }
  return {
    add(event: CalculationEvent) {
      const events = read()
      if (!events.some((e) => e.id === event.id)) write([...events, event])
    },
    pending(): CalculationEvent[] {
      return read().sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    },
    remove(ids: string[]) {
      if (!ids.length) return
      const gone = new Set(ids)
      write(read().filter((e) => !gone.has(e.id)))
    },
    clear() { write([]) },
  }
}
