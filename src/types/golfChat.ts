// Room chat over the golf v2 wire (MoonBase#1226): the shared message
// shape and the merge rule every consumer applies. The server is
// authoritative for ids, sender, and timestamp; delivery is
// at-least-once and history/live overlap is legal, so everything that
// accumulates messages must merge by messageId — never by arrival.

export interface ChatMessage {
  messageId: number
  playerId: string
  text: string
  sentAtUnixMillis: number
}

// Mirrors the server's retention: rooms keep their newest 100 messages,
// so a client holding more is holding rows the server already pruned.
export const CHAT_HISTORY_LIMIT = 100

// Mirrors the server's byte limit; the composer counts the same way the
// server does (bytes, not characters) so the warning matches the wire.
export const CHAT_TEXT_BYTE_LIMIT = 500

const encoder = new TextEncoder()

export const chatTextBytes = (text: string): number => encoder.encode(text).length

// Mirrors the server's per-session chat budget (MoonBase#1240/#1241):
// burst 3, refill 1/s per connection. The mirror is pacing UX only —
// the server stays authoritative, so consumers must tolerate drift and
// treat a refusal as the truth (drainChatBudget resyncs from empty).
export const CHAT_BURST = 3
export const CHAT_REFILL_PER_SEC = 1

// The server's commandRejected reason for an over-budget chat message.
export const CHAT_SLOW_DOWN_REASON = 'slow down'

// A token bucket with explicit time: callers pass nowMs, so behavior is
// a pure function of (state, clock) and tests fabricate time the same
// way the server's rate_limiter_test does.
export interface ChatSendBudget {
  // Fractional tokens as of asOfMs, capped at CHAT_BURST.
  tokens: number
  asOfMs: number
}

export const newChatSendBudget = (nowMs: number): ChatSendBudget => ({
  tokens: CHAT_BURST,
  asOfMs: nowMs
})

// The server refused: it knows the real budget, the mirror drifted.
// Restart empty and let refill catch up.
export const drainChatBudget = (nowMs: number): ChatSendBudget => ({
  tokens: 0,
  asOfMs: nowMs
})

const refilled = (budget: ChatSendBudget, nowMs: number): number =>
  Math.min(
    CHAT_BURST,
    budget.tokens + (Math.max(0, nowMs - budget.asOfMs) / 1000) * CHAT_REFILL_PER_SEC
  )

// Spend one token if a whole one is available. Returns the advanced
// budget either way — refill accrues even on a refused spend.
export function spendChatToken(
  budget: ChatSendBudget,
  nowMs: number
): { budget: ChatSendBudget; ok: boolean } {
  const tokens = refilled(budget, nowMs)
  if (tokens < 1) return { budget: { tokens, asOfMs: nowMs }, ok: false }
  return { budget: { tokens: tokens - 1, asOfMs: nowMs }, ok: true }
}

// Milliseconds until a whole token is available; 0 when sendable now.
export function chatCooldownMs(budget: ChatSendBudget, nowMs: number): number {
  const tokens = refilled(budget, nowMs)
  if (tokens >= 1) return 0
  return Math.ceil(((1 - tokens) * 1000) / CHAT_REFILL_PER_SEC)
}

// One sorted, deduplicated view of everything seen so far, capped to the
// newest CHAT_HISTORY_LIMIT. messageId is the only ordering key — the
// timestamp is wall-clock and display-only. Handles every arrival shape
// the wire permits: history then live, live before history (a message
// committing during a join arrives in both), duplicates from reconnect
// replays, and out-of-order delivery across those paths.
//
// A delivery that adds nothing (a reconnect replaying only known ids)
// returns `existing` unchanged, so state setters bail out instead of
// re-rendering; the server never rewrites a committed id, so the copy
// already held is the message.
export function mergeChatMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const byId = new Map<number, ChatMessage>()
  for (const message of existing) byId.set(message.messageId, message)
  let added = false
  for (const message of incoming) {
    if (!byId.has(message.messageId)) {
      byId.set(message.messageId, message)
      added = true
    }
  }
  if (!added) return existing
  const merged = [...byId.values()].sort((a, b) => a.messageId - b.messageId)
  return merged.length > CHAT_HISTORY_LIMIT ? merged.slice(merged.length - CHAT_HISTORY_LIMIT) : merged
}
