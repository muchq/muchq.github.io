import { render, screen, fireEvent, act } from '@testing-library/react'
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
  connected: true,
  replayUpTo: 0,
  rejection: null,
  onSend: vi.fn()
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

  it('accumulates unread on the toggle while the drawer is closed and clears on open', () => {
    const { rerender } = render(<RoomChat {...baseProps} messages={[]} />)
    rerender(
      <RoomChat {...baseProps} messages={[msg(1, 'bob', 'one'), msg(2, 'bob', 'two')]} />
    )
    // Hidden panel: arrivals stay unread, or the badge could never show.
    const toggle = screen.getByRole('button', { name: 'Open chat, 2 unread' })
    expect(toggle.textContent).toContain('2')

    fireEvent.click(toggle)
    // Open and following: everything is seen, the badge is gone.
    expect(screen.getByRole('button', { name: 'Open chat' })).toBeInTheDocument()
  })

  it('offers a new-messages jump instead of yanking scrolled-back readers', () => {
    const { rerender } = render(<RoomChat {...baseProps} messages={[msg(1, 'bob', 'one')]} />)
    fireEvent.click(screen.getByRole('button', { name: /Open chat/ }))

    // Scroll well away from the bottom, so the reader is not following.
    const list = screen.getByTestId('chat-messages')
    Object.defineProperty(list, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(list, 'clientHeight', { value: 200, configurable: true })
    list.scrollTop = 0
    fireEvent.scroll(list)

    rerender(<RoomChat {...baseProps} messages={[msg(1, 'bob', 'one'), msg(2, 'bob', 'two')]} />)
    const jump = screen.getByRole('button', { name: '1 new message' })

    fireEvent.click(jump)
    expect(screen.queryByRole('button', { name: '1 new message' })).toBeNull()
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

  it('keeps a history replay that lands after mount silent, in the real join order', () => {
    // The integrated order: the component mounts with no messages, then
    // the roomChatHistory frame arrives alongside its watermark.
    const { container, rerender } = render(<RoomChat {...baseProps} messages={[]} />)
    const live = container.querySelector('[aria-live="polite"]')

    rerender(
      <RoomChat
        {...baseProps}
        messages={[msg(1, 'bob', 'old one'), msg(2, 'bob', 'old two')]}
        replayUpTo={2}
      />
    )
    expect(live?.textContent).toBe('')

    rerender(
      <RoomChat
        {...baseProps}
        messages={[msg(1, 'bob', 'old one'), msg(2, 'bob', 'old two'), msg(3, 'bob', 'live now')]}
        replayUpTo={2}
      />
    )
    expect(live?.textContent).toBe('bob: live now')
  })

  it('re-announces a repeat of identical text as a fresh DOM node', () => {
    // aria-live only fires on mutation: two "gg" in a row must not
    // collapse into one silent render.
    const { container, rerender } = render(<RoomChat {...baseProps} messages={[]} />)
    rerender(<RoomChat {...baseProps} messages={[msg(1, 'bob', 'gg')]} />)
    const first = container.querySelector('[aria-live="polite"] span')
    expect(first?.getAttribute('data-message-id')).toBe('1')

    rerender(<RoomChat {...baseProps} messages={[msg(1, 'bob', 'gg'), msg(2, 'bob', 'gg')]} />)
    const second = container.querySelector('[aria-live="polite"] span')
    expect(second?.getAttribute('data-message-id')).toBe('2')
    expect(second?.textContent).toBe('bob: gg')
  })

  it('keeps arrivals seen while the drawer is open and following', () => {
    const { rerender } = render(<RoomChat {...baseProps} messages={[msg(1, 'bob', 'one')]} />)
    fireEvent.click(screen.getByRole('button', { name: /Open chat/ }))

    rerender(
      <RoomChat {...baseProps} messages={[msg(1, 'bob', 'one'), msg(2, 'bob', 'two')]} />
    )
    // Visible and following: the new arrival is seen immediately — no
    // badge when the drawer closes again.
    fireEvent.keyDown(screen.getByLabelText('Chat message'), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Open chat' })).toBeInTheDocument()
  })

  it('moves focus into the composer on open and back to the toggle on Escape', () => {
    render(<RoomChat {...baseProps} messages={[]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))
    const input = screen.getByLabelText('Chat message')
    expect(document.activeElement).toBe(input)

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open chat' }))
  })

  it('paces bursts to the server budget and re-enables as tokens refill', () => {
    vi.useFakeTimers()
    try {
      render(<RoomChat {...baseProps} messages={[]} />)
      const input = screen.getByLabelText('Chat message')

      for (let i = 1; i <= 3; i++) {
        fireEvent.change(input, { target: { value: `m${i}` } })
        fireEvent.keyDown(input, { key: 'Enter' })
      }
      expect(baseProps.onSend).toHaveBeenCalledTimes(3)

      // Bucket empty: the fourth stays in the composer, Send disables,
      // and the polite status region explains why.
      fireEvent.change(input, { target: { value: 'm4' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(baseProps.onSend).toHaveBeenCalledTimes(3)
      expect((input as HTMLTextAreaElement).value).toBe('m4')
      expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
      expect(screen.getByRole('status').textContent).toContain('hold on')

      // One refill later the composer works again.
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(baseProps.onSend).toHaveBeenCalledTimes(4)
    } finally {
      vi.useRealTimers()
    }
  })

  it('restores the draft when the server refuses a recent send with slow down', () => {
    const { rerender } = render(<RoomChat {...baseProps} messages={[]} />)
    const input = screen.getByLabelText('Chat message')
    fireEvent.change(input, { target: { value: 'good luck' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(baseProps.onSend).toHaveBeenCalledWith('good luck')
    expect((input as HTMLTextAreaElement).value).toBe('')

    rerender(
      <RoomChat {...baseProps} messages={[]} rejection={{ seq: 1, reason: 'slow down' }} />
    )
    expect((input as HTMLTextAreaElement).value).toBe('good luck')
    expect(screen.getByRole('status').textContent).toContain('not sent')
    // The server said the budget is empty — the mirror resyncs, so Send
    // waits for the refill instead of earning another refusal.
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('does not clobber a retyped draft when the refusal lands', () => {
    const { rerender } = render(<RoomChat {...baseProps} messages={[]} />)
    const input = screen.getByLabelText('Chat message')
    fireEvent.change(input, { target: { value: 'first' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'second draft' } })

    rerender(
      <RoomChat {...baseProps} messages={[]} rejection={{ seq: 1, reason: 'slow down' }} />
    )
    expect((input as HTMLTextAreaElement).value).toBe('second draft')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('restores nothing for unrelated rejections', () => {
    const { rerender } = render(<RoomChat {...baseProps} messages={[]} />)
    const input = screen.getByLabelText('Chat message')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    rerender(
      <RoomChat {...baseProps} messages={[]} rejection={{ seq: 1, reason: 'not in a room' }} />
    )
    expect((input as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
