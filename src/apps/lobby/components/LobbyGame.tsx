import { useCallback, useState } from 'react'
import ThoughtsGame from '@/apps/thoughts/components/ThoughtsGame'
import CastleTable from '@/apps/castle/components/CastleTable'
import RoomChat from '@/apps/golf/components/RoomChat'
import { useLobby } from '@/hooks/useLobby'
import type { UseLobbyProps } from '@/hooks/useLobby'
import type { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import LobbyPanel from './LobbyPanel'
import styles from './LobbyGame.module.css'

// The lobby: the world as the main view, the panel beside it, the room's
// chat, and — while this session sits at a castle table — the table over
// the world, which keeps ticking underneath so presence and chat never
// drop. The panel hides behind a toggle while a table is up.

export interface LobbyGameProps extends UseLobbyProps {
  onWorldStateChange?: (status: ConnectionState) => void
}

const LobbyGame = ({ onWorldStateChange, ...props }: LobbyGameProps) => {
  const lobby = useLobby(props)
  const { castle, chat, connected, playerId, notice } = lobby
  const atTable = castle.view !== null
  // Open where there is room for it beside the world; a table takes the
  // screen, so it folds away when one comes up and returns when it goes.
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth > 700)
  const [foldedFor, setFoldedFor] = useState(atTable)
  if (foldedFor !== atTable) {
    setFoldedFor(atTable)
    setPanelOpen(!atTable && window.innerWidth > 700)
  }

  // The renderer's own spawn id is not the session's; the hook reports
  // the server's through onPlayerIdChange.
  const ignoreSpawnId = useCallback(() => {}, [])
  const handleWorldState = useCallback(
    (status: ConnectionState) => onWorldStateChange?.(status),
    [onWorldStateChange]
  )

  if (lobby.lost) {
    return (
      <div className={styles.lost}>
        <h1 className={styles.title}>The plaza</h1>
        <p className={styles.error}>{lobby.lost}</p>
      </div>
    )
  }

  const noticeBar = (
    <div className={`${styles.notice} ${notice ? '' : styles.noticeEmpty}`} role="status">
      {notice}
    </div>
  )
  const roomChat = chat.available ? (
    <RoomChat
      messages={chat.messages}
      playerId={playerId}
      connected={connected}
      replayUpTo={chat.replayUpTo}
      rejection={chat.rejection}
      onSend={lobby.sendChat}
    />
  ) : null

  return (
    <>
      <ThoughtsGame link={lobby.world} onPlayerIdReceived={ignoreSpawnId} onConnectionStateChange={handleWorldState} hudSide="right" />
      {atTable && castle.view !== null && (
        <div className={styles.tableOverlay}>
          <CastleTable
            playerId={playerId}
            connected={connected}
            view={castle.view}
            ended={castle.ended}
            selected={castle.selected}
            table={castle}
          />
        </div>
      )}
      <button
        type="button"
        className={styles.panelToggle}
        onClick={() => setPanelOpen(open => !open)}
        aria-expanded={panelOpen}
        aria-controls="lobby-panel"
      >
        {panelOpen ? 'Hide room' : 'Room'}
      </button>
      {panelOpen && (
        <div id="lobby-panel">
          <LobbyPanel lobby={lobby} />
        </div>
      )}
      {roomChat}
      {noticeBar}
    </>
  )
}

export default LobbyGame
