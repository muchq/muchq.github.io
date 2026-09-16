import { describe, expect, it } from 'vitest'
import {
  TAPE_ROWS,
  applyEvent,
  applyEvents,
  curvePoints,
  emptyTape,
  outcomeOf,
  withTokenCap,
} from '../tape'
import type { DejaEvent } from '../types'
import {
  PINNED_EVENT_JSON,
  TOKENS,
  anomalyEvent,
  eventOf,
  hitEvent,
  missEvent,
  nearEvent,
  netEvent,
  novelEvent,
  oneOfEach,
  warmupEvent,
} from './fixtures'

describe('the pinned wire event', () => {
  it('parses and passes through the reducer as a neutral warmup row', () => {
    const event = JSON.parse(PINNED_EVENT_JSON) as DejaEvent
    const tape = applyEvent(emptyTape(), event)
    expect(tape.rows).toHaveLength(1)
    expect(tape.rows[0].event).toEqual(event)
    expect(tape.rows[0].outcome).toBe('warmup')
    expect(tape.lastSeq).toBe(2)
    expect(tape.tokens).toEqual([TOKENS.iili])
    // Every key the Rust test pins, in its order.
    expect(Object.keys(event)).toEqual([
      'seq', 'ts', 'lane', 'step', 'context', 'actual', 'predictions',
      'surprise', 'threshold', 'verdict', 'ewma_loss', 'vocab_size',
    ])
  })
})

describe('outcomeOf', () => {
  it('is green when the actual was the bigram top guess', () => {
    expect(outcomeOf(hitEvent)).toBe('hit')
  })

  it('is amber when the actual was in the top-5 but not first', () => {
    expect(outcomeOf(nearEvent)).toBe('near')
  })

  it('an expected event outside the top-5 is a plain miss, never red', () => {
    expect(outcomeOf(missEvent)).toBe('miss')
    expect(outcomeOf(eventOf({ verdict: 'expected', surprise: { bigram: 100, net: null } }))).not.toBe('anomaly')
  })

  it('a warmup event with a high surprise is not red', () => {
    expect(warmupEvent.surprise.bigram).toBeGreaterThan(anomalyEvent.surprise.bigram)
    expect(outcomeOf(warmupEvent)).toBe('warmup')
  })

  it('red follows the verdict, which is judged against the threshold', () => {
    expect(outcomeOf(anomalyEvent)).toBe('anomaly')
    // The verdict outranks the top-5 check: a server-flagged anomaly whose
    // token somehow sat in the list is still red.
    expect(outcomeOf({ ...anomalyEvent, actual: TOKENS.home })).toBe('anomaly')
  })

  it('is violet for a novel token', () => {
    expect(outcomeOf(novelEvent)).toBe('novel')
  })
})

describe('applyEvent', () => {
  it('holds newest first and dedupes by seq, returning the same tape for a repeat', () => {
    const once = applyEvents(emptyTape(), [hitEvent, nearEvent])
    expect(once.rows.map((r) => r.event.seq)).toEqual([12, 11])
    const again = applyEvent(once, { ...hitEvent, actual: 'a different body, same seq' })
    expect(again).toBe(once)
    expect(again.rows).toHaveLength(2)
  })

  it('slots a late gap-fill event into seq order', () => {
    const tape = applyEvents(emptyTape(), [eventOf({ seq: 5 }), eventOf({ seq: 3 }), eventOf({ seq: 4 })])
    expect(tape.rows.map((r) => r.event.seq)).toEqual([5, 4, 3])
    expect(tape.lastSeq).toBe(5)
  })

  it(`the ${TAPE_ROWS + 1}th event evicts the oldest`, () => {
    let tape = emptyTape()
    for (let seq = 1; seq <= TAPE_ROWS; seq++) tape = applyEvent(tape, eventOf({ seq }))
    expect(tape.rows).toHaveLength(TAPE_ROWS)
    expect(tape.rows.at(-1)?.event.seq).toBe(1)
    tape = applyEvent(tape, eventOf({ seq: TAPE_ROWS + 1 }))
    expect(tape.rows).toHaveLength(TAPE_ROWS)
    expect(tape.rows[0].event.seq).toBe(TAPE_ROWS + 1)
    expect(tape.rows.at(-1)?.event.seq).toBe(2)
  })

  it('an event older than everything held is dropped once the tape is full', () => {
    let tape = emptyTape()
    for (let seq = 10; seq < 10 + TAPE_ROWS; seq++) tape = applyEvent(tape, eventOf({ seq }))
    const full = tape
    tape = applyEvent(tape, eventOf({ seq: 1 }))
    expect(tape).toBe(full)
  })

  it('collects every actual and context token once, first seen first', () => {
    const tape = applyEvents(emptyTape(), [hitEvent, anomalyEvent])
    expect(tape.tokens).toEqual([TOKENS.home, TOKENS.stats, TOKENS.iili, TOKENS.probe])
  })

  it('bounds the tokens seen to the vocab cap, dropping the oldest', () => {
    const tape = applyEvents(emptyTape(3), [hitEvent, anomalyEvent])
    expect(tape.tokens).toEqual([TOKENS.stats, TOKENS.iili, TOKENS.probe])
    expect(withTokenCap(tape, 2).tokens).toEqual([TOKENS.iili, TOKENS.probe])
    // Raising the cap keeps what is held; nothing evicted comes back.
    expect(withTokenCap(tape, 10).tokens).toEqual([TOKENS.stats, TOKENS.iili, TOKENS.probe])
  })
})

describe('curvePoints', () => {
  it('reads oldest first with the net fields absent, not zero, while null', () => {
    const points = curvePoints(applyEvents(emptyTape(), oneOfEach))
    expect(points.map((p) => p.seq)).toEqual([10, 11, 12, 13, 14, 15])
    for (const point of points) {
      expect(point).not.toHaveProperty('net')
      expect(point).not.toHaveProperty('surpriseNet')
    }
    // The warmup row has no threshold to draw either.
    expect(points[0]).not.toHaveProperty('threshold')
    expect(points[1].threshold).toBe(4.0)
    expect(points[4].outcome).toBe('anomaly')
  })

  it('carries the net once it is non-null', () => {
    const [point] = curvePoints(applyEvent(emptyTape(), netEvent))
    expect(point.net).toBe(1.4)
    expect(point.surpriseNet).toBe(0.92)
  })
})
