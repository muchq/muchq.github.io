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
  // Now, in epoch seconds. Read against deja's `ts` and nothing else:
  // the hub stamps that on the same epoch.
  now: number
  // The frame's own timestamp, in seconds, on a clock that only goes
  // forward. Every flight, deadline and freshness reading is on this
  // one. A system-clock correction backwards mid-flight would otherwise
  // freeze the comet in the air and wedge the queue behind it, and one
  // forwards would skip the flight outright.
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

// The phone's breakpoint, where the player labels shrink too: clustered
// splats at 13px overlap into mush on a narrow screen.
const PHONE_WIDTH = 1024

// The last few of the lane, and how wide the plate may get. The wire
// bounds neither the number of context tokens nor their length, and a
// plate as wide as the lane pushes the token off the side of a phone.
const CONTEXT_SHOWN = 4
const PLATE_MAX_WIDTH = 'min(70vw, 460px)'

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

// The node that is moved: no look, no transition, nothing that a frame's
// reposition could interrupt.
const OUTER_STYLE = `
  position: absolute;
  left: 0;
  top: 0;
  font-family: ${MONO};
  font-weight: 400;
  white-space: nowrap;
  pointer-events: none;
  will-change: transform;
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
    for (const { splat } of splats) {
      held.add(splat.seq)
      const { mode, pending } = this.stateOf(splat.seq, view.clock)
      const entry = this.entryFor(splat, mode, view.edge)
      entry.outer.style.fontSize = this.fontSize(mode, view.width)
      // An event still on its way in is neither: it has not hit yet, so
      // it reads as pending rather than as something on the glass.
      const role = pending ? 'pending' : mode
      if (entry.outer.dataset.role !== role) entry.outer.dataset.role = role
      const active = this.active
      if (pending && active && active.seq === splat.seq) comet = { splat, launchedAt: active.launchedAt }

      const projected = projectToNdc(splatPoint(splat, view.wall), view.cameraPos, view.cameraTarget, view.aspect, view.cameraUp)
      if (!projected || projected.forward <= 0.1) {
        // Behind the camera, or in its plane: nothing to draw.
        entry.outer.style.opacity = '0'
        continue
      }
      entry.outer.style.transform = place((projected.x + 1) * 0.5 * view.width, (1 - projected.y) * 0.5 * view.height)
      // Until it hits, the glass is still clean: the data arrives with
      // the comet, stretched by the impact, and settles from there.
      entry.plate.style.transform = pending && !still ? RUNNING : SETTLED
      entry.outer.style.opacity = pending ? '0' : String(splatOpacity(view.now - splat.ts))
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

  private fontSize(mode: Mode, width: number): string {
    const phone = width <= PHONE_WIDTH
    if (mode === 'smear') return phone ? '13px' : '16px'
    return phone ? '10px' : '13px'
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
