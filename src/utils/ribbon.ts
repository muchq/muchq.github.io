import type { Vec3 } from './projection'

// A wake drawn as a ribbon rather than a wire: two vertices per point,
// offset either side of the path and turned to face the camera, so it
// has width in the world — thinning with distance the way everything
// else does — and tapers from the avatar back into the dark.
//
// Built here rather than in a shader because a point's direction needs
// its neighbours, and because this way it is a function of a path and an
// eye with nothing else in it.

// x, y, z, index, edge per vertex: the index drives the glow along the
// ribbon, the edge (-1 or 1) its softness across.
export const RIBBON_FLOATS_PER_VERTEX = 5

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (v: Vec3): Vec3 | null => {
  const n = Math.hypot(v[0], v[1], v[2])
  return n > 1e-6 ? [v[0] / n, v[1] / n, v[2] / n] : null
}

export interface RibbonShape {
  // Half-width at the head, in world units; the tail tapers to nothing.
  width: number
  // How the taper runs: 1 is straight, below 1 keeps the ribbon wide
  // further back, above 1 pinches it off sooner.
  taper: number
}

// The ribbon for one path, oldest point first, seen from `eye`. Returns
// an empty array for a path with no length to draw: a standing avatar
// leaves a point, not a wake.
export function ribbon(path: readonly Vec3[], eye: Vec3, shape: RibbonShape): Float32Array {
  if (path.length < 2) return new Float32Array(0)
  const out = new Float32Array(path.length * 2 * RIBBON_FLOATS_PER_VERTEX)
  const last = path.length - 1
  // Carried so a pair of coincident points keeps the ribbon flat
  // instead of collapsing it or twisting it through a right angle.
  let side: Vec3 | null = null
  let wrote = 0
  for (let i = 0; i <= last; i++) {
    const ahead = path[Math.min(i + 1, last)]
    const behind = path[Math.max(i - 1, 0)]
    const along = normalize(sub(ahead, behind))
    const toEye = normalize(sub(eye, path[i]))
    const facing = along && toEye ? normalize(cross(along, toEye)) : null
    if (facing) side = facing
    if (!side) continue
    // Widest at the head, where the avatar is, thinning into the tail.
    const half = shape.width * Math.pow((i + 1) / path.length, shape.taper)
    for (const edge of [-1, 1]) {
      const at = wrote * RIBBON_FLOATS_PER_VERTEX
      out[at] = path[i][0] + side[0] * half * edge
      out[at + 1] = path[i][1] + side[1] * half * edge
      out[at + 2] = path[i][2] + side[2] * half * edge
      out[at + 3] = i
      out[at + 4] = edge
      wrote += 1
    }
  }
  return wrote === out.length / RIBBON_FLOATS_PER_VERTEX ? out : out.subarray(0, wrote * RIBBON_FLOATS_PER_VERTEX)
}
