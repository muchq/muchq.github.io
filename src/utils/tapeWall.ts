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
import { displayToken } from '@/apps/deja/displayToken'
import { splatColour, splatOpacity, splatPoint, type GlassWall, type TapeSplat, type WallSplat } from './tapeSplats'

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

// How a live splat lands: it arrives large and invisible and is drawn
// settled on the very next frame, so the CSS transition does the smack.
// A seeded splat is drawn settled from the start — a joiner is handed up
// to thirty-two at once, and thirty-two arrivals at once is a stampede.
const ARRIVAL_SCALE = 1.9
const ARRIVAL_MS = 420
const SETTLED = 'translate(-50%, -50%) scale(1)'

const SPLAT_STYLE = `
  position: absolute;
  display: flex;
  align-items: baseline;
  gap: 6px;
  transform-origin: center;
  font-family: "Lexend Deca", sans-serif;
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: 0 0 10px currentColor;
  pointer-events: none;
  transition: transform ${ARRIVAL_MS}ms cubic-bezier(0.18, 0.9, 0.3, 1), opacity ${ARRIVAL_MS}ms ease-out;
`

export class TapeWall {
  private readonly shown = new Map<number, HTMLElement>()

  constructor(private readonly container: HTMLElement) {}

  // Every splat the ring holds, every frame: hand an empty list for a
  // room with no glass and the wall comes down.
  draw(splats: readonly WallSplat[], view: TapeView): void {
    const held = new Set<number>()
    for (const { splat, live } of splats) {
      held.add(splat.seq)
      const existing = this.shown.get(splat.seq)
      const element = existing ?? this.build(splat, live)
      if (!existing) {
        this.container.appendChild(element)
        this.shown.set(splat.seq, element)
      }

      const projected = projectToNdc(splatPoint(splat, view.wall), view.cameraPos, view.cameraTarget, view.aspect, view.cameraUp)
      if (!projected || projected.forward <= 0.1) {
        // Behind the camera, or in its plane: nothing to draw.
        element.style.opacity = '0'
        continue
      }
      element.style.left = `${(projected.x + 1) * 0.5 * view.width}px`
      element.style.top = `${(1 - projected.y) * 0.5 * view.height}px`
      // A live splat spends its first frame large and invisible; every
      // frame after that is where the transition runs to.
      const arriving = !existing && live
      element.style.transform = arriving ? `translate(-50%, -50%) scale(${ARRIVAL_SCALE})` : SETTLED
      element.style.opacity = arriving ? '0' : String(splatOpacity(view.now - splat.ts))
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
  }

  private build(splat: TapeSplat, live: boolean): HTMLElement {
    const element = document.createElement('div')
    element.className = 'tape-splat'
    element.style.cssText = SPLAT_STYLE
    element.style.color = splatColour(splat)
    element.style.transform = `translate(-50%, -50%) scale(${live ? ARRIVAL_SCALE : 1})`

    const token = document.createElement('span')
    token.textContent = displayToken(splat.actual)
    element.appendChild(token)

    // What a predictor led with instead, when either had anything to
    // offer: the gap between the guess and the request is the whole
    // reason the wall is worth looking at.
    const guess = splat.bigram ?? splat.net
    if (guess && guess.token !== splat.actual) {
      const instead = document.createElement('span')
      instead.textContent = displayToken(guess.token)
      instead.style.cssText = 'opacity: 0.55; font-size: 11px; color: #e9eeff; text-shadow: none;'
      element.appendChild(instead)
    }

    // The whole of it, untruncated, for anyone who looks closer.
    element.title = `${splat.verdict} · ${splat.actual}${guess ? ` · guessed ${guess.token}` : ''}`
    return element
  }
}
