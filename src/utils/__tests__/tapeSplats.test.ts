import { describe, it, expect } from 'vitest'
import {
  TAPE_FADE_SECONDS,
  TAPE_FAINTEST,
  TAPE_RING_SIZE,
  TapeRing,
  VERDICT_COLOURS,
  splatColour,
  splatOpacity,
  splatPoint,
} from '../tapeSplats'
import { splat } from '@/test/fakeTape'

// deja's tape as the glass holds it: a bounded ring keyed by seq, the
// colour a verdict reads in, how a splat fades with its age, and where
// on the four walls the hub's wall/u/v puts it.

const wall = { boundary: 50, base: -2, height: 16 }

describe('TapeRing', () => {
  it('keeps what it seeds, oldest first, as already on the glass', () => {
    const ring = new TapeRing()
    ring.seed([splat({ seq: 1 }), splat({ seq: 2 })])
    expect(ring.splats.map(s => s.splat.seq)).toEqual([1, 2])
    expect(ring.splats.every(s => !s.live)).toBe(true)
  })

  it('appends a live event as live, after what was already there', () => {
    const ring = new TapeRing()
    ring.seed([splat({ seq: 1 })])
    ring.add(splat({ seq: 2 }))
    expect(ring.splats.map(s => [s.splat.seq, s.live])).toEqual([
      [1, false],
      [2, true],
    ])
  })

  it('holds one splat per seq however it arrives', () => {
    const ring = new TapeRing()
    ring.add(splat({ seq: 7, actual: 'GET /first' }))
    ring.add(splat({ seq: 7, actual: 'GET /again' }))
    ring.seed([splat({ seq: 7, actual: 'GET /snapshot' }), splat({ seq: 8 })])
    expect(ring.splats.map(s => s.splat.seq)).toEqual([7, 8])
    // The one we already drew, not a second animation of the same event.
    expect(ring.splats[0].splat.actual).toBe('GET /first')
    expect(ring.splats[0].live).toBe(true)
  })

  it('never holds more than the bound, dropping the oldest', () => {
    const ring = new TapeRing()
    for (let seq = 1; seq <= TAPE_RING_SIZE + 5; seq++) ring.add(splat({ seq }))
    expect(ring.splats).toHaveLength(TAPE_RING_SIZE)
    expect(ring.splats[0].splat.seq).toBe(6)
    expect(ring.splats.at(-1)!.splat.seq).toBe(TAPE_RING_SIZE + 5)
    // A seed past the bound is bounded too, and a dropped seq is gone
    // rather than remembered as a duplicate.
    ring.seed(Array.from({ length: TAPE_RING_SIZE + 4 }, (_, i) => splat({ seq: 100 + i })))
    expect(ring.splats).toHaveLength(TAPE_RING_SIZE)
    expect(ring.splats[0].splat.seq).toBe(104)
  })

  it('empties when the world is left', () => {
    const ring = new TapeRing()
    ring.seed([splat({ seq: 1 })])
    ring.clear()
    expect(ring.splats).toEqual([])
    // And the next world starts over: a seq the old world used draws again.
    ring.add(splat({ seq: 1 }))
    expect(ring.splats.map(s => s.splat.seq)).toEqual([1])
  })
})

describe('splatColour', () => {
  it('reads the verdict the way the deja page does', () => {
    expect(splatColour(splat({ verdict: 'anomaly' }))).toBe(VERDICT_COLOURS.anomaly)
    expect(splatColour(splat({ verdict: 'novel' }))).toBe(VERDICT_COLOURS.novel)
    // Expected, and the bigram's top guess was right: a hit.
    expect(splatColour(splat({ verdict: 'expected', actual: 'GET /c', bigram: { token: 'GET /c', p: 0.7 } }))).toBe(
      VERDICT_COLOURS.hit
    )
    // Expected, but not what the bigram led with.
    expect(splatColour(splat({ verdict: 'expected', actual: 'GET /c', bigram: { token: 'GET /d', p: 0.4 } }))).toBe(
      VERDICT_COLOURS.near
    )
    expect(splatColour(splat({ verdict: 'warmup' }))).toBe(VERDICT_COLOURS.neutral)
  })

  it('is neutral for a verdict deja learned to say after this was written', () => {
    expect(splatColour(splat({ verdict: 'quorum-drift' }))).toBe(VERDICT_COLOURS.neutral)
    expect(splatColour(splat({ verdict: '' }))).toBe(VERDICT_COLOURS.neutral)
  })

  it('judges on the bigram alone, as the deja page does', () => {
    // No guess to match: expected, but nothing led with the actual.
    const guessless = splat({ verdict: 'expected', bigram: undefined, net: undefined })
    expect(splatColour(guessless)).toBe(VERDICT_COLOURS.near)
    // The net's guess does not make a hit; the verdict is the bigram's.
    const netOnly = splat({ verdict: 'expected', actual: 'GET /c', bigram: undefined, net: { token: 'GET /c', p: 0.9 } })
    expect(splatColour(netOnly)).toBe(VERDICT_COLOURS.near)
  })
})

describe('splatOpacity', () => {
  it('fades a splat over its life and never all the way out', () => {
    expect(splatOpacity(0)).toBe(1)
    // A clock skewed the wrong way is still a fresh splat, not a bright one.
    expect(splatOpacity(-30)).toBe(1)
    const half = splatOpacity(TAPE_FADE_SECONDS / 2)
    expect(half).toBeLessThan(1)
    expect(half).toBeGreaterThan(TAPE_FAINTEST)
    expect(splatOpacity(TAPE_FADE_SECONDS)).toBeCloseTo(TAPE_FAINTEST, 6)
    expect(splatOpacity(TAPE_FADE_SECONDS * 10)).toBeCloseTo(TAPE_FAINTEST, 6)
  })
})

describe('splatPoint', () => {
  it('puts each wall number on the wall the hub means', () => {
    const at = (w: number) => splatPoint(splat({ wall: w, u: 0.5, v: 0 }), wall)
    expect(at(0)).toEqual([0, -2, -50])
    expect(at(1)).toEqual([50, -2, 0])
    expect(at(2)).toEqual([0, -2, 50])
    expect(at(3)).toEqual([-50, -2, 0])
  })

  it('runs u along the wall and v up the glass the client draws', () => {
    expect(splatPoint(splat({ wall: 0, u: 0, v: 0 }), wall)).toEqual([-50, -2, -50])
    expect(splatPoint(splat({ wall: 0, u: 0.75, v: 1 }), wall)).toEqual([25, 14, -50])
    expect(splatPoint(splat({ wall: 1, u: 0.25, v: 0.5 }), wall)).toEqual([50, 6, -25])
  })

  it('wraps a wall number past the four rather than dropping it at the origin', () => {
    expect(splatPoint(splat({ wall: 4, u: 0.5, v: 0 }), wall)).toEqual(splatPoint(splat({ wall: 0, u: 0.5, v: 0 }), wall))
    expect(splatPoint(splat({ wall: -1, u: 0.5, v: 0 }), wall)).toEqual(splatPoint(splat({ wall: 3, u: 0.5, v: 0 }), wall))
  })
})
