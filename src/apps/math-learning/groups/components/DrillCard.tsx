import { useState } from 'react'
import { checkAnswer, formatAnswer } from '../problems/answers'
import type { Drill, Rng } from '../problems/types'
import AnswerInput from './AnswerInput'
import styles from './Groups.module.css'

interface DrillCardProps {
  drill: Drill
  /** Injectable so tests get reproducible problems. */
  rng?: Rng
}

/** Endless practice: a fresh instance of the same computation on demand. */
const DrillCard = ({ drill, rng = Math.random }: DrillCardProps) => {
  const [item, setItem] = useState(() => drill.make(rng))
  const [value, setValue] = useState('')
  const [verdict, setVerdict] = useState<'right' | 'wrong' | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [streak, setStreak] = useState(0)

  const check = () => {
    if (value.trim() === '' || verdict === 'right') return
    const right = checkAnswer(item.answer, value)
    setVerdict(right ? 'right' : 'wrong')
    // A peek at the solution doesn't count toward the streak.
    setStreak(s => (right ? (revealed ? s : s + 1) : 0))
  }

  const next = () => {
    setItem(drill.make(rng))
    setValue('')
    setVerdict(null)
    setRevealed(false)
  }

  return (
    <article className={styles.drill} aria-label={`Drill: ${drill.title}`}>
      <header className={styles.problemHeader}>
        <h3>{drill.title}</h3>
        <span className={styles.tag} aria-label={`streak ${streak}`}>
          Streak {streak}
        </span>
      </header>
      <p className={styles.prompt}>{item.prompt}</p>
      <div className={styles.answerRow}>
        <AnswerInput
          answer={item.answer}
          value={value}
          onChange={v => {
            setValue(v)
            if (verdict === 'wrong') setVerdict(null)
          }}
          onSubmit={verdict === 'right' ? next : check}
        />
        {verdict === 'right' ? (
          <button type="button" className={styles.button} onClick={next}>
            Next
          </button>
        ) : (
          <button type="button" className={styles.button} onClick={check} disabled={value.trim() === ''}>
            Check
          </button>
        )}
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => setRevealed(r => !r)}>
          {revealed ? 'Hide solution' : 'Show solution'}
        </button>
        {verdict !== 'right' && (
          <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={next}>
            Skip
          </button>
        )}
      </div>
      <p role="status" className={verdict === 'right' ? styles.right : styles.wrong}>
        {verdict === 'right' ? 'Correct.' : verdict === 'wrong' ? 'Not quite.' : ''}
      </p>
      {revealed && (
        <div className={styles.drillSolution}>
          <p>
            <strong>Answer:</strong> {formatAnswer(item.answer)}
          </p>
          <p>{item.solution}</p>
        </div>
      )}
    </article>
  )
}

export default DrillCard
