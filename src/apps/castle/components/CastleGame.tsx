import { castleRoomPath, useCastleGame } from '@/hooks/useCastleGame'
import type { UseCastleGameProps } from '@/hooks/useCastleGame'
import RoomChat from '@/apps/golf/components/RoomChat'
import PermalinkDisplay from '@/apps/golf/components/PermalinkDisplay'
import CastleTable from './CastleTable'
import styles from './CastleGame.module.css'

// The castle app: lobby, room, then the table (CastleTable) from the
// viewer's chair. Every rule the UI enforces is the engine's too — the
// buttons offer, the hub refuses in band, and the notice says why.

const CastleGame = (props: UseCastleGameProps) => {
  const game = useCastleGame(props)
  const { playerId, room, view, ended, notice, chat, selected, connected } = game

  const roomChat = chat.available ? (
    <RoomChat
      messages={chat.messages}
      playerId={playerId}
      connected={connected}
      replayUpTo={chat.replayUpTo}
      rejection={chat.rejection}
      onSend={game.sendChat}
    />
  ) : null

  // Always mounted, so screen readers announce what lands in it.
  const noticeBar = (
    <div className={`${styles.notice} ${notice ? '' : styles.noticeEmpty}`} role="status">
      {notice}
    </div>
  )

  if (game.lost) {
    return (
      <div className={styles.lobby}>
        <h1 className={styles.title}>Castle</h1>
        <p className={styles.error}>{game.lost}</p>
      </div>
    )
  }

  if (room === null) {
    return (
      <div className={styles.lobby}>
        <h1 className={styles.title}>Castle</h1>
        <p className={styles.tagline}>Shed every card first. 2s reset the deck, 10s clear it, four of a kind counts as a 10.</p>
        <div className={styles.lobbyActions}>
          <button type="button" className={styles.primary} onClick={game.createRoom} disabled={!connected}>
            Create a room
          </button>
          <div className={styles.joinRow}>
            <input
              className={styles.input}
              placeholder="Room code"
              aria-label="Room code"
              value={game.roomCode}
              onChange={event => game.setRoomCode(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && connected) game.joinRoom()
              }}
            />
            <button type="button" className={styles.secondary} onClick={game.joinRoom} disabled={!connected}>
              Join
            </button>
          </div>
        </div>
        {noticeBar}
      </div>
    )
  }

  if (view === null) {
    const tables = room.games.filter(summary => summary.game === 'castle')
    return (
      <>
        {roomChat}
        <div className={styles.room}>
          <div className={styles.roomHeader}>
            <div>
              <h1 className={styles.title}>Room {room.roomId}</h1>
              <p className={styles.muted}>
                {room.players.length} {room.players.length === 1 ? 'player' : 'players'}
              </p>
            </div>
            <div className={styles.headerActions}>
              <PermalinkDisplay label="Share room" url={`${window.location.origin}${castleRoomPath(room.roomId)}`} />
              <button type="button" className={styles.link} onClick={game.leaveRoom} disabled={!connected}>
                Leave room
              </button>
            </div>
          </div>
          <section className={styles.section} aria-labelledby="castle-players">
            <h2 id="castle-players">Players</h2>
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
                    {player.gamesWon}/{player.gamesPlayed} won
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className={styles.section} aria-labelledby="castle-tables">
            <h2 id="castle-tables">Tables</h2>
            {tables.length === 0 ? (
              <p className={styles.muted}>No castle tables yet</p>
            ) : (
              <ul className={styles.list}>
                {tables.map(table => {
                  const full = table.playerCount >= 4
                  const open = table.status === 'waiting' && !full
                  return (
                    <li key={table.gameId} className={styles.row}>
                      <span>
                        {table.gameId} · {table.playerCount}/4 · {table.status}
                      </span>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => game.joinTable(table.gameId)}
                        disabled={!open || !connected}
                      >
                        {table.status !== 'waiting' ? 'In play' : full ? 'Full' : 'Join'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <button type="button" className={styles.primary} onClick={game.createTable} disabled={!connected}>
              Open a table
            </button>
          </section>
          {noticeBar}
        </div>
      </>
    )
  }

  return (
    <>
      {roomChat}
      <CastleTable playerId={playerId} connected={connected} view={view} ended={ended} selected={selected} table={game}>
        {noticeBar}
      </CastleTable>
    </>
  )
}

export default CastleGame
