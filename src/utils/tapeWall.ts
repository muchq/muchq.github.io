// The tape drawn on the glasshouse's glass: deja's events arrive as
// comets out of deep space, hit the outside of the pane where the hub
// put them, and smear their data down the inside of it.
//
// Not GLSL. The splats are text — an access-log token, the lane's recent
// context, and what a predictor guessed instead — and a hand-written ray
// tracer has no glyphs. The player labels already hang off the same
// camera as absolute elements (useThoughtsGame), so this is the room's
// own idiom: the browser lays out the text, and a test can read what
// landed where without a GPU.
//
// The wall reads as one live impact at a time. Everything else on the
// glass is residue: what was already there when this client walked in,
// and what the last few impacts left behind.
//
// Every node here is two: an outer that is moved each frame, and a plate
// that carries the look and the one transition. Moving a node that is
// mid-transition restarts the transition, so the two jobs cannot share a
// transform.

import { SHADER_FOV, projectToNdc, type Vec3 } from './projection'
import { displayToken } from './displayToken'
import { COMET_FLIGHT_SECONDS, COMET_TRAIL_POINTS, cometFlight, cometPoints, cometProgress } from './tapeComet'
import {
  splatColour,
  splatLabel,
  splatOpacity,
  splatPoint,
  wallBasis,
  type GlassWall,
  type TapeGuess,
  type TapeSplat,
  type WallSplat,
} from './tapeSplats'

export interface TapeView {
  cameraPos: Vec3
  cameraTarget: Vec3
  cameraUp: Vec3
  aspect: number
  // The page, in CSS pixels.
  width: number
  height: number
  wall: GlassWall
  // The room's own glass colour, as CSS. It rides in with the geometry
  // rather than being looked up here: the DOM layer draws whatever room
  // it is handed and does not import the catalogue of them.
  edge: string
  // The frame's own timestamp, in seconds, on a clock that only goes
  // forward, and the only clock the wall reads. Every flight, deadline,
  // freshness reading and fade is on this one. A system-clock
  // correction backwards mid-flight would otherwise freeze the comet in
  // the air and wedge the queue behind it, one forwards would skip the
  // flight outright, and a client whose clock trailed the hub's would
  // hold a fully opaque splat on the glass for good. deja's own `ts`
  // meets the wall clock once, in the ring, and never reaches here.
  clock: number
}

// How long the data stays smeared across the glass before it settles
// back into residue, and the least it is ever given. A comet waits out
// the floor rather than cutting the last readout short, so a busy lane
// is a run of impacts and not a flicker.
export const SMEAR_SECONDS = 6
export const SMEAR_FLOOR_SECONDS = 2

// Only an event this client received in the last few seconds flies. A
// backgrounded tab pauses the frames while the socket keeps filling the
// ring, and what that ring then holds is history, not arrivals. The
// reading is of `at`, stamped on the same monotonic clock when the ring
// accepted the splat, never of the hub's `ts`: the two clocks differ,
// and comparing them would strand a client that ran a few seconds ahead
// with a wall that never moves.
const ARRIVAL_FRESH_SECONDS = 5

// Arrivals waiting for the glass. Bounded, because a wall is a mood and
// not a log: a lane faster than the flight drops its oldest waiting
// event to residue rather than queueing a minute of comets.
const QUEUED_MAX = 4

// A gap between frames wider than this means nobody was watching. A
// backgrounded tab stops the frames and not the socket, so the ring
// keeps filling; what was already queued when the frames stopped is
// history by the time they start again, and flying it then is a
// stampede of comets for events a minute old. Freshness cannot say so
// on its own: a busy lane legitimately keeps an arrival waiting longer
// than the whole window, one flight and one floor at a time. Half that
// window, so the worst an arrival can be when it finally flies is a few
// seconds late and not a minute; frames come every sixteenth of one.
const FRAME_GAP_SECONDS = ARRIVAL_FRESH_SECONDS / 2

// Seqs that have already had their comet, kept well past the ring so
// leaving the room and coming back is not a second flight, and bounded
// so a long session does not remember every event it ever drew.
const REMEMBERED = 256

