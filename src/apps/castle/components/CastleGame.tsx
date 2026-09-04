import { useState } from 'react'
import { useCastleGame } from '@/hooks/useCastleGame'
import type { UseCastleGameProps } from '@/hooks/useCastleGame'
import RoomChat from '@/apps/golf/components/RoomChat'
import PermalinkDisplay from '@/apps/golf/components/PermalinkDisplay'
import type { Card, CastlePlayer } from '../wire'
import { cardsOf, describeEnding, describeLastPlay, describePile, face, isRed, rowInPlay, seatOf } from '../rules'
import styles from './CastleGame.module.css'

// The castle app: lobby, room, then the table from the viewer's chair.
// Every rule the UI enforces is the engine's too — the buttons offer,
// the hub refuses in band, and the notice says why.

interface CardFaceProps {
  card: Card
  selected?: boolean
  onClick?: () => void
  label?: string
}

const CardFace = ({ card, selected = false, onClick, label }: CardFaceProps) => (
  <button
    type="button"
    className={`${styles.card} ${isRed(card) ? styles.red : ''} ${selected ? styles.selected : ''}`}
    onClick={onClick}
    disabled={onClick === undefined}
    aria-pressed={onClick === undefined ? undefined : selected}
    aria-label={label ?? face(card)}
  >
    <span className={styles.rank}>{card.rank}</span>
    <span className={styles.suit}>{card.suit}</span>
  </button>
)

interface CardBackProps {
  onClick?: () => void
  label: string
}

const CardBack = ({ onClick, label }: CardBackProps) => (
  <button
    type="button"
    className={`${styles.card} ${styles.back}`}
    onClick={onClick}
    disabled={onClick === undefined}
    aria-label={label}
  />
)

