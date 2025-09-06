import { Link } from 'react-router-dom'
import styles from './ResilienceNavigation.module.css'

interface ResilienceNavigationProps {
  level?: string
  phase?: string
  currentRps?: number
  gamePhase?: 'setup' | 'running' | 'scaling'
  showGameInfo?: boolean
}

const ResilienceNavigation = ({ 
  level, 
  phase, 
  currentRps = 10,
  gamePhase = 'setup',
  showGameInfo = true
}: ResilienceNavigationProps) => {
  const getStatusText = () => {
    switch (gamePhase) {
      case 'setup': return 'Ready to Start'
      case 'running': return `Monitoring (${currentRps} RPS)`
      case 'scaling': return `Scaling Up (${currentRps} RPS)`
      default: return 'Ready'
    }
  }

  const getStatusClass = () => {
    switch (gamePhase) {
      case 'setup': return styles.setup
      case 'running': return styles.running
      case 'scaling': return styles.scaling
      default: return styles.setup
    }
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Resilience</Link>
        {showGameInfo && (
          <div className={styles.centerContent}>
            <div className={styles.levelInfo}>
              {phase} - {level}: "The Startup Launch"
            </div>
            <div className={styles.status}>
              <span className={`${styles.statusIndicator} ${getStatusClass()}`}></span>
              {getStatusText()}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default ResilienceNavigation