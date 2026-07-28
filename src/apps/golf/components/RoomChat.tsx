import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './RoomChat.module.css'
import type { ChatMessage, ChatSendBudget } from '@/types/golfChat'
import {
  CHAT_SLOW_DOWN_REASON,
  CHAT_TEXT_BYTE_LIMIT,
  chatCooldownMs,
  chatTextBytes,
  drainChatBudget,
  newChatSendBudget,
  spendChatToken
} from '@/types/golfChat'

// Room chat (MoonBase#1226): one stable instance for both the room
// lobby and in-game views. Wide viewports dock it as a side panel;
// narrow screens collapse it to a floating button with an unread badge
// that opens a bottom sheet. The component owns which mode is live
// (DOCKED_QUERY) and stamps the class the CSS module styles against,
// so presentation and the scroll/seen/focus logic can never disagree.
//
// Seen/unread is presentation state and lives here: only this component
// knows whether the panel is visible and where the reader is scrolled.
//
// Text renders exclusively as React text nodes — no
// dangerouslySetInnerHTML, no linkification, no markdown — so a message
// that looks like HTML stays a string on every screen it reaches.

interface RoomChatProps {
  messages: ChatMessage[]
  playerId: string
  connected: boolean
  // Highest messageId ever delivered by a history replay (wire-derived,
  // so the hook owns it). Replayed messages are never announced to
  // screen readers — only ids above both this and the mount watermark
  // are genuinely live.
  replayUpTo: number
  // The newest command rejection, sequence-numbered by the hook. The
  // composer reacts once per seq and only to the server's "slow down".
  rejection: { seq: number; reason: string } | null
  onSend: (text: string) => void
}

// How close to the bottom (px) still counts as "following": auto-scroll
// only chases new messages for readers already at the end, so scrollback
// is never yanked away.
const FOLLOW_THRESHOLD_PX = 48

// The panel docks only once the viewport leaves real margin beside the
// 1200px content column (1200 + 2 × (1rem gap + 20rem panel) = 1872,
// rounded up). The CSS module has no media query — it styles the
// .docked class this component stamps from this one query.
const DOCKED_QUERY = '(min-width: 1880px)'

// The wire doesn't correlate rejections to commands (MoonBase#1240), so
// restoring a refused draft is a heuristic: a "slow down" this soon
// after our own send, with the composer still empty, is that send being
// refused. The pacing mirror makes this a rare path.
const REJECTION_RESTORE_WINDOW_MS = 5000

const timeFormat = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' })

