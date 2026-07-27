import { describe, it, expect } from 'vitest'
import {
  CHAT_HISTORY_LIMIT,
  CHAT_TEXT_BYTE_LIMIT,
  chatTextBytes,
  isChatMessage,
  mergeChatMessages,
  type ChatMessage
} from '../golfChat'

// The merge rule every chat consumer applies (MoonBase#1226): messageId
// is the only identity and the only order; arrival order and timestamps
// decide nothing.

const msg = (messageId: number, text = `m${messageId}`): ChatMessage => ({
  messageId,
  playerId: 'alice',
  text,
  sentAtUnixMillis: 1_700_000_000_000 + messageId
})

describe('mergeChatMessages', () => {
  it('merges history and live overlap to one copy per id', () => {
    // A message committing during a join legally arrives in both the
    // history replay and live delivery.
    const history = [msg(1), msg(2), msg(3)]
    const live = [msg(3), msg(4)]
    const merged = mergeChatMessages(history, live)
    expect(merged.map(m => m.messageId)).toEqual([1, 2, 3, 4])
  })

  it('orders by messageId regardless of arrival order', () => {
    const merged = mergeChatMessages([msg(5)], [msg(2), msg(9), msg(1)])
    expect(merged.map(m => m.messageId)).toEqual([1, 2, 5, 9])
  })

  it('is idempotent for duplicate deliveries', () => {
    // At-least-once: a reconnect can replay everything already seen.
    const messages = [msg(1), msg(2)]
    const merged = mergeChatMessages(mergeChatMessages(messages, messages), messages)
    expect(merged.map(m => m.messageId)).toEqual([1, 2])
  })

  it('live before history converges the same way', () => {
    // A live row can land before the join's replay is processed.
    const merged = mergeChatMessages([msg(4)], [msg(1), msg(2), msg(3), msg(4)])
    expect(merged.map(m => m.messageId)).toEqual([1, 2, 3, 4])
  })

  it('caps at the newest CHAT_HISTORY_LIMIT messages', () => {
    // The server retains 100; a client holding more is holding rows the
    // server already pruned.
    const many = Array.from({ length: CHAT_HISTORY_LIMIT + 5 }, (_, i) => msg(i + 1))
    const merged = mergeChatMessages([], many)
    expect(merged).toHaveLength(CHAT_HISTORY_LIMIT)
    expect(merged[0].messageId).toBe(6)
    expect(merged[merged.length - 1].messageId).toBe(CHAT_HISTORY_LIMIT + 5)
  })

  it('keeps empty inputs cheap and empty', () => {
    expect(mergeChatMessages([], [])).toEqual([])
  })

  it('returns the existing array unchanged when a delivery adds nothing', () => {
    // Same identity, not just same content: state setters bail out and
    // nothing downstream re-renders for a pure duplicate replay.
    const messages = [msg(1), msg(2)]
    expect(mergeChatMessages(messages, [msg(1), msg(2)])).toBe(messages)
  })
})

describe('isChatMessage', () => {
  it('accepts only rows with a numeric messageId', () => {
    expect(isChatMessage(msg(1))).toBe(true)
    const legacy = { playerId: 'bob', text: 'from an old server' }
    expect(isChatMessage(legacy)).toBe(false)
  })
})

describe('chatTextBytes', () => {
  it('counts bytes, not characters, matching the server limit', () => {
    expect(chatTextBytes('abc')).toBe(3)
    // é is two UTF-8 bytes; 🎉 is four.
    expect(chatTextBytes('é')).toBe(2)
    expect(chatTextBytes('🎉')).toBe(4)
    expect(CHAT_TEXT_BYTE_LIMIT).toBe(500)
  })
})
