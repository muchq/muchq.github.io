import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import ThoughtsGame from '@/apps/thoughts/components/ThoughtsGame'
import GameReview from '@/apps/chess/components/GameReview'
import RoomChat, { type RoomChatHandle } from './RoomChat'
import CommandMenu, { type CommandMenuHandle } from './CommandMenu'
import { lobbyCommands } from '../lobbyCommands'
import { CommandRegistry } from '@/utils/commandRegistry'
import { lobbyTablePath, useLobby } from '@/hooks/useLobby'
import type { RoomLink, UseLobby, UseLobbyProps } from '@/hooks/useLobby'
import LobbyPanel from './LobbyPanel'
import GameTableView from './GameTableView'
import type { TableContext } from '../games'
import { HUB_GAMES } from '@/utils/hubStream'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import styles from './LobbyGame.module.css'

// The lobby: the world as the main view, the panel beside it, the room's
// chat, and — while this session sits at a table of any game — the
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
  const { chess, chat, connected, playerId, notice, room } = lobby
  // A chess review (MoonBase#1637) takes the screen as a table does.
  const atTable = HUB_GAMES.some(game => lobby[game].view !== null) || chess.review !== null
  const tableContext: TableContext = {
    playerId,
    connected,
    room,
    // A rummy dealer among these lets any seat deal (MoonBase#1609).
    away: (room?.players ?? []).filter(player => !player.connected).map(player => player.playerId),
    tableUrl: gameId => (room === null ? null : `${window.location.origin}${lobbyTablePath(room.roomId, gameId)}`)
  }
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
    askBot: () => chatRef.current?.askBot(),
    say: setSaid,
  })
  useEffect(() => commands.publish('lobby', offered))
  useEffect(() => () => commands.withdraw('lobby'), [commands])

  return (
    <>
      <ThoughtsGame link={lobby.world} commands={commands} onTripleTap={openMenu} />
      {HUB_GAMES.map(
        game =>
          lobby[game].view !== null && (
            <div key={game} className={styles.tableOverlay}>
              <GameTableView game={game} table={lobby[game]} context={tableContext} />
            </div>
          )
      )}
      {/* A finished game under review, over any table: closing it goes
          back to whatever was under it. */}
      {chess.review !== null && (
        <div className={`${styles.tableOverlay} ${styles.reviewOverlay}`}>
          <GameReview review={chess.review} playerId={playerId} onClose={chess.closeReview} />
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
          <LobbyPanel lobby={lobby} roomCodeRef={roomCodeRef} onOpenChat={() => chatRef.current?.open()} />
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
          {lobby.lost}{' '}
          <button type="button" onClick={lobby.playHere}>
            Reconnect
          </button>
        </div>
      )}
      {lobby.superseded && (
        <div className={styles.hubLost} role="status">
          Playing in another window{' '}
          <button type="button" onClick={lobby.playHere}>
            Play here
          </button>
        </div>
      )}
      {lobby.roomLink && connected && <RoomLinkBanner link={lobby.roomLink} lobby={lobby} />}
      <CommandMenu registry={commands} ref={menuRef} />
      <div className={`${styles.notice} ${notice || said ? '' : styles.noticeEmpty}`} role="status">
        {notice || said}
      </div>
    </>
  )
}

export default LobbyGame

// A link to another room, held back while seated here. Leaving a game in
// play forfeits it, so that asks first, as Resign does.
function RoomLinkBanner({ link, lobby }: { link: RoomLink; lobby: UseLobby }) {
  const [confirming, setConfirming] = useState(false)
  // The confirm takes Go's place, and its focus.
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (confirming) confirmRef.current?.focus()
  }, [confirming])
  const { room, playerId } = lobby
  const table = room?.players.find(player => player.playerId === playerId)?.table
  const status = room?.games.find(game => game.gameId === table?.gameId)?.status
  const inPlay = status !== undefined && status !== 'waiting'
  return (
    <div className={styles.hubLost} role="status">
      {inPlay ? 'You are in a game' : 'You are at a table'} in room {room?.roomId}.{' '}
      {confirming ? (
        <button type="button" ref={confirmRef} onClick={lobby.followRoomLink}>
          Forfeit and go to room {link.roomId}
        </button>
      ) : (
        <button type="button" onClick={inPlay ? () => setConfirming(true) : lobby.followRoomLink}>
          Go to room {link.roomId}
        </button>
      )}{' '}
      <button type="button" onClick={lobby.stayInRoom}>
        Stay
      </button>
    </div>
  )
}
