import { StrictMode, createRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandRegistry, type Command } from '@/utils/commandRegistry'
import { bindRoomHotkey, COMMAND_HOTKEY } from '@/utils/hotkeys'
import CommandMenu, { type CommandMenuHandle } from '../CommandMenu'

// The menu over the world: Escape opens it, typing filters, arrows and
// Enter run, Escape leaves, and focus goes back where it came from.

const cmd = (id: string, label: string, detail?: string): Command => ({ id, label, detail, run: vi.fn() })

describe('CommandMenu', () => {
  let registry: CommandRegistry
  let shape: Command, room: Command, chat: Command

  beforeEach(() => {
    registry = new CommandRegistry()
    shape = cmd('shape', 'Avatar: cube')
    room = cmd('room', 'Room: Glasshouse', 'Reshapes the room for everyone in it')
    chat = cmd('chat', 'Open chat')
    registry.publish('world', [shape, room])
    registry.publish('lobby', [chat])
  })

  const open = () => fireEvent.keyDown(document, { key: COMMAND_HOTKEY })
  const input = () => screen.getByRole('combobox', { name: 'Command' })
  const options = () => screen.queryAllByRole('option').map(o => o.textContent)

  it('is closed until Escape, which opens it with the filter focused and every command listed', () => {
    render(<CommandMenu registry={registry} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(COMMAND_HOTKEY).toBe('Escape')
    open()
    expect(screen.getByRole('dialog', { name: 'Command menu' })).toHaveAttribute('aria-modal', 'true')
    expect(document.activeElement).toBe(input())
    expect(options()).toEqual(['Avatar: cube', 'Room: GlasshouseReshapes the room for everyone in it', 'Open chat'])
  })

  it('Escape in a text field elsewhere is the field’s, and opens nothing', () => {
    render(
      <>
        <input aria-label="elsewhere" />
        <CommandMenu registry={registry} />
      </>
    )
    fireEvent.keyDown(screen.getByLabelText('elsewhere'), { key: COMMAND_HOTKEY })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('filters as you type, and says when nothing matches', async () => {
    render(<CommandMenu registry={registry} />)
    open()
    await userEvent.type(input(), 'everyone')
    expect(options()).toEqual(['Room: GlasshouseReshapes the room for everyone in it'])
    await userEvent.clear(input())
    await userEvent.type(input(), 'nothing like this')
    expect(options()).toEqual([])
    expect(screen.getByText('No matching commands')).toBeTruthy()
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(shape.run).not.toHaveBeenCalled()
    expect(room.run).not.toHaveBeenCalled()
    expect(chat.run).not.toHaveBeenCalled()
  })

  it('arrows move through the list, wrapping, and Enter runs the one they land on, then closes', () => {
    render(
      <>
        <button type="button">before</button>
        <CommandMenu registry={registry} />
      </>
    )
    const before = screen.getByRole('button', { name: 'before' })
    before.focus()
    open()
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Avatar: cube')
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowUp' })
    expect(input().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { selected: true }).id)
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Open chat')
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(chat.run).toHaveBeenCalledTimes(1)
    expect(shape.run).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(before)
  })

  it('focus is back where it came from before the command runs, so a command can move it', () => {
    const where = vi.fn()
    chat.run = () => where(document.activeElement)
    registry.publish('lobby', [chat])
    render(
      <>
        <button type="button">before</button>
        <CommandMenu registry={registry} />
      </>
    )
    const before = screen.getByRole('button', { name: 'before' })
    before.focus()
    open()
    fireEvent.click(screen.getByRole('option', { name: 'Open chat' }))
    expect(where).toHaveBeenCalledWith(before)
  })

  it('Escape leaves without running anything, and so does a click outside', () => {
    render(<CommandMenu registry={registry} />)
    open()
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    open()
    fireEvent.click(screen.getByTestId('command-menu-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(shape.run).not.toHaveBeenCalled()
    expect(chat.run).not.toHaveBeenCalled()
  })

  it('opens fresh: the last filter and selection are gone', async () => {
    render(<CommandMenu registry={registry} />)
    open()
    await userEvent.type(input(), 'chat')
    fireEvent.keyDown(input(), { key: 'Escape' })
    open()
    expect(input()).toHaveValue('')
    expect(options()).toHaveLength(3)
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Avatar: cube')
  })

  it('a command that goes away while the menu is up leaves the list, and the selection stays in it', () => {
    render(<CommandMenu registry={registry} />)
    open()
    fireEvent.keyDown(input(), { key: 'ArrowUp' })
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Open chat')
    act(() => registry.publish('lobby', []))
    expect(options()).toHaveLength(2)
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(room.run).toHaveBeenCalledTimes(1)
  })

  // The world's keys are bound on the document too; the filter is a text
  // field, so what is typed there is never a world command.
  it('typing in the filter does not reach the world', async () => {
    const onRoom = vi.fn()
    const unbind = bindRoomHotkey(document, onRoom)
    try {
      render(<CommandMenu registry={registry} />)
      open()
      await userEvent.type(input(), 'g ')
      expect(input()).toHaveValue('g ')
      expect(onRoom).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeTruthy()
    } finally {
      unbind()
    }
  })

  // In a room focus often sits on a button (chat's toggle, a table's
  // Join); Escape presses none of them, so it opens the menu from there.
  it('Escape on a focused button opens it, and presses nothing', () => {
    const pressed = vi.fn()
    render(
      <>
        <button type="button" onClick={pressed}>
          Open chat
        </button>
        <CommandMenu registry={registry} />
      </>
    )
    const button = screen.getByRole('button', { name: 'Open chat' })
    button.focus()
    fireEvent.keyDown(button, { key: COMMAND_HOTKEY })
    expect(screen.getByRole('dialog', { name: 'Command menu' })).toBeTruthy()
    expect(pressed).not.toHaveBeenCalled()
  })

  // Closing a drawer or a dialog with Escape is that surface's key.
  it('an Escape something else already handled opens nothing', () => {
    render(<CommandMenu registry={registry} />)
    const handled = new KeyboardEvent('keydown', { key: COMMAND_HOTKEY, bubbles: true, cancelable: true })
    handled.preventDefault()
    act(() => {
      document.dispatchEvent(handled)
    })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Escape in the menu closes it and does not open it again', () => {
    render(<CommandMenu registry={registry} />)
    open()
    fireEvent.keyDown(input(), { key: COMMAND_HOTKEY })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('under StrictMode, leaving hands focus back to where it came from', () => {
    render(
      <StrictMode>
        <button type="button">before</button>
        <CommandMenu registry={registry} />
      </StrictMode>
    )
    const before = screen.getByRole('button', { name: 'before' })
    before.focus()
    open()
    expect(document.activeElement).toBe(input())
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(document.activeElement).toBe(before)
  })

  it('Tab stays in the menu', () => {
    render(
      <>
        <button type="button">behind</button>
        <CommandMenu registry={registry} />
      </>
    )
    open()
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    input().dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(input())
  })

  it('keeps the selected entry in view as the arrows move', () => {
    const scrolled: string[] = []
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.textContent ?? '')
    }
    try {
      render(<CommandMenu registry={registry} />)
      open()
      fireEvent.keyDown(input(), { key: 'ArrowUp' })
      expect(scrolled.at(-1)).toBe('Open chat')
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })

  // A phone has no Escape key: the world's triple-tap opens it this way.
  it('opens from outside through its handle', () => {
    const menu = createRef<CommandMenuHandle>()
    render(<CommandMenu registry={registry} ref={menu} />)
    act(() => menu.current!.open())
    expect(screen.getByRole('dialog', { name: 'Command menu' })).toBeTruthy()
    expect(document.activeElement).toBe(input())
  })

  // An IME's Enter commits text, its arrows pick candidates, its Escape
  // cancels the composition: none of them are the menu's.
  it('keys pressed while composing text are the input method’s', () => {
    render(<CommandMenu registry={registry} />)
    open()
    fireEvent.keyDown(input(), { key: 'ArrowDown', isComposing: true })
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input(), { key: 'Enter', keyCode: 229 })
    fireEvent.keyDown(input(), { key: 'Escape', isComposing: true })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(shape.run).not.toHaveBeenCalled()
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Avatar: cube')
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(shape.run).toHaveBeenCalledTimes(1)
  })

  it('the selection follows its command when entries arrive above it', () => {
    render(<CommandMenu registry={registry} />)
    open()
    fireEvent.keyDown(input(), { key: 'ArrowUp' })
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Open chat')
    const table = cmd('table', 'Join castle table T1')
    act(() => registry.publish('lobby', [table, chat]))
    expect(screen.getByRole('option', { selected: true }).textContent).toBe('Open chat')
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(chat.run).toHaveBeenCalledTimes(1)
    expect(table.run).not.toHaveBeenCalled()
  })

  it('two sources may use the same id without the menu mixing them up', () => {
    registry.publish('lobby', [chat, cmd('shape', 'Also shape')])
    render(<CommandMenu registry={registry} />)
    open()
    expect(options()).toContain('Also shape')
    expect(new Set(registry.list().map(c => c.id)).size).toBe(registry.list().length)
  })
})
