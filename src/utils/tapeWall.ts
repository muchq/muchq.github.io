// The tape drawn on the glasshouse's glass: one element per splat, over
// the canvas, projected through the same camera the ray tracer casts its
// rays from (projection.ts).
//
// Not GLSL. The splats are text — an access-log token, and what a
// predictor guessed instead — and a hand-written ray tracer has no
// glyphs. The player labels already hang off the same camera as absolute
// elements (useThoughtsGame), so this is the room's own idiom: the
// browser lays out the text, and a test can read what landed where
// without a GPU.

import { projectToNdc, type Vec3 } from './projection'
import { displayToken } from './displayToken'
import {
  splatColour,
  splatLabel,
  splatOpacity,
  splatPoint,
  type GlassWall,
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

// How a live splat lands: large for one frame, then drawn settled, so
// the CSS transition does the smack. Only an event that landed in the
// last few seconds gets one, and only once — a backgrounded tab pauses
// the frames while the socket keeps filling the ring, and cycling the
// room away and back rebuilds every element, and neither of those is
// thirty-two arrivals. Opacity is never animated: it is rewritten from
// the clock every frame, so a transition on it would restart every frame
// and leave a splat that passed behind the camera fading in place at the
// edge of the screen.
const ARRIVAL_SCALE = 1.9
const ARRIVAL_MS = 420
const ARRIVAL_FRESH_SECONDS = 5
const SETTLED = 'translate(-50%, -50%) scale(1)'

// Seqs that have had their arrival, kept well past the ring so leaving
// the room and coming back is not a second one, and bounded so a long
// session does not remember every event it ever drew.
const REMEMBERED = 256

// The phone's breakpoint, where the player labels shrink too: clustered
// splats at 13px overlap into mush on a narrow screen.
const PHONE_WIDTH = 1024

const SPLAT_STYLE = `
  position: absolute;
  display: flex;
  align-items: baseline;
  gap: 6px;
  transform-origin: center;
  background: rgba(0, 0, 0, 0.72);
  padding: 3px 7px;
  border-radius: 4px;
  font-family: "Lexend Deca", sans-serif;
  font-weight: 300;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: 0 0 10px currentColor;
  pointer-events: none;
  transition: transform ${ARRIVAL_MS}ms cubic-bezier(0.18, 0.9, 0.3, 1);
`

const prefersLessMotion = () =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const part = (name: string, text: string): HTMLElement => {
  const span = document.createElement('span')
  span.dataset.part = name
  span.textContent = text
  return span
}

export class TapeWall {
  private readonly shown = new Map<number, HTMLElement>()
  private readonly landed = new Set<number>()

  constructor(private readonly container: HTMLElement) {
    // Thirty-two unlabelled access-log tokens are scenery, not a
    // document; the verdict each one carries is on the element for
    // anyone reading the screen.
    container.setAttribute('aria-hidden', 'true')
  }

  // Every splat the ring holds, every frame: hand an empty list for a
  // room with no glass and the wall comes down.
  draw(splats: readonly WallSplat[], view: TapeView): void {
    const held = new Set<number>()
    for (const { splat, live } of splats) {
      held.add(splat.seq)
      const existing = this.shown.get(splat.seq)
      // An arrival is this event's first frame, live, recent, and one
      // this wall has not already smacked in.
      const arriving =
        !existing &&
        live &&
        !this.landed.has(splat.seq) &&
        view.now - splat.ts < ARRIVAL_FRESH_SECONDS &&
        !prefersLessMotion()
      const element = existing ?? this.build(splat, arriving)
      if (!existing) {
        this.container.appendChild(element)
        this.shown.set(splat.seq, element)
        this.remember(splat.seq)
      }
      element.style.fontSize = view.width <= PHONE_WIDTH ? '10px' : '13px'

      const projected = projectToNdc(splatPoint(splat, view.wall), view.cameraPos, view.cameraTarget, view.aspect, view.cameraUp)
      if (!projected || projected.forward <= 0.1) {
        // Behind the camera, or in its plane: nothing to draw.
        element.style.opacity = '0'
        continue
      }
      element.style.left = `${(projected.x + 1) * 0.5 * view.width}px`
      element.style.top = `${(1 - projected.y) * 0.5 * view.height}px`
      // The frame after an arrival is what its transition runs to.
      element.style.transform = arriving ? `translate(-50%, -50%) scale(${ARRIVAL_SCALE})` : SETTLED
      element.style.opacity = String(splatOpacity(view.now - splat.ts))
    }

    for (const [seq, element] of this.shown) {
      if (held.has(seq)) continue
      element.remove()
      this.shown.delete(seq)
    }
  }

  clear(): void {
    for (const element of this.shown.values()) element.remove()
    this.shown.clear()
    this.landed.clear()
  }

  private remember(seq: number): void {
    this.landed.add(seq)
    while (this.landed.size > REMEMBERED) {
      const oldest = this.landed.values().next()
      if (oldest.done) return
      this.landed.delete(oldest.value)
    }
  }

  private build(splat: TapeSplat, arriving: boolean): HTMLElement {
    const element = document.createElement('div')
    element.className = 'tape-splat'
    element.style.cssText = SPLAT_STYLE
    element.style.color = splatColour(splat)
    element.style.transform = arriving ? `translate(-50%, -50%) scale(${ARRIVAL_SCALE})` : SETTLED

    element.appendChild(part('token', displayToken(splat.actual)))

    // What a predictor led with instead, when either had anything to
    // offer and it was not the request itself: the gap between the guess
    // and what happened is the whole reason the wall is worth looking at.
    const guess = splat.bigram ?? splat.net
    if (guess && guess.token !== splat.actual) {
      const instead = part('guess', displayToken(guess.token))
      instead.style.cssText = 'opacity: 0.6; font-size: 0.85em; color: #e9eeff; text-shadow: none;'
      element.appendChild(instead)
    }

    // The verdict in words, so colour is not the only reading of it.
    const label = splatLabel(splat)
    if (label) {
      const verdict = part('verdict', label)
      verdict.style.cssText = 'font-size: 0.75em; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.85;'
      element.appendChild(verdict)
    }

    element.title = `${splat.verdict} · ${splat.actual}${guess ? ` · guessed ${guess.token}` : ''}`
    return element
  }
}
