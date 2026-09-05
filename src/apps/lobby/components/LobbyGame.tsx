import { useEffect, useRef, useState } from 'react'
import ThoughtsGame from '@/apps/thoughts/components/ThoughtsGame'
import CastleTable from '@/apps/castle/components/CastleTable'
import GolfTable from '@/apps/golf/components/GolfTable'
import RoomChat from '@/apps/golf/components/RoomChat'
import { lobbyTablePath, useLobby } from '@/hooks/useLobby'
import type { UseLobbyProps } from '@/hooks/useLobby'
import LobbyPanel from './LobbyPanel'
import styles from './LobbyGame.module.css'

// The lobby: the world as the main view, the panel beside it, the room's
// chat, and — while this session sits at a table of either game — the
// table over the world, which keeps ticking underneath so presence and
// chat never drop. The panel hides behind a toggle while a table is up.

const LobbyGame = (props: UseLobbyProps) => {
  const lobby = useLobby(props)
  const { castle, golf, chat, connected, playerId, notice, room } = lobby
  const atTable = castle.view !== null || golf.view !== null
  // Open where there is room for it beside the world; a table takes the
  // screen, so it folds away when one comes up and returns when it goes.
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 700)
  const [foldedFor, setFoldedFor] = useState(atTable)
  if (foldedFor !== atTable) {
    setFoldedFor(atTable)
    setPanelOpen(!atTable && window.innerWidth > 700)
  }
  // The table takes its own focus on mount; when it goes, the button the
  // player last used is gone with it, so focus lands on the toggle.
  const toggleRef = useRef<HTMLButtonElement>(null)
  const wasAtTable = useRef(atTable)
  useEffect(() => {
    if (wasAtTable.current && !atTable) toggleRef.current?.focus()
    wasAtTable.current = atTable
  }, [atTable])

  if (lobby.lost) {
    return (
      <div className={styles.lost}>
        <h1 className={styles.title}>The plaza</h1>
        <p className={styles.error}>{lobby.lost}</p>
      </div>
    )
  }

  return (
    <>
      <ThoughtsGame link={lobby.world} hudSide="right" />
      {castle.view !== null && (
        <div className={styles.tableOverlay}>
          <CastleTable playerId={playerId} connected={connected} view={castle.view} table={castle} />
        </div>
      )}
      {golf.view !== null && (
        <div className={styles.tableOverlay}>
          <GolfTable
            playerId={playerId}
            view={golf.view}
            table={golf}
            shareUrl={room === null ? null : `${window.location.origin}${lobbyTablePath(room.roomId, golf.view.id)}`}
          />
        </div>
      )}
      <button
        ref={toggleRef}
        type="button"
        className={styles.panelToggle}
        onClick={() => setPanelOpen(open => !open)}
        aria-expanded={panelOpen}
        aria-controls="lobby-panel"
      >
        {panelOpen ? 'Hide lobby' : 'Lobby'}
      </button>
      {panelOpen && (
        <div id="lobby-panel">
          <LobbyPanel lobby={lobby} />
        </div>
      )}
      {chat.available && (
        <div className={styles.chatHost}>
          <RoomChat
            messages={chat.messages}
            playerId={playerId}
            connected={connected}
            replayUpTo={chat.replayUpTo}
            rejection={chat.rejection}
            onSend={lobby.sendChat}
          />
        </div>
      )}
      <div className={`${styles.notice} ${notice ? '' : styles.noticeEmpty}`} role="status">
        {notice}
      </div>
    </>
  )
}

export default LobbyGame
