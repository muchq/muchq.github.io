import { describe, it, expect } from 'vitest'
import {
  cameraStand,
  frameAt,
  planeSurface,
  rightOf,
  sameGeometry,
  sphereGeometry,
  sphereSurface,
  surfaceFor,
  turn,
  walk,
  PLANE_GEOMETRY,
  type Frame,
} from '../surface'
import { GAME_CONFIG } from '../gameClasses'
import type { Vec3 } from '../projection'

// The surface is the hub's rule, drawn: a position is a point of it, a
// step is along the tangent, and the plane keeps every number the world
// had before the sphere was somewhere you could actually walk.

const len = (p: Vec3) => Math.hypot(p[0], p[1], p[2])
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

describe('planeSurface', () => {
  it('draws the ground it always drew and keeps y at zero', () => {
    expect(planeSurface.place([10, 0, -5], 2)).toEqual([10, GAME_CONFIG.groundLevel + 2, -5])
    expect(planeSurface.up([10, 0, -5])).toEqual([0, 1, 0])
    expect(planeSurface.settle([10, 7, -5])).toEqual([10, 0, -5])
  })

  it('stops at the boundary one axis at a time, so a wall is slid along', () => {
    const b = GAME_CONFIG.worldBoundary
    expect(planeSurface.step([b - 0.1, 0, 0], [1, 0, 1])).toEqual([b, 0, 1])
    expect(planeSurface.settle([-b - 3, 0, b + 3])).toEqual([-b, 0, b])
  })
})

describe('sphereSurface', () => {
  const sphere = sphereSurface(53)

  it('puts every position on the wall, with up pointing inward', () => {
    expect(len(sphere.settle([0, 0, -5]))).toBeCloseTo(53, 9)
    expect(len(sphere.settle([30, 30, 30]))).toBeCloseTo(53, 9)
    // The centre has no direction; the hub sends you to the same place.
    expect(sphere.settle([0, 0, 0])).toEqual([0, 0, -53])
    const up = sphere.up([0, 0, -53])
    for (const axis of [0, 1, 2]) expect(up[axis]).toBeCloseTo([0, 0, 1][axis], 9)
    // All the way in is the centre, whichever wall you started from.
    const centre = sphere.place([0, 0, -53], 53)
    for (const axis of [0, 1, 2]) expect(centre[axis]).toBeCloseTo(0, 9)
  })

  it('walks the same arc wherever you stand, poles included', () => {
    // Facing so that walking forward heads for the north pole.
    const start = frameAt(sphere, [0, 0, -53], [0, -1, 0])
    const arc = (from: Frame) => {
      const to = walk(sphere, from, 0, -0.2)
      return Math.acos(dot(from.position, to.position) / (53 * 53)) * 53
    }
    const equator = arc(start)
    // March over the pole and the step is still the same length.
    let frame = start
    for (let i = 0; i < 500; i++) frame = walk(sphere, frame, 0, -0.2)
    // 100 units of arc from the equator is past the pole (a quarter is 83).
    expect(frame.position[1]).toBeGreaterThan(40)
    expect(arc(frame)).toBeCloseTo(equator, 6)
    expect(len(frame.position)).toBeCloseTo(53, 6)
    // Nothing degenerates: the heading stays a unit tangent.
    expect(len(frame.toCamera)).toBeCloseTo(1, 9)
    expect(dot(frame.toCamera, frame.position)).toBeCloseTo(0, 6)
  })

  it('comes back where it started after a lap', () => {
    let frame = frameAt(sphere, [0, 0, -53])
    const lap = Math.round((2 * Math.PI * 53) / 0.2)
    for (let i = 0; i < lap; i++) frame = walk(sphere, frame, 0, -0.2)
    for (const axis of [0, 1, 2]) expect(frame.position[axis]).toBeCloseTo([0, 0, -53][axis], 0)
  })
})

describe('frames', () => {
  it('reads on the plane exactly as the camera angle did', () => {
    for (const angle of [0, 0.7, -2.4, 3.1]) {
      const frame = frameAt(planeSurface, [3, 0, 4], [Math.sin(angle), 0, Math.cos(angle)])
      const right = rightOf(planeSurface, frame)
      expect(right[0]).toBeCloseTo(Math.cos(angle), 9)
      expect(right[2]).toBeCloseTo(-Math.sin(angle), 9)
      const turned = turn(planeSurface, frame, 0.05)
      expect(turned.toCamera[0]).toBeCloseTo(Math.sin(angle + 0.05), 9)
      expect(turned.toCamera[2]).toBeCloseTo(Math.cos(angle + 0.05), 9)
      // w is a step away from the camera, as it always was.
      const walked = walk(planeSurface, frame, 0, -1)
      expect(walked.position[0]).toBeCloseTo(3 - Math.sin(angle), 9)
      expect(walked.position[2]).toBeCloseTo(4 - Math.cos(angle), 9)
    }
  })

  it('keeps the camera behind the avatar on a sphere', () => {
    const sphere = sphereSurface(53)
    const frame = frameAt(sphere, [0, 0, -53])
    const stand = cameraStand(sphere, frame, 7)
    expect(len(stand)).toBeCloseTo(53, 9)
    // Behind, not through the floor: it stands along the heading.
    expect(dot(stand, frame.toCamera)).toBeGreaterThan(0)
  })

  it('turns a full circle back to where it looked', () => {
    const sphere = sphereSurface(53)
    let frame = frameAt(sphere, [10, 10, -50])
    const first = frame.toCamera
    for (let i = 0; i < 40; i++) frame = turn(sphere, frame, (2 * Math.PI) / 40)
    for (const axis of [0, 1, 2]) expect(frame.toCamera[axis]).toBeCloseTo(first[axis], 6)
  })
})

describe('geometry', () => {
  it('names the hub surfaces and tells them apart', () => {
    expect(surfaceFor(PLANE_GEOMETRY)).toBe(planeSurface)
    expect(surfaceFor(sphereGeometry(12)).geometry).toEqual({ sphere: { radius: 12 } })
    expect(sameGeometry(PLANE_GEOMETRY, { plane: {} })).toBe(true)
    expect(sameGeometry(PLANE_GEOMETRY, sphereGeometry(53))).toBe(false)
    expect(sameGeometry(sphereGeometry(53), sphereGeometry(12))).toBe(false)
  })
})
