import styles from './Deja.module.css'
import ProbBars from './ProbBars'
import { rowId } from '../rows'
import type { TapeRow } from '../tape'

const TOP = 3

// The oldest of the context's tokens is the faintest.
const ageOpacity = (index: number, count: number) => 0.35 + (0.65 * (index + 1)) / count

const Tape = ({ rows }: { rows: TapeRow[] }) => (
  <ol className={styles.tape} aria-label="Scored requests">
    <li className={`${styles.row} ${styles.head}`} aria-hidden="true">
      <span>seq</span>
      <span>context</span>
      <span>bigram</span>
      <span>net</span>
      <span>actual</span>
    </li>
    {rows.map(({ event, outcome }) => (
      <li key={event.seq} id={rowId(event.seq)} data-outcome={outcome} className={`${styles.row} ${styles[outcome]}`}>
        <span className={styles.seq}>#{event.seq}</span>
        <span className={styles.chips}>
          {event.context.map((token, i) => (
            <span
              key={i}
              data-testid="chip"
              className={styles.chip}
              style={{ opacity: ageOpacity(i, event.context.length) }}
              title={token}
            >
              {token}
            </span>
          ))}
        </span>
        <span data-testid="bigram">
          <ProbBars predictions={event.predictions.bigram} limit={TOP} actual={event.actual} />
        </span>
        <span data-testid="net">
          <ProbBars predictions={event.predictions.net} limit={TOP} actual={event.actual} />
        </span>
        <span data-testid="actual" className={styles.actual}>
          {event.actual}
        </span>
      </li>
    ))}
  </ol>
)

export default Tape
