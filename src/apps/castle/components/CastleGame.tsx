import { useState } from 'react'
import { castleRoomPath, useCastleGame } from '@/hooks/useCastleGame'
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
  // Present only for a card the viewer can act on: those are buttons,
  // the rest are pictures. A toggle (selection) reports its state.
  onClick?: () => void
  toggle?: boolean
  label?: string
  className?: string
}

const CardFace = ({ card, onClick, toggle, label, className = '' }: CardFaceProps) => {
  const classes = `${styles.card} ${isRed(card) ? styles.red : ''} ${toggle ? styles.selected : ''} ${className}`
  if (onClick === undefined) {
    return (
      <span className={classes} role="img" aria-label={label ?? face(card)}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suit}>{card.suit}</span>
      </span>
    )
  }
  return (
    <button type="button" className={classes} onClick={onClick} aria-pressed={toggle} aria-label={label ?? face(card)}>
      <span className={styles.rank}>{card.rank}</span>
      <span className={styles.suit}>{card.suit}</span>
    </button>
  )
}

interface CardBackProps {
  onClick?: () => void
  label: string
}

const CardBack = ({ onClick, label }: CardBackProps) =>
  onClick === undefined ? (
    <span className={`${styles.card} ${styles.back}`} role="img" aria-label={label} />
  ) : (
    <button type="button" className={`${styles.card} ${styles.back}`} onClick={onClick} aria-label={label} />
  )

const CastleGame = (props: UseCastleGameProps) => {
  const game = useCastleGame(props)
  const { playerId, room, view, ended, notice, chat, selected, connected } = game
  // Setup: the hand card picked, waiting for the face-up card to swap
  // with. Keyed to its table, so a pick never outlives the table it was
  // made on.
  const [pendingSwap, setPendingSwap] = useState<{ gameId: string; index: number } | null>(null)

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
        <p className={styles.tagline}>Shed every card first. Twos reset, tens burn, fours of a kind burn.</p>
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

  const me = seatOf(view, playerId)
  const myTurn = view.currentPlayerId === playerId && view.phase === 'playing'
  const myRow = me === undefined ? 'hand' : rowInPlay(me)
  const inPlay = me === undefined ? [] : cardsOf(me, myRow)
  const arranging = view.phase === 'setup' && me !== undefined && !me.ready
  const swapFrom =
    arranging && pendingSwap !== null && pendingSwap.gameId === view.gameId && pendingSwap.index < me.hand.length
      ? pendingSwap.index
      : null

  const renderSeat = (seat: CastlePlayer) => {
    const mine = seat.playerId === playerId
    const onTurn = view.phase === 'playing' && view.currentPlayerId === seat.playerId
    const label = mine ? `${seat.playerId} (you)` : seat.playerId
    const whose = mine ? 'Your' : `${seat.playerId}'s`
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
          <span className={styles.rowLabel}>Face down</span>
          <div className={styles.rowCards} role="group" aria-label={`${whose} face-down row`}>
            {Array.from({ length: seat.faceDownCount }, (_, i) => (
              <CardBack
                key={i}
                label={mine && myTurn && myRow === 'faceDown' ? `flip face-down card ${i + 1}` : 'face-down card'}
                onClick={mine && myTurn && myRow === 'faceDown' && connected ? () => game.playFaceDown(i) : undefined}
              />
            ))}
          </div>
          <span className={styles.rowLabel}>Face up, for all to see</span>
          <div className={styles.rowCards} role="group" aria-label={`${whose} face-up row`}>
            {seat.faceUp.map((card, i) => {
              const swappable = mine && swapFrom !== null
              const playable = mine && myTurn && myRow === 'faceUp'
              if (swappable) {
                return (
                  <CardFace
                    key={i}
                    card={card}
                    className={styles.swapTarget}
                    label={`swap for ${face(card)}`}
                    onClick={() => {
                      game.swapForSetup(swapFrom, i)
                      setPendingSwap(null)
                    }}
                  />
                )
              }
              return (
                <CardFace
                  key={i}
                  card={card}
                  toggle={playable ? selected.includes(i) : undefined}
                  onClick={playable && connected ? () => game.toggleCard(i) : undefined}
                />
              )
            })}
          </div>
          <span className={styles.rowLabel}>Hand</span>
          <div className={styles.rowCards} role="group" aria-label={`${whose} hand`}>
            {seat.hand.length > 0
              ? seat.hand.map((card, i) => {
                  const picking = mine && arranging
                  const playable = mine && myTurn && myRow === 'hand'
                  return (
                    <CardFace
                      key={i}
                      card={card}
                      toggle={picking ? swapFrom === i : playable ? selected.includes(i) : undefined}
                      onClick={
                        picking
                          ? () => setPendingSwap(swapFrom === i ? null : { gameId: view.gameId, index: i })
                          : playable && connected
                            ? () => game.toggleCard(i)
                            : undefined
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

  const hint = (() => {
    if (view.phase === 'waiting' && view.players.length < 2) return 'Waiting for a second seat.'
    if (arranging) {
      return swapFrom === null
        ? 'Pick a hand card to swap into your face-up row, or ready up.'
        : 'Now pick the face-up card to swap it with.'
    }
    if (view.phase === 'setup' && me?.ready) return 'Ready. Waiting for the table.'
    if (myTurn && myRow === 'faceDown') return 'Flip a face-down card. Blind.'
    return ''
  })()

  const actions = (() => {
    if (view.phase === 'waiting') {
      return (
        <button type="button" className={styles.primary} onClick={game.startTable} disabled={view.players.length < 2 || !connected}>
          Deal
        </button>
      )
    }
    if (arranging) {
      return (
        <button type="button" className={styles.primary} onClick={game.ready} disabled={!connected}>
          Ready
        </button>
      )
    }
    if (myTurn && me !== undefined && myRow !== 'faceDown') {
      return (
        <>
          <button type="button" className={styles.primary} onClick={game.playSelected} disabled={selected.length === 0 || !connected}>
            Play {selected.length > 0 ? selected.map(i => face(inPlay[i])).join(' ') : ''}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={game.pickUp}
            disabled={me.canPlay || view.pileCount === 0 || !connected}
          >
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
            <button type="button" className={styles.link} onClick={game.leaveTable} disabled={!connected}>
              Leave table
            </button>
          )}
        </div>
        <p className={styles.ending} role="status">
          {view.phase === 'ended' && ended !== null ? describeEnding(ended.finished, ended.loser, playerId) : ''}
        </p>
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
        <p className={styles.hint} role="status">
          {hint}
        </p>
        <div className={styles.seats}>{view.players.map(renderSeat)}</div>
        <div className={styles.actions}>{actions}</div>
        {noticeBar}
      </div>
    </>
  )
}

export default CastleGame
