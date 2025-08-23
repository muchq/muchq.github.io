import { Link } from 'react-router-dom'
import styles from './PartyNavigation.module.css'

const PartyNavigation = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Rescue Party</Link>
      </div>
    </nav>
  )
}

export default PartyNavigation