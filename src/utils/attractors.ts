import type { Vec3, Mat4 } from './projection'

// Strange attractors for the world to hang outside its walls: a curve
// each, integrated once on the CPU and drawn as a line strip that a
// glowing head runs along. Deterministic, so every client sees the same
// shapes; no seed, no randomness.

export const ATTRACTOR_KINDS = ['lorenz', 'rossler', 'thomas', 'aizawa'] as const
export type AttractorKind = (typeof ATTRACTOR_KINDS)[number]

// How a curve is drawn, as against what shape it is. One attractor is a
// comet, the next a chain of beads, the next a drift of sparks: the
// geometry is the system, the texture is this.
export interface AttractorStyle {
  // Beads along the curve, in points per bead; 0 draws it solid.
  bead: number
  // How much of the curve the head's glow reaches back along, as a
  // fraction of its length. Small is a spark, large is a long comet.
  tail: number
  // How hard the curve shimmers point by point over time; 0 is steady.
  twinkle: number
  // How white the lit part burns; 0 keeps the curve's own colour.
  core: number
  // The comet: a ribbon drawn over the lit stretch, as wide as this
  // fraction of the curve's own radius. 0 leaves the bare wire, which
  // is its own look next to a curve that has one.
  comet: number
}

// The most points a comet is built over, however long the lit stretch
// is: a ribbon is rebuilt every frame, and past a few hundred points
// the far end of it is a pixel wide anyway.
export const COMET_LIMIT = 600

// The stretch of a curve just behind its head, oldest first: the indices
// the comet's ribbon is built over. A curve is a loop, so the stretch
// wraps round the end of it rather than stopping there.
export function cometStretch(points: number, head: number, length: number): number[] {
  const span = Math.min(Math.max(Math.round(length), 0), Math.min(points, COMET_LIMIT))
  if (span < 2) return []
  const last = Math.floor(head) % points
  const out: number[] = []
  for (let i = span - 1; i >= 0; i--) out.push((last - i + points * Math.ceil(i / points + 1)) % points)
  return out
}

export interface AttractorSpec {
  kind: AttractorKind
  // World position of the curve's centre; scale is its radius.
  center: Vec3
  scale: number
  color: Vec3
  // Radians per second about the vertical through the centre.
  spin: number
  points: number
  // Points the glowing head advances per second.
  speed: number
  style: AttractorStyle
}

interface System {
  derivative: (s: Vec3) => Vec3
  start: Vec3
  dt: number
}

const SYSTEMS: Record<AttractorKind, System> = {
  lorenz: {
    derivative: ([x, y, z]) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z],
    start: [1, 1, 1],
    dt: 0.006,
  },
  rossler: {
    derivative: ([x, y, z]) => [-y - z, x + 0.2 * y, 0.2 + z * (x - 5.7)],
    start: [0.1, 0, 0],
    dt: 0.03,
  },
  // Cyclically symmetric: the same rule on all three axes, so it wanders
  // a lattice instead of orbiting lobes. Nothing else here looks like it.
  thomas: {
    derivative: ([x, y, z]) => [Math.sin(y) - 0.19 * x, Math.sin(z) - 0.19 * y, Math.sin(x) - 0.19 * z],
    start: [1.1, 1.1, -0.01],
    dt: 0.05,
  },
  // A shell with a spike up its axis: round where the others are flat.
  aizawa: {
    derivative: ([x, y, z]) => [
      (z - 0.7) * x - 3.5 * y,
      3.5 * x + (z - 0.7) * y,
      0.6 + 0.95 * z - (z * z * z) / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x * x * x,
    ],
    start: [0.1, 0, 0],
    dt: 0.01,
  },
}

