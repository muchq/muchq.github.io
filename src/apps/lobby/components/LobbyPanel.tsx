import { useState, useSyncExternalStore, type Ref } from 'react'
import PermalinkDisplay from './PermalinkDisplay'
import type { UseLobby } from '@/hooks/useLobby'
import { lobbyRoomPath } from '@/hooks/useLobby'
import type { HubGameName, HubRoomPlayer } from '@/utils/hubStream'
import type { ChessGameSummary } from '@/apps/chess/wire'
import { nameOf } from '@/apps/chess/rules'
import RoundRobins from './RoundRobins'
import type { VoiceMesh, VoiceView } from '@/utils/voiceMesh'
import { CATALOG, FAMILIES, FAMILY_NOUNS, familyOf, type GameFamily } from '../catalog'
import { atTable, offerFor, pairingAt, seatsOf, tableFor } from '../offers'
import type { TableHook } from '../games'
import styles from './LobbyPanel.module.css'

// The side panel beside the world: where you are (the plaza, or a room
// by code), who is here and what they are doing, and the tables. The
// world and the chat are the page's; this only offers.

const presence = (player: HubRoomPlayer): string => {
  if (player.table !== undefined) return `at ${player.table.game} ${player.table.gameId}`
  return player.connected ? 'free' : 'away'
}

// The room's running record, kept by the hub across its tables.
const record = (player: HubRoomPlayer): string => `${player.gamesWon}/${player.gamesPlayed} won`

// A finished chess game as one line: sides, score and ending, length.
const RESULT_MARK = { white: '1-0', black: '0-1' } as const
const gameLine = (game: ChessGameSummary): string => {
  const score = game.result.winnerColor === undefined ? '½-½' : RESULT_MARK[game.result.winnerColor]
  return `${nameOf(game.white)} vs ${nameOf(game.black)} · ${score} ${game.result.ending} · ${Math.ceil(game.plies / 2)} moves`
}

