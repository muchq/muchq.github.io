import { describe, it, expect } from 'vitest'
import { globeMarks, mapHeadingDegrees, mapIsRound, mapPoint } from '../miniMap'
import { frameAt, planeSurface, sphereSurface, walk } from '../surface'
import { GAME_CONFIG } from '../gameClasses'

// The corner map in map units: centre 0, edge 1, y down. The plane is
// the square it always was; a sphere has no square, so it is a globe
// centred on the player with the far side of the world on the rim.

describe('mapPoint on the plane', () => {
  const b = GAME_CONFIG.worldBoundary
  const viewer = frameAt(planeSurface, [0, 0, 0])

  it('is the world square, north up, wherever the camera looks', () => {
    expect(mapPoint(planeSurface, viewer, [b, 0, -b])).toEqual([1, -1])
    expect(mapPoint(planeSurface, viewer, [b / 2, 0, 0])).toEqual([0.5, 0])
    const turned = frameAt(planeSurface, [0, 0, 0], [1, 0, 0])
    expect(mapPoint(planeSurface, turned, [b, 0, -b])).toEqual([1, -1])
  })

  it('turns the arrow with the camera and keeps the map square', () => {
    expect(mapHeadingDegrees(planeSurface, viewer)).toBeCloseTo(0, 9)
    expect(mapHeadingDegrees(planeSurface, frameAt(planeSurface, [0, 0, 0], [1, 0, 0]))).toBeCloseTo(-90, 9)
    expect(mapIsRound(planeSurface)).toBe(false)
  })
})

describe('mapPoint on a sphere', () => {
  const sphere = sphereSurface(53)
  // Standing on the wall, facing the north pole.
  const viewer = frameAt(sphere, [0, 0, -53], [0, -1, 0])

  it('puts the viewer at the centre and the far side on the rim', () => {
    expect(Math.hypot(...mapPoint(sphere, viewer, viewer.position))).toBe(0)
    const antipode = mapPoint(sphere, viewer, [0, 0, 53])
    expect(Math.hypot(antipode[0], antipode[1])).toBeCloseTo(1, 9)
  })

  it('draws the way you are walking up the page and the camera below', () => {
    const ahead = walk(sphere, viewer, 0, -0.2 * 100)
    const [x, y] = mapPoint(sphere, viewer, ahead.position)
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeLessThan(0)
    const behind = walk(sphere, viewer, 0, 0.2 * 100)
    expect(mapPoint(sphere, viewer, behind.position)[1]).toBeGreaterThan(0)
    const right = walk(sphere, viewer, 0.2 * 100, 0)
    expect(mapPoint(sphere, viewer, right.position)[0]).toBeGreaterThan(0)
  })

  it('measures the rim in great-circle distance, so a quarter of the way is half way out', () => {
    const quarter = mapPoint(sphere, viewer, [53, 0, 0])
    expect(Math.hypot(quarter[0], quarter[1])).toBeCloseTo(0.5, 9)
  })

  it('reads the same from anywhere, pole included, and wants a round map', () => {
    const atPole = frameAt(sphere, [0, 53, 0], [0, 0, 1])
    expect(Math.hypot(...mapPoint(sphere, atPole, atPole.position))).toBe(0)
    const equator = mapPoint(sphere, atPole, [0, 0, -53])
    expect(Math.hypot(equator[0], equator[1])).toBeCloseTo(0.5, 9)
    // The globe turns with the player, so its arrow never turns.
    expect(mapHeadingDegrees(sphere, atPole)).toBe(0)
    expect(mapIsRound(sphere)).toBe(true)
  })
})

// The globe turns with the player, so the picture is the same at every
// heading: without something fixed on it, walking tells you nothing
// about where you are or which way you went. The poles are the world's
// own up and down, and the prime meridian is the half circle between
// them through -z, where the sphere room's shader puts longitude zero.
describe('globeMarks', () => {
  const sphere = sphereSurface(53)
  const radius = (p: readonly [number, number]) => Math.hypot(p[0], p[1])
  // Everything the meridian draws, in one list.
  const meridianPoints = (marks: { meridian: [number, number][][] }) => marks.meridian.flat()

  it('has none of it on a plane, which is a square with north up', () => {
    expect(globeMarks(planeSurface, frameAt(planeSurface, [0, 0, 0]))).toBeNull()
  })

  it("puts the poles where the world's up and down are", () => {
    // Standing on the equator at -z, facing the north pole: it is
    // straight up the page, a quarter of the world away.
    const viewer = frameAt(sphere, [0, 0, -53], [0, -1, 0])
    const marks = globeMarks(sphere, viewer)!
    expect(marks.north.at[0]).toBeCloseTo(0, 9)
    expect(marks.north.at[1]).toBeCloseTo(-0.5, 9)
    expect(marks.south.at[0]).toBeCloseTo(0, 9)
    expect(marks.south.at[1]).toBeCloseTo(0.5, 9)
  })

  it('runs the meridian from pole to pole, through the ground the viewer is on', () => {
    const viewer = frameAt(sphere, [0, 0, -53], [0, -1, 0])
    const marks = globeMarks(sphere, viewer)!
    const points = meridianPoints(marks)
    expect(points[0]).toEqual(marks.north.at)
    expect(points.at(-1)).toEqual(marks.south.at)
    // The viewer is standing on it, so it passes through the centre.
    expect(Math.min(...points.map(radius))).toBeCloseTo(0, 6)
    // And nothing it draws leaves the map.
    expect(Math.max(...points.map(radius))).toBeLessThanOrEqual(1 + 1e-9)
  })

  // The map is the world seen from over the viewer, so the rim is one
  // point: the far side. A line that crosses it leaves one edge and
  // comes back at the opposite one, and one stroke through that jump
  // is a chord straight across the map.
  it('breaks the meridian where it crosses the rim', () => {
    // Standing on the meridian's own far side: the line runs off the
    // rim and back.
    const viewer = frameAt(sphere, [0, 0, 53], [0, -1, 0])
    const marks = globeMarks(sphere, viewer)!
    expect(marks.meridian.length).toBeGreaterThan(1)
    for (const run of marks.meridian) {
      for (let i = 1; i < run.length; i++) {
        expect(Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1])).toBeLessThan(0.5)
      }
    }
  })

  it('draws one unbroken line from anywhere off it', () => {
    // A quarter of the world round from the meridian, so neither it nor
    // its far side is in the way.
    const viewer = frameAt(sphere, [53, 0, 0], [0, -1, 0])
    expect(globeMarks(sphere, viewer)!.meridian).toHaveLength(1)
  })

  it("keeps a pole's letter on the map when the pole is on the rim", () => {
    // Standing on the south pole: the north pole is the whole world
    // away, which is the rim, all the way round.
    const viewer = frameAt(sphere, [0, -53, 0], [0, 0, 1])
    const marks = globeMarks(sphere, viewer)!
    expect(radius(marks.north.at)).toBeCloseTo(1, 9)
    expect(radius(marks.north.label)).toBeLessThan(radius(marks.north.at))
    // And the pole underfoot labels below itself rather than nowhere.
    expect(radius(marks.south.at)).toBe(0)
    expect(marks.south.label[1]).toBeGreaterThan(0)
  })
})
