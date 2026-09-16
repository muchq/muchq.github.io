// The page's state as a pure reducer: events in, a bounded tape out. The
// hook feeds it from the stream and from gap-fills, which overlap, so it
// dedupes by seq and keeps seq order however events arrive.
import type { DejaEvent } from './types'

// How a row reads. The verdict is the server's call against its own
// threshold and outranks the top-5 check; among expected events, where the
// actual sat in the bigram's list decides. The net's list is not consulted:
// the verdict is judged on the bigram's surprise, so this stays consistent
// with what red means.
export type Outcome = 'hit' | 'near' | 'miss' | 'anomaly' | 'novel' | 'warmup'

export interface TapeRow {
  event: DejaEvent
  outcome: Outcome
}

export interface Tape {
  // Newest first, at most TAPE_ROWS.
  rows: TapeRow[]
  lastSeq: number
  // Every token seen in a context or as an actual, first seen first, at
  // most tokenCap. There is no vocabulary endpoint; this is Ask-it's menu.
  tokens: string[]
  // The same tokens, for the membership test every event does: the tape
  // holds thousands, and each event checks up to nine of them.
  tokenSet: ReadonlySet<string>
  tokenCap: number
}

export const TAPE_ROWS = 200
// The service's default cap; the state's vocab_cap replaces it once read.
export const DEFAULT_TOKEN_CAP = 2048

export const emptyTape = (tokenCap = DEFAULT_TOKEN_CAP): Tape => ({
  rows: [],
  lastSeq: 0,
  tokens: [],
  tokenSet: new Set(),
  tokenCap,
})

export function outcomeOf(event: DejaEvent): Outcome {
  switch (event.verdict) {
    case 'warmup':
    case 'novel':
    case 'anomaly':
      return event.verdict
    default: {
      const rank = event.predictions.bigram.findIndex((p) => p.token === event.actual)
      return rank === 0 ? 'hit' : rank > 0 ? 'near' : 'miss'
    }
  }
}

type Tokens = Pick<Tape, 'tokens' | 'tokenSet'>

const capTokens = (tokens: string[], cap: number): Tokens => {
  const kept = tokens.slice(-cap)
  return { tokens: kept, tokenSet: new Set(kept) }
}

// The same arrays come back when nothing is new, so a caller can tell by
// identity — and a tape that has seen the whole vocabulary allocates nothing.
function addTokens(tape: Tape, seen: string[]): Tokens {
  const fresh = seen.filter((token, i) => !tape.tokenSet.has(token) && seen.indexOf(token) === i)
  if (fresh.length === 0) return { tokens: tape.tokens, tokenSet: tape.tokenSet }
  return capTokens([...tape.tokens, ...fresh], tape.tokenCap)
}

// The same tape comes back for an event already held, or one too old for a
// full tape, so a caller can tell a no-op by identity.
export function applyEvent(tape: Tape, event: DejaEvent): Tape {
  const { rows } = tape
  if (rows.some((row) => row.event.seq === event.seq)) return tape
  const oldest = rows.at(-1)
  if (rows.length >= TAPE_ROWS && oldest && event.seq < oldest.event.seq) return tape
  const row: TapeRow = { event, outcome: outcomeOf(event) }
  let at = rows.findIndex((r) => r.event.seq < event.seq)
  if (at === -1) at = rows.length
  return {
    rows: [...rows.slice(0, at), row, ...rows.slice(at)].slice(0, TAPE_ROWS),
    lastSeq: Math.max(tape.lastSeq, event.seq),
    ...addTokens(tape, [...event.context, event.actual]),
    tokenCap: tape.tokenCap,
  }
}

export const applyEvents = (tape: Tape, events: DejaEvent[]): Tape => events.reduce(applyEvent, tape)

// Evicted tokens do not come back when the cap rises: they were dropped.
export function withTokenCap(tape: Tape, tokenCap: number): Tape {
  if (tokenCap === tape.tokenCap) return tape
  return { ...tape, tokenCap, ...capTokens(tape.tokens, tokenCap) }
}

// One chart point per row, oldest first. A null net or threshold is left
// off the point rather than written as zero, so the chart draws nothing
// there instead of a line along the floor.
export interface CurvePoint {
  seq: number
  outcome: Outcome
  bigram: number
  surpriseBigram: number
  net?: number
  surpriseNet?: number
  threshold?: number
}

export function curvePoints(tape: Tape): CurvePoint[] {
  const points = tape.rows.map(({ event, outcome }) => {
    const point: CurvePoint = {
      seq: event.seq,
      outcome,
      bigram: event.ewma_loss.bigram,
      surpriseBigram: event.surprise.bigram,
    }
    if (event.ewma_loss.net !== null) point.net = event.ewma_loss.net
    if (event.surprise.net !== null) point.surpriseNet = event.surprise.net
    if (event.threshold !== null) point.threshold = event.threshold
    return point
  })
  return points.reverse()
}

// Whether the net has started predicting: its line and bars appear with
// its first non-null loss.
export const hasNet = (points: CurvePoint[]) => points.some((p) => p.net !== undefined)
