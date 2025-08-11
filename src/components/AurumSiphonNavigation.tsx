import { Link } from 'react-router-dom'
import styles from './AurumSiphonNavigation.module.css'

interface AurumSiphonNavigationProps {
  playerId: string | null
}

const AurumSiphonNavigation = ({ playerId }: AurumSiphonNavigationProps) => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Aurum Siphon</Link>
        <div className={styles.centerContent}>
          {playerId && (
            <div className={styles.playerId}>
              Player: {playerId}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default AurumSiphonNavigation