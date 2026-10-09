import { useState, useSyncExternalStore, type Ref } from 'react'
import PermalinkDisplay from './PermalinkDisplay'
import type { UseLobby } from '@/hooks/useLobby'
import { lobbyRoomPath } from '@/hooks/useLobby'
import type { HubRoomPlayer } from '@/utils/hubStream'
import { hubChessFeedUrl, hubPlayUrl } from '@/utils/hubSession'
import type { ChessGameSummary } from '@/apps/chess/wire'
import { nameOf } from '@/apps/chess/rules'
import type { VoiceMesh, VoiceView } from '@/utils/voiceMesh'
import { CATALOG, FAMILIES, catalogEntry, seatsLine } from '../catalog'
import { atTable, seatsOf, tableFor, tableOffer } from '../offers'
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

// The room's finished chess games (MoonBase#1637), fetched when asked
// for rather than on every visit, each one reviewable; and whether the
// room publishes them, which any member may change and every member
// hears about.
const ChessGames = ({ lobby, disabled }: { lobby: UseLobby; disabled: boolean }) => {
  const { history } = lobby.chess
  return (
    <section className={styles.section} aria-labelledby="lobby-chess-games">
      <h2 id="lobby-chess-games">Chess games</h2>
      {history === null ? (
        <button type="button" className={styles.secondary} onClick={lobby.chess.loadHistory} disabled={disabled}>
          Show finished games
        </button>
      ) : (
        <>
          {history.games.length === 0 ? (
            <p className={styles.muted}>No finished games yet</p>
          ) : (
            <ul className={styles.list}>
              {history.games.map(game => (
                <li key={game.archiveId} className={styles.row}>
                  <span>{gameLine(game)}</span>
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
          <label className={styles.muted}>
            <input type="checkbox" checked={history.published} onChange={event => lobby.chess.publish(event.target.checked)} disabled={disabled} />{' '}
            Publish this room’s chess games
          </label>
          {history.published && (
            <p className={styles.muted}>
              Games that end while this is on join the{' '}
              <a href={hubChessFeedUrl(hubPlayUrl())} target="_blank" rel="noopener noreferrer">
                public chess feed
              </a>{' '}
              and stay there for 30 days, even after this is turned off.
            </p>
          )}
        </>
      )}
    </section>
  )
}

// A new table: one picker of every game, grouped by family, one button
// that opens the picked one, and what that game is and who it seats. A
// game more is an entry in the catalog, never a button more here.
const NewTable = ({ lobby, disabled }: { lobby: UseLobby; disabled: boolean }) => {
  const [game, setGame] = useState(CATALOG[0].game)
  const entry = catalogEntry(game)
  return (
    <div className={styles.stack}>
      <div className={styles.picker}>
        <select aria-label="Game" value={game} onChange={event => setGame(catalogEntry(event.target.value as typeof game).game)} disabled={disabled}>
          {FAMILIES.map(family => (
            <optgroup key={family} label={family}>
              {CATALOG.filter(option => option.family === family).map(option => (
                <option key={option.game} value={option.game}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" className={styles.primary} onClick={tableFor(lobby, game).createTable} disabled={disabled}>
          Open a {game} table
        </button>
      </div>
      <p className={styles.muted}>{entry.blurb}</p>
      <p className={styles.muted}>{seatsLine(entry)}</p>
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

const VoiceSection = ({ voice, connected }: { voice: VoiceMesh; connected: boolean }) => {
  const view = useSyncExternalStore(voice.subscribe, voice.view)
  const off = view.status === 'off'
  return (
    <section className={styles.section} aria-labelledby="lobby-voice">
      <h2 id="lobby-voice">Voice</h2>
      <p role="status" className={styles.muted}>
        {voiceStatus(view)}
      </p>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => (off ? void voice.join() : voice.leave())}
          disabled={off && !connected}
        >
          {off ? 'Join voice' : 'Leave voice'}
        </button>
        {view.status === 'on' && !view.listenOnly && (
          <button type="button" className={styles.secondary} onClick={() => voice.setMuted(!view.muted)}>
            {view.muted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>
    </section>
  )
}

export interface LobbyPanelProps {
  lobby: UseLobby
  // The room code field, for the command menu's "Join a room by code".
  roomCodeRef?: Ref<HTMLInputElement>
}

const LobbyPanel = ({ lobby, roomCodeRef }: LobbyPanelProps) => {
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
      <PermalinkDisplay label="Share room" url={`${window.location.origin}${lobbyRoomPath(room.roomId)}`} />
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
      <VoiceSection voice={lobby.voice} connected={connected} />
      <section className={styles.section} aria-labelledby="lobby-tables">
        <h2 id="lobby-tables">Tables</h2>
        {room.games.length === 0 ? (
          <p className={styles.muted}>No tables yet</p>
        ) : (
          <ul className={styles.list}>
            {room.games.map(table => {
              const offer = tableOffer(table)
              const game = table.game
              return (
                <li key={table.gameId} className={styles.row}>
                  <span>
                    {game} {table.gameId} · {table.playerCount}/{seatsOf(game)} · {table.status === 'choosing' ? 'between deals' : table.status}
                    {table.terms === undefined ? '' : ` · ${table.terms}`}
                  </span>
                  <span className={styles.offers}>
                    {/* Chess hides nothing, so any of its tables can be watched. */}
                    {game === 'chess' && (
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => lobby.chess.watchTable(table.gameId)}
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
      <ChessGames lobby={lobby} disabled={!connected} />
      {COMMAND_HINT}
    </aside>
  )
}

export default LobbyPanel
