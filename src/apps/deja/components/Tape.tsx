import { memo } from 'react'
import styles from './Deja.module.css'
import ProbBars from './ProbBars'
import { displayToken } from '@/utils/displayToken'
import { OUTCOME_BLURB, OUTCOME_ORDER, TAPE_BOUND_NOTE } from '../outcomes'
import { rowId } from '../rows'
import type { TapeRow } from '../tape'

const TOP = 2

const COLUMNS = ['outcome', 'seq', 'context', 'bigram', 'net', 'actual']

// The oldest of the context's tokens is the faintest, and still readable.
const ageOpacity = (index: number, count: number) => 0.6 + (0.4 * (index + 1)) / count

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

// The reducer hands back the row objects it already holds, so a row renders
// again only when its own event changes — which an applied event never does.
export const Row = memo(({ row: { event, outcome } }: { row: TapeRow }) => (
  <div id={rowId(event.seq)} role="row" data-outcome={outcome} className={`${styles.row} ${styles[outcome]}`}>
    <span role="cell" data-testid="outcome" className={styles.outcome}>
      {outcome}
    </span>
    <span role="cell" className={styles.seq}>
      #{event.seq}
    </span>
    <span role="cell" className={styles.chips}>
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
    <span role="cell" data-testid="bigram" data-label="bigram" className={styles.pred}>
      <ProbBars predictions={event.predictions.bigram} limit={TOP} actual={event.actual} />
    </span>
    <span role="cell" data-testid="net" data-label="net" className={styles.pred}>
      <ProbBars predictions={event.predictions.net} limit={TOP} actual={event.actual} />
    </span>
    <span role="cell" data-testid="actual" className={styles.actual} title={event.actual}>
      {displayToken(event.actual)}
    </span>
  </div>
))

Row.displayName = 'Row'

// A table: the column names reach a screen reader as the headers of the
// cells under them, rather than as a stray line of six words.
const Tape = ({ rows }: { rows: TapeRow[] }) => (
  <div className={styles.tapeBlock}>
    <OutcomeLegend />
    <div className={styles.tape} role="table" aria-label="Scored requests">
      <div role="row" className={`${styles.row} ${styles.head}`}>
        {COLUMNS.map((column) => (
          <span key={column} role="columnheader">
            {column}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <Row key={row.event.seq} row={row} />
      ))}
    </div>
  </div>
)

export default Tape
