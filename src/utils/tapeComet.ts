// The flight of one of deja's events: a comet out of deep space that
// ends against the outside of the glass, on the point the hub numbered.
//
// Pure, and a function of two things only — the splat's `seq` and how
// far into the flight it is — so every client in the room watches the
// same comet, and a test reads the whole trajectory at sampled instants
// with no browser, no clock and no GPU. Nothing here touches the DOM;
// tapeWall.ts projects these points and draws them.

import type { Vec3 } from './projection'
import { splatPoint, type GlassWall, type TapeSplat } from './tapeSplats'

// Long enough to read as a fall out of the sky, short enough that a busy
// lane is not a queue of comets.
export const COMET_FLIGHT_SECONDS = 1.5

// Points behind the head, and how much of the flight they reach back
// over. The head moves fastest just before impact, so the same span in
// time is a long tail at the glass and a short one out in the dark.
export const COMET_TRAIL_POINTS = 7
const TRAIL_SPAN = 0.22

// The sky the comets come out of, in units of the room's own boundary:
// how far outside the pane a flight starts, and how far to either side
// of the impact it may begin. The rise is in wall heights.
const LAUNCH_DEPTH = 7
const LAUNCH_SPREAD = 2.5
const LAUNCH_RISE = [1.5, 4.5] as const
// How far the path bows off the straight line, at most, in boundaries.
const BOW = [0.5, 1] as const

// Outward from each wall, and along it: wall 0 is -z, 1 is +x, 2 is +z,
// 3 is -x, and `u` runs in x for the walls square to z, in z for the
// others — the same four faces splatPoint places on.
const OUTWARD: readonly Vec3[] = [
  [0, 0, -1],
  [1, 0, 0],
  [0, 0, 1],
  [-1, 0, 0],
]
const ALONG: readonly Vec3[] = [
  [1, 0, 0],
  [0, 0, 1],
  [1, 0, 0],
  [0, 0, 1],
]

const add = (a: Vec3, b: Vec3, scale = 1): Vec3 => [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

// A stable number in [0, 1) from the event's seq. The hub's seq is the
// event's identity, so this is the one input two clients are guaranteed
// to share — no Math.random anywhere in a comet.
function spread(seq: number, salt: number): number {
  let h = Math.imul(seq ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 1, 0xc2b2ae35)
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2d)
  return ((h ^ (h >>> 15)) >>> 0) / 0x100000000
}

const between = (seq: number, salt: number, [low, high]: readonly [number, number]) => low + spread(seq, salt) * (high - low)
const signed = (seq: number, salt: number) => spread(seq, salt) * 2 - 1

const face = (splat: TapeSplat) => ((splat.wall % 4) + 4) % 4

// Where the flight begins: out past the attractors, off to one side, and
// well above the point it is coming down on.
function launchPoint(splat: TapeSplat, wall: GlassWall, impact: Vec3): Vec3 {
  const f = face(splat)
  let point = add(impact, OUTWARD[f], wall.boundary * LAUNCH_DEPTH)
  point = add(point, ALONG[f], signed(splat.seq, 1) * wall.boundary * LAUNCH_SPREAD)
  return add(point, [0, 1, 0], wall.height * between(splat.seq, 2, LAUNCH_RISE))
}

// The plane the path bows in, square to the travel so the bow is only
// ever a detour and never a shortcut or a stall. Never downward: the
// overlay has no depth test, so a comet that dipped under the floor
// would streak along below the horizon with the room unable to hide it.
function bowDirection(seq: number, travel: Vec3): Vec3 {
  const dir = norm(travel)
  // Square to the world's up, unless the fall is straight down, in which
  // case any axis square to it will do.
  const first = Math.abs(dir[1]) > 0.99 ? norm(cross(dir, [1, 0, 0])) : norm(cross(dir, [0, 1, 0]))
  const second = cross(dir, first)
  const angle = spread(seq, 3) * Math.PI * 2
  const bow: Vec3 = [
    first[0] * Math.cos(angle) + second[0] * Math.sin(angle),
    first[1] * Math.cos(angle) + second[1] * Math.sin(angle),
    first[2] * Math.cos(angle) + second[2] * Math.sin(angle),
  ]
  // The mirror image of a bow is a bow: flipping it keeps the detour
  // square to the travel, and puts every comet over the floor rather
  // than under it, since a flight only ever falls towards its impact.
  return bow[1] < 0 ? [-bow[0], -bow[1], -bow[2]] : bow
}

// One comet's whole path, derived once. The wall reads eight points off
// this a frame, and none of them re-derives the sky the event came out
// of.
export interface CometFlight {
  impact: Vec3
  launch: Vec3
  travel: Vec3
  // Unit, square to the travel, never downward.
  bow: Vec3
  amplitude: number
}

export function cometFlight(splat: TapeSplat, wall: GlassWall): CometFlight {
  const impact = splatPoint(splat, wall)
  const launch = launchPoint(splat, wall, impact)
  const travel = sub(impact, launch)
  return { impact, launch, travel, bow: bowDirection(splat.seq, travel), amplitude: wall.boundary * between(splat.seq, 4, BOW) }
}

// How far through the flight a comet launched at `launchedAt` is, both
// in epoch seconds. Clamped: a clock that ran backwards is a comet that
// has not left, and one that ran forward is a comet that has landed.
export function cometProgress(launchedAt: number, now: number): number {
  return Math.max(0, Math.min(1, (now - launchedAt) / COMET_FLIGHT_SECONDS))
}

// Where the head is at `t` in [0, 1]. The pace is quadratic — it hangs
// in the dark and then comes in hard — and the path bows off the
// straight line, widest around the middle and closed at both ends.
export function cometPointAt(flight: CometFlight, t: number): Vec3 {
  // The flight is scenery; the impact is the contract. At the end this
  // is the hub's own point, not a number that rounds to it.
  const clamped = Math.max(0, Math.min(1, t))
  if (clamped >= 1) return flight.impact
  const { launch, travel, bow } = flight
  const pace = clamped * clamped
  const swing = Math.sin(Math.PI * pace) * flight.amplitude
  return [
    launch[0] + travel[0] * pace + bow[0] * swing,
    launch[1] + travel[1] * pace + bow[1] * swing,
    launch[2] + travel[2] * pace + bow[2] * swing,
  ]
}

// The head, then its own recent past behind it, nearest first. The trail
// is empty at launch — nothing has happened yet to leave one — and once
// it has landed, because what is on the glass then is the smear.
export function cometPoints(flight: CometFlight, t: number): Vec3[] {
  const points = [cometPointAt(flight, t)]
  if (t <= 0 || t >= 1) return points
  const step = TRAIL_SPAN / COMET_TRAIL_POINTS
  for (let i = 1; i <= COMET_TRAIL_POINTS; i++) {
    const back = t - step * i
    if (back <= 0) break
    points.push(cometPointAt(flight, back))
  }
  return points
}

// The same path, per splat: what a test reads, and what a caller with no
// frame to hold a flight in wants.
export function cometAt(splat: TapeSplat, wall: GlassWall, t: number): Vec3 {
  return cometPointAt(cometFlight(splat, wall), t)
}

export function cometTrail(splat: TapeSplat, wall: GlassWall, t: number): Vec3[] {
  return cometPoints(cometFlight(splat, wall), t).slice(1)
}
