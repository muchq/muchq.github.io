import { useEffect, useRef, useState } from 'react'
import Navigation from '@/shared/components/Navigation'
import NavTagline from '@/shared/components/nav/NavTagline'
import { startPuzzle } from '../solo/api'
import { DIFFICULTIES, LENGTHS, type Length, type Mode, type Puzzle } from '../solo/contract'
import SoloRound, { Numbers } from '../solo/SoloRound'
import styles from '../solo/SoloWordchains.module.css'

const MODES = {
  quick: { title: 'Quick Play', description: 'A random puzzle at your own pace.', icon: '⇄' },
  daily: { title: 'Daily Challenge', description: 'A new puzzle each day for each difficulty.', icon: '□' },
  sprint: { title: 'Time Attack', description: 'Solve as many puzzles as you can before time runs out.', icon: '◷' },
} satisfies Record<Mode, { title: string; description: string; icon: string }>

const MODE_OPTIONS: Mode[] = ['quick', 'daily', 'sprint']

interface Game {
  id: number
  mode: Mode
  length: Length
  puzzle: Puzzle
  startedAt: number
}

const WordchainsPage = () => {
  const [mode, setMode] = useState<Mode>('quick')
  const [length, setLength] = useState<Length>(4)
  const [starting, setStarting] = useState(false)
  const pending = useRef<AbortController | null>(null)
  const [error, setError] = useState('')
  const [game, setGame] = useState<Game | null>(null)
  const [stats, setStats] = useState({ solved: 0, optimal: 0, points: 0 })
  const gameId = useRef(0)
  const title = useRef<HTMLHeadingElement>(null)

  useEffect(() => () => pending.current?.abort(), [])

  useEffect(() => {
    if (!game && gameId.current > 0) title.current?.focus()
  }, [game])

  const play = async () => {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setStarting(true)
    setError('')
    try {
      const puzzle = await startPuzzle(mode, length, controller.signal)
      if (!controller.signal.aborted) setGame({ id: ++gameId.current, mode, length, puzzle, startedAt: Date.now() })
    } catch {
      if (!controller.signal.aborted) setError('Could not start a puzzle. Try again.')
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null
        setStarting(false)
      }
    }
  }

  const menu = () => {
    pending.current?.abort()
    pending.current = null
    setStarting(false)
    setError('')
    setGame(null)
  }

  return (
    <div className={styles.shell}>
      <Navigation appName="Wordchains" context={<NavTagline text="Single player" />} />
      <main className={`${styles.main} ${game ? styles.playing : ''}`}>
        <header className={styles.header}>
          <h1 ref={title} tabIndex={-1}>Word Chains</h1>
          <p>{game ? MODES[game.mode].title : 'Change one letter at a time.'}</p>
        </header>
        {error && <p role="alert" className={styles.feedback}>{error}</p>}
        {game ? (
          <SoloRound key={game.id} length={game.length} mode={game.mode}
            firstPuzzle={game.puzzle} startedAt={game.startedAt} onReplay={play} onMenu={menu} starting={starting}
            onSolved={(points, optimal) => setStats(previous => ({
              solved: previous.solved + 1,
              optimal: previous.optimal + Number(optimal),
              points: previous.points + points,
            }))} />
        ) : (
          <div className={styles.menu}>
            <div className={styles.card}>
              <fieldset disabled={starting}>
                <legend>Game mode</legend>
                <div className={styles.modes}>
                  {MODE_OPTIONS.map(value => (
                    <label className={styles.choice} key={value}>
                      <input type="radio" name="solo-mode" checked={mode === value} onChange={() => setMode(value)} />
                      <span className={styles.modeIcon} aria-hidden="true">{MODES[value].icon}</span>
                      <span>
                        <strong>{MODES[value].title}</strong>
                        <small>{MODES[value].description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset disabled={starting}>
                <legend>Difficulty</legend>
                <div className={styles.difficulties}>
                  {LENGTHS.map(value => (
                    <label className={styles.choice} key={value}>
                      <input type="radio" name="solo-difficulty" checked={length === value} onChange={() => setLength(value)} />
                      <span><strong>{DIFFICULTIES[value].label}</strong><small>{value} letters</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button className={styles.primary} type="button" onClick={play} disabled={starting}>
                {starting ? 'Starting…' : 'Play'}
              </button>
            </div>
            <aside className={`${styles.card} ${styles.stats}`} aria-label="Session stats">
              <h2>Stats</h2>
              <Numbers items={[['Solved', stats.solved], ['Optimal', stats.optimal], ['Score', stats.points]]} />
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

export default WordchainsPage
