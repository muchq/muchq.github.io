import { useEffect, useRef, useState } from 'react'
import ThoughtsGame from '@/apps/thoughts/components/ThoughtsGame'
import CastleTable from '@/apps/castle/components/CastleTable'
import GolfTable from '@/apps/golf/components/GolfTable'
import RoomChat from './RoomChat'
import { lobbyTablePath, useLobby } from '@/hooks/useLobby'
import type { UseLobbyProps } from '@/hooks/useLobby'
import LobbyPanel from './LobbyPanel'
import styles from './LobbyGame.module.css'

// The lobby: the world as the main view, the panel beside it, the room's
// chat, and — while this session sits at a table of either game — the
// table over the world, which keeps ticking underneath so presence and
// chat never drop. The panel hides behind a toggle while a table is up.

// Hiding the panel is how the bare world is asked for, so the choice
// outlives the visit. Storage can throw (private windows, blocked site
// data); without it the panel opens by width, as it always did.
const PANEL_KEY = 'lobby.panel'

function panelWanted(): boolean {
  try {
    const stored = localStorage.getItem(PANEL_KEY)
    if (stored !== null) return stored === 'open'
  } catch {
    // fall through to the width
  }
  return window.innerWidth > 700
}

function rememberPanel(open: boolean): void {
  try {
    localStorage.setItem(PANEL_KEY, open ? 'open' : 'closed')
  } catch {
    // the choice lasts this visit only
  }
}

const LobbyGame = (props: UseLobbyProps) => {
  const lobby = useLobby(props)
  const { castle, golf, chat, connected, playerId, notice, room } = lobby
  const atTable = castle.view !== null || golf.view !== null
  // A table takes the screen, so the panel folds away when one comes up
  // and returns to what the player wants when it goes.
  const [panelOpen, setPanelOpen] = useState(panelWanted)
  const [foldedFor, setFoldedFor] = useState(atTable)
  if (foldedFor !== atTable) {
    setFoldedFor(atTable)
    setPanelOpen(!atTable && panelWanted())
  }
  const togglePanel = () => {
    rememberPanel(!panelOpen)
    setPanelOpen(!panelOpen)
  }
  // The table takes its own focus on mount; when it goes, the button the
  // player last used is gone with it, so focus lands on the toggle.
  const toggleRef = useRef<HTMLButtonElement>(null)
  const wasAtTable = useRef(atTable)
  useEffect(() => {
    if (wasAtTable.current && !atTable) toggleRef.current?.focus()
    wasAtTable.current = atTable
  }, [atTable])

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
            connected={connected}
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
        onClick={togglePanel}
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
      {room !== null && (
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
      {lobby.lost && (
        <div className={styles.hubLost} role="status">
          {lobby.lost}
        </div>
      )}
      <div className={`${styles.notice} ${notice ? '' : styles.noticeEmpty}`} role="status">
        {notice}
      </div>
    </>
  )
}

export default LobbyGame
