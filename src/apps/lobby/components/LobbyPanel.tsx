import PermalinkDisplay from '@/apps/golf/components/PermalinkDisplay'
import type { UseLobby } from '@/hooks/useLobby'
import { TABLE_SEATS, lobbyRoomPath, tableOffer } from '@/hooks/useLobby'
import type { HubRoomPlayer } from '@/utils/hubStream'
import styles from './LobbyPanel.module.css'

// The side panel beside the world: where you are (the plaza, or a room
// by code), who is here and what they are doing, and the tables. The
// world and the chat are the page's; this only offers.

const presence = (player: HubRoomPlayer): string => {
  if (player.table !== undefined) return `at ${player.table.game} ${player.table.gameId}`
  return player.connected ? 'free' : 'away'
}

export interface LobbyPanelProps {
  lobby: UseLobby
}

const LobbyPanel = ({ lobby }: LobbyPanelProps) => {
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
      </aside>
    )
  }

  const busy = room.players.find(player => player.playerId === playerId)?.table !== undefined
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
              <span className={styles.muted}>{presence(player)}</span>
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
              const offer = tableOffer(table)
              const game = table.game ?? 'golf'
              return (
                <li key={table.gameId} className={styles.row}>
                  <span>
                    {game} {table.gameId} · {table.playerCount}/{TABLE_SEATS} · {table.status}
                  </span>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => (game === 'castle' ? lobby.castle.joinTable(table.gameId) : lobby.openGolfTable(table.gameId))}
                    disabled={!offer.open || !connected || busy}
                    aria-label={`${offer.label} ${game} ${table.gameId}`}
                  >
                    {offer.label}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className={styles.stack}>
          <button type="button" className={styles.primary} onClick={lobby.castle.createTable} disabled={!connected || busy}>
            Open a castle table
          </button>
          <button type="button" className={styles.secondary} onClick={lobby.createGolfTable} disabled={!connected || busy}>
            Open a golf table
          </button>
        </div>
      </section>
    </aside>
  )
}

export default LobbyPanel
