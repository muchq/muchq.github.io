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

// Cycles this client's room geometry. Undocumented for now: the room
// will come from the hub once rooms carry a geometry (MoonBase#1554).
export const ROOM_HOTKEY = 'g'

export function bindRoomHotkey(target: Document | HTMLElement, onCycle: () => void): () => void {
  return bindHotkey(target, ROOM_HOTKEY, onCycle)
}

// Cycles the avatar's shape.
export const SHAPE_HOTKEY = ' '

export function bindShapeHotkey(target: Document | HTMLElement, onCycle: () => void): () => void {
  return bindHotkey(target, SHAPE_HOTKEY, onCycle, { preventDefault: true })
}
