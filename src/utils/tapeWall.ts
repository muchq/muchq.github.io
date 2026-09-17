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

import { SHADER_FOV, projectToNdc, type Vec3 } from './projection'
import { displayToken } from './displayToken'
import { COMET_FLIGHT_SECONDS, COMET_TRAIL_POINTS, cometAt, cometProgress, cometTrail } from './tapeComet'
import { GLASS_EDGE, paletteCss } from './roomGeometry'
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
  // Now, in epoch seconds, against a splat's ts.
  now: number
}

// How long the data stays smeared across the glass before it settles
// back into residue. A comet arriving retires it early, so a busy lane
// is a run of impacts rather than a wall of stickers.
export const SMEAR_SECONDS = 6

// Only an event that reached us in the last few seconds flies. A
// backgrounded tab pauses the frames while the socket keeps filling the
// ring, and what that ring then holds is history, not arrivals.
const ARRIVAL_FRESH_SECONDS = 5

// Seqs that have already had their comet, kept well past the ring so
// leaving the room and coming back is not a second flight, and bounded
// so a long session does not remember every event it ever drew.
const REMEMBERED = 256

// The phone's breakpoint, where the player labels shrink too: clustered
// splats at 13px overlap into mush on a narrow screen.
const PHONE_WIDTH = 1024

// The impact, and the half-second the data takes to stop running. Never
// opacity: that is rewritten from the clock every frame, so a transition
// on it would restart every frame and leave a splat that passed behind
// the camera fading in place at the edge of the screen.
const SMEAR_MS = 520
const SETTLED = 'translate(-50%, -50%)'
const RUNNING = 'translate(-50%, -50%) scaleX(2.6) skewX(-24deg)'

// The head's world radius, so a comet grows as it comes in rather than
// being a dot that teleports.
const COMET_RADIUS = 1.1

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace'
const GLASS = paletteCss(GLASS_EDGE)

type Mode = 'residue' | 'smear'

// Both readings sit on a dark plate: the glass behind them is lit, and
// neon on neon is not contrast.
const PLATE = `
  position: absolute;
  transform-origin: center;
  font-family: ${MONO};
  font-weight: 400;
  white-space: nowrap;
  pointer-events: none;
  transition: transform ${SMEAR_MS}ms cubic-bezier(0.1, 0.85, 0.25, 1);
`

const RESIDUE_STYLE = `
  ${PLATE}
  display: flex;
  align-items: baseline;
  gap: 6px;
  z-index: 1;
  background: rgba(0, 0, 0, 0.72);
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
  text-shadow: 0 0 8px currentColor;
`

const SMEAR_STYLE = `
  ${PLATE}
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 2;
  background: rgba(0, 0, 0, 0.82);
  padding: 5px 10px 5px 8px;
  border-left: 2px solid currentColor;
  border-radius: 2px;
  letter-spacing: 0.08em;
  text-shadow: 0 0 12px currentColor;
  box-shadow: 0 0 22px -6px currentColor, inset 0 0 18px -10px ${GLASS};
`

const prefersLessMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const part = (name: string, text: string, css = ''): HTMLElement => {
  const span = document.createElement('span')
  span.dataset.part = name
  span.textContent = text
  if (css) span.style.cssText = css
  return span
}

// A predictor's line in the readout: who guessed, what, and how sure.
const guessLine = (name: string, guess: TapeGuess): HTMLElement => {
  const line = part('guess', `${name} ${displayToken(guess.token)} ${guess.p.toFixed(2)}`, `font-size: 0.72em; color: ${GLASS}; opacity: 0.86; text-shadow: none;`)
  line.dataset.predictor = name
  return line
}

