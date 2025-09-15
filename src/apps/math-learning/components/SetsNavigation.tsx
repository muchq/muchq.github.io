import { Link } from 'react-router-dom'
import styles from './SetsNavigation.module.css'

const SetsNavigation = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Sets</Link>
      </div>
    </nav>
  )
}

export default SetsNavigation