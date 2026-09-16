import styles from './Deja.module.css'
import type { Prediction } from '../types'

interface Props {
  // Null is a predictor that is not there yet, and reads as a dash;
  // empty is a row the predictor has never seen.
  predictions: Prediction[] | null
  limit: number
  actual?: string
}

// A predictor's likeliest next tokens as horizontal bars, likeliest first.
const ProbBars = ({ predictions, limit, actual }: Props) => {
  if (predictions === null) return <span className={styles.none}>—</span>
  if (predictions.length === 0) return <span className={styles.none}>unseen</span>
  return (
    <div className={styles.bars}>
      {predictions.slice(0, limit).map((p) => (
        <div key={p.token} className={`${styles.barRow} ${p.token === actual ? styles.barHit : ''}`} title={p.token}>
          <span className={styles.barLabel}>{p.token}</span>
          <span className={styles.barTrack}>
            <span
              role="meter"
              aria-label={p.token}
              aria-valuenow={p.p}
              aria-valuemin={0}
              aria-valuemax={1}
              className={styles.bar}
              style={{ width: `${Math.round(p.p * 100)}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  )
}

export default ProbBars