// A plate is painted on the glass, so it is measured in the glass. The
// element keeps one fixed font size and the wall's own transform does
// the rest: a splat is small because it is far away, never because the
// screen is. There is no breakpoint here for the same reason there is
// none on a sign in a room.
const FONT_PX = 16
// A line of text, in world units. The room is a hundred units across
// and the glass sixteen tall, so a three-line smear is about a fifth of
// the pane's height and reads from the far side of the floor.
const SMEAR_EM_WORLD = 1.2
const RESIDUE_EM_WORLD = 0.8

// Under this, a splat is a smudge rather than a reading, and it stops
// being drawn. Measured across the plate's shortest axis on screen:
// distance shrinks it evenly, a pane seen nearly edge-on squashes it to
// a bright line at full height, and a pitched view of one can leave
// both of the plate's own axes long while they fall on nearly the same
// line. Thirty-two of any of those is the mess.
const LEGIBLE_PX = 7

// The last few of the lane, and how wide the plate may get, in its own
// text rather than in screen pixels: the plate scales with the pane, so
// a bound in `vw` would have meant something different at every
// distance. The wire bounds neither the number of context tokens nor
// their length.
const CONTEXT_SHOWN = 4
const PLATE_MAX_WIDTH = '30em'

// The impact, and the half-second the data takes to stop running. The
// stretch stays readable: a hard one is half a second of illegible
// headline. Never opacity — that is rewritten from the clock every
// frame, so a transition on it would restart every frame and leave a
// splat that passed behind the camera fading in place at the edge of the
// screen. The longhand says so in a way `transition: all` cannot
// silently undo.
const SMEAR_MS = 520
const RUNNING = 'scaleX(1.4) skewX(-14deg)'
const SETTLED = 'none'

// A comet is one fixed dot scaled by the compositor, never a box
// re-sized every frame, and the head has a ceiling: a head a metre from
// the camera would otherwise be a disc wider than the screen, which is a
// full-screen flash on every impact you happen to be standing beside.
export const COMET_DOT_PX = 16
// The glow is most of what is painted, and it rides the same transform
// the dot does: it reaches its blur plus its spread past every edge, so
// a ceiling on the dot alone is a ceiling on the hole in the middle of
// the flash.
const COMET_GLOW_BLUR = COMET_DOT_PX * 1.6
const COMET_GLOW_SPREAD = COMET_DOT_PX * 0.4
const COMET_PAINT_PX = COMET_DOT_PX + 2 * (COMET_GLOW_BLUR + COMET_GLOW_SPREAD)
// The ceiling, on the whole flash.
export const COMET_MAX_PX = 128
const COMET_MAX_DOT_PX = (COMET_MAX_PX * COMET_DOT_PX) / COMET_PAINT_PX
// The head's world radius, so a comet grows as it comes in rather than
// being a dot that teleports.
const COMET_RADIUS = 1.1

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace'
// The /deja page's own text colour. Secondary text stays pale rather
// than taking the room's neon: the plate is lit from behind, and neon on
// neon is not contrast.
const PALE = '#e9eeff'

type Mode = 'residue' | 'smear'

// How old a splat reads: how long the fade has been running, which the
// ring already backdated for tape that was on the glass before we
// walked in. One reading, one clock — the same one the flight is judged
// on, which is what stops a client running ahead of the hub from flying
// a comet and landing a fully transparent smear.
const ageOf = (held: WallSplat, view: TapeView): number => view.clock - held.at

// The node that is moved: no look, no transition, nothing that a frame's
// reposition could interrupt.
const OUTER_STYLE = `
  position: absolute;
  left: 0;
  top: 0;
  font-family: ${MONO};
  font-size: ${FONT_PX}px;
  font-weight: 400;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform;
  /* CSS wraps a transform in translate(origin) ... translate(-origin),
     which a translation commutes with and a matrix does not: left at
     the default centre, the pane matrix lands the plate at
     at + o - M*o, most of its own width from the splat. At the corner
     the declared list is the whole transform. */
  transform-origin: 0px 0px;
`

// Both readings sit on a dark plate: the glass behind them is lit, and
// neon on neon is not contrast.
const PLATE_STYLE = `
  transform-origin: center;
  transition-property: transform;
  transition-duration: ${SMEAR_MS}ms;
  transition-timing-function: cubic-bezier(0.1, 0.85, 0.25, 1);
  max-width: ${PLATE_MAX_WIDTH};
  overflow: hidden;
`

