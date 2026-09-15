import { describe, it, expect } from 'vitest'
import { sphereWorld, planeWorld, SPHERE_ROOM } from '../sphereWorld'
import { GAME_CONFIG } from '../gameClasses'

// The hub moves players on a flat ±boundary plane; a room decides where
// that plane is drawn. The sphere room wraps it onto the inner wall of a
// sphere: x around, z pole-ward, height inward.

const b = GAME_CONFIG.worldBoundary
const dot = (a: number[], c: number[]) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2]
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2])

describe('planeWorld', () => {
  it('is the world as it always was: y is height above the floor, up is up', () => {
    expect(planeWorld.place(3, -4, 0)).toEqual([3, GAME_CONFIG.groundLevel, -4])
    expect(planeWorld.place(3, -4, 2.5)).toEqual([3, GAME_CONFIG.groundLevel + 2.5, -4])
    expect(planeWorld.up(3, -4)).toEqual([0, 1, 0])
  })
})

describe('sphereWorld', () => {
  const world = sphereWorld(b)
  const R = SPHERE_ROOM.radius

  it('puts a point on the floor at the sphere radius, and height inward', () => {
    for (const [x, z] of [[0, 0], [20, -10], [-49, 30]]) {
      expect(len(world.place(x, z, 0))).toBeCloseTo(R)
      expect(len(world.place(x, z, 3))).toBeCloseTo(R - 3)
    }
  })

  it('points up at the centre, which is down into the wall reversed', () => {
    for (const [x, z] of [[0, 0], [20, -10], [-49, 30]]) {
      const p = world.place(x, z, 0)
      const up = world.up(x, z)
      expect(len(up)).toBeCloseTo(1)
      expect(dot(up, p)).toBeCloseTo(-R)
    }
  })

  it('is a square patch: the x edge and the z edge are the same arc from the centre', () => {
    const centre = world.place(0, 0, 0)
    expect(dot(centre, world.place(b, 0, 0))).toBeCloseTo(dot(centre, world.place(0, b, 0)))
    expect(dot(centre, world.place(-b, 0, 0))).toBeCloseTo(dot(centre, world.place(0, -b, 0)))
    // Most of the way to a quarter turn: the patch is a big share of the wall.
    expect(dot(centre, world.place(b, 0, 0))).toBeGreaterThan(0)
    expect(dot(centre, world.place(b, 0, 0))).toBeLessThan(R * R * 0.5)
  })

  it('leaves the poles and the far side as sky: no plane point reaches them', () => {
    const top = world.place(0, b, 0)
    expect(top[1]).toBeLessThan(R * 0.98)
    expect(world.place(b, 0, 0)[2]).toBeLessThan(R * 0.98)
  })

  // A step on the plane is a step of the same length on the wall, and
  // along it, in either direction.
  it('moves a plane step along the wall at plane scale, either way', () => {
    const p = world.place(10, 5, 0)
    for (const [dx, dz] of [[0.01, 0], [0, 0.01]]) {
      const q = world.place(10 + dx, 5 + dz, 0)
      const step = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]
      expect(Math.abs(dot(step, world.up(10, 5)))).toBeLessThan(1e-4)
      expect(len(step)).toBeGreaterThan(0.0095)
      expect(len(step)).toBeLessThan(0.0105)
    }
  })

  it('reads the plane coordinate back off a wall point', () => {
    for (const [x, z] of [[0, 0], [20, -10], [-49, 30], [49.9, -49.9]]) {
      const [px, pz] = world.planeCoord(world.place(x, z, 0))
      expect(px).toBeCloseTo(x, 4)
      expect(pz).toBeCloseTo(z, 4)
    }
  })

  it('is giant: many avatars across', () => {
    expect(R).toBeGreaterThan(20)
  })

  it('lifts the camera aim so the far wall and sky come into the frame; the plane does not', () => {
    expect(world.lookLift).toBeGreaterThan(1)
    expect(planeWorld.lookLift).toBe(0)
  })
})
