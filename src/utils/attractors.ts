import type { Vec3, Mat4 } from './projection'

// Strange attractors for the world to hang outside its walls: a curve
// each, integrated once on the CPU and drawn as a line strip that a
// glowing head runs along. Deterministic, so every client sees the same
// shapes; no seed, no randomness.

export const ATTRACTOR_KINDS = ['lorenz', 'rossler'] as const
export type AttractorKind = (typeof ATTRACTOR_KINDS)[number]

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
// outside floor, so from inside they fill the panes.
export function attractorsOutside(boundary: number): AttractorSpec[] {
  const b = boundary
  const common = { points: 3000, speed: 400 }
  const standing = (scale: number) => scale + 2
  return [
    { kind: 'lorenz', center: [b + 58, standing(50), 12], scale: 50, color: [1.0, 0.55, 0.25], spin: 0.03, ...common },
    { kind: 'rossler', center: [-14, standing(44), -(b + 55)], scale: 44, color: [0.45, 0.9, 1.0], spin: -0.04, ...common },
    { kind: 'lorenz', center: [-(b + 62), standing(56), -18], scale: 56, color: [0.85, 0.5, 1.0], spin: 0.025, ...common },
    { kind: 'rossler', center: [20, standing(40), b + 52], scale: 40, color: [0.5, 1.0, 0.6], spin: 0.045, ...common },
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
