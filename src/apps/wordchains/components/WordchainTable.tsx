import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { WordchainTableActions } from '@/hooks/useWordchainTable'
import type { WordchainLetters, WordchainRunner, WordchainView } from '../wire'
import { clockText, describeResult, parSteps, steps, you } from '../race'
import felt from '@/apps/cards/felt.module.css'
import GameEnding from '@/apps/cards/GameEnding'
import AboutGame from '@/apps/lobby/components/AboutGame'
import VariantPicker from '@/apps/lobby/components/VariantPicker'
import styles from './WordchainTable.module.css'

// A word ladder race at a lobby table (MoonBase#1719): everyone climbs
// the same puzzle against one clock. Every rule is the hub's — it checks
// each word and refuses with a reason the lobby shows — so this only
// draws the view: the viewer's own ladder while racing, everyone else's
// as a count until the race is over.

export interface WordchainTableProps {
  playerId: string
  connected: boolean
  view: WordchainView
  table: WordchainTableActions & { opening: boolean; sending: boolean }
}

const LETTER_OPTIONS = [
  { value: '3', label: '3 letters' },
  { value: '4', label: '4 letters' },
  { value: '5', label: '5 letters' }
] as const

const TICK_MS = 250

// Time left against the hub's deadline, on this device's clock.
const RaceClock = ({ deadlineMs }: { deadlineMs: number }) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <span className={styles.clock}>{`${clockText(deadlineMs - now)} left`}</span>
  )
}

