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
}

// What the hub sends a joiner, and all the wall is ever worth: a wall is
// a mood, not a log.
export const TAPE_RING_SIZE = 32

export class TapeRing {
  private held: WallSplat[] = []

  constructor(private readonly size = TAPE_RING_SIZE) {}

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
    this.held.push({ splat, live })
    if (this.held.length > this.size) this.held = this.held.slice(this.held.length - this.size)
  }
}

// The /deja page's palette, so a wall and the tape read the same.
export const VERDICT_COLOURS = {
  hit: '#4ade80',
  near: '#ffb347',
  anomaly: '#ff6b6b',
  novel: '#b388ff',
  neutral: 'rgba(233, 238, 255, 0.55)',
} as const

// How a splat reads. The verdict is deja's own call and outranks
// everything else; among expected events the bigram's top guess decides,
// exactly as the tape's outcomeOf does — the verdict is judged on the
// bigram's surprise, so the net's guess must not turn a near green. The
// wire carries only the top guess, not the top five, so an expected
// event the bigram did not lead with is amber whether it was in the list
// or missed it altogether. An unrecognised verdict is neutral: deja may
// learn to say something this client has never heard of, and the splat
// still belongs on the glass.
export function splatColour(splat: TapeSplat): string {
  switch (splat.verdict) {
    case 'anomaly':
      return VERDICT_COLOURS.anomaly
    case 'novel':
      return VERDICT_COLOURS.novel
    case 'expected':
      return splat.bigram?.token === splat.actual ? VERDICT_COLOURS.hit : VERDICT_COLOURS.near
    default:
      return VERDICT_COLOURS.neutral
  }
}

// How long a splat takes to fade to the faintest it gets, and how faint
// that is. A joiner is handed a ring minutes old, so age is what tells a
// wall that is still busy from one that emptied out while nobody looked.
export const TAPE_FADE_SECONDS = 180
export const TAPE_FAINTEST = 0.12

export function splatOpacity(ageSeconds: number): number {
  // A clock skewed the other way is a fresh splat, not a brighter one.
  const age = Math.max(0, Math.min(1, ageSeconds / TAPE_FADE_SECONDS))
  return 1 - age * (1 - TAPE_FAINTEST)
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
