import { Link } from 'react-router-dom'
import styles from './PosterizeNavigation.module.css'

interface PosterizeNavigationProps {
  className?: string
}

const PosterizeNavigation = ({ className }: PosterizeNavigationProps) => {
  return (
    <nav className={`${styles.nav} ${className || ''}`}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ : Posterize</Link>
        <div className={styles.centerContent}>
          <div className={styles.tagline}>
            Blur your images with ease
          </div>
        </div>
      </div>
    </nav>
  )
}

export default PosterizeNavigation