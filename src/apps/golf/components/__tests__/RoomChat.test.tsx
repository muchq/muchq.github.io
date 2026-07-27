import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RoomChat from '../RoomChat'
import type { ChatMessage } from '@/types/golfChat'

// The chat surface itself (MoonBase#1226): literal text rendering, the
// composer's keyboard/limit/disabled rules, and the unread affordances.
// Scroll-following is exercised only as far as jsdom allows — the
// near-bottom geometry itself has no layout engine here.

const msg = (messageId: number, playerId: string, text: string): ChatMessage => ({
  messageId,
  playerId,
  text,
  sentAtUnixMillis: 1_700_000_000_000 + messageId
})

const baseProps = {
  playerId: 'alice',
  unreadCount: 0,
  connected: true,
  onSend: vi.fn(),
  onSeen: vi.fn()
}

describe('RoomChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders messages chronologically with sender and a useful empty state', () => {
    const { rerender } = render(<RoomChat {...baseProps} messages={[]} />)
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument()

    rerender(
      <RoomChat
        {...baseProps}
        messages={[msg(1, 'bob', 'first'), msg(2, 'alice', 'second')]}
      />
    )
    const list = screen.getByTestId('chat-messages')
    expect(list.textContent).toContain('bob')
    expect(list.textContent?.indexOf('first')).toBeLessThan(list.textContent!.indexOf('second'))
  })

  it('renders HTML-looking text as literal text, never markup', () => {
    render(
      <RoomChat
        {...baseProps}
        messages={[msg(1, 'bob', '<img src=x onerror=alert(1)>')]}
      />
    )
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('sends on Enter, newline on Shift+Enter, trimmed', () => {
    render(<RoomChat {...baseProps} messages={[]} />)
    const input = screen.getByLabelText('Chat message')

    fireEvent.change(input, { target: { value: '  hello  ' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(baseProps.onSend).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(baseProps.onSend).toHaveBeenCalledWith('hello')
    // Sending clears the composer.
    expect((input as HTMLTextAreaElement).value).toBe('')
  })

  it('refuses empty sends and keeps an over-limit draft unsent', () => {
    render(<RoomChat {...baseProps} messages={[]} />)
    const input = screen.getByLabelText('Chat message')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(baseProps.onSend).not.toHaveBeenCalled()

    // 501 bytes: over the server's byte limit, so the draft stays put —
    // the user edits it down instead of losing it to a rejection.
    const tooLong = 'a'.repeat(501)
    fireEvent.change(input, { target: { value: tooLong } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(baseProps.onSend).not.toHaveBeenCalled()
    expect((input as HTMLTextAreaElement).value).toBe(tooLong)
    expect(screen.getByText('501/500')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('counts limit bytes the way the server does', () => {
    render(<RoomChat {...baseProps} messages={[]} />)
    const input = screen.getByLabelText('Chat message')
    // 125 four-byte emoji = 500 bytes: at the limit, still sendable.
    fireEvent.change(input, { target: { value: '🎉'.repeat(125) } })
    expect(screen.getByText('500/500')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('disables the composer while disconnected', () => {
    render(<RoomChat {...baseProps} messages={[]} connected={false} />)
    expect(screen.getByLabelText('Chat message')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByText('reconnecting…')).toBeInTheDocument()
  })

  it('shows the unread badge on the drawer toggle and clears via onSeen when opened', () => {
    render(<RoomChat {...baseProps} messages={[msg(1, 'bob', 'hi')]} unreadCount={3} />)
    const toggle = screen.getByRole('button', { name: 'Open chat, 3 unread' })
    expect(toggle.textContent).toContain('3')

    fireEvent.click(toggle)
    expect(baseProps.onSeen).toHaveBeenCalled()
  })

  it('offers a new-messages jump instead of yanking scrolled-back readers', () => {
    render(<RoomChat {...baseProps} messages={[msg(1, 'bob', 'hi')]} unreadCount={2} />)
    const jump = screen.getByRole('button', { name: '2 new messages' })
    fireEvent.click(jump)
    expect(baseProps.onSeen).toHaveBeenCalled()
  })

  it('announces live messages politely but never the history replay', () => {
    const { container, rerender } = render(
      <RoomChat {...baseProps} messages={[msg(1, 'bob', 'replayed history')]} />
    )
    const live = container.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toBe('')

    rerender(
      <RoomChat
        {...baseProps}
        messages={[msg(1, 'bob', 'replayed history'), msg(2, 'bob', 'fresh message')]}
      />
    )
    expect(live?.textContent).toBe('bob: fresh message')
    expect(live?.textContent).not.toContain('replayed history')
  })
})