const RESIDUE_STYLE = `
  ${PLATE_STYLE}
  display: flex;
  align-items: baseline;
  gap: 6px;
  background: rgba(0, 0, 0, 0.72);
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
  text-shadow: 0 0 8px currentColor;
`

const smearStyle = (edge: string) => `
  ${PLATE_STYLE}
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(0, 0, 0, 0.82);
  padding: 5px 10px 5px 8px;
  border-left: 2px solid currentColor;
  border-radius: 2px;
  letter-spacing: 0.08em;
  text-shadow: 0 0 12px currentColor;
  box-shadow: 0 0 22px -6px currentColor, inset 0 0 18px -10px ${edge};
`

// A flex row is only as honest as its shrink policy. The plate has a
// max width and hides what overruns it, so a row that lets its first
// item take everything puts the verdict — the result the wall exists to
// show — past the edge, where it is the verdict that gets cut and not
// the path. The tokens give; the verdict never does.
const ELIDES = 'min-width: 0px; overflow: hidden; text-overflow: ellipsis;'
const KEEPS = 'flex: none;'

const prefersLessMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const place = (x: number, y: number, scale = 0) =>
  `translate(-50%, -50%) translate(${x}px, ${y}px)${scale ? ` scale(${scale})` : ''}`

// The shortest the 2x2 maps any unit direction to: its smaller
// singular value. The two column lengths are not this — they are what
// it does to the plate's own two axes, and those can both stay long
// while the image between them collapses onto a line.
function shortestAxis(a: number, b: number, c: number, d: number): number {
  const frobenius = a * a + b * b + c * c + d * d
  const area = Math.abs(a * d - b * c)
  const spread = Math.sqrt(Math.max(0, frobenius * frobenius - 4 * area * area))
  return Math.sqrt(Math.max(0, (frobenius - spread) / 2))
}

interface PagePoint {
  x: number
  y: number
  // How far down the view the point sits, in world units.
  forward: number
}

// Where a world point lands on this view's page, in CSS pixels, or null
// when it is behind the camera or in its plane.
function onScreen(point: Vec3, view: TapeView): PagePoint | null {
  const p = projectToNdc(point, view.cameraPos, view.cameraTarget, view.aspect, view.cameraUp)
  if (!p || p.forward <= 0.1) return null
  return { x: (p.x + 1) * 0.5 * view.width, y: (1 - p.y) * 0.5 * view.height, forward: p.forward }
}

// A plate lying in the glass rather than facing the camera. The pane's
// two directions are projected alongside the splat's own point, and the
// pixels they come back as become the element's 2x2: the plate is then
// turned, sheared, foreshortened and scaled by exactly what the camera
// does to the pane it is painted on, with no second projection model to
// drift out of step with the ray tracer's.
//
// Affine, not perspective: the pane's far edge does not converge. At
// the size a readout ever is against the distance it is ever seen from,
// that is not a difference anyone can see, and it costs two extra
// projections a frame instead of a 4x4 and a perspective ancestor.
function inPane(splat: TapeSplat, view: TapeView, emWorld: number): { transform: string; legible: number } | null {
  const origin = splatPoint(splat, view.wall)
  const at = onScreen(origin, view)
  if (!at) return null
  // The avatar is the near plane. The camera stands back from them, so
  // a slice of the room behind the player is always on screen, and tape
  // painted there is between the camera and the avatar: it rakes across
  // the middle of the screen over everything in front of it, and it is
  // behind you. The camera's target is the avatar's waist, so how far
  // down the view they stand is the distance to it.
  const avatar = Math.hypot(
    view.cameraTarget[0] - view.cameraPos[0],
    view.cameraTarget[1] - view.cameraPos[1],
    view.cameraTarget[2] - view.cameraPos[2]
  )
  if (at.forward < avatar) return null
  const { along, up } = wallBasis(splat)
  const right = onScreen([origin[0] + along[0], origin[1] + along[1], origin[2] + along[2]], view)
  const over = onScreen([origin[0] + up[0], origin[1] + up[1], origin[2] + up[2]], view)
  if (!right || !over) return null
  // World units per local pixel, so the element's own font size lands
  // on the glass as `emWorld` of it.
  const k = emWorld / FONT_PX
  const a = (right.x - at.x) * k
  const b = (right.y - at.y) * k
  // Local y runs down the page and v runs up the glass.
  const c = -(over.x - at.x) * k
  const d = -(over.y - at.y) * k
  return {
    transform: `translate(${at.x}px, ${at.y}px) matrix(${a}, ${b}, ${c}, ${d}, 0, 0) translate(-50%, -50%)`,
    legible: shortestAxis(a, b, c, d) * FONT_PX,
  }
}

