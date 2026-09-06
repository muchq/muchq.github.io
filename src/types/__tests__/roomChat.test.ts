import { describe, it, expect } from 'vitest'
import {
  CHAT_BURST,
  CHAT_HISTORY_LIMIT,
  CHAT_TEXT_BYTE_LIMIT,
  chatCooldownMs,
  chatTextBytes,
  drainChatBudget,
  mergeChatMessages,
  newChatSendBudget,
  spendChatToken,
  type ChatMessage
} from '../roomChat'

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

describe('chatTextBytes', () => {
  it('counts bytes, not characters, matching the server limit', () => {
    expect(chatTextBytes('abc')).toBe(3)
    // é is two UTF-8 bytes; 🎉 is four.
    expect(chatTextBytes('é')).toBe(2)
    expect(chatTextBytes('🎉')).toBe(4)
    expect(CHAT_TEXT_BYTE_LIMIT).toBe(500)
  })
})

// The pacing mirror of the server's chat budget (MoonBase#1240/#1241):
// pure functions of (state, clock), so tests fabricate time the same
// way the server's rate_limiter_test does.
describe('chat send budget', () => {
  const t0 = 1_700_000_000_000

  it('allows the full burst immediately, then refuses', () => {
    let budget = newChatSendBudget(t0)
    for (let i = 0; i < CHAT_BURST; i++) {
      const spent = spendChatToken(budget, t0)
      expect(spent.ok).toBe(true)
      budget = spent.budget
    }
    expect(spendChatToken(budget, t0).ok).toBe(false)
  })

  it('refills one token per second and caps at the burst', () => {
    let budget = newChatSendBudget(t0)
    for (let i = 0; i < CHAT_BURST; i++) budget = spendChatToken(budget, t0).budget

    // 999ms is not a whole token yet.
    const early = spendChatToken(budget, t0 + 999)
    expect(early.ok).toBe(false)

    // The refill accrued during the refused spend: 1ms later the whole
    // token exists — and exactly one of it.
    const one = spendChatToken(early.budget, t0 + 1000)
    expect(one.ok).toBe(true)
    expect(spendChatToken(one.budget, t0 + 1000).ok).toBe(false)

    // A long idle stretch refills to the cap, never beyond it.
    let idle = one.budget
    for (let i = 0; i < CHAT_BURST; i++) {
      const spent = spendChatToken(idle, t0 + 60_000)
      expect(spent.ok).toBe(true)
      idle = spent.budget
    }
    expect(spendChatToken(idle, t0 + 60_000).ok).toBe(false)
  })

  it('reports the wait until the next whole token', () => {
    const drained = drainChatBudget(t0)
    expect(chatCooldownMs(drained, t0)).toBe(1000)
    expect(chatCooldownMs(drained, t0 + 400)).toBe(600)
    expect(chatCooldownMs(drained, t0 + 1000)).toBe(0)
    expect(chatCooldownMs(newChatSendBudget(t0), t0)).toBe(0)
  })
})
