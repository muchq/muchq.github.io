import { useEffect, useRef, useState } from 'react'
import ThoughtsGame from '@/apps/thoughts/components/ThoughtsGame'
import CastleTable from '@/apps/castle/components/CastleTable'
import GolfTable from '@/apps/golf/components/GolfTable'
import RoomChat from './RoomChat'
import { lobbyTablePath, useLobby } from '@/hooks/useLobby'
import type { UseLobbyProps } from '@/hooks/useLobby'
import LobbyPanel from './LobbyPanel'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import styles from './LobbyGame.module.css'

// The lobby: the world as the main view, the panel beside it, the room's
// chat, and — while this session sits at a table of either game — the
// table over the world, which keeps ticking underneath so presence and
// chat never drop. The panel hides behind a toggle while a table is up.

// Hiding the panel is how the bare world is asked for, so that choice
// outlives the visit; showing it again forgets it. Otherwise the panel
// opens where there is room for it beside the world.
const PANEL_KEY = 'lobby.panel'

const panelWanted = (): boolean => safeLocalStorage.get(PANEL_KEY) !== 'hidden' && window.innerWidth > 700

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
  // Over a table the toggle is about room on screen, not the world, so
  // only a choice made away from one is kept.
  const togglePanel = () => {
    if (!atTable) {
      if (panelOpen) safeLocalStorage.set(PANEL_KEY, 'hidden')
      else safeLocalStorage.remove(PANEL_KEY)
    }
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
      <ThoughtsGame link={lobby.world} />
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
