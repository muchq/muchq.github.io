import styles from './MetricsDashboard.module.css'

// Ghost chart shown while a widget's first fetch is in flight. Bar heights are
// fixed, not random: the placeholder is furniture, not data, so every widget
// should idle identically on every visit instead of inviting a read.
const BAR_HEIGHTS = [45, 70, 55, 80, 60, 88, 65, 50]

const ChartSkeleton = () => (
  <div className={styles.chartSkeleton} data-testid="chart-skeleton">
    {BAR_HEIGHTS.map((height, i) => (
      <div
        key={i}
        className={styles.skeletonBar}
        // Negative delays start each bar mid-cycle, so the wave is already
        // rolling on first paint instead of fading in from a dead stop.
        style={{ height: `${height}%`, animationDelay: `${(i * -0.18).toFixed(2)}s` }}
      />
    ))}
    {/* The bars are decorative; the words carry the state for screen readers
        and text queries. */}
    <span className={styles.srOnly}>Loading…</span>
  </div>
)

export default ChartSkeleton