const rk4 = (f: (s: Vec3) => Vec3, s: Vec3, dt: number): Vec3 => {
  const k1 = f(s)
  const k2 = f([s[0] + (dt / 2) * k1[0], s[1] + (dt / 2) * k1[1], s[2] + (dt / 2) * k1[2]])
  const k3 = f([s[0] + (dt / 2) * k2[0], s[1] + (dt / 2) * k2[1], s[2] + (dt / 2) * k2[2]])
  const k4 = f([s[0] + dt * k3[0], s[1] + dt * k3[1], s[2] + dt * k3[2]])
  return [
    s[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    s[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    s[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ]
}

const BURN_IN = 500

// `points` xyz triples along the attractor, centred on its bounding box
// and scaled so its farthest point is at distance 1, so a spec's centre
// and scale say where the curve visually sits.
export function attractorTrajectory(kind: AttractorKind, points: number): Float32Array {
  const system = SYSTEMS[kind]
  if (!system) throw new Error(`no such attractor: ${kind}`)
  let s = system.start
  for (let i = 0; i < BURN_IN; i++) s = rk4(system.derivative, s, system.dt)
  const raw: Vec3[] = []
  for (let i = 0; i < points; i++) {
    raw.push(s)
    s = rk4(system.derivative, s, system.dt)
  }
  const lo: Vec3 = [Infinity, Infinity, Infinity]
  const hi: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (const p of raw) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]) }
  const mid: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]
  let radius = 0
  for (const p of raw) radius = Math.max(radius, Math.hypot(p[0] - mid[0], p[1] - mid[1], p[2] - mid[2]))
  const out = new Float32Array(points * 3)
  raw.forEach((p, i) => {
    for (let a = 0; a < 3; a++) out[i * 3 + a] = (p[a] - mid[a]) / (radius || 1)
  })
  return out
}

// Where the glasshouse hangs its attractors: one past each wall, close
// behind the glass and as tall as the room is wide, standing on the
// outside floor, so from inside they fill the panes. No two panes show
// the same thing — a different system behind each, drawn a different
// way, so which way you are facing is never a guess.
export function attractorsOutside(boundary: number): AttractorSpec[] {
  const b = boundary
  const standing = (scale: number) => scale + 2
  return [
    // East: a butterfly, smooth, with a long comet drawn along it.
    {
      kind: 'lorenz',
      center: [b + 58, standing(50), 12],
      scale: 50,
      color: [1.0, 0.55, 0.25],
      spin: 0.03,
      points: 3000,
      speed: 400,
      style: { bead: 0, tail: 0.3, twinkle: 0, core: 0.6, comet: 0.03 },
    },
    // North: a coil, taken coarsely so it reads as a chain of beads.
    {
      kind: 'rossler',
      center: [-14, standing(44), -(b + 55)],
      scale: 44,
      color: [0.45, 0.9, 1.0],
      spin: -0.04,
      points: 1100,
      speed: 90,
      style: { bead: 7, tail: 0.12, twinkle: 0, core: 0.35, comet: 0.014 },
    },
    // West: a lattice, taken finely and shimmering, a drift of sparks.
    {
      kind: 'thomas',
      center: [-(b + 62), standing(56), -18],
      scale: 56,
      color: [0.85, 0.5, 1.0],
      spin: 0.025,
      points: 4000,
      speed: 260,
      // Sparks and nothing else: a comet would only smear them.
      style: { bead: 0, tail: 0.06, twinkle: 0.9, core: 0.2, comet: 0 },
    },
    // South: a shell, solid and slow, lit by a short hard spark.
    {
      kind: 'aizawa',
      center: [20, standing(40), b + 52],
      scale: 40,
      color: [0.5, 1.0, 0.6],
      spin: 0.045,
      points: 2600,
      speed: 700,
      style: { bead: 0, tail: 0.02, twinkle: 0, core: 1, comet: 0.05 },
    },
  ]
}

// Unit-ball curve to world: scale, spin about y, then translate.
export function modelMatrix(center: Vec3, scale: number, angle: number): Mat4 {
  const c = Math.cos(angle) * scale
  const s = Math.sin(angle) * scale
  return new Float32Array([
    c, 0, -s, 0,
    0, scale, 0, 0,
    s, 0, c, 0,
    center[0], center[1], center[2], 1,
  ])
}