const part = (name: string, text: string, css = ''): HTMLElement => {
  const span = document.createElement('span')
  span.dataset.part = name
  span.textContent = text
  if (css) span.style.cssText = css
  return span
}

// A predictor's line in the readout: who guessed, what, and how sure.
const guessLine = (name: string, guess: TapeGuess): HTMLElement => {
  const line = part('guess', `${name} ${displayToken(guess.token)} ${guess.p.toFixed(2)}`, `${ELIDES} font-size: 0.72em; color: ${PALE}; opacity: 0.86; text-shadow: none;`)
  line.dataset.predictor = name
  return line
}

// What is on the glass for one splat, in the mode it is currently read
// in. The smear is the whole event; the residue is what is left of it.
function render(outer: HTMLElement, plate: HTMLElement, splat: TapeSplat, mode: Mode, edge: string): void {
  plate.replaceChildren()
  plate.style.cssText = mode === 'smear' ? smearStyle(edge) : RESIDUE_STYLE
  outer.style.color = splatColour(splat)
  const label = splatLabel(splat)
  // Whichever predictor had something to say, the bigram first: the
  // residue has room for one, and the title carries it either way.
  const guess = splat.bigram ?? splat.net

  if (mode === 'smear') {
    // The lane that led here, then what actually came, then what each
    // predictor led with instead. The last few of the lane only: the
    // wire bounds nothing, and the token is what the wall is for.
    const lane = splat.context.slice(-CONTEXT_SHOWN)
    if (lane.length > 0) {
      const row = document.createElement('div')
      row.style.cssText = `display: flex; gap: 8px; font-size: 0.7em; color: ${PALE}; opacity: 0.55; text-shadow: none;`
      for (const token of lane) row.appendChild(part('context', displayToken(token)))
      plate.appendChild(row)
    }
    const headline = document.createElement('div')
    headline.style.cssText = 'display: flex; align-items: baseline; gap: 10px;'
    headline.appendChild(part('token', displayToken(splat.actual), `${ELIDES} font-size: 1.15em;`))
    if (label) headline.appendChild(part('verdict', label, `${KEEPS} font-size: 0.68em; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.9;`))
    plate.appendChild(headline)
    const guesses = document.createElement('div')
    guesses.style.cssText = 'display: flex; gap: 10px;'
    if (splat.bigram) guesses.appendChild(guessLine('bigram', splat.bigram))
    if (splat.net) guesses.appendChild(guessLine('net', splat.net))
    if (guesses.childElementCount > 0) plate.appendChild(guesses)
  } else {
    plate.appendChild(part('token', displayToken(splat.actual), ELIDES))
    // What a predictor led with instead, when it was not the request
    // itself: the gap is the whole reason for the wall.
    if (guess && guess.token !== splat.actual) {
      plate.appendChild(part('guess', displayToken(guess.token), `${ELIDES} opacity: 0.6; font-size: 0.85em; color: ${PALE}; text-shadow: none;`))
    }
    // The verdict in words, so colour is not the only reading of it.
    if (label) plate.appendChild(part('verdict', label, `${KEEPS} font-size: 0.75em; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.85;`))
  }

  outer.title = `${splat.verdict} · ${splat.actual}${guess ? ` · guessed ${guess.token}` : ''}`
}

interface Held {
  outer: HTMLElement
  plate: HTMLElement
  mode: Mode
}

export class TapeWall {
  private readonly shown = new Map<number, Held>()
  private readonly landed = new Set<number>()
  // Arrivals that have not been given the glass yet, oldest first.
  private queue: TapeSplat[] = []
  // The head, then its trail, nearest first.
  private trail: HTMLElement[] = []
  // The one event the wall is currently showing off, and the two
  // instants that decide what it looks like.
  private active: { seq: number; launchedAt: number; impactAt: number } | null = null
  // The last frame this wall drew, on the frame clock, so it can tell a
  // busy lane from a tab nobody was looking at.
  private drawnAt: number | null = null

  constructor(private readonly container: HTMLElement) {
    // Thirty-two unlabelled access-log tokens are scenery, not a
    // document; the verdict each one carries is on the element for
    // anyone reading the screen.
    container.setAttribute('aria-hidden', 'true')
  }

