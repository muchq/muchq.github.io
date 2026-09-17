import { describe, it, expect } from 'vitest'
import { COMET_FLIGHT_SECONDS, COMET_TRAIL_POINTS, cometAt, cometFlight, cometPointAt, cometPoints, cometProgress, cometTrail } from '../tapeComet'
import { splatPoint, type GlassWall } from '../tapeSplats'
import { splat } from '@/test/fakeTape'
import type { Vec3 } from '../projection'

// The flight of one comet: a pure function of the splat's identity and
// how far into the flight it is, so the whole trajectory can be read at
// sampled instants without a browser, a clock or a GPU.

const wall: GlassWall = { boundary: 50, base: -2, height: 16 }

// How far outside the glass a point is, along the wall it belongs to.
const outwardness = (point: Vec3, face: number): number => (face === 0 ? -point[2] : face === 1 ? point[0] : face === 2 ? point[2] : -point[0])

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

const samples = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n)

describe('cometAt', () => {
  // The hub places every splat; the flight is scenery around a point two
  // clients must agree on to the square inch.
  it("ends exactly on the hub's point, on every wall", () => {
    for (const face of [0, 1, 2, 3, 7]) {
      const event = splat({ seq: 100 + face, wall: face, u: 0.31, v: 0.62 })
      expect(cometAt(event, wall, 1)).toEqual(splatPoint(event, wall))
      // Past the end it is still there, not drifting through the glass.
      expect(cometAt(event, wall, 1.9)).toEqual(splatPoint(event, wall))
    }
  })

  it('starts out in deep space and closes on the glass the whole way', () => {
    // Swept, not sampled at one seq: the bow is hashed per event, and a
    // comet that backed away mid-flight would look like a bug in the room.
    for (let seq = 0; seq < 200; seq++) {
      const event = splat({ seq, wall: seq % 4, u: (seq % 7) / 7, v: (seq % 5) / 5 })
      const impact = splatPoint(event, wall)
      expect(distance(cometAt(event, wall, 0), impact)).toBeGreaterThan(wall.boundary * 3)
      let last = Infinity
      for (const t of samples(40)) {
        const here = distance(cometAt(event, wall, t), impact)
        expect(here).toBeLessThan(last)
        last = here
      }
      expect(last).toBe(0)
    }
  })

  // It hits the outside of the pane: from the floor you watch it come at
  // you through the glass, and it never sails through the room first.
  it('stays outside the glass until the instant it lands', () => {
    for (const face of [0, 1, 2, 3]) {
      const event = splat({ seq: 9 + face, wall: face, u: 0.7, v: 0.1 })
      for (const t of samples(40)) {
        expect(outwardness(cometAt(event, wall, t), face)).toBeGreaterThanOrEqual(wall.boundary)
      }
    }
  })

  // Every client in the room draws the same comet, because the only
  // input other than the clock is the seq the hub numbered the event by.
  it('flies the same path for one event and a different one for the next', () => {
    const one = splat({ seq: 77, wall: 2, u: 0.5, v: 0.5 })
    const again = splat({ seq: 77, wall: 2, u: 0.5, v: 0.5, actual: 'GET /other', verdict: 'anomaly' })
    const next = splat({ seq: 78, wall: 2, u: 0.5, v: 0.5 })
    expect(cometAt(again, wall, 0.3)).toEqual(cometAt(one, wall, 0.3))
    expect(cometAt(next, wall, 0.3)).not.toEqual(cometAt(one, wall, 0.3))
    // Not a rail: consecutive events come out of different sky.
    const launches = [11, 12, 13, 14, 15].map(seq => cometAt(splat({ seq, wall: 0 }), wall, 0))
    expect(new Set(launches.map(p => p.join(','))).size).toBe(launches.length)
  })

  // A straight line to the point would read as a projectile; the bow is
  // what makes it a comet. It has to close anyway.
  it('bows off the straight line in the middle and is back on it at both ends', () => {
    const event = splat({ seq: 5, wall: 0, u: 0.5, v: 0.5 })
    const impact = splatPoint(event, wall)
    const launch = cometAt(event, wall, 0)
    const straight = (t: number): Vec3 => [0, 1, 2].map(i => launch[i] + (impact[i] - launch[i]) * t) as Vec3
    const off = (t: number) => {
      const here = cometAt(event, wall, t)
      // Distance from the line through launch and impact, not from the
      // point the lerp would have reached: the pace is not the bow.
      const d: Vec3 = [impact[0] - launch[0], impact[1] - launch[1], impact[2] - launch[2]]
      const rel: Vec3 = [here[0] - launch[0], here[1] - launch[1], here[2] - launch[2]]
      const along = (rel[0] * d[0] + rel[1] * d[1] + rel[2] * d[2]) / (d[0] * d[0] + d[1] * d[1] + d[2] * d[2])
      return distance(here, straight(along))
    }
    expect(off(0.5)).toBeGreaterThan(1)
    expect(off(0)).toBeCloseTo(0, 6)
    expect(off(1)).toBeCloseTo(0, 6)
  })
})

