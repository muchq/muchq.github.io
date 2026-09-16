import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import styles from './Deja.module.css'
import { scrollToRow } from '../rows'
import { hasNet, type CurvePoint } from '../tape'

const MARK: Partial<Record<CurvePoint['outcome'], string>> = { anomaly: '#ff6b6b', novel: '#b388ff' }

// A dot only where the verdict was anomaly or novel; clicking one scrolls
// the tape to that row.
const OutcomeDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: CurvePoint }) => {
  const colour = payload && MARK[payload.outcome]
  if (!payload || !colour || cx === undefined || cy === undefined) return <g key={payload?.seq} />
  return (
    <circle
      key={payload.seq}
      className={styles.dot}
      cx={cx}
      cy={cy}
      r={4}
      fill={colour}
      stroke="none"
      onClick={() => scrollToRow(payload.seq)}
    />
  )
}

const axis = { stroke: '#888', fontSize: 10 }
const tooltip = {
  contentStyle: { background: '#1a1f35', border: '1px solid rgba(102, 182, 255, 0.3)', fontSize: 12 },
}

// Per-event surprise against the threshold, anomalies and novelties marked.
const SurpriseStrip = ({ points }: { points: CurvePoint[] }) => (
  <div className={styles.chart}>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points}>
        <XAxis dataKey="seq" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={40} />
        <Tooltip {...tooltip} />
        <Line dataKey="threshold" name="threshold" stroke="#ff6b6b" strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
        <Line dataKey="surpriseBigram" name="bigram" stroke="#66b6ff" strokeWidth={1.5} dot={OutcomeDot} activeDot={false} isAnimationActive={false} />
        {hasNet(points) && (
          <Line dataKey="surpriseNet" name="net" stroke="#b388ff" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
    <p className={styles.chartNote}>Dots are anomalies and novelties; click one to find its row.</p>
  </div>
)

export default SurpriseStrip
