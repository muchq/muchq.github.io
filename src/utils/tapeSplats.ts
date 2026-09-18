// deja's tape as the glasshouse holds it (MoonBase#1563, lobby.smithy's
// TapeSplat): the wire shape, a bounded ring keyed by seq, and the three
// pure questions the glass asks of one splat — what colour it reads in,
// how faded it is by now, and where on the four walls it lands.
//
// The hub places every splat from its seq, so two clients standing in
// one room draw an event on the same square inch. This file never
// recomputes a placement; it only turns the hub's wall/u/v into a point
// of the glass the client chose to draw.

import type { Vec3 } from './projection'

// One predictor's top guess, with the probability it gave it.
export interface TapeGuess {
  token: string
  p: number
}

export interface TapeSplat {
  // deja's sequence number: the event's identity, and the hub's only
  // input to where it lands.
  seq: number
  // 0 is -z, 1 is +x, 2 is +z, 3 is -x.
  wall: number
  // Along the wall, and up the glass, both in [0, 1).
  u: number
  v: number
  // When deja scored it, in epoch seconds.
  ts: number
  // The lane's recent tokens, oldest first.
  context: string[]
  actual: string
  // "warmup", "expected", "anomaly" or "novel" — a string, not an enum,
  // so a verdict deja learns to say still reaches the wall.
  verdict: string
  // Each predictor's top guess, absent when it had none.
  bigram?: TapeGuess
  net?: TapeGuess
}

// A splat as the wall holds it: whether it landed while we were watching
// or was already on the glass when we walked in. A live one animates in;
// a joiner handed thirty-two at once sees them already settled rather
// than a stampede.
export interface WallSplat {
  splat: TapeSplat
  live: boolean
  // When this client received it, in seconds on the same monotonic
  // clock the frames run on. deja's `ts` is the hub's wall clock and the
  // two can differ by seconds either way; a wall that asked `ts` whether
  // an event was still arriving would stop flying comets the moment a
  // client ran ahead of the hub, and never start again. Monotonic
  // because a wall clock is not: a correction backwards would make an
  // arrival that just happened look like one from the future.
  at: number
}

// What the hub sends a joiner, and all the wall is ever worth: a wall is
// a mood, not a log.
export const TAPE_RING_SIZE = 32

export class TapeRing {
  private held: WallSplat[] = []

  // The clock is the client's own and only goes forward, matching the
  // frame timestamps the wall reads `at` against. Injectable so a test
  // can drive it.
  constructor(private readonly clock: () => number = () => performance.now() / 1000) {}

  // Oldest first, as the hub sends them.
  get splats(): readonly WallSplat[] {
    return this.held
  }

  // What was already on the glass: a snapshot's tape, or a reshape's.
  seed(splats: readonly TapeSplat[]): void {
    for (const splat of splats) this.put(splat, false)
  }

  // One event, landing now.
  add(splat: TapeSplat): void {
    this.put(splat, true)
  }

  // The glass belongs to the world that was standing.
  clear(): void {
    this.held = []
  }

  // A seq already on the wall stays as it is: the same event reaches a
  // client twice whenever a snapshot overlaps what it watched land, and
  // redrawing it would animate an arrival that already happened.
  private put(splat: TapeSplat, live: boolean): void {
    if (this.held.some(held => held.splat.seq === splat.seq)) return
    this.held.push({ splat, live, at: this.clock() })
    if (this.held.length > TAPE_RING_SIZE) this.held = this.held.slice(this.held.length - TAPE_RING_SIZE)
  }
}

// The /deja page's palette, so a wall and the tape read the same.
export const VERDICT_COLOURS = {
  hit: '#4ade80',
  near: '#ffb347',
  anomaly: '#ff6b6b',
  novel: '#b388ff',
  neutral: 'rgba(233, 238, 255, 0.72)',
} as const

// How a splat reads. `other` is anything this client has no colour for —
// a warmup, or a verdict deja learned to say after this was written.
export type WallOutcome = 'hit' | 'near' | 'anomaly' | 'novel' | 'other'

// The verdict is deja's own call and outranks everything else; among
// expected events the bigram's top guess decides, and the net's is not
// consulted, which is how the /deja page judges a row too. It is not
// quite that page's outcome: only the top guess rides the wire, not the
// top five, so an expected event the bigram did not lead with is amber
// here whether that page would have called it a near or a miss.
export function splatOutcome(splat: TapeSplat): WallOutcome {
  switch (splat.verdict) {
    case 'anomaly':
      return 'anomaly'
    case 'novel':
      return 'novel'
    case 'expected':
      return splat.bigram?.token === splat.actual ? 'hit' : 'near'
    default:
      return 'other'
  }
}