// A comet that dives under the floor streaks along below the horizon,
// because the overlay has no depth test and the room cannot hide it.
describe('the floor', () => {
  it('is never crossed, out of whatever sky the seq picks', () => {
    for (let seq = 0; seq < 1200; seq++) {
      const face = seq % 4
      const event = splat({ seq, wall: face, u: (seq % 7) / 7, v: (seq % 5) / 5 })
      for (const t of samples(20)) {
        expect(cometAt(event, wall, t)[1]).toBeGreaterThanOrEqual(wall.base)
      }
    }
  })

  it('is below every launch, so a comet always comes down rather than up', () => {
    for (let seq = 0; seq < 1200; seq++) {
      const event = splat({ seq, wall: seq % 4, u: (seq % 7) / 7, v: (seq % 5) / 5 })
      const launch = cometAt(event, wall, 0)
      const impact = splatPoint(event, wall)
      expect(launch[1]).toBeGreaterThan(impact[1])
      // And it comes out of a bounded sky: a hash that stopped landing
      // in [0, 1) would throw the launch off to nowhere.
      expect(launch.every(n => Number.isFinite(n))).toBe(true)
      expect(distance(launch, impact)).toBeLessThan(wall.boundary * 12)
    }
  })
})

describe('cometFlight', () => {
  // The wall derives the flight once a frame and reads eight points off
  // it; that has to be the same path the per-splat calls describe.
  it('is the same path, hoisted out of the per-point work', () => {
    const event = splat({ seq: 17, wall: 3, u: 0.4, v: 0.7 })
    const flight = cometFlight(event, wall)
    for (const t of samples(12)) {
      expect(cometPointAt(flight, t)).toEqual(cometAt(event, wall, t))
    }
    const points = cometPoints(flight, 0.6)
    expect(points[0]).toEqual(cometAt(event, wall, 0.6))
    expect(points.slice(1)).toEqual(cometTrail(event, wall, 0.6))
    // The head is always there, the trail only while it is flying.
    expect(cometPoints(flight, 1)).toEqual([splatPoint(event, wall)])
  })
})

describe('cometTrail', () => {
  it('lags behind the head, in order, and is nothing at launch', () => {
    const event = splat({ seq: 3, wall: 0, u: 0.5, v: 0.5 })
    const impact = splatPoint(event, wall)
    expect(cometTrail(event, wall, 0)).toEqual([])
    const trail = cometTrail(event, wall, 0.6)
    expect(trail).toHaveLength(COMET_TRAIL_POINTS)
    let last = distance(cometAt(event, wall, 0.6), impact)
    for (const point of trail) {
      const here = distance(point, impact)
      expect(here).toBeGreaterThan(last)
      last = here
    }
  })

  it('is short while the comet is still leaving, and whole once it is under way', () => {
    const event = splat({ seq: 3, wall: 0, u: 0.5, v: 0.5 })
    expect(cometTrail(event, wall, 0.01).length).toBeLessThan(COMET_TRAIL_POINTS)
    expect(cometTrail(event, wall, 0.5)).toHaveLength(COMET_TRAIL_POINTS)
    // At the end there is no comet left to trail.
    expect(cometTrail(event, wall, 1)).toEqual([])
  })
})

describe('cometProgress', () => {
  it('runs from launch to impact and stops there', () => {
    expect(cometProgress(100, 100)).toBe(0)
    expect(cometProgress(100, 100 + COMET_FLIGHT_SECONDS / 2)).toBeCloseTo(0.5, 6)
    expect(cometProgress(100, 100 + COMET_FLIGHT_SECONDS)).toBe(1)
    expect(cometProgress(100, 500)).toBe(1)
    // A clock that went backwards is a comet that has not left yet.
    expect(cometProgress(100, 90)).toBe(0)
  })
})