// What is on the glass for one splat, in the mode it is currently read
// in. The smear is the whole event; the residue is what is left of it.
function render(element: HTMLElement, splat: TapeSplat, mode: Mode): void {
  element.replaceChildren()
  element.dataset.role = mode
  element.dataset.seq = String(splat.seq)
  element.style.cssText = mode === 'smear' ? SMEAR_STYLE : RESIDUE_STYLE
  element.style.color = splatColour(splat)
  const label = splatLabel(splat)
  // Whichever predictor had something to say, the bigram first: the
  // residue has room for one, and the title carries it either way.
  const guess = splat.bigram ?? splat.net

  if (mode === 'smear') {
    // The lane that led here, then what actually came, then what each
    // predictor led with instead.
    if (splat.context.length > 0) {
      const lane = document.createElement('div')
      lane.style.cssText = 'display: flex; gap: 8px; font-size: 0.7em; color: #e9eeff; opacity: 0.55; text-shadow: none;'
      for (const token of splat.context) lane.appendChild(part('context', displayToken(token)))
      element.appendChild(lane)
    }
    const headline = document.createElement('div')
    headline.style.cssText = 'display: flex; align-items: baseline; gap: 10px;'
    headline.appendChild(part('token', displayToken(splat.actual), 'font-size: 1.15em;'))
    if (label) headline.appendChild(part('verdict', label, 'font-size: 0.68em; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.9;'))
    element.appendChild(headline)
    const guesses = document.createElement('div')
    guesses.style.cssText = 'display: flex; gap: 10px;'
    if (splat.bigram) guesses.appendChild(guessLine('bigram', splat.bigram))
    if (splat.net) guesses.appendChild(guessLine('net', splat.net))
    if (guesses.childElementCount > 0) element.appendChild(guesses)
  } else {
    element.appendChild(part('token', displayToken(splat.actual)))
    // What a predictor led with instead, when it was not the request
    // itself: the gap is the whole reason for the wall.
    if (guess && guess.token !== splat.actual) {
      element.appendChild(part('guess', displayToken(guess.token), `opacity: 0.6; font-size: 0.85em; color: ${GLASS}; text-shadow: none;`))
    }
    // The verdict in words, so colour is not the only reading of it.
    if (label) element.appendChild(part('verdict', label, 'font-size: 0.75em; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.85;'))
  }

  element.title = `${splat.verdict} · ${splat.actual}${guess ? ` · guessed ${guess.token}` : ''}`
}

export class TapeWall {
  private readonly shown = new Map<number, { element: HTMLElement; mode: Mode }>()
  private readonly landed = new Set<number>()
  // The head, then its trail, nearest first.
  private trail: HTMLElement[] = []
  // The one event the wall is currently showing off, and the two
  // instants that decide what it looks like.
  private active: { seq: number; launchedAt: number; impactAt: number } | null = null

  constructor(private readonly container: HTMLElement) {
    // Thirty-two unlabelled access-log tokens are scenery, not a
    // document; the verdict each one carries is on the element for
    // anyone reading the screen.
    container.setAttribute('aria-hidden', 'true')
  }

  // Every splat the ring holds, every frame: hand an empty list for a
  // room with no glass and the wall comes down, comet included.
  draw(splats: readonly WallSplat[], view: TapeView): void {
    this.launch(splats, view)

    const held = new Set<number>()
    // The one splat whose comet is still on its way in, taken from the
    // list the wall is drawing: nothing flies that is not on the glass.
    let comet: { splat: TapeSplat; launchedAt: number } | null = null
    for (const { splat } of splats) {
      held.add(splat.seq)
      const mode = this.modeOf(splat.seq, view.now)
      const element = this.elementFor(splat, mode)
      element.style.fontSize = this.fontSize(mode, view.width)
      // In flight the glass is still clean: the data arrives with the
      // comet, stretched by the impact, and settles over the next
      // half-second.
      const active = this.active
      const flying = mode === 'smear' && active !== null && view.now < active.impactAt
      if (flying && active) comet = { splat, launchedAt: active.launchedAt }

      const projected = projectToNdc(splatPoint(splat, view.wall), view.cameraPos, view.cameraTarget, view.aspect, view.cameraUp)
      if (!projected || projected.forward <= 0.1) {
        // Behind the camera, or in its plane: nothing to draw.
        element.style.opacity = '0'
        continue
      }
      element.style.left = `${(projected.x + 1) * 0.5 * view.width}px`
      element.style.top = `${(1 - projected.y) * 0.5 * view.height}px`
      element.style.transform = flying ? RUNNING : SETTLED
      element.style.opacity = flying ? '0' : String(splatOpacity(view.now - splat.ts))
    }

    for (const [seq, { element }] of this.shown) {
      if (held.has(seq)) continue
      element.remove()
      this.shown.delete(seq)
      // Whatever took it off the glass — the room changing, the ring
      // rolling over — took its flight with it.
      if (this.active?.seq === seq) this.active = null
    }

    this.flight(comet, view)
  }

