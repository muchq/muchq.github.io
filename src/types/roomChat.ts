// Room chat over the hub's room layer (MoonBase#1226): the shared message
// shape and the merge rule every consumer applies. The server is
// authoritative for ids, sender, and timestamp; delivery is
// at-least-once and history/live overlap is legal, so everything that
// accumulates messages must merge by messageId — never by arrival.

export interface ChatMessage {
  messageId: number
  // The author. A bot's reply carries its reserved id — `microgpt`
  // answering `@bot` (MoonBase#1591), `mithril` answering `/wordchain` —
  // shown as the reply's source. Whimsical player ids never collide.
  playerId: string
  text: string
  sentAtUnixMillis: number
  // Optional on the wire (games.smithy): true on a bot's replies so
  // clients style them without hard-coding the reserved ids. Absent on
  // ordinary messages and on hubs that predate the field.
  bot?: boolean
  // On mithril's replies, the ladder `text` spells out.
  wordchain?: Wordchain
}

// A word ladder: `path` is every rung, both ends included, and absent
// when no ladder joins `start` to `end`.
export interface Wordchain {
  start: string
  end: string
  path?: string[]
}

// Mirrors games_hub::BotMention (MoonBase room_bot.cc): `@bot` at the
// very start, any case, followed by ASCII whitespace or end of text.
// Anything else is not a mention — so a client highlight never promises
// a reply the hub won't give. Returns the exact prefix from `text` (to
// preserve the typed casing) and the remainder, or null.
export function botMentionPrefix(
  text: string
): { mention: string; rest: string } | null {
  if (text.length < 4) return null
  if (text.slice(0, 4).toLowerCase() !== '@bot') return null
  const rest = text.slice(4)
  if (rest.length > 0 && !isAsciiSpace(rest.charCodeAt(0))) return null
  return { mention: text.slice(0, 4), rest }
}

const isAsciiSpace = (code: number): boolean =>
  code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0b || code === 0x0c || code === 0x0d

// A slash command the hub answers in room chat. `accepts` mirrors the
// hub's grammar for the text after the command, so a highlight never
// promises an answer the hub won't give.
export interface SlashCommand {
  name: string
  usage: string
  description: string
  accepts: (args: string) => boolean
}

const WORDCHAIN_WORD = /^[A-Za-z]{3,9}$/

// Every command the hub answers, in menu order.
export const SLASH_COMMANDS: SlashCommand[] = [
  {
    // games_hub::WordchainCommand (MoonBase wordchain.cc): exactly two
    // words of 3 to 9 ASCII letters.
    name: 'wordchain',
    usage: '/wordchain start end',
    description: 'shortest word ladder, from mithril',
    accepts: args => {
      const words = args.split(/[ \t\r\n]+/).filter(word => word !== '')
      return words.length === 2 && words.every(word => WORDCHAIN_WORD.test(word))
    }
  }
]

// The command at the very start of `text` (any case), followed by ASCII
// whitespace and arguments it accepts. Returns the typed command, the
// remainder, and the command's spec, or null for text the hub leaves as
// chat.
export function slashCommand(
  text: string,
  commands: SlashCommand[] = SLASH_COMMANDS
): { command: string; rest: string; spec: SlashCommand } | null {
  for (const spec of commands) {
    const command = text.slice(0, spec.name.length + 1)
    if (command.toLowerCase() !== `/${spec.name}`) continue
    const rest = text.slice(command.length)
    if (rest.length === 0 || !isAsciiSpace(rest.charCodeAt(0))) continue
    if (spec.accepts(rest)) return { command, rest, spec }
  }
  return null
}

// The commands a draft of just `/` and a partial name could still
// become, in menu order. Nothing once whitespace follows the name.
export function slashCompletions(draft: string, commands: SlashCommand[] = SLASH_COMMANDS): SlashCommand[] {
  if (!/^\/[A-Za-z]*$/.test(draft)) return []
  const typed = draft.slice(1).toLowerCase()
  return commands.filter(spec => spec.name.startsWith(typed))
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
