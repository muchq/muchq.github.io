// The deja service (MoonBase#1150) behind api.muchq.com: an anomaly
// detector over the access-log token stream. VITE_DEJA_API_URL points it
// at a local backend, like the other apps. The JSON routes answer 406 to
// any other Accept, so every request here names one; the stream route
// does not look.
import type { DejaEvent, DejaState, NextResponse, Prediction } from './types'

export const DEJA_API_URL = import.meta.env.VITE_DEJA_API_URL || 'https://api.muchq.com/deja/v1'

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

// Read lazily so a test's stubbed global is the one that gets called.
const defaultFetch: FetchLike = (input, init) => globalThis.fetch(input, init)

const ACCEPT_JSON = { Accept: 'application/json' }

async function getJson(url: string, fetchFn: FetchLike): Promise<unknown> {
  try {
    const res = await fetchFn(url, { headers: ACCEPT_JSON })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const isRecord = (body: unknown): body is Record<string, unknown> => typeof body === 'object' && body !== null

// Up to the last 200 events with seq > after, oldest first. Null when the
// service did not answer with events: a poll must tell "nothing new" from
// "nobody home".
export async function fetchRecent(after: number, fetchFn: FetchLike = defaultFetch): Promise<DejaEvent[] | null> {
  const body = await getJson(`${DEJA_API_URL}/recent?after=${after}`, fetchFn)
  if (!isRecord(body) || !Array.isArray(body.events)) return null
  return body.events as DejaEvent[]
}

export async function fetchState(fetchFn: FetchLike = defaultFetch): Promise<DejaState | null> {
  const body = await getJson(`${DEJA_API_URL}/state`, fetchFn)
  if (!isRecord(body) || typeof body.step !== 'number' || typeof body.vocab_cap !== 'number') return null
  return body as unknown as DejaState
}

// What POST /next came back with. The route lands with Phase 3; until it
// deploys the gateway answers 404 or 405, which is a note, not an error.
export type NextResult =
  | { kind: 'ok'; predictions: NextResponse['predictions'] }
  | { kind: 'rejected'; message: string }
  | { kind: 'not-deployed' }
  | { kind: 'unavailable' }

const isPredictions = (body: unknown): body is NextResponse => {
  if (!isRecord(body) || !isRecord(body.predictions)) return false
  const { bigram, net } = body.predictions as { bigram?: unknown; net?: unknown }
  return Array.isArray(bigram) && (net === null || Array.isArray(net))
}

async function rejectionMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    const parsed: unknown = JSON.parse(text)
    if (isRecord(parsed) && typeof parsed.message === 'string') return parsed.message
  } catch {
    // not JSON
  }
  return text || 'Rejected'
}

export async function askNext(context: string[], fetchFn: FetchLike = defaultFetch): Promise<NextResult> {
  let res: Response
  try {
    res = await fetchFn(`${DEJA_API_URL}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ACCEPT_JSON },
      body: JSON.stringify({ context }),
    })
  } catch {
    return { kind: 'unavailable' }
  }
  if (res.status === 404 || res.status === 405) return { kind: 'not-deployed' }
  if (res.status === 400) return { kind: 'rejected', message: await rejectionMessage(res) }
  if (!res.ok) return { kind: 'unavailable' }
  try {
    const body: unknown = await res.json()
    if (!isPredictions(body)) return { kind: 'unavailable' }
    return { kind: 'ok', predictions: body.predictions }
  } catch {
    return { kind: 'unavailable' }
  }
}

export type { Prediction }
