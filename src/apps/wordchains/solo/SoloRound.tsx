import { useEffect, useRef, useState, type FormEvent } from 'react'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import { clockText, steps } from '../race'
import { playWord, requestHint, startPuzzle } from './api'
import { DIFFICULTIES, type Length, type Mode, type Puzzle, type Result } from './contract'
import styles from './SoloWordchains.module.css'

interface RoundProps {
  starting: boolean
  length: Length
  mode: Mode
  firstPuzzle: Puzzle
  startedAt: number
  onSolved: (points: number, optimal: boolean) => void
  onReplay: () => void
  onMenu: () => void
}

const CELEBRATION_MS = 800

export function Numbers({ items }: { items: [string, number | string][] }) {
  return (
    <dl className={styles.numbers}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Tiles({ word, previous, target = false }: { word: string; previous?: string; target?: boolean }) {
  return (
    <>
      <span className={styles.visuallyHidden}>{word}</span>
      <span className={styles.tiles} aria-hidden="true">
        {Array.from(word, (letter, index) => {
          const changed = previous !== undefined && letter !== previous[index]
          return (
            <span key={index} className={target ? styles.targetTile : changed ? styles.changedTile : undefined}>
              {letter.toUpperCase()}
            </span>
          )
        })}
      </span>
    </>
  )
}

export default function SoloRound({ starting, length, mode, firstPuzzle, startedAt, onSolved, onReplay, onMenu }: RoundProps) {
  const difficulty = DIFFICULTIES[length]
  const sprint = mode === 'sprint'
  const deadline = startedAt + difficulty.seconds * 1000
  const bestKey = `wordchains.timeAttackBest.${length}.${difficulty.seconds}s`
  const [previousBest] = useState(() => Number(safeLocalStorage.get(bestKey)) || 0)
  const [now, setNow] = useState(startedAt)
  const [puzzle, setPuzzle] = useState(firstPuzzle)
  const [chain, setChain] = useState([firstPuzzle.start])
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState('')
  const [sprintStats, setSprintStats] = useState({ solved: 0, points: 0 })
  const [advanceAt, setAdvanceAt] = useState<number | null>(null)
  const [advancingFailed, setAdvancingFailed] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const pending = useRef<AbortController | null>(null)
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const ladderRef = useRef<HTMLDivElement>(null)
  const moves = chain.length - 1
  const solved = result !== null
  const timeUp = sprint && now >= deadline
  const finished = timeUp || (!sprint && solved)
  const points = result?.points ?? 0
  const optimalSteps = result?.optimalSteps ?? 0

  useEffect(() => {
    if (!sprint || timeUp) return
    const timer = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [sprint, timeUp])

  useEffect(() => {
    if (advanceAt === null || timeUp) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const time = Date.now()
      setNow(time)
      if (time >= deadline) return
      try {
        const next = await startPuzzle('sprint', length, controller.signal)
        if (controller.signal.aborted) return
        if (Date.now() >= deadline) {
          setNow(Date.now())
          return
        }
        setPuzzle(next)
        setChain([next.start])
        setResult(null)
      } catch {
        if (controller.signal.aborted) return
        setAdvancingFailed(true)
      }
      setAdvanceAt(null)
    }, Math.max(0, advanceAt - Date.now()))
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [advanceAt, deadline, length, timeUp])

  useEffect(() => () => pending.current?.abort(), [])

  useEffect(() => {
    if (timeUp && sprintStats.points > (Number(safeLocalStorage.get(bestKey)) || 0)) {
      safeLocalStorage.set(bestKey, String(sprintStats.points))
    }
  }, [bestKey, sprintStats.points, timeUp])

  useEffect(() => {
    if (finished) resultRef.current?.focus()
    else inputRef.current?.focus({ preventScroll: true })
  }, [finished, puzzle])

  useEffect(() => {
    const ladder = ladderRef.current
    if (ladder) ladder.scrollTop = moves > 0 ? ladder.scrollHeight : 0
  }, [moves])

  const canPlay = () => {
    if (sprint && Date.now() >= deadline) {
      setNow(Date.now())
      return false
    }
    return !solved
  }

  const send = async (action: (signal: AbortSignal) => Promise<void>) => {
    if (pending.current || !canPlay()) return
    const controller = new AbortController()
    pending.current = controller
    setSending(true)
    setFeedback('')
    try {
      await action(controller.signal)
    } catch {
      if (!controller.signal.aborted) setFeedback('Could not reach Word Chains. Try again.')
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null
        setSending(false)
        inputRef.current?.focus({ preventScroll: true })
      }
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const word = draft.trim().toLowerCase()
    if (!word) return
    void send(async signal => {
      const move = await playWord(puzzle, chain, word, signal)
      if (signal.aborted || !canPlay()) return
      if (move.status === 'rejected') {
        setFeedback(move.feedback)
        return
      }

      setChain([...chain, word])
      setDraft('')
      if (move.status !== 'solved') return

      const { points, optimalSteps } = move.result
      setResult(move.result)
      onSolved(points, moves + 1 === optimalSteps)
      if (sprint) {
        setSprintStats(previous => ({ solved: previous.solved + 1, points: previous.points + points }))
        setAdvanceAt(Date.now() + CELEBRATION_MS)
      }
    })
  }

  const hint = () => {
    if (mode !== 'quick') return
    void send(async signal => {
      const { word } = await requestHint(puzzle, chain, signal)
      if (signal.aborted) return
      if (word) setDraft(word)
      else setFeedback('No unused route. Undo to try another path.')
    })
  }

  const undo = () => {
    if (pending.current || !canPlay() || moves === 0) return
    setChain(chain.slice(0, -1))
    setDraft('')
    setFeedback('')
    inputRef.current?.focus({ preventScroll: true })
  }

  if (finished) {
    const best = Math.max(previousBest, sprintStats.points)
    return (
      <section className={`${styles.card} ${styles.results}`} aria-labelledby="solo-result">
        <h2 ref={resultRef} tabIndex={-1} id="solo-result">
          {timeUp ? 'Time’s up' : moves === optimalSteps ? 'Optimal!' : moves === optimalSteps + 1 ? 'Great job!' : 'Complete!'}
        </h2>
        <p>{timeUp ? `${difficulty.label} · ${difficulty.seconds} seconds` : `${puzzle.start.toUpperCase()} → ${puzzle.target.toUpperCase()}`}</p>
        <Numbers items={timeUp
          ? [['Solved', sprintStats.solved], ['Points', sprintStats.points], ['Best', best]]
          : [['Steps', moves], ['Optimal', optimalSteps], ['Points', `+${points}`]]} />
        {timeUp && sprintStats.points > previousBest && <p className={styles.success}>New personal best!</p>}
        {!timeUp && <p className={styles.chainSummary}>{chain.join(' → ')}</p>}
        <div className={styles.actions}>
          <button className={styles.primary} type="button" onClick={onReplay} disabled={starting}>{starting ? 'Starting…' : mode === 'quick' ? 'New puzzle' : 'Play again'}</button>
          <button type="button" onClick={onMenu}>Back to menu</button>
        </div>
      </section>
    )
  }

  return (
    <section className={`${styles.card} ${styles.round}`} aria-labelledby="solo-puzzle">
      <div className={styles.roundTop}>
        <button type="button" onClick={onMenu}>‹ Menu</button>
        <span>{difficulty.label} · {length} letters</span>
        <span>{steps(moves)}</span>
      </div>
      <h2 id="solo-puzzle">{puzzle.start.toUpperCase()} <span>→</span> {puzzle.target.toUpperCase()}</h2>
      <div className={styles.ladder} ref={ladderRef}>
        <ol role="list" aria-label="Your chain">
          {chain.map((word, index) => (
            <li key={word}>
              <Tiles word={word} previous={chain[index - 1]} />
            </li>
          ))}
        </ol>
        {!solved && <div className={styles.goal}><Tiles word={puzzle.target} target /><span>Target</span></div>}
      </div>
      {sprint && <Numbers items={[['Time left', clockText(deadline - now)], ['Solved', sprintStats.solved], ['Points', sprintStats.points]]} />}
      <form className={styles.entry} onSubmit={submit}>
        <p role="status" className={solved ? styles.success : styles.feedback}>{feedback || (solved ? `Solved! +${points} points` : '')}</p>
        <div className={styles.entryRow}>
          <input ref={inputRef} aria-label="Next word" placeholder="Enter a word…" value={draft}
            autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" readOnly={solved || sending}
            onChange={event => { setDraft(event.target.value); setFeedback('') }} />
          <button type="submit" className={styles.primary} disabled={sending || solved || !draft.trim()}>Submit</button>
        </div>
        <div className={styles.tools}>
          {advancingFailed && <button type="button" onClick={() => {
            setAdvancingFailed(false)
            setAdvanceAt(Date.now())
          }}>Retry next puzzle</button>}
          <button type="button" onClick={undo} disabled={sending || moves === 0 || solved}>Undo</button>
          {mode === 'quick' && <button type="button" onClick={hint} disabled={sending}>Hint</button>}
        </div>
      </form>
    </section>
  )
}
