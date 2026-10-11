import { useEffect, useId, useState } from 'react'
import type { UseLobby } from '@/hooks/useLobby'
import { CLOCKS } from '@/apps/chess/rules'
import { VARIANTS, type PongVariant } from '@/apps/pong/wire'
import { mayModerate, myOpenPairings, pairingLine, roomRoundRobins, stillToPlay, type HeldRoundRobin } from '../roundRobins'
import styles from './LobbyPanel.module.css'

// The room's round robins (MoonBase#1647), chess's and pong's, in the lobby panel: each
// one's standings and pairings, the player's own pairings to play, the
// moderator's forfeits and withdrawals, and a new one. The hub decides
// every action; this only offers.

interface Props {
  lobby: UseLobby
  // Offline: nothing is sent.
  disabled: boolean
  // Seated at a table: no other can be opened or joined.
  busy: boolean
}

const Entry = ({ lobby, roundRobin, disabled, busy }: Props & { roundRobin: HeldRoundRobin }) => {
  // Each game's round robins are moved in its own envelope.
  const table = roundRobin.game === 'pong' ? lobby.pong : lobby.chess
  const { playerId, room } = lobby
  const headingId = useId()
  // Standings, pairings and moderation fold away: the entry's first job
  // is the player's own next game.
  const [open, setOpen] = useState(false)
  const counted = roundRobin.pairings.filter(pairing => !pairing.voided)
  const decided = counted.filter(pairing => pairing.score !== undefined).length
  const present = room?.players.map(player => player.playerId) ?? []
  const id = roundRobin.roundRobinId
  const mine = myOpenPairings(roundRobin, playerId)
  const seating = disabled || busy || table.opening
  const withdrawable = roundRobin.entrants.filter(
    entrant => !roundRobin.withdrawn.includes(entrant) && mayModerate(roundRobin, playerId, present, [entrant])
  )
  return (
    <li className={styles.entry} aria-labelledby={headingId}>
      <h3 id={headingId}>
        Round robin {roundRobin.roundRobinId} by {roundRobin.creator}
      </h3>
      <p className={styles.muted}>
        {roundRobin.terms} · {decided} of {counted.length} decided
      </p>
      {mine.length > 0 && (
        <div className={styles.wrap}>
          {mine.map(({ pairing, opponent }) =>
            pairing.gameId === undefined ? (
              <button key={opponent} type="button" className={styles.primary} onClick={() => table.playRoundRobin(id, opponent)} disabled={seating}>
                Play {opponent}
              </button>
            ) : (
              <button key={opponent} type="button" className={styles.primary} onClick={() => table.joinTable(pairing.gameId as string)} disabled={seating}>
                Join {opponent} at {pairing.gameId}
              </button>
            )
          )}
        </div>
      )}
      <button
        type="button"
        className={styles.link}
        aria-expanded={open}
        aria-label={`Details of round robin ${roundRobin.roundRobinId}`}
        onClick={() => setOpen(held => !held)}
      >
        Details
      </button>
      {open && (
        <>
          <ol className={styles.list} aria-label="Standings">
            {roundRobin.standings.map(standing => (
              <li key={standing.playerId}>
                {standing.place}. {standing.playerId} · {standing.points} (<abbr title="Sonneborn-Berger">SB</abbr> {standing.sonnebornBerger})
                {standing.withdrawn ? ' · withdrew' : ''}
              </li>
            ))}
          </ol>
          <ul className={styles.list} aria-label="Pairings">
            {roundRobin.pairings.map(pairing => {
              const pair = `${pairing.first} – ${pairing.second}`
              // A forfeit is for a pairing still to play at no table.
              const forfeitable =
                stillToPlay(pairing) && pairing.gameId === undefined && mayModerate(roundRobin, playerId, present, [pairing.first, pairing.second])
              return (
                <li key={`${pairing.round}\n${pairing.first}\n${pairing.second}`} className={stillToPlay(pairing) ? undefined : styles.muted}>
                  Round {pairing.round}: {pairingLine(pairing)}
                  {forfeitable && (
                    <span className={styles.wrap}>
                      {[pairing.first, pairing.second].map(winner => (
                        <button
                          key={winner}
                          type="button"
                          className={styles.link}
                          onClick={() => table.forfeit(id, winner, winner === pairing.first ? pairing.second : pairing.first)}
                          disabled={disabled}
                          aria-label={`${winner} wins ${pair} by forfeit`}
                        >
                          {winner} wins
                        </button>
                      ))}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {withdrawable.length > 0 && (
            <div className={styles.wrap}>
              {withdrawable.map(entrant => (
                <button key={entrant} type="button" className={styles.secondary} onClick={() => table.withdraw(id, entrant)} disabled={disabled}>
                  Withdraw {entrant}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </li>
  )
}

// 3 to 8 of the room's members, entered in the room's order, at chess on
// a picked clock or at pong on a picked variant. Those here start picked and those away not; a pick made holds
// whoever comes or goes.
const NewRoundRobin = ({ lobby, disabled, onStarted }: Pick<Props, 'lobby' | 'disabled'> & { onStarted: () => void }) => {
  const players = lobby.room?.players ?? []
  const [picks, setPicks] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [game, setGame] = useState<'chess' | 'pong'>('chess')
  const [clock, setClock] = useState('3+2')
  const [variant, setVariant] = useState<PongVariant>('smallcat')
  const picked = (player: (typeof players)[number]) => picks.get(player.playerId) ?? player.connected
  const entrants = players.filter(picked).map(player => player.playerId)
  const sized = entrants.length >= 3 && entrants.length <= 8
  const toggle = (player: (typeof players)[number]) => setPicks(held => new Map(held).set(player.playerId, !picked(player)))
  return (
    <div className={styles.stack}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.muted}>Entrants</legend>
        <div className={styles.wrap}>
          {players.map(player => (
            <label key={player.playerId}>
              <input type="checkbox" checked={picked(player)} onChange={() => toggle(player)} disabled={disabled} /> {player.playerId}
            </label>
          ))}
        </div>
      </fieldset>
      {/* Labelled on screen: a phone's native picker shows its options alone. */}
      <div className={`${styles.picker} ${styles.pickerWrap}`}>
        <label className={styles.pick}>
          Game
          <select aria-label="Round robin game" value={game} onChange={event => setGame(event.target.value as 'chess' | 'pong')} disabled={disabled}>
            <option value="chess">Chess</option>
            <option value="pong">Pong</option>
          </select>
        </label>
        {game === 'chess' ? (
          <label className={styles.pick}>
            Clock
            <select aria-label="Round robin clock" value={clock} onChange={event => setClock(event.target.value)} disabled={disabled}>
              {Object.keys(CLOCKS).map(label => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className={styles.pick}>
            Court
            <select aria-label="Round robin variant" value={variant} onChange={event => setVariant(event.target.value as PongVariant)} disabled={disabled}>
              {VARIANTS.map(option => (
                <option key={option.variant} value={option.variant}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          className={styles.primary}
          onClick={() => {
            if (game === 'chess') lobby.chess.createRoundRobin(entrants, CLOCKS[clock])
            else lobby.pong.createRoundRobin(entrants, variant)
            onStarted()
          }}
          disabled={disabled || !sized}
        >
          Start a round robin
        </button>
      </div>
      {!sized && <p className={styles.muted}>Pick 3 to 8 players</p>}
    </div>
  )
}

// Each game's asked for on arriving, then kept current by each one every
// member hears.
// A room with none and too few for one shows nothing; the form waits
// behind its button.
const RoundRobins = ({ lobby, disabled, busy }: Props) => {
  const roundRobins = roomRoundRobins(lobby.chess.roundRobins, lobby.pong.roundRobins)
  const chessUnknown = lobby.chess.roundRobins === null
  const pongUnknown = lobby.pong.roundRobins === null
  const loadChess = lobby.chess.loadRoundRobins
  const loadPong = lobby.pong.loadRoundRobins
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (chessUnknown && !disabled) loadChess()
  }, [chessUnknown, disabled, loadChess])
  useEffect(() => {
    if (pongUnknown && !disabled) loadPong()
  }, [pongUnknown, disabled, loadPong])
  const loadRoundRobins = () => {
    loadChess()
    loadPong()
  }
  const held = roundRobins ?? []
  if (held.length === 0 && (lobby.room?.players.length ?? 0) < 3) return null
  return (
    <section className={styles.section} aria-labelledby="lobby-round-robins">
      <div className={styles.sectionHead}>
        <h2 id="lobby-round-robins">Round robins</h2>
        <span className={styles.wrap}>
          <button type="button" className={styles.link} onClick={loadRoundRobins} disabled={disabled} aria-label="Refresh round robins">
            Refresh
          </button>
          <button type="button" className={styles.link} aria-expanded={creating} onClick={() => setCreating(open => !open)}>
            New round robin
          </button>
        </span>
      </div>
      {creating && <NewRoundRobin lobby={lobby} disabled={disabled} onStarted={() => setCreating(false)} />}
      {roundRobins === null && <p className={styles.muted}>Loading round robins…</p>}
      {held.length > 0 && (
        <ul className={styles.list}>
          {held.map(roundRobin => (
            <Entry key={`${roundRobin.game}\n${roundRobin.roundRobinId}`} lobby={lobby} roundRobin={roundRobin} disabled={disabled} busy={busy} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default RoundRobins