  // Every splat the ring holds, every frame: hand an empty list for a
  // room with no glass and the wall comes down, comet included.
  draw(splats: readonly WallSplat[], view: TapeView): void {
    // A reader who asked for less motion gets none of it: no flight, and
    // no smear either. The plate carries one transition, so parking a
    // waiting plate at the running transform would play that smear the
    // moment the glass came free.
    const still = prefersLessMotion()
    const gap = this.drawnAt === null ? 0 : view.clock - this.drawnAt
    this.drawnAt = view.clock
    if (gap > FRAME_GAP_SECONDS) this.queue = []
    this.launch(splats, view, still)

    const held = new Set<number>()
    // The one splat whose comet is still on its way in, taken from the
    // list the wall is drawing: nothing flies that is not on the glass.
    let comet: { splat: TapeSplat; launchedAt: number } | null = null
    for (const onGlass of splats) {
      const { splat } = onGlass
      held.add(splat.seq)
      const { mode, pending } = this.stateOf(splat.seq, view.clock)
      const entry = this.entryFor(splat, mode, view.edge)
      // An event still on its way in is neither: it has not hit yet, so
      // it reads as pending rather than as something on the glass.
      const role = pending ? 'pending' : mode
      if (entry.outer.dataset.role !== role) entry.outer.dataset.role = role
      const painted = inPane(splat, view, mode === 'smear' ? SMEAR_EM_WORLD : RESIDUE_EM_WORLD)
      // Nothing flies at a pane there is nowhere to land on. The comet
      // is picked here rather than before the placement because a
      // flight whose impact is behind the avatar would otherwise cross
      // the camera-to-avatar region and land on nothing.
      const active = this.active
      if (painted && pending && active && active.seq === splat.seq) comet = { splat, launchedAt: active.launchedAt }
      if (!painted) {
        // Behind the camera, in its plane, or behind the avatar:
        // nowhere to put it.
        entry.outer.style.opacity = '0'
        continue
      }
      // Placed whether or not it is worth reading, so the frame it
      // becomes worth reading again does not start from a stale pose.
      entry.outer.style.transform = painted.transform
      if (painted.legible < LEGIBLE_PX) {
        // A smudge rather than a reading. Thirty-two smudges is the
        // mess this wall is not.
        entry.outer.style.opacity = '0'
        continue
      }
      // Until it hits, the glass is still clean: the data arrives with
      // the comet, stretched by the impact, and settles from there.
      entry.plate.style.transform = pending && !still ? RUNNING : SETTLED
      entry.outer.style.opacity = pending ? '0' : String(splatOpacity(ageOf(onGlass, view)))
    }

    for (const [seq, { outer }] of this.shown) {
      if (held.has(seq)) continue
      outer.remove()
      this.shown.delete(seq)
      // Whatever took it off the glass — the room changing, the ring
      // rolling over — took its flight with it.
      if (this.active?.seq === seq) this.active = null
      this.queue = this.queue.filter(waiting => waiting.seq !== seq)
    }

    this.flight(comet, view)
  }

  clear(): void {
    for (const { outer } of this.shown.values()) outer.remove()
    this.shown.clear()
    this.landed.clear()
    this.queue = []
    this.active = null
    this.drawnAt = null
    this.retireComet()
  }

  // Queue every event this wall has not seen before that is still
  // arriving, then give the glass to at most one of them. Everything it
  // has never seen is marked as history in the same pass, so a joiner's
  // thirty-two are residue rather than a stampede.
  private launch(splats: readonly WallSplat[], view: TapeView, still: boolean): void {
    for (const { splat, live, at } of splats) {
      if (!live || this.landed.has(splat.seq)) continue
      this.remember(splat.seq)
      if (view.clock - at >= ARRIVAL_FRESH_SECONDS) continue
      this.queue.push(splat)
      if (this.queue.length > QUEUED_MAX) this.queue.shift()
    }
    const next = this.queue[0]
    if (!next) return
    // A comet in the air, or a smear that has not had its moment yet,
    // keeps the glass. One launch a frame, and never a cut-off readout.
    const active = this.active
    if (active && view.clock < active.impactAt + SMEAR_FLOOR_SECONDS) return
    this.queue.shift()
    // Without the flight the data is on the glass on this frame rather
    // than a second and a half later.
    this.active = { seq: next.seq, launchedAt: view.clock, impactAt: view.clock + (still ? 0 : COMET_FLIGHT_SECONDS) }
    // One comet at a time, even if the last one never landed.
    this.retireComet()
  }

