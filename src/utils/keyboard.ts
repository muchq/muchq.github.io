// A key pressed while a text field has focus is typing, not a game
// command: the world's document-level handlers stand aside for it.
// A control a key press would work: space presses a button, follows no
// link but pages past it, toggles a checkbox.
const CONTROL_ROLES = new Set(['button', 'link', 'checkbox', 'switch', 'tab', 'menuitem', 'option'])

export function isControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return true
  return CONTROL_ROLES.has(target.getAttribute('role') ?? '')
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const editable = target.getAttribute('contenteditable')
  if (editable !== null && editable !== 'false') return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
