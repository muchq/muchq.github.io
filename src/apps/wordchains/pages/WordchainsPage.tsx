import { useEffect, useRef, useState } from 'react'
import Navigation from '@/shared/components/Navigation'
import NavTagline from '@/shared/components/nav/NavTagline'
import { loadDictionary } from '../solo/dictionary'
import { DIFFICULTIES, LENGTHS, makePuzzle, type Dictionary, type Length, type Mode, type Puzzle } from '../solo/puzzles'
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
  const [dictionary, setDictionary] = useState<Dictionary | null>(null)
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  const [game, setGame] = useState<Game | null>(null)
  const [stats, setStats] = useState({ solved: 0, optimal: 0, points: 0 })
  const gameId = useRef(0)
  const title = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    let active = true
    loadDictionary().then(
      loaded => { if (active) setDictionary(loaded) },
      () => { if (active) setError('Could not load the dictionary.') },
    )
    return () => { active = false }
  }, [retry])

  useEffect(() => {
    if (!game && gameId.current > 0) title.current?.focus()
  }, [game])

  const play = () => {
    if (!dictionary) return
    const puzzle = makePuzzle(dictionary, mode, length)
    if (!puzzle) {
      setGame(null)
      setError('Could not find a puzzle. Try again.')
      return
    }
    setError('')
    setGame({ id: ++gameId.current, mode, length, puzzle, startedAt: Date.now() })
  }

  return (
    <div className={styles.shell}>
      <Navigation appName="Wordchains" context={<NavTagline text="Single player" />} />
      <main className={`${styles.main} ${game ? styles.playing : ''}`}>
        <header className={styles.header}>
          <h1 ref={title} tabIndex={-1}>Word Chains</h1>
          <p>{game ? MODES[game.mode].title : 'Change one letter at a time.'}</p>
        </header>
        {game && dictionary ? (
          <SoloRound key={game.id} dictionary={dictionary} length={game.length} mode={game.mode}
            firstPuzzle={game.puzzle} startedAt={game.startedAt} onReplay={play} onMenu={() => setGame(null)}
            onSolved={(points, optimal) => setStats(previous => ({
              solved: previous.solved + 1,
              optimal: previous.optimal + Number(optimal),
              points: previous.points + points,
            }))} />
        ) : (
          <div className={styles.menu}>
            <div className={styles.card}>
              <fieldset>
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
              <fieldset>
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
              <button className={styles.primary} type="button" onClick={play} disabled={!dictionary}>
                {dictionary || error ? 'Play' : 'Loading dictionary…'}
              </button>
              {error && <p role="alert" className={styles.feedback}>{error}</p>}
              {error && !dictionary && <button type="button" onClick={() => { setError(''); setRetry(value => value + 1) }}>Retry</button>}
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
