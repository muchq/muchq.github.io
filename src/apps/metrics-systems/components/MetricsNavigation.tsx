import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './MetricsNavigation.module.css'

const metricsFacts = [
  "Metrics reveal system health patterns.",
  "Real-time data drives better decisions.",
  "Performance monitoring prevents issues.",
  "Observability is the key to reliability.",
  "Data tells the story of your system.",
  "Metrics are the heartbeat of software."
]

interface MetricsNavigationProps {
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'failed'
  onReconnect?: () => void
}

const MetricsNavigation = ({ connectionStatus = 'disconnected', onReconnect }: MetricsNavigationProps) => {
  const [currentFactIndex, setCurrentFactIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Start by fading in the first fact after a short delay
    const initialTimeout = setTimeout(() => {
      setIsVisible(true)
    }, 4000)

    // Then set up the rotation interval
    const interval = setInterval(() => {
      // Fade out (takes 5 seconds)
      setIsVisible(false)
      
      // After fade out completes, change fact and fade in
      setTimeout(() => {
        setCurrentFactIndex((prevIndex) => (prevIndex + 1) % metricsFacts.length)
        setIsVisible(true)
      }, 10000) // Wait 5 seconds for fade out to complete
    }, 28000) // Total cycle: 10s visible + 5s fade out + 5s fade in = 20s

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [])

  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Metrics</Link>
        <div className={styles.centerContent}>
          <div className={styles.factsRow}>
            <div className={`${styles.fact} ${isVisible ? styles.visible : ''}`}>
              {metricsFacts[currentFactIndex]}
            </div>
            <div className={styles.connectionStatus}>
              {connectionStatus === 'connecting' && <span className={styles.connecting}>Connecting to metrics API...</span>}
              {connectionStatus === 'connected' && <span className={styles.connected}>Live Data</span>}
              {connectionStatus === 'disconnected' && (
                <>
                  <span className={styles.disconnected}>Offline</span>
                  {onReconnect && (
                    <button className={styles.reconnectButton} onClick={onReconnect} title="Reconnect">
                      🔄
                    </button>
                  )}
                </>
              )}
              {connectionStatus === 'failed' && (
                <>
                  <span className={styles.failed}>API Unavailable</span>
                  {onReconnect && (
                    <button className={styles.reconnectButton} onClick={onReconnect} title="Try Reconnect">
                      🔄
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default MetricsNavigation