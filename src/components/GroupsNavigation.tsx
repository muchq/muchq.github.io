import { Link } from 'react-router-dom'
import styles from './GroupsNavigation.module.css'

const GroupsNavigation = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Groups</Link>
      </div>
    </nav>
  )
}

export default GroupsNavigation