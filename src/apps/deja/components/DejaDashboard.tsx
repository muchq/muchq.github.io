import { useEffect, useMemo } from 'react'
import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import AskIt from './AskIt'
import Counters from './Counters'
import DejaChart from './DejaChart'
import { OutcomeDot } from './OutcomeDot'
import Tape from './Tape'
import { curvePoints } from '../tape'
import { useDejaStream, type StreamDeps, type StreamStatus } from '../useDejaStream'

interface Props {
  onStatusChange: (status: StreamStatus) => void
  deps?: StreamDeps
}

// The live deja page (MoonBase#1150, Phase 4): the tape of scored
// requests, the learning curve and surprise strip over what it holds, the
// service's counters, and a way to ask the predictors directly.
const DejaDashboard = ({ onStatusChange, deps }: Props) => {
  const { tape, status, state } = useDejaStream(deps)
  useEffect(() => {
    onStatusChange(status)
  }, [status, onStatusChange])
  const points = useMemo(() => curvePoints(tape), [tape])

  return (
    <div className={styles.metricsGrid}>
      <Counters state={state} rows={tape.rows} />

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>The tape</h2>
        {tape.rows.length === 0 ? (
          <div className={styles.noData}>Waiting for the first scored request…</div>
        ) : (
          <Tape rows={tape.rows} />
        )}
      </div>

      <div className={styles.sectionGrid}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Learning curve</h2>
          <DejaChart points={points} keys={{ bigram: 'bigram', net: 'net' }} strokeWidth={2} />
        </div>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Surprise</h2>
          <DejaChart
            points={points}
            keys={{ bigram: 'surpriseBigram', net: 'surpriseNet' }}
            strokeWidth={1.5}
            dot={<OutcomeDot />}
            note="Dots are anomalies and novelties; click one, or press Enter on it, to find its row."
          />
        </div>
      </div>

      <AskIt tokens={tape.tokens} />
    </div>
  )
}

export default DejaDashboard
