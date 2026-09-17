import { describe, it, expect } from 'vitest'
import {
  TAPE_FADE_SECONDS,
  wallBasis,
  TAPE_RING_SIZE,
  TapeRing,
  VERDICT_COLOURS,
  splatColour,
  splatOpacity,
  splatPoint,
} from '../tapeSplats'
import { splat } from '@/test/fakeTape'
import type { Vec3 } from '../projection'

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

  // deja's `ts` is the hub's clock. A client a few seconds ahead of it
  // would read every live event as history and never fly one, so the
  // ring stamps when this client actually received the splat.
  it('stamps each splat with this client, not with the hub', () => {
    let clock = 500
    const ring = new TapeRing(() => clock)
    ring.add(splat({ seq: 1, ts: 1_000_000 }))
    clock = 512
    ring.add(splat({ seq: 2, ts: 0 }))
    ring.seed([splat({ seq: 3, ts: 1_000_000 })])
    expect(ring.splats.map(s => s.at)).toEqual([500, 512, 512])
    // The hub's own reading is untouched: it is what the wall fades by.
    expect(ring.splats.map(s => s.splat.ts)).toEqual([1_000_000, 0, 1_000_000])
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
  it('fades a splat off the glass rather than down to a floor', () => {
    expect(splatOpacity(0)).toBe(1)
    // A clock skewed the other way is fresh, not brighter.
    expect(splatOpacity(-30)).toBe(1)
    const half = splatOpacity(TAPE_FADE_SECONDS / 2)
    expect(half).toBeCloseTo(0.5, 6)
    // All the way off. A floor here is what made a room full of ghosts:
    // thirty-two splats none of which could ever leave.
    expect(splatOpacity(TAPE_FADE_SECONDS)).toBe(0)
    expect(splatOpacity(TAPE_FADE_SECONDS * 10)).toBe(0)
  })

  it('holds the glass for under a minute', () => {
    expect(TAPE_FADE_SECONDS).toBeLessThanOrEqual(60)
  })
})

describe('wallBasis', () => {
  // Text painted on the glass has to lie in the glass and read the
  // right way round to someone standing inside the room. A basis that
  // leaves the plane hangs the plate at an angle to the pane it is
  // supposed to be painted on; one with the wrong handedness spells the
  // token backwards on two of the four walls.
  const INWARD: Record<number, Vec3> = { 0: [0, 0, 1], 1: [-1, 0, 0], 2: [0, 0, -1], 3: [1, 0, 0] }
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

  it('lies in the pane and reads the right way round from inside', () => {
    for (const wall of [0, 1, 2, 3]) {
      const { along, up } = wallBasis(splat({ wall }))
      const inward = INWARD[wall]
      expect(dot(along, inward)).toBeCloseTo(0, 12)
      expect(dot(up, inward)).toBeCloseTo(0, 12)
      expect(up).toEqual([0, 1, 0])
      expect(dot(along, along)).toBeCloseTo(1, 12)
      // Facing the reader rather than away: not mirrored.
      expect(dot(cross(along, up), inward)).toBeGreaterThan(0)
    }
  })

  it('wraps a wall number past the four, the way the placement does', () => {
    expect(wallBasis(splat({ wall: 7 }))).toEqual(wallBasis(splat({ wall: 3 })))
  })

  // Reading direction is the placement's own wherever handedness allows
  // it, so u running rightwards is the common case and not a coincidence.
  it('runs along the line u runs along', () => {
    const glass = { boundary: 50, base: -2, height: 16 }
    for (const wall of [0, 1, 2, 3]) {
      const { along } = wallBasis(splat({ wall }))
      const a = splatPoint(splat({ wall, u: 0.4, v: 0.5 }), glass)
      const b = splatPoint(splat({ wall, u: 0.6, v: 0.5 }), glass)
      const du: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
      expect(Math.abs(dot(along, du))).toBeCloseTo(Math.hypot(du[0], du[1], du[2]), 9)
    }
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
