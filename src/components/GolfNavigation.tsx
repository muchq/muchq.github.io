import { Link } from 'react-router-dom'
import styles from './GolfNavigation.module.css'

interface GolfNavigationProps {
  gameId: string | null
  playerId: string | null
  playerName: string | null
  isConnected: boolean
}

const GolfNavigation = ({ gameId, playerId, playerName, isConnected }: GolfNavigationProps) => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Golf</Link>
        <div className={styles.centerContent}>
          {gameId && (
            <div className={styles.gameInfo}>
              Room: {gameId}
            </div>
          )}
          {playerName && (
            <div className={styles.playerId}>
              Player: {playerName}
            </div>
          )}
          <div className={styles.status}>
            <span className={`${styles.connectionDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default GolfNavigation