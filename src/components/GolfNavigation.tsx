import { Link } from 'react-router-dom'
import styles from './GolfNavigation.module.css'

interface GolfNavigationProps {
  roomId: string | null
  gameId: string | null
  playerId: string | null
  playerName: string | null
  isConnected: boolean
}

const GolfNavigation = ({ roomId, gameId, playerName, isConnected }: GolfNavigationProps) => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Golf</Link>
        <div className={styles.centerContent}>
          {roomId && (
            <div className={styles.gameInfo}>
              Room: {roomId}
            </div>
          )}
          {gameId && (
            <div className={styles.gameInfo}>
              Game: {gameId}
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