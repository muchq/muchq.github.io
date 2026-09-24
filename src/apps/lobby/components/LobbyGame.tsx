import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import ThoughtsGame from '@/apps/thoughts/components/ThoughtsGame'
import CastleTable from '@/apps/castle/components/CastleTable'
import GolfTable from '@/apps/golf/components/GolfTable'
import RoomChat, { type RoomChatHandle } from './RoomChat'
import CommandMenu, { type CommandMenuHandle } from './CommandMenu'
import { lobbyCommands } from '../lobbyCommands'
import { CommandRegistry } from '@/utils/commandRegistry'
import { lobbyTablePath, useLobby } from '@/hooks/useLobby'
import type { UseLobbyProps } from '@/hooks/useLobby'
import LobbyPanel from './LobbyPanel'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import styles from './LobbyGame.module.css'

// The lobby: the world as the main view, the panel beside it, the room's
// chat, and — while this session sits at a table of either game — the
// table over the world, which keeps ticking underneath so presence and
// chat never drop. The panel hides behind a toggle while a table is up.
// Over all of it, the command menu: the world and the lobby both publish
// into one registry, and Escape opens it.

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
  const roomCodeRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<RoomChatHandle>(null)
  const menuRef = useRef<CommandMenuHandle>(null)
  // Stable, so the world's tap binding (and a run of taps) survives renders.
  const openMenu = useCallback(() => menuRef.current?.open(), [])
  const [commands] = useState(() => new CommandRegistry())
  // Asked for by the menu: the panel comes up, then the field is focused.
  const [roomCodeAsked, setRoomCodeAsked] = useState(0)
  // The menu's own word in the status line, until the hook has one or a
  // couple of seconds pass.
  const [said, setSaid] = useState('')
  useEffect(() => {
    if (!said) return
    const timer = window.setTimeout(() => setSaid(''), 2000)
    return () => window.clearTimeout(timer)
  }, [said])
  useEffect(() => {
    if (roomCodeAsked > 0) roomCodeRef.current?.focus()
  }, [roomCodeAsked])

  const wasAtTable = useRef(atTable)
  useEffect(() => {
    if (wasAtTable.current && !atTable) toggleRef.current?.focus()
    wasAtTable.current = atTable
  }, [atTable])

  // The voice entries follow the mesh, which changes off React's clock.
  useSyncExternalStore(lobby.voice.subscribe, lobby.voice.view)
  const offered = lobbyCommands(lobby, {
    panelOpen,
    togglePanel,
    askRoomCode: () => {
      setPanelOpen(true)
      setRoomCodeAsked(asked => asked + 1)
    },
    openChat: () => chatRef.current?.open(),
    say: setSaid,
  })
  useEffect(() => commands.publish('lobby', offered))
  useEffect(() => () => commands.withdraw('lobby'), [commands])

  return (
    <>
      <ThoughtsGame link={lobby.world} commands={commands} onTripleTap={openMenu} />
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
          <LobbyPanel lobby={lobby} roomCodeRef={roomCodeRef} />
        </div>
      )}
      {room !== null && (
        <div className={styles.chatHost}>
          <RoomChat
            ref={chatRef}
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
      <CommandMenu registry={commands} ref={menuRef} />
      <div className={`${styles.notice} ${notice || said ? '' : styles.noticeEmpty}`} role="status">
        {notice || said}
      </div>
    </>
  )
}

export default LobbyGame
