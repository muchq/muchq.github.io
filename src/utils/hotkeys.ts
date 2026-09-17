import { isTypingTarget } from './keyboard'

// The world's one-key commands, bound one way: a bare key press, not a
// held key repeating, not a chord, and never while a text field has
// focus. A key that scrolls the page (space) keeps the page still.
export function bindHotkey(
  target: Document | HTMLElement,
  key: string,
  onPress: () => void,
  opts: { preventDefault?: boolean } = {},
): () => void {
  const wanted = key.toLowerCase()
  const handle = (e: Event) => {
    const press = e as KeyboardEvent
    if (isTypingTarget(press.target)) return
    if (press.repeat || press.ctrlKey || press.metaKey || press.altKey) return
    if (press.key.toLowerCase() !== wanted) return
    if (opts.preventDefault) press.preventDefault()
    onPress()
  }
  target.addEventListener('keydown', handle)
  return () => target.removeEventListener('keydown', handle)
}

// Cycles this client's room geometry. Undocumented on purpose.
export const ROOM_HOTKEY = 'g'

export function bindRoomHotkey(target: Document | HTMLElement, onCycle: () => void): () => void {
  return bindHotkey(target, ROOM_HOTKEY, onCycle)
}

// The same command on a phone, which has no `g`: three taps in the same
// spot in quick succession. Still undocumented — this is the easter egg
// the key is, not a control.
export const TAPS_WANTED = 3
// Between one tap and the next. A double-tap zoom is around 300ms, so
// this is loose enough to be comfortable and tight enough that two
// unrelated taps do not run together.
export const TAP_GAP_MS = 400
// How far the finger may wander across the whole run, in CSS pixels.
export const TAP_SLOP = 30

export interface Tap {
  at: number
  x: number
  y: number
}

// The run of taps still counting toward a triple, and whether this one
// completed it. A tap too long after the last, or too far from the
// first, starts a new run rather than extending the old — so a slow
// drum of taps across the screen never adds up to a triple.
export function afterTap(run: Tap[], tap: Tap): { run: Tap[]; fired: boolean } {
  const last = run.at(-1)
  const continues =
    last !== undefined &&
    tap.at - last.at <= TAP_GAP_MS &&
    Math.hypot(tap.x - run[0].x, tap.y - run[0].y) <= TAP_SLOP
  const next = continues ? [...run, tap] : [tap]
  return next.length >= TAPS_WANTED ? { run: [], fired: true } : { run: next, fired: false }
}

// `target` is the world's own touch surface, which is not the canvas:
// that is pointer-events: none behind everything, so it never receives
// a touch. A tap only counts when it lands on the surface itself — the
// joysticks, the sound toggle and the minimap sit on top of it, and a
// tap on one of those is aimed at the control, not at the world.
export function bindRoomTaps(target: HTMLElement, onCycle: () => void): () => void {
  let run: Tap[] = []
  const forget = () => { run = [] }
  const handle = (e: Event) => {
    const touch = e as TouchEvent
    if (e.target !== target) return forget()
    // One finger, and the last one off the glass. A hand resting on a
    // joystick leaves a touch behind, so driving and tapping at once
    // never adds up: you let go of the world to ask it to change.
    if (touch.touches.length > 0 || touch.changedTouches.length !== 1) return forget()
    const { clientX, clientY } = touch.changedTouches[0]
    const next = afterTap(run, { at: Date.now(), x: clientX, y: clientY })
    run = next.run
    if (!next.fired) return
    // Only on the one that lands, so an ordinary tap still behaves.
    e.preventDefault()
    onCycle()
  }
  target.addEventListener('touchend', handle, { passive: false })
  target.addEventListener('touchcancel', forget)
  return () => {
    target.removeEventListener('touchend', handle)
    target.removeEventListener('touchcancel', forget)
  }
}

// Cycles the avatar's shape.
export const SHAPE_HOTKEY = ' '

export function bindShapeHotkey(target: Document | HTMLElement, onCycle: () => void): () => void {
  return bindHotkey(target, SHAPE_HOTKEY, onCycle, { preventDefault: true })
}
