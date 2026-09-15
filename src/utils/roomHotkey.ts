import { isTypingTarget } from './keyboard'

// Cycles this client's room geometry. Undocumented for now: the room
// will come from the hub once rooms carry a geometry (MoonBase#1554).
export const ROOM_HOTKEY = 'g'

export function bindRoomHotkey(target: Document | HTMLElement, onCycle: () => void): () => void {
  const handle = (e: Event) => {
    const key = e as KeyboardEvent
    if (isTypingTarget(key.target)) return
    if (key.repeat || key.ctrlKey || key.metaKey || key.altKey) return
    if (key.key.toLowerCase() !== ROOM_HOTKEY) return
    onCycle()
  }
  target.addEventListener('keydown', handle)
  return () => target.removeEventListener('keydown', handle)
}
