import { describe, it, expect } from 'vitest'
import { mapHeadingDegrees, mapIsRound, mapPoint } from '../miniMap'
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
