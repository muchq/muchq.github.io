import { describe, it, expect, vi, afterEach } from 'vitest'
import { bindHotkey, bindRoomHotkey, bindShapeHotkey, ROOM_HOTKEY, SHAPE_HOTKEY } from '../hotkeys'

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