const CastleGame = (props: UseCastleGameProps) => {
  const game = useCastleGame(props)
  const { playerId, room, view, ended, notice, chat, selected } = game
  // Setup: the hand card picked, waiting for the face-up card to swap with.
  const [swapFrom, setSwapFrom] = useState<number | null>(null)

  const roomChat = chat.available ? (
    <RoomChat
      messages={chat.messages}
      playerId={playerId}
      connected={game.connected}
      replayUpTo={chat.replayUpTo}
      rejection={chat.rejection}
      onSend={game.sendChat}
    />
  ) : null

  const noticeBar = notice ? (
    <div className={styles.notice} role="status">
      {notice}
    </div>
  ) : null

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
        <p className={styles.tagline}>Shed every card first. Twos reset, tens burn, fours of a kind burn.</p>
        <div className={styles.lobbyActions}>
          <button type="button" className={styles.primary} onClick={game.createRoom} disabled={!game.connected}>
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
                if (event.key === 'Enter') game.joinRoom()
              }}
            />
            <button type="button" className={styles.secondary} onClick={game.joinRoom} disabled={!game.connected}>
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
            <PermalinkDisplay label="Share room" url={`${window.location.origin}/castle/room/${room.roomId}`} />
          </div>
          <section className={styles.section} aria-labelledby="castle-players">
            <h2 id="castle-players">Players</h2>
            <ul className={styles.list}>
              {room.players.map(player => (
                <li key={player.playerId} className={styles.row}>
                  <span>
                    {player.playerId === playerId ? `${player.playerId} (you)` : player.playerId}{' '}
                    <span aria-label={player.connected ? 'connected' : 'away'}>{player.connected ? '🟢' : '🔴'}</span>
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
                {tables.map(table => (
                  <li key={table.gameId} className={styles.row}>
                    <span>
                      {table.gameId} · {table.playerCount}/4 · {table.status}
                    </span>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => game.joinTable(table.gameId)}
                      disabled={table.status !== 'waiting' || table.playerCount >= 4}
                    >
                      {table.status === 'waiting' ? 'Join' : 'In play'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className={styles.primary} onClick={game.createTable}>
              Open a table
            </button>
          </section>
          <button type="button" className={styles.link} onClick={game.leaveRoom}>
            Leave room
          </button>
          {noticeBar}
        </div>
      </>
    )
  }

  const me = seatOf(view, playerId)
  const myTurn = view.currentPlayerId === playerId && view.phase === 'playing'
  const myRow = me === undefined ? 'hand' : rowInPlay(me)
  const inPlay = me === undefined ? [] : cardsOf(me, myRow)

  const renderSeat = (seat: CastlePlayer) => {
    const mine = seat.playerId === playerId
    const onTurn = view.phase === 'playing' && view.currentPlayerId === seat.playerId
    const label = mine ? `${seat.playerId} (you)` : seat.playerId
    return (
      <section
        key={seat.playerId}
        className={`${styles.seat} ${onTurn ? styles.onTurn : ''} ${seat.out ? styles.out : ''}`}
        aria-label={`${label}${onTurn ? ', to play' : ''}${seat.out ? ', out' : ''}`}
      >
        <h3 className={styles.seatName}>
          {label}
          {view.phase === 'setup' && <span className={styles.muted}> {seat.ready ? '· ready' : '· arranging'}</span>}
          {onTurn && <span className={styles.turn}> · to play</span>}
          {seat.out && <span className={styles.muted}> · out</span>}
        </h3>
        <div className={styles.rows}>
          <div className={styles.rowCards} aria-label={`${label} face down`}>
            {Array.from({ length: seat.faceDownCount }, (_, i) => (
              <CardBack
                key={i}
                label={mine && myTurn && myRow === 'faceDown' ? `flip face-down card ${i + 1}` : 'face-down card'}
                onClick={mine && myTurn && myRow === 'faceDown' ? () => game.playFaceDown(i) : undefined}
              />
            ))}
          </div>
          <div className={styles.rowCards} aria-label={`${label} face up`}>
            {seat.faceUp.map((card, i) => {
              const swappable = mine && view.phase === 'setup' && !seat.ready && swapFrom !== null
              const playable = mine && myTurn && myRow === 'faceUp'
              return (
                <CardFace
                  key={i}
                  card={card}
                  selected={playable && selected.includes(i)}
                  label={swappable ? `swap for ${face(card)}` : face(card)}
                  onClick={
                    swappable
                      ? () => {
                          game.swapForSetup(swapFrom, i)
                          setSwapFrom(null)
                        }
                      : playable
                        ? () => game.toggleCard(i)
                        : undefined
                  }
                />
              )
            })}
          </div>
          <div className={styles.rowCards} aria-label={`${label} hand`}>
            {seat.hand.length > 0
              ? seat.hand.map((card, i) => {
                  const arranging = mine && view.phase === 'setup' && !seat.ready
                  const playable = mine && myTurn && myRow === 'hand'
                  return (
                    <CardFace
                      key={i}
                      card={card}
                      selected={(arranging && swapFrom === i) || (playable && selected.includes(i))}
                      onClick={
                        arranging ? () => setSwapFrom(swapFrom === i ? null : i) : playable ? () => game.toggleCard(i) : undefined
                      }
                    />
                  )
                })
              : Array.from({ length: seat.handCount }, (_, i) => <CardBack key={i} label="hand card" />)}
          </div>
        </div>
      </section>
    )
  }

  const actions = (() => {
    if (view.phase === 'waiting') {
      return (
        <>
          <button type="button" className={styles.primary} onClick={game.startTable} disabled={view.players.length < 2}>
            {view.players.length < 2 ? 'Waiting for a second seat' : 'Deal'}
          </button>
        </>
      )
    }
    if (view.phase === 'setup' && me !== undefined) {
      return me.ready ? (
        <p className={styles.muted}>Ready. Waiting for the table.</p>
      ) : (
        <>
          <p className={styles.muted}>
            {swapFrom === null ? 'Pick a hand card to swap into your face-up row, or ready up.' : 'Now pick the face-up card to swap it with.'}
          </p>
          <button type="button" className={styles.primary} onClick={game.ready}>
            Ready
          </button>
        </>
      )
    }
    if (view.phase === 'playing' && me !== undefined && myTurn) {
      if (myRow === 'faceDown') return <p className={styles.muted}>Flip a face-down card. Blind.</p>
      return (
        <>
          <button type="button" className={styles.primary} onClick={game.playSelected} disabled={selected.length === 0}>
            Play {selected.length > 0 ? selected.map(i => face(inPlay[i])).join(' ') : ''}
          </button>
          <button type="button" className={styles.secondary} onClick={game.pickUp} disabled={me.canPlay || view.pileCount === 0}>
            Pick up the pile
          </button>
        </>
      )
    }
    if (view.phase === 'ended') {
      return (
        <button type="button" className={styles.primary} onClick={game.leaveTable}>
          Back to the room
        </button>
      )
    }
    return null
  })()

  return (
    <>
      {roomChat}
      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <h1 className={styles.title}>Table {view.gameId}</h1>
          {view.phase !== 'ended' && (
            <button type="button" className={styles.link} onClick={game.leaveTable}>
              Leave table
            </button>
          )}
        </div>
        {view.phase === 'ended' && ended !== null && (
          <p className={styles.ending} role="status">
            {describeEnding(ended.finished, ended.loser, playerId)}
          </p>
        )}
        {(view.phase === 'playing' || view.phase === 'ended') && (
          <section className={styles.pile} aria-label="pile">
            <div className={styles.pileCards}>
              {view.pileTop === undefined ? <div className={styles.emptyPile}>empty</div> : <CardFace card={view.pileTop} />}
              <div className={styles.pileText}>
                <p>{describePile(view)}</p>
                <p className={styles.muted}>
                  {view.pileCount} on the pile · {view.drawPileCount} to draw
                </p>
                {view.lastPlay !== undefined && <p className={styles.lastPlay}>{describeLastPlay(view.lastPlay, playerId)}</p>}
              </div>
            </div>
          </section>
        )}
        <div className={styles.seats}>{view.players.map(renderSeat)}</div>
        <div className={styles.actions}>{actions}</div>
        {noticeBar}
      </div>
    </>
  )
}

export default CastleGame
