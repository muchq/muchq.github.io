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

// The wire predicate for a mergeable chat row: without a numeric
// messageId there is no identity to merge or order on. Adapters use it
// to keep pre-chat-id server frames out of typed chat state.
export const isChatMessage = (
  message: { playerId: string; text: string; messageId?: number }
): message is ChatMessage => typeof message.messageId === 'number'

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
