// A key pressed while a text field has focus is typing, not a game
// command: the world's document-level handlers stand aside for it.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const editable = target.getAttribute('contenteditable')
  if (editable !== null && editable !== 'false') return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
