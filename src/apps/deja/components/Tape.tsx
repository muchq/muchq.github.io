import styles from './Deja.module.css'
import ProbBars from './ProbBars'
import { displayToken } from '../displayToken'
import { OUTCOME_BLURB, OUTCOME_ORDER, TAPE_BOUND_NOTE } from '../outcomes'
import { rowId } from '../rows'
import type { TapeRow } from '../tape'

const TOP = 2

// The oldest of the context's tokens is the faintest.
const ageOpacity = (index: number, count: number) => 0.35 + (0.65 * (index + 1)) / count

const OutcomeLegend = () => (
  <div className={styles.legendBlock}>
    <ul className={styles.legend} aria-label="Outcome key">
      {OUTCOME_ORDER.map((outcome) => (
        <li
          key={outcome}
          data-outcome={outcome}
          title={OUTCOME_BLURB[outcome]}
          className={`${styles.legendItem} ${styles[outcome]}`}
        >
          <span className={styles.legendSwatch} aria-hidden="true" />
          <span className={styles.legendLabel}>{outcome}</span>
          <span className={styles.legendBlurb}>{OUTCOME_BLURB[outcome]}</span>
        </li>
      ))}
    </ul>
    <p className={styles.tapeBound}>{TAPE_BOUND_NOTE}</p>
  </div>
)

const Tape = ({ rows }: { rows: TapeRow[] }) => (
  <div className={styles.tapeBlock}>
    <OutcomeLegend />
    <ol className={styles.tape} aria-label="Scored requests">
      <li className={`${styles.row} ${styles.head}`} aria-hidden="true">
        <span>outcome</span>
        <span>seq</span>
        <span>context</span>
        <span>bigram</span>
        <span>net</span>
        <span>actual</span>
      </li>
      {rows.map(({ event, outcome }) => (
        <li
          key={event.seq}
          id={rowId(event.seq)}
          data-outcome={outcome}
          className={`${styles.row} ${styles[outcome]}`}
          aria-label={`${outcome}, sequence ${event.seq}`}
        >
          <span data-testid="outcome" className={styles.outcome}>
            {outcome}
          </span>
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
                {displayToken(token)}
              </span>
            ))}
          </span>
          <span data-testid="bigram" data-label="bigram" className={styles.pred}>
            <ProbBars predictions={event.predictions.bigram} limit={TOP} actual={event.actual} />
          </span>
          <span data-testid="net" data-label="net" className={styles.pred}>
            <ProbBars predictions={event.predictions.net} limit={TOP} actual={event.actual} />
          </span>
          <span data-testid="actual" className={styles.actual} title={event.actual}>
            {displayToken(event.actual)}
          </span>
        </li>
      ))}
    </ol>
  </div>
)

export default Tape
