import { useEffect, useRef, useState } from 'react'
import type { SpadesTableActions } from '@/hooks/useSpadesTable'
import type { SpadesPlayer, SpadesTrickPlay, SpadesView } from '../wire'
import { HAND_SIZE } from '../wire'
import { bidNumber, bidWords, describeResult, face, isLegal, teamName, you, You } from '../rules'
import { seatsOf } from '@/apps/lobby/catalog'
import { CardBack, CardFace } from '@/apps/castle/components/Cards'
import { clockOf, fromViewer } from '@/apps/castle/seating'
import felt from '@/apps/castle/components/CastleTable.module.css'
import AboutGame from '@/apps/lobby/components/AboutGame'
import styles from './SpadesTable.module.css'

// The spades table from the viewer's chair on castle's felt: the viewer at
// 6 o'clock and the others round the ring in turn order, a partner across
// at 12. The middle is the trick in play. Every rule is the hub's: the view names
// the viewer's legal plays, and only those are buttons.

export interface SpadesTableProps {
  playerId: string
  connected: boolean
  view: SpadesView
  table: SpadesTableActions & { opening: boolean; sending: boolean }
}

// Another seat's hand is backs: past this many, the count says the rest.
const SHOWN_BACKS = 5

const SEATS = seatsOf('spades')

const signed = (points: number) => (points > 0 ? `+${points}` : `${points}`)

