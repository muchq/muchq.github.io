import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  afterTap,
  bindHotkey,
  bindRoomHotkey,
  bindRoomTaps,
  bindShapeHotkey,
  ROOM_HOTKEY,
  SHAPE_HOTKEY,
  TAP_GAP_MS,
  TAP_SLOP,
  TAPS_WANTED,
} from '../hotkeys'

// One binding for every one-key world command: it stands aside for
// typing, held keys and chords, and the room and shape keys are two
// names for it. The room key is undocumented for now: one key cycles
// the room geometry for this client only.

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))

describe('bindShapeHotkey', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('cycles on space and keeps the page from scrolling', () => {
    const onCycle = vi.fn()
    const unbind = bindShapeHotkey(document, onCycle)
    const space = new KeyboardEvent('keydown', { key: SHAPE_HOTKEY, bubbles: true, cancelable: true })
    document.dispatchEvent(space)
    expect(onCycle).toHaveBeenCalledTimes(1)
    expect(space.defaultPrevented).toBe(true)
    const other = new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true })
    document.dispatchEvent(other)
    expect(onCycle).toHaveBeenCalledTimes(1)
    expect(other.defaultPrevented).toBe(false)
    unbind()
  })

  it('does not cycle for a held space, a chord, or a text field', () => {
    const onCycle = vi.fn()
    const unbind = bindShapeHotkey(document, onCycle)
    press(SHAPE_HOTKEY, { repeat: true })
    press(SHAPE_HOTKEY, { ctrlKey: true })
    const input = document.createElement('input')
    document.body.appendChild(input)
    press(SHAPE_HOTKEY, {}, input)
    expect(onCycle).not.toHaveBeenCalled()
    unbind()
  })
})

describe('bindHotkey', () => {
  it('leaves the default alone unless asked', () => {
    const unbind = bindHotkey(document, 'x', () => {})
    const x = new KeyboardEvent('keydown', { key: 'X', bubbles: true, cancelable: true })
    document.dispatchEvent(x)
    expect(x.defaultPrevented).toBe(false)
    unbind()
  })
})

describe('bindRoomHotkey', () => {
  let unbind: (() => void) | null = null
  afterEach(() => {
    unbind?.()
    unbind = null
    document.body.innerHTML = ''
  })

  it('cycles on the key, either case, and not on other keys', () => {
    const onCycle = vi.fn()
    unbind = bindRoomHotkey(document, onCycle)
    press(ROOM_HOTKEY)
    press(ROOM_HOTKEY.toUpperCase())
    press('h')
    press(' ')
    expect(onCycle).toHaveBeenCalledTimes(2)
  })

  it('ignores a held key repeating and chorded presses', () => {
    const onCycle = vi.fn()
    unbind = bindRoomHotkey(document, onCycle)
    press(ROOM_HOTKEY, { repeat: true })
    press(ROOM_HOTKEY, { ctrlKey: true })
    press(ROOM_HOTKEY, { metaKey: true })
    press(ROOM_HOTKEY, { altKey: true })
    expect(onCycle).not.toHaveBeenCalled()
    press(ROOM_HOTKEY)
    expect(onCycle).toHaveBeenCalledTimes(1)
  })

  it('stands aside while a text field has focus', () => {
    const onCycle = vi.fn()
    unbind = bindRoomHotkey(document, onCycle)
    const input = document.createElement('input')
    document.body.appendChild(input)
    press(ROOM_HOTKEY, {}, input)
    expect(onCycle).not.toHaveBeenCalled()
    const div = document.createElement('div')
    document.body.appendChild(div)
    press(ROOM_HOTKEY, {}, div)
    expect(onCycle).toHaveBeenCalledTimes(1)
  })

  it('stops listening once unbound', () => {
    const onCycle = vi.fn()
    unbind = bindRoomHotkey(document, onCycle)
    unbind()
    unbind = null
    press(ROOM_HOTKEY)
    expect(onCycle).not.toHaveBeenCalled()
  })
})


