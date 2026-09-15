import { describe, it, expect, vi, afterEach } from 'vitest'
import { bindRoomHotkey, ROOM_HOTKEY } from '../roomHotkey'

// Undocumented for now: one key cycles the room geometry for this client
// only. It must stand aside for typing, like every world key does.

const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }))

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
