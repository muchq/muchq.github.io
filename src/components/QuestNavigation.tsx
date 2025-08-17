import { Link } from 'react-router-dom'
import styles from './QuestNavigation.module.css'

interface QuestNavigationProps {
  score: number
  level: string
  gameStarted: boolean
}

const QuestNavigation = ({ 
  score, 
  level, 
  gameStarted 
}: QuestNavigationProps) => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Quest</Link>
        <div className={styles.centerContent}>
          {gameStarted && (
            <>
              <div className={styles.gameInfo}>
                Level: {level}
              </div>
              <div className={styles.score}>
                Score: {score.toLocaleString()}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default QuestNavigation