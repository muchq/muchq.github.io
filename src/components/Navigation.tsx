import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Navigation.module.css'

interface NavigationProps {
  className?: string
}

const Navigation = ({ className }: NavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <nav className={`${styles.nav} ${className || ''}`}>
      <div className={`${styles.navContainer} nav-container`}>
        <Link to="/" className={`${styles.navLogo} nav-logo`}>MuchQ</Link>
        <ul className={`${styles.navMenu} ${isMobileMenuOpen ? styles.active : ''}`}>
          <li className={`${styles.navItem} nav-item`}>
            <a href="#" className={styles.navLink}>Projects</a>
            <div className={styles.dropdown}>
              <a href="#" className={styles.dropdownItem}>Web Apps</a>
              <a href="#" className={styles.dropdownItem}>Open Source</a>
              <a href="#" className={styles.dropdownItem}>Graphics</a>
            </div>
          </li>
          <li className={`${styles.navItem} nav-item`}>
            <a href="#" className={styles.navLink}>Interests</a>
            <div className={styles.dropdown}>
              <a href="#" className={styles.dropdownItem}>Music</a>
              <a href="#" className={styles.dropdownItem}>Math</a>
              <a href="#" className={styles.dropdownItem}>Chess</a>
              <a href="#" className={styles.dropdownItem}>Space</a>
            </div>
          </li>
          <li className={`${styles.navItem} nav-item`}>
            <a href="#" className={styles.navLink}>Blog</a>
          </li>
          <li className={`${styles.navItem} nav-item`}>
            <Link to="/thoughts" className={styles.navLink}>Thoughts</Link>
          </li>
          {/* <li className={`${styles.navItem} nav-item`}>
            <a href="#" className={styles.navLink}>Resume</a>
          </li> */}
        </ul>
        <button 
          className={styles.mobileMenuToggle}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          ☰
        </button>
      </div>
    </nav>
  )
}

export default Navigation