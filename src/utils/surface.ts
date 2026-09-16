import { GAME_CONFIG } from './gameClasses'
import type { Vec3 } from './projection'

// The shape of a room's world, as the hub names it (MoonBase#1554's
// lobby Geometry): the ground plane, or the inside of a sphere centred
// on the origin. A position on the wire is a point OF the surface —
// three real coordinates, not a plane coordinate the room redraws — so
// the sphere is somewhere to walk rather than a square patch laid on a
// wall, and the whole of it is reachable.
export type Geometry = { plane: Record<string, never> } | { sphere: { radius: number } }

export const PLANE_GEOMETRY: Geometry = { plane: {} }

// The sphere this client asks for when it wants one. The hub takes any
// radius in 2..1000; a room's shader is built for this one.
export const SPHERE_RADIUS = 53

export const sphereGeometry = (radius: number = SPHERE_RADIUS): Geometry => ({ sphere: { radius } })

export function sphereRadiusOf(geometry: Geometry): number | null {
  return 'sphere' in geometry ? geometry.sphere.radius : null
}

export function sameGeometry(a: Geometry, b: Geometry): boolean {
  return sphereRadiusOf(a) === sphereRadiusOf(b)
}

// Same kind of surface, whatever its size: which room draws it is a
// question about the kind, since one sphere room draws any sphere.
export function sameSurfaceKind(a: Geometry, b: Geometry): boolean {
  return (sphereRadiusOf(a) === null) === (sphereRadiusOf(b) === null)
}

// What the renderer asks of a surface: where to draw a point standing on
// it, which way is up there, where a position lands (the hub's own rule,
// so both agree without a round trip), and how far along the tangent a
// step goes.
export interface Surface {
  readonly geometry: Geometry
  // Where the room draws a point of the surface raised `height` above it.
  place(p: Vec3, height: number): Vec3
  // The outward normal: the way an avatar standing at `p` points.
  up(p: Vec3): Vec3
  // The nearest point of the surface to `p`.
  settle(p: Vec3): Vec3
  // `p` moved by a tangent `delta`, back on the surface.
  step(p: Vec3, delta: Vec3): Vec3
  // How far above the avatar the camera aims: 0 looks at it, more lifts
  // the far wall into the frame.
  readonly lookLift: number
}

const scaled = (p: Vec3, k: number): Vec3 => [p[0] * k, p[1] * k, p[2] * k]
const length = (p: Vec3): number => Math.hypot(p[0], p[1], p[2])
const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v))

export const planeSurface: Surface = {
  geometry: PLANE_GEOMETRY,
  lookLift: 0,
  place: (p, height) => [p[0], GAME_CONFIG.groundLevel + height, p[2]],
  up: () => [0, 1, 0],
  settle: p => [clamp(p[0], GAME_CONFIG.worldBoundary), 0, clamp(p[2], GAME_CONFIG.worldBoundary)],
  step(p, delta) {
    return this.settle([p[0] + delta[0], 0, p[2] + delta[2]])
  },
}

// The inner wall of a sphere: up is inward, height is inward, and a
// tangent step is the chord back onto the wall — the same arc for the
// same keypress wherever you stand, poles included, because nothing is
// parameterised by longitude and latitude any more.
export function sphereSurface(radius: number): Surface {
  return {
    geometry: sphereGeometry(radius),
    lookLift: 2.5,
    place: (p, height) => scaled(p, (radius - height) / radius),
    up: p => {
      const r = length(p)
      return r > 0 ? scaled(p, -1 / r) : [0, 0, 1]
    },
    settle: p => {
      const r = length(p)
      // Nowhere to point from the centre: the hub puts you here too.
      return r > 0 ? scaled(p, radius / r) : [0, 0, -radius]
    },
    step(p, delta) {
      return this.settle([p[0] + delta[0], p[1] + delta[1], p[2] + delta[2]])
    },
  }
}

export function surfaceFor(geometry: Geometry): Surface {
  const radius = sphereRadiusOf(geometry)
  return radius === null ? planeSurface : sphereSurface(radius)
}

// Where a player stands and which way the camera sits from them: the
// position on the surface and a unit tangent there. One frame replaces
// the old plane position plus camera angle, and reads the same on a
// plane as it always did.
export interface Frame {
  position: Vec3
  toCamera: Vec3
}

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const normalize = (v: Vec3): Vec3 | null => {
  const n = length(v)
  return n > 1e-9 ? scaled(v, 1 / n) : null
}

// The tangent nearest `toCamera` at `position`, with a fallback for the
// one direction that has no tangent component (looking straight down).
function tangent(surface: Surface, position: Vec3, toCamera: Vec3): Vec3 {
  const up = surface.up(position)
  const flattened = normalize([
    toCamera[0] - up[0] * dot(toCamera, up),
    toCamera[1] - up[1] * dot(toCamera, up),
    toCamera[2] - up[2] * dot(toCamera, up),
  ])
  if (flattened) return flattened
  const any = Math.abs(up[1]) < 0.9 ? ([0, 1, 0] as Vec3) : ([0, 0, 1] as Vec3)
  return normalize(cross(up, any)) ?? [0, 0, 1]
}

export function frameAt(surface: Surface, position: Vec3, toCamera: Vec3 = [0, 0, 1]): Frame {
  const settled = surface.settle(position)
  return { position: settled, toCamera: tangent(surface, settled, toCamera) }
}

// The avatar's right hand: cross(up, toCamera), which on the plane is
// the old [cos a, 0, -sin a].
export function rightOf(surface: Surface, frame: Frame): Vec3 {
  return cross(surface.up(frame.position), frame.toCamera)
}

// Swings the camera round the avatar. On the plane this is exactly the
// old camera.angle += radians.
export function turn(surface: Surface, frame: Frame, radians: number): Frame {
  const right = rightOf(surface, frame)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const turned: Vec3 = [
    frame.toCamera[0] * cos + right[0] * sin,
    frame.toCamera[1] * cos + right[1] * sin,
    frame.toCamera[2] * cos + right[2] * sin,
  ]
  return { position: frame.position, toCamera: tangent(surface, frame.position, turned) }
}

// A step of `right` to the right and `toCamera` toward the camera. The
// heading is carried onto the new tangent plane, so walking a great
// circle keeps facing the same way and no pole is special.
export function walk(surface: Surface, frame: Frame, right: number, toCamera: number): Frame {
  if (right === 0 && toCamera === 0) return frame
  const side = rightOf(surface, frame)
  const delta: Vec3 = [
    side[0] * right + frame.toCamera[0] * toCamera,
    side[1] * right + frame.toCamera[1] * toCamera,
    side[2] * right + frame.toCamera[2] * toCamera,
  ]
  const position = surface.step(frame.position, delta)
  return { position, toCamera: tangent(surface, position, frame.toCamera) }
}

// Where the camera sits: `distance` along the tangent away from the
// avatar, then `height` up from the surface there.
export function cameraStand(surface: Surface, frame: Frame, distance: number): Vec3 {
  return surface.step(frame.position, scaled(frame.toCamera, distance))
}