// A phone has no `g`, so the same command answers to three taps in the
// same spot. Still the easter egg the key is — nothing on screen says
// so, which is why the recogniser has to be exact: too loose and people
// reshape the room by accident, too tight and nobody ever finds it.
describe('afterTap', () => {
  const tap = (at: number, x = 0, y = 0) => ({ at, x, y })

  it('fires on the third tap in the same spot, and not before', () => {
    let run = afterTap([], tap(0))
    expect(run.fired).toBe(false)
    run = afterTap(run.run, tap(100))
    expect(run.fired).toBe(false)
    expect(run.run).toHaveLength(TAPS_WANTED - 1)
    run = afterTap(run.run, tap(200))
    expect(run.fired).toBe(true)
  })

  it('starts over rather than firing, so a fourth tap is not a second triple', () => {
    const third = afterTap(afterTap(afterTap([], tap(0)).run, tap(100)).run, tap(200))
    expect(third.run).toEqual([])
    expect(afterTap(third.run, tap(300)).fired).toBe(false)
  })

  it('drops a run when the taps come too far apart', () => {
    const second = afterTap(afterTap([], tap(0)).run, tap(TAP_GAP_MS + 1))
    // The late tap begins a run of its own, so two more are still owed.
    expect(second.run).toHaveLength(1)
    expect(afterTap(second.run, tap(TAP_GAP_MS + 2)).fired).toBe(false)
  })

  // Measured from the first tap, not the last: three taps each a step
  // from the one before would otherwise walk across the screen and
  // still count.
  it('drops a run that wanders away from where it started', () => {
    const drift = TAP_SLOP * 0.6
    const second = afterTap(afterTap([], tap(0)).run, tap(50, drift))
    expect(second.run).toHaveLength(2)
    const third = afterTap(second.run, tap(100, drift * 2))
    expect(third.fired).toBe(false)
    expect(third.run).toHaveLength(1)
  })
})

describe('bindRoomTaps', () => {
  let canvas: HTMLElement
  beforeEach(() => {
    vi.useFakeTimers()
    canvas = document.createElement('div')
    document.body.appendChild(canvas)
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  const touch = (x: number, y: number) => ({ clientX: x, clientY: y }) as Touch
  const lift = (changed: Touch[], held: Touch[] = [], from: HTMLElement = canvas) => {
    const e = new Event('touchend', { bubbles: true, cancelable: true })
    Object.assign(e, { changedTouches: changed, touches: held })
    from.dispatchEvent(e)
    return e
  }

  it('cycles the room on three taps and swallows only the one that lands', () => {
    const onCycle = vi.fn()
    bindRoomTaps(canvas, onCycle)
    const first = lift([touch(10, 10)])
    expect(onCycle).not.toHaveBeenCalled()
    // An ordinary tap is still an ordinary tap.
    expect(first.defaultPrevented).toBe(false)
    lift([touch(12, 12)])
    const third = lift([touch(11, 11)])
    expect(onCycle).toHaveBeenCalledTimes(1)
    expect(third.defaultPrevented).toBe(true)
  })

  it('waits out a slow third tap', () => {
    const onCycle = vi.fn()
    bindRoomTaps(canvas, onCycle)
    lift([touch(10, 10)])
    lift([touch(10, 10)])
    vi.advanceTimersByTime(TAP_GAP_MS + 1)
    lift([touch(10, 10)])
    expect(onCycle).not.toHaveBeenCalled()
  })

  // A thumb on a joystick leaves a touch behind. Driving and tapping at
  // once must not reshape the room under everyone standing there.
  it('ignores a tap made with another finger still down', () => {
    const onCycle = vi.fn()
    bindRoomTaps(canvas, onCycle)
    for (let i = 0; i < TAPS_WANTED; i++) lift([touch(10, 10)], [touch(400, 600)])
    expect(onCycle).not.toHaveBeenCalled()
  })

  // The joysticks and the sound toggle sit on top of the world. A tap
  // on one of those is aimed at the control, and bubbles up here.
  it('ignores a tap aimed at a control sitting on the world', () => {
    const onCycle = vi.fn()
    bindRoomTaps(canvas, onCycle)
    const joystick = document.createElement('div')
    canvas.appendChild(joystick)
    for (let i = 0; i < TAPS_WANTED; i++) lift([touch(10, 10)], [], joystick)
    expect(onCycle).not.toHaveBeenCalled()
  })

  it('forgets the run when a touch is cancelled', () => {
    const onCycle = vi.fn()
    bindRoomTaps(canvas, onCycle)
    lift([touch(10, 10)])
    lift([touch(10, 10)])
    canvas.dispatchEvent(new Event('touchcancel', { bubbles: true }))
    lift([touch(10, 10)])
    expect(onCycle).not.toHaveBeenCalled()
  })

  it('stops listening once unbound', () => {
    const onCycle = vi.fn()
    bindRoomTaps(canvas, onCycle)()
    for (let i = 0; i < TAPS_WANTED; i++) lift([touch(10, 10)])
    expect(onCycle).not.toHaveBeenCalled()
  })
})
