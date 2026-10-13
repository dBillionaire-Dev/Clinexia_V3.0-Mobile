import type { CalculationEvent } from "./types"

export const BATCH_SIZE = 100

/** What happened when one batch was posted. */
export type SendResult =
  /** The server answered 2xx. `finished` = IDs it stored plus IDs it permanently rejected: both are safe to delete. */
  | { kind: "done"; finished: string[] }
  /** The server says the payload itself is bad (400/413/422). Retrying the same batch can never work. */
  | { kind: "invalid" }
  /** Network or server trouble. Keep everything and try again later. */
  | { kind: "retry" }

export interface SyncDeps {
  pending: () => CalculationEvent[]
  remove: (ids: string[]) => void
  send: (events: CalculationEvent[]) => Promise<SendResult>
}

export interface FlushResult {
  /** Events removed from the queue (stored by the server or permanently rejected). */
  sent: number
  /** True when something is still queued because of a temporary problem. The caller should try again later. */
  retry: boolean
}

function ids(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []
}

/** Turns an HTTP response (or null for a network failure) into a SendResult. Pure, so it can be tested. */
export function interpretResponse(res: { status: number; data: unknown } | null): SendResult {
  if (!res) return { kind: "retry" }
  if (res.status >= 200 && res.status < 300) {
    let body: unknown = res.data
    if (typeof body === "string") {
      try { body = JSON.parse(body) } catch { body = null }
    }
    const b = (body ?? {}) as { accepted?: unknown; rejected?: unknown }
    return { kind: "done", finished: [...ids(b.accepted), ...ids(b.rejected)] }
  }
  if (res.status === 400 || res.status === 413 || res.status === 422) return { kind: "invalid" }
  return { kind: "retry" }
}

async function sendBatch(batch: CalculationEvent[], deps: SyncDeps): Promise<FlushResult> {
  const res = await deps.send(batch)

  if (res.kind === "done") {
    deps.remove(res.finished)
    const done = new Set(res.finished)
    // Anything the server neither stored nor rejected stays queued for another pass.
    return { sent: res.finished.length, retry: !batch.every((e) => done.has(e.id)) }
  }

  if (res.kind === "invalid") {
    // One bad event must not block the good ones behind it: send them one at a time to find it, then drop it.
    if (batch.length > 1) {
      let sent = 0
      for (const event of batch) {
        const r = await sendBatch([event], deps)
        sent += r.sent
        if (r.retry) return { sent, retry: true }
      }
      return { sent, retry: false }
    }
    deps.remove([batch[0].id])
    return { sent: 0, retry: false }
  }

  return { sent: 0, retry: true }
}

/** Sends queued events in batches of 100. Stops at a temporary failure and keeps whatever was not finished. */
export async function flushEvents(deps: SyncDeps): Promise<FlushResult> {
  const events = deps.pending()
  let sent = 0
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const r = await sendBatch(events.slice(i, i + BATCH_SIZE), deps)
    sent += r.sent
    if (r.retry) return { sent, retry: true }
  }
  return { sent, retry: false }
}