const RoomChat = ({ messages, playerId, connected, replayUpTo, rejection, onSend }: RoomChatProps) => {
  const [draft, setDraft] = useState('')
  // Drawer-mode only: whether the bottom sheet is open. The docked
  // panel ignores it — the .docked rules keep the panel visible.
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Environments without matchMedia (jsdom) are drawer mode.
  const [docked, setDocked] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(DOCKED_QUERY).matches
  )
  const [lastSeenId, setLastSeenId] = useState(0)
  // The client-side mirror of the server's chat budget (burst 3, refill
  // 1/s): pacing UX so honest users rarely earn a real refusal. The
  // server stays authoritative.
  const [budget, setBudget] = useState<ChatSendBudget>(() => newChatSendBudget(Date.now()))
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [lastSent, setLastSent] = useState<{ text: string; atMs: number } | null>(null)
  const [refused, setRefused] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const wasDrawerOpenRef = useRef(false)
  const followingRef = useRef(true)

  const latestId = messages.length > 0 ? messages[messages.length - 1].messageId : 0

  // Screen-reader announcements, derived in render (React's "adjusting
  // state when a prop changes" pattern). Ids at or below `upTo` had
  // already rendered when the previous render committed; only a tail
  // above both it and replayUpTo is a genuinely live arrival — a
  // 100-message replay must never be read aloud. The initializer covers
  // mounting onto existing messages, and a smaller latestId means the
  // room's chat state was reset.
  const [announced, setAnnounced] = useState<{
    upTo: number
    entry: { id: number; text: string } | null
  }>({ upTo: latestId, entry: null })
  if (latestId !== announced.upTo) {
    const last = messages[messages.length - 1]
    const entry =
      latestId > announced.upTo && last && last.messageId > replayUpTo
        ? { id: last.messageId, text: `${last.playerId}: ${last.text}` }
        : latestId < announced.upTo
          ? null
          : announced.entry
    setAnnounced({ upTo: latestId, entry })
  }

  // Server refusals, adjusted in render the same way. A "slow down"
  // inside the restore window is our send being refused: put the text
  // back in the composer instead of losing it, drain the mirror (the
  // server knows the real budget — ours drifted), and say so in-panel.
  // Unrelated rejection reasons restore nothing.
  const [handledRejectionSeq, setHandledRejectionSeq] = useState(rejection?.seq ?? 0)
  if (rejection && rejection.seq !== handledRejectionSeq) {
    setHandledRejectionSeq(rejection.seq)
    if (rejection.reason === CHAT_SLOW_DOWN_REASON) {
      const now = Date.now()
      if (lastSent && now - lastSent.atMs <= REJECTION_RESTORE_WINDOW_MS) {
        if (draft === '') setDraft(lastSent.text)
        setRefused(true)
        const drained = drainChatBudget(now)
        setBudget(drained)
        setCooldownUntil(now + chatCooldownMs(drained, now))
      }
    }
  }

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(DOCKED_QUERY)
    const update = () => setDocked(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const panelVisible = docked || drawerOpen

  const markSeen = useCallback(() => {
    setLastSeenId(latestId)
  }, [latestId])

  // lastSeenId can never legitimately exceed latestId (markSeen assigns
  // it), so a smaller latestId means the room's chat state was reset —
  // everything is unseen again, derived rather than synchronized.
  const effectiveLastSeenId = lastSeenId > latestId ? 0 : lastSeenId

  const unreadCount = useMemo(
    () => messages.reduce((count, m) => (m.messageId > effectiveLastSeenId ? count + 1 : count), 0),
    [messages, effectiveLastSeenId]
  )

  const handleScroll = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const fromBottom = list.scrollHeight - list.scrollTop - list.clientHeight
    followingRef.current = fromBottom <= FOLLOW_THRESHOLD_PX
    if (followingRef.current) markSeen()
  }, [markSeen])

  // Follow the newest message — but only while the panel is actually on
  // screen. A hidden panel has no reader: marking arrivals seen there
  // would keep the unread badge permanently empty, and scrollTop writes
  // against display:none are no-ops anyway. panelVisible in the deps
  // also re-runs this when the drawer opens, so the sheet lands at the
  // bottom instead of on the oldest message.
  useEffect(() => {
    const list = listRef.current
    if (panelVisible && list && followingRef.current) {
      list.scrollTop = list.scrollHeight
      markSeen()
    }
  }, [latestId, panelVisible, markSeen])

  const trimmedDraft = draft.trim()
  const draftBytes = chatTextBytes(trimmedDraft)
  const overLimit = draftBytes > CHAT_TEXT_BYTE_LIMIT
  const nearLimit = draftBytes > CHAT_TEXT_BYTE_LIMIT - 100
  const coolingDown = cooldownUntil !== null

  const send = useCallback(() => {
    if (!trimmedDraft || !connected || overLimit) return
    const now = Date.now()
    // Spend from the mirror before shipping; an empty bucket keeps the
    // draft in place and starts the cooldown instead of earning a
    // server refusal. Refill accrues either way.
    const spent = spendChatToken(budget, now)
    setBudget(spent.budget)
    const wait = chatCooldownMs(spent.budget, now)
    if (!spent.ok) {
      setCooldownUntil(now + wait)
      return
    }
    onSend(trimmedDraft)
    setLastSent({ text: trimmedDraft, atMs: now })
    setDraft('')
    setRefused(false)
    followingRef.current = true
    if (wait > 0) setCooldownUntil(now + wait)
  }, [trimmedDraft, connected, overLimit, budget, onSend])

  // Re-enable Send as the mirror refills: the timeout is the clock
  // reporting back in.
  useEffect(() => {
    if (cooldownUntil === null) return
    const timer = setTimeout(() => {
      setCooldownUntil(null)
      setRefused(false)
    }, Math.max(0, cooldownUntil - Date.now()))
    return () => clearTimeout(timer)
  }, [cooldownUntil])

  const onComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        send()
      }
    },
    [send]
  )

  const openDrawer = useCallback(() => {
    setDrawerOpen(true)
    markSeen()
  }, [markSeen])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  // Focus follows the drawer: into the composer on open, back to the
  // toggle on close. The CSS hides whichever control had focus, which
  // would otherwise drop keyboard users back to <body>.
  useEffect(() => {
    if (!docked) {
      if (drawerOpen) inputRef.current?.focus()
      else if (wasDrawerOpenRef.current) toggleRef.current?.focus()
    }
    wasDrawerOpenRef.current = drawerOpen
  }, [drawerOpen, docked])

  const onPanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && !docked && drawerOpen) closeDrawer()
    },
    [docked, drawerOpen, closeDrawer]
  )

  // Message rows depend only on messages and whose they are — not on
  // the draft, so typing doesn't rebuild up to 100 rows per keystroke.
  const messageItems = useMemo(
    () =>
      messages.map(message => (
        <div
          key={message.messageId}
          className={`${styles.message} ${message.playerId === playerId ? styles.ownMessage : ''}`}
        >
          <div className={styles.messageMeta}>
            <span className={styles.sender}>{message.playerId}</span>
            <span className={styles.timestamp}>{timeFormat.format(message.sentAtUnixMillis)}</span>
          </div>
          <div className={styles.messageText}>{message.text}</div>
        </div>
      )),
    [messages, playerId]
  )

  const rootClass = [
    styles.chatRoot,
    drawerOpen ? styles.drawerOpen : '',
    docked ? styles.docked : ''
  ].join(' ')

  return (
    <div className={rootClass}>
      {drawerOpen && !docked && (
        // Pointer-only affordance: keyboard and screen-reader users
        // close via Escape or the labeled close button.
        <div className={styles.backdrop} onClick={closeDrawer} aria-hidden="true" />
      )}
      <div
        className={styles.panel}
        role={!docked && drawerOpen ? 'dialog' : undefined}
        aria-label="Room chat"
        onKeyDown={onPanelKeyDown}
      >
        <div className={styles.header}>
          <span className={styles.title}>Room chat</span>
          <span className={styles.connection}>
            {connected ? '' : 'reconnecting…'}
          </span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeDrawer}
            aria-label="Close chat"
          >
            ×
          </button>
        </div>
        <div className={styles.messageList} ref={listRef} onScroll={handleScroll} data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className={styles.emptyState}>No messages yet — say hello.</div>
          ) : (
            messageItems
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className={styles.newMessages}
            onClick={() => {
              const list = listRef.current
              if (list) list.scrollTop = list.scrollHeight
              followingRef.current = true
              markSeen()
            }}
          >
            {unreadCount} new message{unreadCount === 1 ? '' : 's'}
          </button>
        )}
        <div className={styles.composer}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder={connected ? 'Message the room' : 'Reconnecting…'}
            disabled={!connected}
            rows={2}
            aria-label="Chat message"
          />
          <div className={styles.composerSide}>
            {/* role="status" is a polite live region, so the cooldown
              * and refusal reach screen readers without touching the
              * message announcement region. */}
            {(refused || coolingDown) && (
              <span className={styles.cooldownHint} role="status">
                {refused ? 'not sent — hold on a moment…' : 'hold on a moment…'}
              </span>
            )}
            {(nearLimit || overLimit) && (
              <span className={`${styles.byteCount} ${overLimit ? styles.overLimit : ''}`}>
                {draftBytes}/{CHAT_TEXT_BYTE_LIMIT}
              </span>
            )}
            <button
              type="button"
              className={styles.sendButton}
              onClick={send}
              disabled={!connected || trimmedDraft.length === 0 || overLimit || coolingDown}
              title={coolingDown ? 'Chat is rate limited — waiting a moment' : undefined}
            >
              Send
            </button>
          </div>
        </div>
      </div>
      <button
        ref={toggleRef}
        type="button"
        className={styles.drawerToggle}
        onClick={openDrawer}
        aria-label={unreadCount > 0 ? `Open chat, ${unreadCount} unread` : 'Open chat'}
      >
        💬
        {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
      </button>
      {/* Live messages only — never the history replay. Outside the
        * panel so a closed drawer still announces; keyed by id so a
        * repeat of identical text is still a DOM mutation. */}
      <div className={styles.srOnly} aria-live="polite">
        {announced.entry && (
          <span key={announced.entry.id} data-message-id={announced.entry.id}>
            {announced.entry.text}
          </span>
        )}
      </div>
    </div>
  )
}

export default RoomChat
