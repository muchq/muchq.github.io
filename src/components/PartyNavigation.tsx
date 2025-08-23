import { Link } from 'react-router-dom'
import styles from './PartyNavigation.module.css'

interface PartyNavigationProps {
  gameId: string | null
  playerId: string | null
  playerName: string | null
  isConnected: boolean
}

const PartyNavigation = ({ gameId, playerName, isConnected }: PartyNavigationProps) => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.homeLink}>Home</Link>
        <div className={styles.gameTitle}>🎉 Rescue Party 🎉</div>
        <div className={styles.status}>
          {isConnected && (
            <>
              <span className={styles.statusItem}>
                Game: {gameId || 'None'}
              </span>
              <span className={styles.statusItem}>
                Player: {playerName || 'Guest'}
              </span>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default PartyNavigation