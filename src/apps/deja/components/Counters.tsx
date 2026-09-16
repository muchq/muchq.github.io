import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import own from './Deja.module.css'
import type { TapeRow } from '../tape'
import type { DejaState } from '../types'

const n = (value: number) => value.toLocaleString('en-US')

interface Props {
  state: DejaState | null
  rows: TapeRow[]
}

const Tile = ({ label, value, unit, testId, children }: { label: string; value: string; unit?: string; testId: string; children?: React.ReactNode }) => (
  <div className={styles.miniCard}>
    <div className={styles.miniLabel}>{label}</div>
    <div className={styles.miniValue} data-testid={testId}>
      {value}
    </div>
    {unit && <div className={styles.miniUnit}>{unit}</div>}
    {children}
  </div>
)

// The state's counters, refreshed on its cadence, alongside what the rows
// on this page show. Warmup progress stands in for the threshold until
// there is one.
const Counters = ({ state, rows }: Props) => {
  const onPage = (outcome: TapeRow['outcome']) => rows.filter((row) => row.outcome === outcome).length
  if (!state) {
    return (
      <section aria-label="Counters" className={styles.overviewCards}>
        <Tile label="Steps" value="…" testId="steps" />
      </section>
    )
  }
  return (
    <section aria-label="Counters" className={styles.overviewCards}>
      <Tile label="Steps" value={n(state.step)} testId="steps" />
      <Tile label="Vocabulary" value={`${n(state.vocab_size)} / ${n(state.vocab_cap)}`} testId="vocab" />
      <Tile label="Anomalies" value={n(state.anomalies)} unit={`${n(onPage('anomaly'))} on this page`} testId="anomalies" />
      <Tile label="Novelties" value={n(state.novelties)} unit={`${n(onPage('novel'))} on this page`} testId="novelties" />
      {state.threshold === null ? (
        <Tile label="Warmup" value={`${n(state.step)} / ${n(state.warmup_needed)}`} unit="scored steps" testId="warmup">
          <div
            className={own.progress}
            role="progressbar"
            aria-label="Warmup"
            aria-valuenow={state.step}
            aria-valuemin={0}
            aria-valuemax={state.warmup_needed}
          >
            <span className={own.progressFill} style={{ width: `${Math.min(100, (100 * state.step) / state.warmup_needed)}%` }} />
          </div>
        </Tile>
      ) : (
        <Tile label="Threshold" value={state.threshold.toFixed(2)} unit="nats of surprise" testId="threshold" />
      )}
    </section>
  )
}

export default Counters
