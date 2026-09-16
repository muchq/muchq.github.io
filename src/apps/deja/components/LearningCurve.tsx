import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import styles from './Deja.module.css'
import { hasNet, type CurvePoint } from '../tape'

const axis = { stroke: '#888', fontSize: 10 }
const tooltip = {
  contentStyle: { background: '#1a1f35', border: '1px solid rgba(102, 182, 255, 0.3)', fontSize: 12 },
}

// Each predictor's EWMA loss over the events held, the threshold behind
// them. The net's line appears with its first non-null loss.
const LearningCurve = ({ points }: { points: CurvePoint[] }) => (
  <div className={styles.chart}>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points}>
        <XAxis dataKey="seq" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={40} />
        <Tooltip {...tooltip} />
        <Line dataKey="threshold" name="threshold" stroke="#ff6b6b" strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
        <Line dataKey="bigram" name="bigram" stroke="#66b6ff" strokeWidth={2} dot={false} isAnimationActive={false} />
        {hasNet(points) && (
          <Line dataKey="net" name="net" stroke="#b388ff" strokeWidth={2} dot={false} isAnimationActive={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  </div>
)

export default LearningCurve
