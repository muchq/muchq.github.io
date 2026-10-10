import { useEffect, useId, useState } from 'react'
import type { UseLobby } from '@/hooks/useLobby'
import type { ChessRoundRobin } from '@/apps/chess/wire'
import { CLOCKS } from '@/apps/chess/rules'
import { mayModerate, myOpenPairings, pairingLine, stillToPlay, termsLine } from '@/apps/chess/roundRobin'
import styles from './LobbyPanel.module.css'

// The room's chess round robins (MoonBase#1647) in the lobby panel: each
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

const Entry = ({ lobby, roundRobin, disabled, busy }: Props & { roundRobin: ChessRoundRobin }) => {
  const { playerId, room } = lobby
  const headingId = useId()
  const present = room?.players.map(player => player.playerId) ?? []
  const id = roundRobin.roundRobinId
  const mine = myOpenPairings(roundRobin, playerId)
  const seating = disabled || busy || lobby.chess.opening
  const withdrawable = roundRobin.entrants.filter(
    entrant => !roundRobin.withdrawn.includes(entrant) && mayModerate(roundRobin, playerId, present, [entrant])
  )
  return (
    <li className={styles.entry} aria-labelledby={headingId}>
      <h3 id={headingId}>
        Round robin {roundRobin.roundRobinId} by {roundRobin.creator}
      </h3>
      <p className={styles.muted}>{termsLine(roundRobin.terms)}</p>
      {mine.length > 0 && (
        <div className={styles.wrap}>
          {mine.map(({ pairing, opponent }) =>
            pairing.gameId === undefined ? (
              <button key={opponent} type="button" className={styles.primary} onClick={() => lobby.chess.playRoundRobin(id, opponent)} disabled={seating}>
                Play {opponent}
              </button>
            ) : (
              <button key={opponent} type="button" className={styles.primary} onClick={() => lobby.chess.joinTable(pairing.gameId as string)} disabled={seating}>
                Join {opponent} at {pairing.gameId}
              </button>
            )
          )}
        </div>
      )}
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
          const pair = `${pairing.white} – ${pairing.black}`
          // A forfeit is for a pairing still to play at no table.
          const forfeitable =
            stillToPlay(pairing) && pairing.gameId === undefined && mayModerate(roundRobin, playerId, present, [pairing.white, pairing.black])
          return (
            <li key={`${pairing.round}\n${pairing.white}\n${pairing.black}`} className={stillToPlay(pairing) ? undefined : styles.muted}>
              Round {pairing.round}: {pairingLine(pairing)}
              {forfeitable && (
                <span className={styles.wrap}>
                  {[pairing.white, pairing.black].map(winner => (
                    <button
                      key={winner}
                      type="button"
                      className={styles.link}
                      onClick={() => lobby.chess.forfeit(id, winner, winner === pairing.white ? pairing.black : pairing.white)}
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
            <button key={entrant} type="button" className={styles.secondary} onClick={() => lobby.chess.withdraw(id, entrant)} disabled={disabled}>
              Withdraw {entrant}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

// 3 to 8 of the room's members, entered in the room's order, on a picked
// clock. Those here start picked and those away not; a pick made holds
// whoever comes or goes.
const NewRoundRobin = ({ lobby, disabled }: Pick<Props, 'lobby' | 'disabled'>) => {
  const players = lobby.room?.players ?? []
  const [picks, setPicks] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [clock, setClock] = useState('3+2')
  const picked = (player: (typeof players)[number]) => picks.get(player.playerId) ?? player.connected
  const entrants = players.filter(picked).map(player => player.playerId)
  const sized = entrants.length >= 3 && entrants.length <= 8
  const toggle = (player: (typeof players)[number]) => setPicks(held => new Map(held).set(player.playerId, !picked(player)))
  return (
    <div className={styles.stack}>
      <h3>New round robin</h3>
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
      <div className={styles.picker}>
        <select aria-label="Round robin clock" value={clock} onChange={event => setClock(event.target.value)} disabled={disabled}>
          {Object.keys(CLOCKS).map(label => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" className={styles.primary} onClick={() => lobby.chess.createRoundRobin(entrants, CLOCKS[clock])} disabled={disabled || !sized}>
          Start a round robin
        </button>
      </div>
      {!sized && <p className={styles.muted}>Pick 3 to 8 players</p>}
    </div>
  )
}

// Asked for on arriving, then kept current by each one every member hears.
const RoundRobins = ({ lobby, disabled, busy }: Props) => {
  const { roundRobins, loadRoundRobins } = lobby.chess
  const unknown = roundRobins === null
  useEffect(() => {
    if (unknown && !disabled) loadRoundRobins()
  }, [unknown, disabled, loadRoundRobins])
  return (
    <section className={styles.section} aria-labelledby="lobby-round-robins">
      <h2 id="lobby-round-robins">Round robins</h2>
      {roundRobins === null ? (
        <p className={styles.muted}>Loading round robins…</p>
      ) : roundRobins.length === 0 ? (
        <p className={styles.muted}>No round robins yet</p>
      ) : (
        <ul className={styles.list}>
          {roundRobins.map(roundRobin => (
            <Entry key={roundRobin.roundRobinId} lobby={lobby} roundRobin={roundRobin} disabled={disabled} busy={busy} />
          ))}
        </ul>
      )}
      <button type="button" className={styles.link} onClick={loadRoundRobins} disabled={disabled} aria-label="Refresh round robins">
        Refresh
      </button>
      <NewRoundRobin lobby={lobby} disabled={disabled} />
    </section>
  )
}

export default RoundRobins