const SpadesTable = ({ playerId, connected, view, table }: SpadesTableProps) => {
  const { opening, sending } = table
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  const [bid, setBid] = useState<number | null>(null)
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  // A move takes the control that made it away, so focus goes to the
  // hand, where the next one is made.
  const handRef = useRef<HTMLDivElement>(null)
  const thenHand = (move: () => void) => () => {
    move()
    handRef.current?.focus()
  }
  // Asking takes away the button that asked, so focus goes to the
  // question; staying puts the button back, and focus with it.
  const leaveRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const stayed = useRef(false)
  useEffect(() => {
    if (confirmingLeave) {
      confirmRef.current?.focus()
      return
    }
    if (!stayed.current) return
    stayed.current = false
    leaveRef.current?.focus()
  }, [confirmingLeave])

  const me = view.players.find(player => player.playerId === playerId)
  const partner = me === undefined ? undefined : view.players.find(player => player.team === me.team && player !== me)
  const myTurn = view.currentPlayerId === playerId
  const seatsOfTeam = (team: number) => view.players.flatMap((player, seat) => (player.team === team ? [seat] : []))
  const able = connected && !sending
  const bidding = view.phase === 'bidding' && myTurn
  const playing = view.phase === 'playing' && myTurn
  // A leave ends the game for every seat, so one in play is asked twice.
  const inPlay = view.phase === 'bidding' || view.phase === 'playing' || view.phase === 'scored'
  // A pick is for the bid it was made for, and the question for the game
  // it was asked in.
  if (bid !== null && !bidding) setBid(null)
  if (confirmingLeave && !inPlay) setConfirmingLeave(false)
  const lastPlay = view.trick.at(-1)
  const said =
    lastPlay !== undefined
      ? `${You(lastPlay.playerId, playerId)} played ${face(lastPlay.card)}`
      : view.lastTrick !== undefined
        ? `${You(view.lastTrick.winner, playerId)} took the trick`
        : ''

  const hint = (() => {
    if (view.phase === 'waiting') {
      const seated = view.players.length
      if (seated < 2) return 'Waiting for a second seat.'
      if (seated < SEATS) return `${seated === 2 ? 'Two' : 'Three'} seated: start cutthroat, every seat for itself, or wait for four to play partners.`
      return 'Four seated: partners across, or cutthroat.'
    }
    if (bidding && partner !== undefined) return `Your bid: the tricks you and ${partner.playerId} mean to take between you, or nil.`
    if (bidding) return 'Your bid: the tricks you mean to take, or nil.'
    if (view.phase === 'bidding') return `Waiting for ${view.currentPlayerId} to bid.`
    if (playing && view.trick.length === 0) return view.spadesBroken ? 'Your lead.' : 'Your lead. Spades aren’t broken yet.'
    if (playing) return 'Your play: follow the suit led if you can.'
    if (view.phase === 'playing') return `Waiting for ${view.currentPlayerId} to play.`
    if (view.phase === 'scored') return `Hand ${view.handNumber} is scored: anyone can deal the next.`
    return ''
  })()

  const actions = (() => {
    if (view.phase === 'waiting') {
      return (
        <>
          <AboutGame game="spades" className={felt.hint} />
          {view.players.length === SEATS && (
            <button type="button" className={felt.primary} onClick={() => table.startTable('partners')} disabled={!connected}>
              Start partners
            </button>
          )}
          <button
            type="button"
            className={view.players.length === SEATS ? felt.secondary : felt.primary}
            onClick={() => table.startTable('cutthroat')}
            disabled={view.players.length < 2 || !connected}
          >
            Start cutthroat
          </button>
        </>
      )
    }
    if (bidding) {
      return (
        <>
          <select
            className={styles.bid}
            aria-label="Your bid"
            value={bid ?? ''}
            onChange={event => setBid(Number(event.target.value))}
            disabled={!able}
          >
            <option value="" disabled>
              Pick…
            </option>
            {Array.from({ length: (view.handSize ?? HAND_SIZE) + 1 }, (_, tricks) => (
              <option key={tricks} value={tricks}>
                {tricks === 0 ? 'Nil' : tricks}
              </option>
            ))}
          </select>
          <button type="button" className={felt.primary} onClick={thenHand(() => bid !== null && table.bid(bid))} disabled={bid === null || !able}>
            {bid === null ? 'Bid' : `Bid ${bidNumber(bid)}`}
          </button>
        </>
      )
    }
    if (view.phase === 'scored' || view.phase === 'won') {
      return (
        <button type="button" className={felt.primary} onClick={thenHand(table.deal)} disabled={!able}>
          {view.phase === 'won' ? 'Deal a new game' : 'Deal the next hand'}
        </button>
      )
    }
    if (view.phase === 'closed') {
      return (
        <>
          <button type="button" className={felt.primary} onClick={table.playAgain} disabled={!connected || opening}>
            {opening ? 'Opening…' : 'Play again'}
          </button>
          <button type="button" className={felt.secondary} onClick={table.leaveTable}>
            Back to the room
          </button>
        </>
      )
    }
    return null
  })()

  const trickCards = (plays: SpadesTrickPlay[], label: string) => (
    <div className={styles.trick} role="group" aria-label={label}>
      {plays.map(play => (
        <span key={face(play.card)} className={styles.play}>
          <CardFace card={play.card} label={`${face(play.card)} from ${play.playerId}`} />
          <span className={styles.player} aria-hidden="true">
            {you(play.playerId, playerId)}
          </span>
        </span>
      ))}
    </div>
  )

  const renderSeat = (seat: SpadesPlayer, clock: number) => {
    const mine = seat.playerId === playerId
    const onTurn = view.currentPlayerId === seat.playerId
    const label = mine ? `${seat.playerId} (you)` : seat.playerId
    const dealt = view.handNumber > 0
    return (
      <section
        key={seat.playerId}
        className={`${felt.seat} ${mine ? felt.mine : ''} ${onTurn ? felt.onTurn : ''}`}
        data-clock={clock}
        aria-label={label}
      >
        <h3 className={felt.seatName}>
          {label}
          {seat === partner && <span className={felt.muted}> · partner</span>}
          {view.dealer === seat.playerId && <span className={felt.muted}> · dealer</span>}
          {!mine && dealt && (
            <span className={`${felt.handCount} ${seat.handCount > SHOWN_BACKS ? felt.handCountShown : ''}`}> · {seat.handCount} in hand</span>
          )}
        </h3>
        {dealt && <p className={felt.muted}>{`${bidWords(seat.bid)} · ${seat.tricks} taken`}</p>}
        <div className={felt.seatFrame}>
          <div className={felt.seatCards}>
            <div
              className={felt.hand}
              ref={mine ? handRef : undefined}
              tabIndex={mine ? -1 : undefined}
              role="group"
              aria-label={mine ? 'Your hand' : `${seat.playerId}'s hand`}
            >
              <div className={felt.fan}>
                {mine
                  ? seat.hand.map(card => (
                      <span key={face(card)} className={felt.fanSlot}>
                        <CardFace card={card} onClick={playing && able && isLegal(view, card) ? thenHand(() => table.play(card)) : undefined} />
                      </span>
                    ))
                  : Array.from({ length: Math.min(seat.handCount, SHOWN_BACKS) }, (_, i) => (
                      <span key={i} className={felt.fanSlot}>
                        <CardBack label="hand card" />
                      </span>
                    ))}
              </div>
            </div>
          </div>
        </div>
        {mine && <div className={felt.actions}>{actions}</div>}
      </section>
    )
  }

  return (
    <div className={felt.table} data-phase={view.phase}>
      <div className={felt.tableHeader}>
        <h1 ref={headingRef} tabIndex={-1} className={felt.title}>
          Spades · {view.gameId}
        </h1>
        {view.handNumber > 0 && <p className={felt.muted}>Hand {view.handNumber}</p>}
        <div className={felt.status}>
          <p className={felt.srOnly} role="status">
            {myTurn ? 'Your turn' : ''}
          </p>
          <p className={felt.hint} role="status">
            {hint}
          </p>
          <p className={felt.srOnly} role="status">
            {said}
          </p>
        </div>
        {view.phase !== 'closed' &&
          (confirmingLeave ? (
            <span className={styles.confirm}>
              <button ref={confirmRef} type="button" className={felt.secondary} onClick={table.leaveTable} disabled={!connected}>
                Leave and end the game
              </button>
              <button
                type="button"
                className={felt.link}
                onClick={() => {
                  setConfirmingLeave(false)
                  stayed.current = true
                }}
              >
                Stay
              </button>
            </span>
          ) : (
            <button
              ref={leaveRef}
              type="button"
              className={felt.link}
              onClick={inPlay ? () => setConfirmingLeave(true) : table.leaveTable}
              disabled={!connected}
            >
              Leave table
            </button>
          ))}
      </div>
      <p className={felt.ending} role="status">
        {view.result === undefined ? '' : describeResult(view.result, view, playerId)}
      </p>
      <div className={felt.ring}>
        {fromViewer(view.players, playerId).map((seat, i, all) => renderSeat(seat, clockOf(all.length, i)))}
        {view.handNumber > 0 && (
          <section className={felt.pile} aria-label="table">
            {view.trick.length > 0 || view.lastTrick === undefined ? (
              trickCards(view.trick, 'trick')
            ) : (
              <>
                <p className={felt.muted}>{`${You(view.lastTrick.winner, playerId)} took the last trick`}</p>
                {trickCards(view.lastTrick.plays, 'last trick')}
              </>
            )}
            <p className={felt.muted}>{view.spadesBroken ? 'Spades broken' : 'Spades not broken'}</p>
          </section>
        )}
      </div>
      {view.teams.length > 0 && (
        <div className={styles.sheets}>
          <table className={styles.sheet} aria-label="Score">
            <thead>
              <tr>
                <th scope="col">Team</th>
                <th scope="col">Score</th>
                <th scope="col">Bags</th>
                <th scope="col">Games</th>
              </tr>
            </thead>
            <tbody>
              {view.teams.map((team, t) => (
                <tr key={t}>
                  <th scope="row">{teamName(view, t, playerId)}</th>
                  <td>{team.score}</td>
                  <td>{team.bags}</td>
                  <td>{team.gamesWon}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.hands.length > 0 && (
            <table className={styles.sheet} aria-label="Hands">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  {view.teams.map((_, t) => (
                    <th key={t} scope="colgroup" colSpan={3}>
                      {teamName(view, t, playerId)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.hands.map((line, h) => (
                  <tr key={h}>
                    <th scope="row">{h + 1}</th>
                    {view.teams.map((_, t) => {
                      const of = seatsOfTeam(t)
                      return (
                        <TeamLine
                          key={t}
                          bids={of.map(seat => line.bids[seat])}
                          took={of.reduce((sum, seat) => sum + line.tricks[seat], 0)}
                          points={line.points[t]}
                          score={line.scores[t]}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// A team's columns on one hand: its seats' bids, the tricks they took, what
// the hand scored and the total after.
const TeamLine = ({ bids, took, points, score }: { bids: number[]; took: number; points: number; score: number }) => (
  <>
    <td>{`${bids.map(bidNumber).join(' / ')} · took ${took}`}</td>
    <td>{signed(points)}</td>
    <td>{score}</td>
  </>
)

export default SpadesTable
