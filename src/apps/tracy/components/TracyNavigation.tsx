import { Link } from 'react-router-dom'
import styles from './TracyNavigation.module.css'

const TracyNavigation = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Tracy</Link>
        <div className={styles.centerContent}>
          <div className={styles.tagline}>
            Ray Tracer
          </div>
        </div>
      </div>
    </nav>
  )
}

export default TracyNavigation