const WordchainTable = ({ playerId, connected, view, table }: WordchainTableProps) => {
  const { opening, sending } = table
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  const inputRef = useRef<HTMLInputElement>(null)

  const me = view.runners.find(runner => runner.playerId === playerId)
  const ladder = me?.ladder ?? []
  const finished = me?.finishedAtMs !== undefined
  const racing = view.phase === 'racing'
  const climbing = racing && me !== undefined && !finished
  const able = connected && !sending
  const lettersOf = (word: string | undefined) => String(word?.length ?? 4) as (typeof LETTER_OPTIONS)[number]['value']
  // The picker offers the last race's letters until someone picks others.
  const [letters, setLetters] = useState(() => lettersOf(view.start))

  // The word typed stays until the hub takes it, so a refused word can be
  // fixed rather than retyped; a rung added or taken back, or a new race,
  // clears it.
  const race = `${view.start}|${view.target}|${view.startedAtMs}`
  const [draft, setDraft] = useState('')
  const [held, setHeld] = useState({ race, rungs: ladder.length })
  if (held.race !== race || held.rungs !== ladder.length) {
    if (held.race !== race) setLetters(lettersOf(view.start))
    setHeld({ race, rungs: ladder.length })
    setDraft('')
  }
  // Focus follows the word box while climbing; when it goes (a finish or
  // the race's end), the heading takes focus rather than the page.
  const wasClimbing = useRef(climbing)
  useEffect(() => {
    if (climbing) inputRef.current?.focus()
    else if (wasClimbing.current) headingRef.current?.focus()
    wasClimbing.current = climbing
  }, [climbing, ladder.length])

  // Leaving mid-race gives the race up, so it is asked twice; staying puts
  // the button, and focus, back.
  const [confirmingLeave, setConfirmingLeave] = useState(false)
  if (confirmingLeave && !racing) setConfirmingLeave(false)
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

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const word = draft.trim().toLowerCase()
    if (word === '' || !able) return
    table.play(word)
  }

  const par = parSteps(view)
  const seated = view.runners.filter(runner => !runner.left).length
  const hint = (() => {
    if (view.phase === 'waiting') return seated < 2 ? 'Waiting for a second seat.' : `${seated} seated: start when everyone’s here.`
    if (climbing) return `One letter at a time, every rung a word: ${view.start} to ${view.target}.`
    if (racing && finished) return `You reached ${view.target} in ${steps(ladder.length)}. Waiting for the others.`
    if (view.phase === 'over') return 'Anyone can start the next race.'
    return ''
  })()

  const startPicker = (action: string) => (
    <VariantPicker
      label="Race"
      options={LETTER_OPTIONS}
      value={letters}
      onChange={setLetters}
      action={action}
      onAction={value => table.startTable(Number(value) as WordchainLetters)}
      disabled={!connected || seated < 2}
    />
  )

  const runnerLine = (runner: WordchainRunner) => {
    const status = runner.finishedAtMs !== undefined ? `finished in ${steps(runner.words)}` : steps(runner.words)
    return `${status}${runner.left ? ' · left' : ''}`
  }

  return (
    <div className={styles.table} data-phase={view.phase}>
      <div className={felt.tableHeader}>
        <h1 ref={headingRef} tabIndex={-1} className={felt.title}>
          Word chains · {view.gameId}
        </h1>
        <div className={felt.status}>
          <p className={felt.hint} role="status">
            {hint}
          </p>
        </div>
        {view.phase !== 'closed' &&
          (confirmingLeave ? (
            <span className={styles.confirm}>
              <button ref={confirmRef} type="button" className={felt.secondary} onClick={table.leaveTable} disabled={!connected}>
                Leave the race
              </button>
              <button
                type="button"
                className={felt.link}
                onClick={() => {
                  stayed.current = true
                  setConfirmingLeave(false)
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
              onClick={racing && me !== undefined ? () => setConfirmingLeave(true) : table.leaveTable}
              disabled={!connected}
            >
              Leave table
            </button>
          ))}
      </div>
      <p className={felt.ending} role="status">
        {view.result === undefined ? '' : describeResult(view.result, view, playerId)}
      </p>

      {view.start !== undefined && view.target !== undefined && (
        <section className={styles.puzzle} aria-label="puzzle">
          <span className={styles.word}>{view.start}</span>
          <span aria-hidden="true">→</span>
          <span className={styles.word}>{view.target}</span>
          {par !== undefined && <span className={felt.muted}>par {steps(par)}</span>}
          {racing && view.deadlineMs !== undefined && <RaceClock deadlineMs={view.deadlineMs} />}
        </section>
      )}

      {racing && me !== undefined && (
        <section className={styles.mine} aria-label="your ladder">
          <ol className={styles.ladder}>
            <li className={styles.rung}>{view.start}</li>
            {ladder.map((word, i) => (
              <li key={i} className={styles.rung}>
                {word}
              </li>
            ))}
          </ol>
          {climbing && (
            <form className={styles.play} onSubmit={submit}>
              <input
                ref={inputRef}
                className={styles.input}
                aria-label="next word"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                maxLength={view.start?.length}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
              <button type="submit" className={felt.primary} disabled={!able || draft.trim() === ''}>
                Play
              </button>
              <button type="button" className={felt.secondary} onClick={table.retract} disabled={!able || ladder.length === 0}>
                Take back
              </button>
            </form>
          )}
        </section>
      )}

      <table className={styles.board} aria-label="Runners">
        <thead>
          <tr>
            <th scope="col">Runner</th>
            <th scope="col">{view.phase === 'over' || view.phase === 'closed' ? 'Ladder' : 'Climbed'}</th>
            <th scope="col">Wins</th>
          </tr>
        </thead>
        <tbody>
          {view.runners.map(runner => (
            <tr key={runner.playerId} data-me={runner.playerId === playerId}>
              <th scope="row">{you(runner.playerId, playerId)}</th>
              <td>
                {runnerLine(runner)}
                {!racing && runner.ladder !== undefined && runner.ladder.length > 0 && (
                  <span className={styles.shown}>{[view.start, ...runner.ladder].join(' → ')}</span>
                )}
              </td>
              <td>{runner.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={felt.actions}>
        {view.phase === 'waiting' && (
          <>
            <AboutGame game="wordchain" className={felt.hint} />
            {startPicker('Start the race')}
          </>
        )}
        {view.phase === 'over' && startPicker('Next race')}
        {view.phase === 'closed' && <GameEnding onPlayAgain={table.playAgain} onBack={table.leaveTable} opening={opening} connected={connected} />}
      </div>
    </div>
  )
}

export default WordchainTable
