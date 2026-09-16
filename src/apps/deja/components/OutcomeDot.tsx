import styles from './Deja.module.css'
import { scrollToRow } from '../rows'
import type { CurvePoint } from '../tape'

const MARK: Partial<Record<CurvePoint['outcome'], string>> = { anomaly: '#ff6b6b', novel: '#b388ff' }

// A dot only where the verdict was anomaly or novel, and a control rather
// than a decoration: it finds that event's row by pointer or by keyboard.
// Recharts clones this element once per point with cx, cy and the point.
export const OutcomeDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: CurvePoint }) => {
  const colour = payload && MARK[payload.outcome]
  if (!payload || !colour || cx === undefined || cy === undefined) return <g />
  const find = () => scrollToRow(payload.seq)
  return (
    <circle
      className={styles.dot}
      cx={cx}
      cy={cy}
      r={4}
      fill={colour}
      stroke="none"
      role="button"
      tabIndex={0}
      aria-label={`${payload.outcome} at #${payload.seq}`}
      onClick={find}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        find()
      }}
    />
  )
}
