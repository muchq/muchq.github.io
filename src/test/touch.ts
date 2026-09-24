import { vi } from 'vitest'

// Touches for jsdom, which has no TouchEvent to construct: an Event with
// the touch lists hung on it. Taps advance fake timers, so callers run
// under vi.useFakeTimers().

const at = (x: number, y: number) => ({ clientX: x, clientY: y }) as Touch

export function fireTouch(target: HTMLElement, kind: string, changed: Touch[], held: Touch[]): Event {
  const e = new Event(kind, { bubbles: true, cancelable: true })
  Object.assign(e, { changedTouches: changed, touches: held })
  target.dispatchEvent(e)
  return e
}

// One finger down and up again in the same place, quickly.
export function tap(target: HTMLElement, x = 10, y = 10): Event {
  fireTouch(target, 'touchstart', [at(x, y)], [at(x, y)])
  vi.advanceTimersByTime(40)
  return fireTouch(target, 'touchend', [at(x, y)], [])
}

export function tripleTap(target: HTMLElement, x = 10, y = 10): Event {
  tap(target, x, y)
  tap(target, x + 2, y + 2)
  return tap(target, x + 1, y + 1)
}

export { at as touchAt }
