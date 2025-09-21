import { Link } from 'react-router-dom'
import styles from './WordchainsNavigation.module.css'

const WordchainsNavigation = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Wordchains</Link>
        <div className={styles.centerContent}>
          <div className={styles.tagline}>
            Word Chain Solver
          </div>
        </div>
      </div>
    </nav>
  )
}

export default WordchainsNavigation