// The room's finished chess games (MoonBase#1637), each one reviewable,
// a published one linked to its page. History is asked for on room
// arrival in LobbyGame; Refresh here asks again.
const ChessGames = ({ lobby, disabled }: { lobby: UseLobby; disabled: boolean }) => {
  const { history } = lobby.chess
  return (
    <section className={styles.section} aria-labelledby="lobby-chess-games">
      <h2 id="lobby-chess-games">Chess games</h2>
      {history === null ? (
        <p className={styles.muted}>Loading finished games…</p>
      ) : (
        <>
          {history.games.length === 0 ? (
            <p className={styles.muted}>No finished games yet</p>
          ) : (
            <ul className={styles.list}>
              {history.games.map(game => (
                <li key={game.archiveId} className={styles.row}>
                  <span>
                    {gameLine(game)}
                    {game.published && (
                      <>
                        {' · '}
                        <a href={`/games/chess/${game.archiveId}`} target="_blank" rel="noopener noreferrer">
                          public page
                        </a>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => lobby.chess.reviewArchived(game.archiveId)}
                    disabled={disabled}
                    aria-label={`Review ${game.gameId} game ${game.ordinal}`}
                  >
                    Review
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={styles.link} onClick={lobby.chess.loadHistory} disabled={disabled} aria-label="Refresh finished games">
            Refresh
          </button>
        </>
      )}
    </section>
  )
}

// A new table: one picker of the families, a family of several games
// (cards) picking its game beside it, and one button that opens the
// picked game's table. What a game is, its table says.
// A family of one game is offered as that game ("Chess"), a family of
// several by its name ("Cards").
const FAMILY_OPTIONS = FAMILIES.map(family => {
  const members = CATALOG.filter(entry => entry.family === family)
  return members.length === 1
    ? { value: members[0].game as string, family, label: members[0].label }
    : { value: family.toLowerCase(), family, label: family }
})

const NewTable = ({ lobby, disabled }: { lobby: UseLobby; disabled: boolean }) => {
  const [choice, setChoice] = useState(FAMILY_OPTIONS[0])
  const family = choice.family
  const games = CATALOG.filter(entry => entry.family === family)
  const [picked, setPicked] = useState<Partial<Record<GameFamily, HubGameName>>>({})
  const game = picked[family] ?? games[0].game
  return (
    <div className={styles.picker}>
      <select
        aria-label="Game"
        value={choice.value}
        onChange={event => setChoice(FAMILY_OPTIONS.find(option => option.value === event.target.value) ?? FAMILY_OPTIONS[0])}
        disabled={disabled}
      >
        {FAMILY_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {games.length > 1 && (
        <select
          aria-label={`${FAMILY_NOUNS[family].singular} game`}
          value={game}
          onChange={event => setPicked(held => ({ ...held, [family]: event.target.value as HubGameName }))}
          disabled={disabled}
        >
          {games.map(option => (
            <option key={option.game} value={option.game}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      <button type="button" className={styles.primary} onClick={tableFor(lobby, game).createTable} disabled={disabled} aria-label={`Open a table: ${game}`}>
        Open a table
      </button>
    </div>
  )
}

// The command menu has no button of its own: this is where it is told.
const COMMAND_HINT = <p className={`${styles.muted} ${styles.hint}`}>Press Esc, or triple-tap the world, for commands</p>

// The room's voice: in or out of it, who else is, and the mute. One
// button joins and leaves, so focus stays put across the change, and the
// status line says what happened.
const voiceStatus = (view: VoiceView): string => {
  if (view.status === 'joining') return 'Joining voice…'
  if (view.status === 'off') return ''
  const who = `In voice: ${['you', ...view.members].join(', ')}`
  return view.listenOnly ? `${who} · listening only: no microphone` : who
}

// The room's voice, beside sharing the room: one button joins and leaves,
// so focus stays put across the change, and the status line under the
// row says what happened.
const VoiceControls = ({ voice, connected }: { voice: VoiceMesh; connected: boolean }) => {
  const view = useSyncExternalStore(voice.subscribe, voice.view)
  const off = view.status === 'off'
  return (
    <div role="group" aria-label="Voice" className={styles.voice}>
      <button type="button" className={styles.secondary} onClick={() => (off ? void voice.join() : voice.leave())} disabled={off && !connected}>
        {off ? 'Join voice' : 'Leave voice'}
      </button>
      {view.status === 'on' && !view.listenOnly && (
        <button type="button" className={styles.secondary} onClick={() => voice.setMuted(!view.muted)}>
          {view.muted ? 'Unmute' : 'Mute'}
        </button>
      )}
    </div>
  )
}

// Under the share-and-voice row, outside the buttons' group so joining
// moves no button; always there, so its first words are heard.
const VoiceStatus = ({ voice }: { voice: VoiceMesh }) => {
  const view = useSyncExternalStore(voice.subscribe, voice.view)
  return (
    <p role="status" className={`${styles.muted} ${styles.voiceStatus}`}>
      {voiceStatus(view)}
    </p>
  )
}

export interface LobbyPanelProps {
  lobby: UseLobby
  // The room code field, for the command menu's "Join a room by code".
  roomCodeRef?: Ref<HTMLInputElement>
  // Opens the room's chat; the row offers no Chat button without it.
  onOpenChat?: () => void
}

const LobbyPanel = ({ lobby, roomCodeRef, onOpenChat }: LobbyPanelProps) => {
  const { room, connected, playerId } = lobby

  if (room === null) {
    return (
      <aside className={styles.panel} aria-label="lobby">
        <h1 className={styles.title}>The plaza</h1>
        <p className={styles.muted}>Wander with everyone, or take a room of your own.</p>
        <div className={styles.stack}>
          <button type="button" className={styles.primary} onClick={lobby.createRoom} disabled={!connected}>
            Create a room
          </button>
          <div className={styles.joinRow}>
            <input
              ref={roomCodeRef}
              className={styles.input}
              placeholder="Room code"
              aria-label="Room code"
              value={lobby.roomCode}
              onChange={event => lobby.setRoomCode(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && connected) lobby.joinRoom()
              }}
            />
            <button type="button" className={styles.secondary} onClick={lobby.joinRoom} disabled={!connected}>
              Join
            </button>
          </div>
        </div>
        {COMMAND_HINT}
      </aside>
    )
  }

  const busy = atTable(room, playerId)
  return (
    <aside className={styles.panel} aria-label="lobby">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Room {room.roomId}</h1>
          <p className={styles.muted}>
            {room.players.length} {room.players.length === 1 ? 'player' : 'players'}
          </p>
        </div>
        <button type="button" className={styles.link} onClick={lobby.leaveRoom} disabled={!connected}>
          Leave room
        </button>
      </div>
      <div className={styles.toolbar}>
        <PermalinkDisplay
          label="Share room"
          url={`${window.location.origin}${lobbyRoomPath(room.roomId)}`}
          className={styles.secondary}
        />
        {onOpenChat && (
          <button type="button" className={styles.secondary} onClick={onOpenChat}>
            Chat
          </button>
        )}
        <VoiceControls voice={lobby.voice} connected={connected} />
        <VoiceStatus voice={lobby.voice} />
      </div>
      <section className={styles.section} aria-labelledby="lobby-players">
        <h2 id="lobby-players">Players</h2>
        <ul className={styles.list}>
          {room.players.map(player => (
            <li key={player.playerId} className={styles.row}>
              <span>
                {player.playerId === playerId ? `${player.playerId} (you)` : player.playerId}{' '}
                <span role="img" aria-label={player.connected ? 'connected' : 'away'}>
                  {player.connected ? '🟢' : '🔴'}
                </span>
              </span>
              <span className={styles.muted}>
                {presence(player)} · {record(player)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section} aria-labelledby="lobby-tables">
        <h2 id="lobby-tables">Tables</h2>
        {room.games.length === 0 ? (
          <p className={styles.muted}>No tables yet</p>
        ) : (
          <ul className={styles.list}>
            {room.games.map(table => {
              // A summary from before tables named their game is golf's.
              const game = table.game ?? 'golf'
              const pairing = pairingAt(lobby, table)
              // Any table of a game that hides nothing can be watched.
              const { watchTable: watch }: TableHook = tableFor(lobby, game)
              const offer = offerFor(lobby, table)
              return (
                <li key={table.gameId} className={styles.row}>
                  <span>
                    {familyOf(game).games.length > 1 ? `${FAMILY_NOUNS[familyOf(game).family].plural} · ` : ''}
                    {game} {table.gameId} · {table.playerCount}/{seatsOf(game)} · {table.status === 'choosing' ? 'between deals' : table.status}
                    {table.terms === undefined ? '' : ` · ${table.terms}`}
                    {pairing === undefined ? '' : ` · round robin: ${pairing[0]} – ${pairing[1]}`}
                  </span>
                  <span className={styles.offers}>
                    {watch !== undefined && (
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => watch(table.gameId)}
                        disabled={!connected || busy}
                        aria-label={`Watch ${game} ${table.gameId}`}
                      >
                        Watch
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => tableFor(lobby, game).joinTable(table.gameId)}
                      disabled={!offer.open || !connected || busy}
                      aria-label={`${offer.label} ${game} ${table.gameId}`}
                    >
                      {offer.label}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <NewTable lobby={lobby} disabled={!connected || busy} />
      </section>
      <RoundRobins lobby={lobby} disabled={!connected} busy={busy} />
      <ChessGames lobby={lobby} disabled={!connected} />
      {COMMAND_HINT}
    </aside>
  )
}

export default LobbyPanel
