import { useId, useState } from 'react'
import { checkAnswer, formatAnswer } from '../problems/answers'
import type { Problem } from '../problems/types'
import AnswerInput from './AnswerInput'
import styles from './Groups.module.css'

interface ProblemCardProps {
  problem: Problem
  /** e.g. "5.3" */
  number: string
  solved: boolean
  onSolvedChange: (solved: boolean) => void
}

/**
 * One exercise. Computational problems check themselves; proofs are
 * written on paper, compared with the model solution, and marked done by
 * the reader.
 */
const ProblemCard = ({ problem, number, solved, onSolvedChange }: ProblemCardProps) => {
  const headingId = useId()
  const [value, setValue] = useState('')
  const [verdict, setVerdict] = useState<'right' | 'wrong' | null>(null)

  const check = () => {
    if (problem.kind !== 'answer' || value.trim() === '') return
    const right = checkAnswer(problem.answer, value)
    setVerdict(right ? 'right' : 'wrong')
    if (right && !solved) onSolvedChange(true)
  }

  return (
    <article className={styles.problem} aria-labelledby={headingId}>
      <header className={styles.problemHeader}>
        <h3 id={headingId}>Problem {number}</h3>
        <span className={styles.tag}>{problem.kind === 'proof' ? 'Proof' : 'Compute'}</span>
        {solved && <span className={`${styles.tag} ${styles.solvedTag}`}>✓ Solved</span>}
      </header>
      <div className={styles.prompt}>{problem.prompt}</div>

      {problem.kind === 'answer' && (
        <div className={styles.answerRow}>
          <AnswerInput
            label={`Answer to problem ${number}`}
            answer={problem.answer}
            value={value}
            onChange={v => {
              setValue(v)
              setVerdict(null)
            }}
            onSubmit={check}
          />
          <button type="button" className={styles.button} onClick={check} disabled={value.trim() === ''}>
            Check
          </button>
        </div>
      )}
      <p role="status" className={verdict === 'right' ? styles.right : styles.wrong}>
        {verdict === 'right' ? 'Correct.' : verdict === 'wrong' ? 'Not quite — try again, or open the hint.' : ''}
      </p>

      {problem.hint && (
        <details className={styles.hint}>
          <summary>Hint</summary>
          <div>{problem.hint}</div>
        </details>
      )}
      <details className={styles.solution}>
        <summary>Solution</summary>
        <div>
          {problem.kind === 'answer' && (
            <p>
              <strong>Answer:</strong> {formatAnswer(problem.answer)}
            </p>
          )}
          {problem.solution}
        </div>
      </details>
      {problem.kind === 'proof' && (
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => onSolvedChange(!solved)}>
          {solved ? 'Mark as not done' : 'Mark as done'}
        </button>
      )}
    </article>
  )
}

export default ProblemCard
