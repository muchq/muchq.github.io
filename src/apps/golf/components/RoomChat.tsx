import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './RoomChat.module.css'
import type { ChatMessage } from '@/types/golfChat'
import { CHAT_TEXT_BYTE_LIMIT, chatTextBytes } from '@/types/golfChat'

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

const timeFormat = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' })

const RoomChat = ({ messages, playerId, connected, replayUpTo, onSend }: RoomChatProps) => {
  const [draft, setDraft] = useState('')
  // Drawer-mode only: whether the bottom sheet is open. The docked
  // panel ignores it — the .docked rules keep the panel visible.
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Environments without matchMedia (jsdom) are drawer mode.
  const [docked, setDocked] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(DOCKED_QUERY).matches
  )
  const [lastSeenId, setLastSeenId] = useState(0)
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

  const send = useCallback(() => {
    if (!trimmedDraft || !connected || overLimit) return
    onSend(trimmedDraft)
    setDraft('')
    followingRef.current = true
  }, [trimmedDraft, connected, overLimit, onSend])

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
            {(nearLimit || overLimit) && (
              <span className={`${styles.byteCount} ${overLimit ? styles.overLimit : ''}`}>
                {draftBytes}/{CHAT_TEXT_BYTE_LIMIT}
              </span>
            )}
            <button
              type="button"
              className={styles.sendButton}
              onClick={send}
              disabled={!connected || trimmedDraft.length === 0 || overLimit}
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
