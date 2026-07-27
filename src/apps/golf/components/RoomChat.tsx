import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './RoomChat.module.css'
import type { ChatMessage } from '@/types/golfChat'
import { CHAT_TEXT_BYTE_LIMIT, chatTextBytes } from '@/types/golfChat'

// Room chat (MoonBase#1226): one component for both the room lobby and
// in-game views. Wide viewports render it as a stable side panel; narrow
// screens collapse it to a floating button with an unread badge that
// opens a bottom sheet (the CSS module owns which of the two shows, and
// DOCKED_QUERY mirrors that decision for the logic that needs it).
//
// Text renders exclusively as React text nodes — no
// dangerouslySetInnerHTML, no linkification, no markdown — so a message
// that looks like HTML stays a string on every screen it reaches.

interface RoomChatProps {
  messages: ChatMessage[]
  playerId: string
  unreadCount: number
  connected: boolean
  // Highest messageId ever delivered by a history replay. Replayed
  // messages are never announced to screen readers — only ids above
  // both this and the mount watermark are genuinely live.
  replayUpTo: number
  onSend: (text: string) => void
  onSeen: () => void
}

// How close to the bottom (px) still counts as "following": auto-scroll
// only chases new messages for readers already at the end, so scrollback
// is never yanked away.
const FOLLOW_THRESHOLD_PX = 48

// Paired with the @media block in RoomChat.module.css: the panel docks
// only once the viewport leaves real margin beside the 1200px content
// column (1200 + 2 × (1rem gap + 20rem panel) = 1872, rounded up).
const DOCKED_QUERY = '(min-width: 1880px)'

const formatTime = (unixMillis: number) =>
  new Date(unixMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const RoomChat = ({ messages, playerId, unreadCount, connected, replayUpTo, onSend, onSeen }: RoomChatProps) => {
  const [draft, setDraft] = useState('')
  // Drawer-mode only: whether the bottom sheet is open. The docked
  // panel ignores it — CSS keeps the panel visible regardless.
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Mirrors the CSS breakpoint so scroll/seen/focus logic knows whether
  // the panel is actually on screen. Environments without matchMedia
  // (jsdom) are treated as drawer mode.
  const [docked, setDocked] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const wasDrawerOpenRef = useRef(false)
  const followingRef = useRef(true)
  // Ids at or below this had already rendered when the component first
  // painted; only messages above it (and above replayUpTo) are announced
  // to screen readers — a 100-message replay must not be read aloud.
  const announceAfterIdRef = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState<{ id: number; text: string } | null>(null)

  const latestId = messages.length > 0 ? messages[messages.length - 1].messageId : 0

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(DOCKED_QUERY)
    const update = () => setDocked(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const panelVisible = docked || drawerOpen

  const handleScroll = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const fromBottom = list.scrollHeight - list.scrollTop - list.clientHeight
    followingRef.current = fromBottom <= FOLLOW_THRESHOLD_PX
    if (followingRef.current) onSeen()
  }, [onSeen])

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
      onSeen()
    }
  }, [latestId, panelVisible, onSeen])

  // Announcements are independent of panel visibility — the live region
  // sits outside the panel, so closed-drawer arrivals still reach
  // screen readers.
  useEffect(() => {
    const watermark = announceAfterIdRef.current
    if (watermark === null || latestId < watermark) {
      // First paint, or the room's chat state was reset: move the
      // watermark silently.
      announceAfterIdRef.current = latestId
      return
    }
    if (latestId > watermark) {
      const fresh = messages.filter(m => m.messageId > watermark && m.messageId > replayUpTo)
      const last = fresh[fresh.length - 1]
      if (last) setAnnouncement({ id: last.messageId, text: `${last.playerId}: ${last.text}` })
      announceAfterIdRef.current = latestId
    }
  }, [latestId, messages, replayUpTo])

  const send = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed || !connected) return
    if (chatTextBytes(trimmed) > CHAT_TEXT_BYTE_LIMIT) return
    onSend(trimmed)
    setDraft('')
    followingRef.current = true
  }, [draft, connected, onSend])

  const onComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        send()
      }
    },
    [send]
  )

  const draftBytes = chatTextBytes(draft.trim())
  const overLimit = draftBytes > CHAT_TEXT_BYTE_LIMIT
  const nearLimit = draftBytes > CHAT_TEXT_BYTE_LIMIT - 100

  const openDrawer = useCallback(() => {
    setDrawerOpen(true)
    onSeen()
  }, [onSeen])

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

  const panel = (
    <div
      className={styles.panel}
      data-testid="room-chat-panel"
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
          messages.map(message => (
            <div
              key={message.messageId}
              className={`${styles.message} ${message.playerId === playerId ? styles.ownMessage : ''}`}
            >
              <div className={styles.messageMeta}>
                <span className={styles.sender}>{message.playerId}</span>
                <span className={styles.timestamp}>{formatTime(message.sentAtUnixMillis)}</span>
              </div>
              <div className={styles.messageText}>{message.text}</div>
            </div>
          ))
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
            onSeen()
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
            disabled={!connected || draft.trim().length === 0 || overLimit}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`${styles.chatRoot} ${drawerOpen ? styles.drawerOpen : ''}`}>
      {panel}
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
        {announcement && (
          <span key={announcement.id} data-message-id={announcement.id}>
            {announcement.text}
          </span>
        )}
      </div>
    </div>
  )
}

export default RoomChat