  clear(): void {
    for (const { element } of this.shown.values()) element.remove()
    this.shown.clear()
    this.landed.clear()
    this.active = null
    this.retireComet()
  }

  // The newest event this wall has not seen before, if it is recent
  // enough to still be arriving. Everything else it has never seen is
  // marked as history in the same pass, so a joiner's thirty-two are
  // residue rather than a stampede.
  private launch(splats: readonly WallSplat[], view: TapeView): void {
    let arriving: TapeSplat | null = null
    for (const { splat, live } of splats) {
      if (!live || this.landed.has(splat.seq)) continue
      this.remember(splat.seq)
      if (view.now - splat.ts < ARRIVAL_FRESH_SECONDS) arriving = splat
    }
    if (!arriving) return
    // A reader who asked for less motion gets no flight at all: the data
    // is on the glass on this frame, not a second and a half later.
    const flies = !prefersLessMotion()
    this.active = { seq: arriving.seq, launchedAt: view.now, impactAt: view.now + (flies ? COMET_FLIGHT_SECONDS : 0) }
    // One comet at a time, even if the last one never landed.
    this.retireComet()
  }

  private modeOf(seq: number, now: number): Mode {
    const active = this.active
    if (!active || active.seq !== seq) return 'residue'
    return now < active.impactAt + SMEAR_SECONDS ? 'smear' : 'residue'
  }

  private fontSize(mode: Mode, width: number): string {
    const phone = width <= PHONE_WIDTH
    if (mode === 'smear') return phone ? '13px' : '16px'
    return phone ? '10px' : '13px'
  }

  private elementFor(splat: TapeSplat, mode: Mode): HTMLElement {
    const existing = this.shown.get(splat.seq)
    if (existing) {
      if (existing.mode !== mode) {
        render(existing.element, splat, mode)
        existing.mode = mode
      }
      return existing.element
    }
    const element = document.createElement('div')
    element.className = 'tape-splat'
    render(element, splat, mode)
    this.container.appendChild(element)
    this.shown.set(splat.seq, { element, mode })
    return element
  }

  // The comet itself: the head where tapeComet puts it, and its own
  // recent past behind it, all projected through the room's camera.
  private flight(comet: { splat: TapeSplat; launchedAt: number } | null, view: TapeView): void {
    if (!comet) {
      this.retireComet()
      return
    }
    const { splat } = comet
    const t = cometProgress(comet.launchedAt, view.now)
    const points = [cometAt(splat, view.wall, t), ...cometTrail(splat, view.wall, t)]
    while (this.trail.length > points.length) this.trail.pop()?.remove()
    const colour = splatColour(splat)
    points.forEach((point, i) => {
      const element = this.trail[i] ?? this.addCometPart(i)
      const projected = projectToNdc(point, view.cameraPos, view.cameraTarget, view.aspect, view.cameraUp)
      if (!projected || projected.forward <= 0.1) {
        element.style.opacity = '0'
        return
      }
      // A head of fixed world size: it grows as it closes on the glass.
      const size = Math.max(2, ((COMET_RADIUS / projected.forward) / (SHADER_FOV * view.aspect)) * view.width * 0.5)
      const taper = 1 - i / (COMET_TRAIL_POINTS + 1)
      const px = size * (i === 0 ? 1 : taper * 0.8)
      element.style.left = `${(projected.x + 1) * 0.5 * view.width}px`
      element.style.top = `${(1 - projected.y) * 0.5 * view.height}px`
      element.style.width = `${px}px`
      element.style.height = `${px}px`
      element.style.opacity = String(i === 0 ? 1 : taper * 0.7)
      element.style.background = i === 0 ? '#ffffff' : colour
      element.style.boxShadow = `0 0 ${px * 2.5}px ${px * 0.6}px ${colour}`
    })
  }

  private addCometPart(i: number): HTMLElement {
    const element = document.createElement('div')
    element.dataset.comet = i === 0 ? 'head' : 'trail'
    element.style.cssText = 'position: absolute; z-index: 3; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none;'
    this.container.appendChild(element)
    this.trail[i] = element
    return element
  }

  private retireComet(): void {
    for (const element of this.trail) element.remove()
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
