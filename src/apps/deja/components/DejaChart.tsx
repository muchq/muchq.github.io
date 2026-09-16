import type { ReactElement, SVGProps } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import styles from './Deja.module.css'
import { hasNet, type CurvePoint } from '../tape'

const axis = { stroke: '#888', fontSize: 10 }
const tooltip = {
  contentStyle: { background: '#1a1f35', border: '1px solid rgba(102, 182, 255, 0.3)', fontSize: 12 },
}

interface Props {
  points: CurvePoint[]
  // Which numbers on the point each predictor's line draws: the learning
  // curve reads the EWMA losses, the surprise strip the per-event surprises.
  keys: { bigram: keyof CurvePoint; net: keyof CurvePoint }
  strokeWidth: number
  dot?: ReactElement<SVGProps<SVGElement>> | false
  note?: string
}

// Both of the page's charts: a predictor line each over the events held,
// the threshold behind them. The net's line appears with its first
// non-null loss, so neither chart draws a line along the floor until then.
const DejaChart = ({ points, keys, strokeWidth, dot = false, note }: Props) => (
  <div className={styles.chart}>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points}>
        <XAxis dataKey="seq" {...axis} interval="preserveStartEnd" />
        <YAxis {...axis} width={40} />
        <Tooltip {...tooltip} />
        <Line
          dataKey="threshold"
          name="threshold"
          stroke="#ff6b6b"
          strokeDasharray="4 4"
          strokeWidth={1}
          dot={false}
          isAnimationActive={false}
        />
        <Line
          dataKey={keys.bigram}
          name="bigram"
          stroke="#66b6ff"
          strokeWidth={strokeWidth}
          dot={dot}
          // A marked dot says something; recharts' hover dot would cover it.
          activeDot={dot === false ? undefined : false}
          isAnimationActive={false}
        />
        {hasNet(points) && (
          <Line
            dataKey={keys.net}
            name="net"
            stroke="#b388ff"
            strokeWidth={strokeWidth}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
    {note && <p className={styles.chartNote}>{note}</p>}
  </div>
)

export default DejaChart
