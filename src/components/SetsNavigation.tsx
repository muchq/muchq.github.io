import { Link } from 'react-router-dom'
import styles from './SetsNavigation.module.css'

const SetsNavigation = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>
          MuchQ
        </Link>
        <div className={styles.navCenter}>
          <span className={styles.navPath}>
            Interests {'>'} Math {'>'} Sets
          </span>
        </div>
        <div className={styles.navRight}>
          <Link to="/groups" className={styles.navLink}>
            Groups
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default SetsNavigation