  // How one splat reads this frame: the smear is the live impact, and
  // anything still on its way in is not on the glass at all yet.
  private stateOf(seq: number, now: number): { mode: Mode; pending: boolean } {
    if (this.queue.some(waiting => waiting.seq === seq)) return { mode: 'smear', pending: true }
    const active = this.active
    if (!active || active.seq !== seq) return { mode: 'residue', pending: false }
    if (now < active.impactAt) return { mode: 'smear', pending: true }
    return { mode: now < active.impactAt + SMEAR_SECONDS ? 'smear' : 'residue', pending: false }
  }

  private entryFor(splat: TapeSplat, mode: Mode, edge: string): Held {
    const existing = this.shown.get(splat.seq)
    if (existing) {
      if (existing.mode !== mode) {
        render(existing.outer, existing.plate, splat, mode, edge)
        existing.mode = mode
      }
      return existing
    }
    const outer = document.createElement('div')
    outer.className = 'tape-splat'
    outer.style.cssText = OUTER_STYLE
    outer.dataset.seq = String(splat.seq)
    const plate = document.createElement('div')
    outer.appendChild(plate)
    render(outer, plate, splat, mode, edge)
    this.container.appendChild(outer)
    const entry = { outer, plate, mode }
    this.shown.set(splat.seq, entry)
    return entry
  }

  // The comet itself: the head where tapeComet puts it, and its own
  // recent past behind it, all projected through the room's camera. The
  // path is derived once a frame and read eight times.
  private flight(comet: { splat: TapeSplat; launchedAt: number } | null, view: TapeView): void {
    if (!comet) {
      this.retireComet()
      return
    }
    const { splat } = comet
    const t = cometProgress(comet.launchedAt, view.clock)
    const points = cometPoints(cometFlight(splat, view.wall), t)
    while (this.trail.length > points.length) this.trail.pop()?.remove()
    const colour = splatColour(splat)
    points.forEach((point, i) => {
      const dot = this.trail[i] ?? this.addCometPart(i, i === 0 ? view.edge : colour)
      const projected = projectToNdc(point, view.cameraPos, view.cameraTarget, view.aspect, view.cameraUp)
      if (!projected || projected.forward <= 0.1) {
        dot.style.opacity = '0'
        return
      }
      // A dot of fixed world size, so it grows as it closes on the
      // glass, with a ceiling so an impact underfoot is not a flash.
      const world = ((COMET_RADIUS / projected.forward) / (SHADER_FOV * view.aspect)) * view.width * 0.5
      const taper = 1 - i / (COMET_TRAIL_POINTS + 1)
      const px = Math.min(COMET_MAX_DOT_PX, Math.max(2, world)) * (i === 0 ? 1 : taper * 0.8)
      dot.style.transform = place((projected.x + 1) * 0.5 * view.width, (1 - projected.y) * 0.5 * view.height, px / COMET_DOT_PX)
      dot.style.opacity = String(i === 0 ? 1 : taper * 0.7)
    })
  }

  // One dot, sized and lit once: a frame only moves and scales it.
  private addCometPart(i: number, colour: string): HTMLElement {
    const dot = document.createElement('div')
    dot.dataset.comet = i === 0 ? 'head' : 'trail'
    dot.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: ${COMET_DOT_PX}px;
      height: ${COMET_DOT_PX}px;
      border-radius: 50%;
      background: ${colour};
      box-shadow: 0 0 ${COMET_GLOW_BLUR}px ${COMET_GLOW_SPREAD}px ${colour};
      pointer-events: none;
      will-change: transform;
    `
    this.container.appendChild(dot)
    this.trail[i] = dot
    return dot
  }

  private retireComet(): void {
    if (this.trail.length === 0) return
    for (const dot of this.trail) dot.remove()
    this.trail = []
  }

  private remember(seq: number): void {
    this.landed.add(seq)
    while (this.landed.size > REMEMBERED) {
      const oldest = this.landed.values().next()
      if (oldest.done) return
      this.landed.delete(oldest.value)
    }
  }
}