export function splatColour(splat: TapeSplat): string {
  const outcome = splatOutcome(splat)
  return outcome === 'other' ? VERDICT_COLOURS.neutral : VERDICT_COLOURS[outcome]
}

// The word beside the colour, because colour alone is not a reading:
// this client's own for an outcome it knows, and deja's verdict verbatim
// for one it does not.
export function splatLabel(splat: TapeSplat): string {
  const outcome = splatOutcome(splat)
  return outcome === 'other' ? splat.verdict : outcome
}

// How long a splat takes to fade to the faintest it gets, and how faint
// that is. A joiner is handed a ring minutes old, so age is what tells a
// wall that is still busy from one that emptied out while nobody looked.
// How long a splat stays on the glass, and it leaves completely. A
// floor here is what made the room a mess: the ring holds thirty-two,
// the hub hands a joiner all of them at once, and none of them could
// ever finish leaving — so every pane carried a crowd of ghosts that
// were still legible enough to read over whatever had just landed. The
// wall is the last minute of traffic, not the session's history.
export const TAPE_FADE_SECONDS = 45

export function splatOpacity(ageSeconds: number): number {
  // A clock skewed the other way is a fresh splat, not a brighter one.
  const age = Math.max(0, Math.min(1, ageSeconds / TAPE_FADE_SECONDS))
  return 1 - age
}

// The glass this client draws: the boundary the four panes stand on, the
// floor they rise from, and how tall they are drawn. No height rides the
// wire — `v` is a fraction of whatever this is.
export interface GlassWall {
  boundary: number
  base: number
  height: number
}

// Where a splat lands, in world coordinates. `u` runs along the wall
// from its low corner to its high one, in x for the walls square to z
// and in z for the walls square to x. A wall number past the four wraps
// rather than falling to the origin: an event from a hub that numbers
// more walls than this client draws belongs on the glass somewhere.
// Which way text runs on a pane, and which way is up it. `up` is the
// world's own up: the glass stands vertically, so a readout painted on
// it does too.
export interface WallBasis {
  along: Vec3
  up: Vec3
}

const GLASS_UP: Vec3 = [0, 1, 0]

// The two directions of a pane's own plane, oriented for a reader
// standing inside the room. `along` is the line u runs along, turned
// around on the panes where that would spell the token backwards: the
// same line either way, so the placement is untouched, and it is only
// ever u increasing leftwards, which nobody can see. Nothing here reads
// the glass's size — a pane's plane does not depend on how tall the
// client draws it.
export function wallBasis(splat: TapeSplat): WallBasis {
  const face = ((splat.wall % 4) + 4) % 4
  const along: Vec3 = face % 2 === 0 ? [1, 0, 0] : [0, 0, 1]
  // Into the room, off this pane.
  const inward: Vec3 = face === 0 ? [0, 0, 1] : face === 1 ? [-1, 0, 0] : face === 2 ? [0, 0, -1] : [1, 0, 0]
  // Text faces a reader when `along` crossed with up points back at
  // them. With `up` the world's own, that cross product is in the floor
  // plane and one dot product settles it.
  const facing: Vec3 = [
    along[1] * GLASS_UP[2] - along[2] * GLASS_UP[1],
    along[2] * GLASS_UP[0] - along[0] * GLASS_UP[2],
    along[0] * GLASS_UP[1] - along[1] * GLASS_UP[0],
  ]
  const towards = facing[0] * inward[0] + facing[1] * inward[1] + facing[2] * inward[2]
  return { along: towards < 0 ? [-along[0], -along[1], -along[2]] : along, up: GLASS_UP }
}

export function splatPoint(splat: TapeSplat, wall: GlassWall): Vec3 {
  const face = ((splat.wall % 4) + 4) % 4
  const along = (splat.u * 2 - 1) * wall.boundary
  const y = wall.base + splat.v * wall.height
  switch (face) {
    case 0:
      return [along, y, -wall.boundary]
    case 1:
      return [wall.boundary, y, along]
    case 2:
      return [along, y, wall.boundary]
    default:
      return [-wall.boundary, y, along]
  }
}
