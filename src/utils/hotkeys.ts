import { isControlTarget, isTypingTarget } from './keyboard'

// The world's one-key commands, bound one way: a bare key press, not a
// held key repeating, not a chord, never while a text field has focus,
// and never one something else already handled. A key with a default of
// its own (space) keeps the page still, and stands aside on a focused
// control, where the default is the point.
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
    if (press.repeat || press.ctrlKey || press.metaKey || press.altKey || press.defaultPrevented) return
    if (press.key.toLowerCase() !== wanted) return
    if (opts.preventDefault) {
      if (isControlTarget(press.target)) return
      press.preventDefault()
    }
    onPress()
  }
  target.addEventListener('keydown', handle)
  return () => target.removeEventListener('keydown', handle)
}

// Cycles the room's geometry. The command menu lists the rooms by name.
export const ROOM_HOTKEY = 'g'

export function bindRoomHotkey(target: Document | HTMLElement, onCycle: () => void): () => void {
  return bindHotkey(target, ROOM_HOTKEY, onCycle)
}

// Cycles a room's music options when it has more than one. The command
// menu lists them by name.
export const MUSIC_HOTKEY = 'y'

export function bindMusicHotkey(target: Document | HTMLElement, onCycle: () => void): () => void {
  return bindHotkey(target, MUSIC_HOTKEY, onCycle)
}

// A phone's way to the command menu, having no space bar: three taps in
// the same spot in quick succession.
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

// A finger that is down, and might yet turn out to be a tap.
export const TAP_HOLD_MS = 300

// Whether a finger that went down at `start` and came up at `end` was a
// tap at all: quick, and still where it landed. A release on its own
// says neither — a long press and a swipe that curls back to where it
// began both end exactly where a tap would.
export function isTap(start: Tap, end: Tap): boolean {
  return end.at - start.at <= TAP_HOLD_MS && Math.hypot(end.x - start.x, end.y - start.y) <= TAP_SLOP
}

// `target` is the world's own touch surface, which is not the canvas:
// that is pointer-events: none behind everything, so it never receives
// a touch. A tap only counts when it lands on the surface itself — the
// joysticks, the sound toggle and the minimap sit on top of it, and a
// tap on one of those is aimed at the control, not at the world.
export function bindTripleTap(target: HTMLElement, onTriple: () => void): () => void {
  let run: Tap[] = []
  // The finger that is down and might yet turn out to be a tap. Losing
  // it is how a gesture is marked as one that never can be: a release
  // with no candidate behind it is not a tap, which is what keeps the
  // last lift of a pinch — one changed touch, none held, indis-
  // tinguishable from a tap on its own — from counting as one.
  let candidate: Tap | null = null

  const forget = () => {
    run = []
    candidate = null
  }

  const began = (e: Event) => {
    const touch = e as TouchEvent
    // A second finger, or a finger put down on a control: whatever this
    // turns into, it is not a tap, and it interrupts whatever was
    // counting — three taps with a pinch among them are not a triple.
    if (e.target !== target || touch.touches.length > 1) {
      candidate = null
      run = []
      return
    }
    const { clientX, clientY } = touch.changedTouches[0]
    candidate = { at: Date.now(), x: clientX, y: clientY }
  }

  const moved = (e: Event) => {
    if (!candidate) return
    const { clientX, clientY } = (e as TouchEvent).changedTouches[0]
    if (Math.hypot(clientX - candidate.x, clientY - candidate.y) <= TAP_SLOP) return
    candidate = null
    run = []
  }

  const ended = (e: Event) => {
    const touch = e as TouchEvent
    const began = candidate
    candidate = null
    // Fingers still down: the gesture is not over, and it was never a
    // single tap to begin with.
    if (touch.touches.length > 0) return
    if (!began || touch.changedTouches.length !== 1) return
    const { clientX, clientY } = touch.changedTouches[0]
    if (!isTap(began, { at: Date.now(), x: clientX, y: clientY })) {
      run = []
      return
    }
    // Counted from where the finger landed, which is where the person
    // meant to tap.
    const next = afterTap(run, began)
    run = next.run
    if (!next.fired) return
    // Only on the one that lands, so an ordinary tap still behaves.
    e.preventDefault()
    onTriple()
  }

  // Safari waits after a tap to see whether a second one follows, and
  // zooms if it does — so the page would have reframed under the finger
  // before the third tap ever arrived, and a preventDefault on that one
  // is far too late. `manipulation` drops the double-tap zoom and keeps
  // pinch and pan. The joysticks set their own, stricter, `none`.
  const hadTouchAction = target.style.touchAction
  target.style.touchAction = 'manipulation'

  target.addEventListener('touchstart', began)
  target.addEventListener('touchmove', moved)
  target.addEventListener('touchend', ended, { passive: false })
  target.addEventListener('touchcancel', forget)
  return () => {
    target.style.touchAction = hadTouchAction
    target.removeEventListener('touchstart', began)
    target.removeEventListener('touchmove', moved)
    target.removeEventListener('touchend', ended)
    target.removeEventListener('touchcancel', forget)
  }
}

// Opens the command menu, where every world command is listed by name.
export const COMMAND_HOTKEY = ' '

export function bindCommandHotkey(target: Document | HTMLElement, onOpen: () => void): () => void {
  return bindHotkey(target, COMMAND_HOTKEY, onOpen, { preventDefault: true })
}
