import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './RoomChat.module.css'
import type { ChatMessage } from '@/types/golfChat'
import { CHAT_TEXT_BYTE_LIMIT, chatTextBytes } from '@/types/golfChat'

// Room chat (MoonBase#1226): one component for both the room lobby and
// in-game views. Desktop renders it as a stable side panel; narrow
// screens collapse it to a floating button with an unread badge that
// opens a bottom sheet (the CSS module owns which of the two shows).
//
// Text renders exclusively as React text nodes — no
// dangerouslySetInnerHTML, no linkification, no markdown — so a message
// that looks like HTML stays a string on every screen it reaches.

interface RoomChatProps {
  messages: ChatMessage[]
  playerId: string
  unreadCount: number
  connected: boolean
  onSend: (text: string) => void
  onSeen: () => void
}

// How close to the bottom (px) still counts as "following": auto-scroll
// only chases new messages for readers already at the end, so scrollback
// is never yanked away.
const FOLLOW_THRESHOLD_PX = 48

const formatTime = (unixMillis: number) =>
  new Date(unixMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const RoomChat = ({ messages, playerId, unreadCount, connected, onSend, onSeen }: RoomChatProps) => {
  const [draft, setDraft] = useState('')
  // Mobile-only: whether the drawer is open. The desktop panel ignores
  // it — CSS keeps the panel visible regardless.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const followingRef = useRef(true)
  // Ids at or below this had already rendered when the component (or its
  // history) first painted; only messages after it are announced to
  // screen readers — a 100-message replay must not be read aloud.
  const announceAfterIdRef = useRef<number | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const latestId = messages.length > 0 ? messages[messages.length - 1].messageId : 0

  const handleScroll = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const fromBottom = list.scrollHeight - list.scrollTop - list.clientHeight
    followingRef.current = fromBottom <= FOLLOW_THRESHOLD_PX
    if (followingRef.current) onSeen()
  }, [onSeen])

  // First paint (and the history that arrives with it) sets the
  // announcement watermark without announcing anything.
  useEffect(() => {
    if (announceAfterIdRef.current === null && messages.length >= 0) {
      announceAfterIdRef.current = latestId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const list = listRef.current
    if (list && followingRef.current) {
      list.scrollTop = list.scrollHeight
      onSeen()
    }
    const watermark = announceAfterIdRef.current
    if (watermark !== null && latestId > watermark) {
      const fresh = messages.filter(m => m.messageId > watermark)
      const last = fresh[fresh.length - 1]
      if (last) setAnnouncement(`${last.playerId}: ${last.text}`)
      announceAfterIdRef.current = latestId
    }
  }, [latestId, messages, onSeen])

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

  const panel = (
    <div className={styles.panel} data-testid="room-chat-panel">
      <div className={styles.header}>
        <span className={styles.title}>Room chat</span>
        <span className={styles.connection}>
          {connected ? '' : 'reconnecting…'}
        </span>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setDrawerOpen(false)}
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
      {/* Live messages only: the history replay never lands here. */}
      <div className={styles.srOnly} aria-live="polite">
        {announcement}
      </div>
    </div>
  )

  return (
    <div className={`${styles.chatRoot} ${drawerOpen ? styles.drawerOpen : ''}`}>
      {panel}
      <button
        type="button"
        className={styles.drawerToggle}
        onClick={openDrawer}
        aria-label={unreadCount > 0 ? `Open chat, ${unreadCount} unread` : 'Open chat'}
      >
        💬
        {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
      </button>
    </div>
  )
}

export default RoomChat
