import { describe, it, expect } from 'vitest'
import { sphereWorld, planeWorld, SPHERE_ROOM } from '../sphereWorld'
import { GAME_CONFIG } from '../gameClasses'
import { cameraBasis } from '../projection'

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
    // Past half a quarter turn: the patch is a big share of the wall.
    expect(dot(centre, world.place(b, 0, 0))).toBeGreaterThan(0)
    expect(dot(centre, world.place(b, 0, 0))).toBeLessThan(R * R * 0.7)
  })

  it('leaves the poles and the far side as sky: no plane point reaches them', () => {
    const top = world.place(0, b, 0)
    expect(top[1]).toBeLessThan(R * 0.98)
    expect(world.place(b, 0, 0)[2]).toBeLessThan(R * 0.98)
  })

  // A step on the plane is a step along the wall, at plane length through
  // the middle of the patch in either direction.
  const step = (x: number, z: number, dx: number, dz: number) => {
    const p = world.place(x, z, 0)
    const q = world.place(x + dx, z + dz, 0)
    const s = [q[0] - p[0], q[1] - p[1], q[2] - p[2]]
    expect(Math.abs(dot(s, world.up(x, z)))).toBeLessThan(1e-4)
    return len(s) / Math.hypot(dx, dz)
  }

  it('moves a plane step along the wall at plane scale through the middle, either way', () => {
    expect(step(0, 0, 0.01, 0)).toBeCloseTo(1, 2)
    expect(step(0, 0, 0, 0.01)).toBeCloseTo(1, 2)
    expect(step(10, 5, 0.01, 0)).toBeCloseTo(1, 1)
  })

  // No flat map of a sphere keeps lengths: toward the top and bottom
  // edges an x step shortens as the lines of longitude draw together,
  // while a z step does not.
  it('shortens an x step to about six tenths at the top and bottom edges, and z not at all', () => {
    for (const z of [b, -b]) {
      expect(step(0, z, 0.01, 0)).toBeGreaterThan(0.55)
      expect(step(0, z, 0.01, 0)).toBeLessThan(0.65)
      expect(step(0, z, 0, 0.01)).toBeCloseTo(1, 2)
    }
  })

  it('is giant: dozens of avatars across', () => {
    expect(R).toBeGreaterThan(40 * GAME_CONFIG.sphereRadius)
  })

  // The camera orbits up to 15 plane units behind the avatar, so its
  // plane point reaches ±65: a pole there would spin the frame.
  it('keeps the camera off the poles, so its frame never degenerates', () => {
    let worst = Infinity
    for (let pz = -50; pz <= 50; pz += 10) {
      for (let px = -50; px <= 50; px += 10) {
        const target = world.place(px, pz, 4)
        for (let a = 0; a < 2 * Math.PI; a += Math.PI / 8) {
          for (const d of [2, 7, 15]) {
            const cx = px + Math.sin(a) * d
            const cz = pz + Math.cos(a) * d
            const cam = world.place(cx, cz, 5)
            const { forward, right } = cameraBasis(cam, target, world.up(cx, cz))
            worst = Math.min(worst, Math.hypot(...right) * Math.hypot(...forward))
            expect(Math.abs(world.place(cx, cz, 0)[1])).toBeLessThan(R * 0.98)
          }
        }
      }
    }
    expect(worst).toBeGreaterThan(0.9)
  })

  it('lifts the camera aim so the far wall and sky come into the frame; the plane does not', () => {
    expect(world.lookLift).toBeGreaterThan(1)
    expect(planeWorld.lookLift).toBe(0)
  })
})
