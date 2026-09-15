import { GAME_CONFIG } from './gameClasses'
import type { Vec3 } from './projection'

// Where a room draws the hub's flat world. Players move on the ±boundary
// plane whatever the room; the room says where a plane point at some
// height above the floor sits in space, and which way is up there.
export interface WorldMapping {
  place(x: number, z: number, height: number): Vec3
  up(x: number, z: number): Vec3
  // How far above the avatar the camera aims, in height units: 0 looks
  // at the avatar, more lifts the far wall and the sky into the frame.
  lookLift: number
}

// The world as it always was: the plane is the floor.
export const planeWorld: WorldMapping = {
  place: (x, z, height) => [x, GAME_CONFIG.groundLevel + height, z],
  up: () => [0, 1, 0],
  lookLift: 0,
}

// The sphere room: the plane is a square patch of the inner wall, x as
// longitude and z as latitude over the same arc, so a step is the same
// length in either direction and the same length it is on the plane;
// height goes inward. Beyond the patch, every way, is sky. The shader's
// floor hook reads the same three numbers.
export const SPHERE_ROOM = { radius: 40, wrap: 0.4, latitude: 0.8 } as const

export interface SphereWorld extends WorldMapping {
  // The plane point a wall point came from.
  planeCoord(p: Vec3): [number, number]
}

export function sphereWorld(boundary: number): SphereWorld {
  const { radius, wrap, latitude } = SPHERE_ROOM
  const outward = (x: number, z: number): Vec3 => {
    const lon = (x / boundary) * Math.PI * wrap
    const lat = (z / boundary) * (Math.PI / 2) * latitude
    return [Math.cos(lat) * Math.sin(lon), Math.sin(lat), -Math.cos(lat) * Math.cos(lon)]
  }
  return {
    lookLift: 2.5,
    place: (x, z, height) => {
      const n = outward(x, z)
      const r = radius - height
      return [n[0] * r, n[1] * r, n[2] * r]
    },
    up: (x, z) => {
      const n = outward(x, z)
      return [-n[0], -n[1], -n[2]]
    },
    planeCoord: p => {
      const l = Math.hypot(p[0], p[1], p[2]) || 1
      const n = [p[0] / l, p[1] / l, p[2] / l]
      const lat = Math.asin(Math.max(-1, Math.min(1, n[1])))
      const lon = Math.atan2(n[0], -n[2])
      return [(lon / (Math.PI * wrap)) * boundary, (lat / ((Math.PI / 2) * latitude)) * boundary]
    },
  }
}
