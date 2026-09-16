import { GAME_CONFIG } from './gameClasses'
import type { Vec3 } from './projection'
import { rightOf, sphereRadiusOf, type Frame, type Surface } from './surface'

// The map in the corner, in map units: the centre is 0 and the edge is
// 1, x right and y down, ready to scale to whatever size the screen
// gives it.
export type MapPoint = [number, number]

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

// Where a position sits on the map.
//
// The plane is drawn as it always was: the square itself, north up,
// everyone at their own place on it, and the local player's arrow
// turning as the camera swings.
//
// A sphere has no square and no edge, so it is drawn as a globe seen
// from directly above the local player: distance from the centre is the
// great-circle distance to them, and the rim is the far side of the
// world. The map turns with the player instead of the arrow, so the way
// they are walking is always up.
export function mapPoint(surface: Surface, viewer: Frame, position: Vec3): MapPoint {
  const radius = sphereRadiusOf(surface.geometry)
  if (radius === null) {
    const b = GAME_CONFIG.worldBoundary
    return [position[0] / b, position[2] / b]
  }
  // The viewer's own frame is the map's: down the local up, with the
  // heading up the page.
  const up = surface.up(viewer.position)
  const forward = viewer.toCamera
  const side = rightOf(surface, viewer)
  const to: Vec3 = [
    position[0] / radius,
    position[1] / radius,
    position[2] / radius,
  ]
  const along = Math.max(-1, Math.min(1, -dot(to, up)))
  // Great-circle distance as a fraction of the half circumference: the
  // antipode lands on the rim wherever you stand.
  const angle = Math.acos(along) / Math.PI
  const east = dot(to, side)
  const north = dot(to, forward)
  const flat = Math.hypot(east, north)
  // Straight above or straight below: no bearing to draw it on, so it
  // goes up the page — at the centre or on the rim, where it belongs.
  if (flat < 1e-9) return [0, -angle]
  // Toward the camera is behind the avatar, so it draws below centre.
  return [(east / flat) * angle, (north / flat) * angle]
}

// How far to turn the local player's arrow, in degrees. The plane's map
// is fixed to the world, so the arrow carries the heading; the globe
// turns with the player, so the arrow always points up it.
export function mapHeadingDegrees(surface: Surface, viewer: Frame): number {
  if (sphereRadiusOf(surface.geometry) !== null) return 0
  return -(Math.atan2(viewer.toCamera[0], viewer.toCamera[2]) * 180) / Math.PI
}

// A globe is round; the plane's map is the square it always was.
export function mapIsRound(surface: Surface): boolean {
  return sphereRadiusOf(surface.geometry) !== null
}
