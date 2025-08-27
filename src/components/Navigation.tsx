import { useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './Navigation.module.css'

interface NavigationProps {
  className?: string
}

const Navigation = ({ className }: NavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const toggleAccordion = (itemName: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemName)) {
        newSet.delete(itemName)
      } else {
        newSet.add(itemName)
      }
      return newSet
    })
  }

  return (
    <nav className={`${styles.nav} ${className || ''}`}>
      <div className={`${styles.navContainer} nav-container`}>
        <Link to="/" className={`${styles.navLogo} nav-logo`}>MuchQ</Link>
        <ul className={`${styles.navMenu} ${isMobileMenuOpen ? styles.active : ''}`}>
          <li className={`${styles.navItem} nav-item ${expandedItems.has('projects') ? styles.expanded : ''}`}>
            <a
              href="#"
              className={styles.navLink}
              onClick={(e) => {
                if (window.innerWidth <= 768) {
                  e.preventDefault()
                  toggleAccordion('projects')
                }
              }}
            >
              Projects
              <span className={styles.accordionIcon}>›</span>
            </a>
            <div className={styles.dropdown}>
              <a href="#" className={styles.dropdownItem}>Web Apps</a>
              <a href="#" className={styles.dropdownItem}>Open Source</a>
              <a href="#" className={styles.dropdownItem}>Graphics</a>
              {/* <Link to="/tracy" className={styles.dropdownItem}>→ Tracy</Link> */}
            </div>
          </li>
          <li className={`${styles.navItem} nav-item ${expandedItems.has('interests') ? styles.expanded : ''}`}>
            <a
              href="#"
              className={styles.navLink}
              onClick={(e) => {
                if (window.innerWidth <= 768) {
                  e.preventDefault()
                  toggleAccordion('interests')
                }
              }}
            >
              Interests
              <span className={styles.accordionIcon}>›</span>
            </a>
            <div className={styles.dropdown}>
              <a href="#" className={styles.dropdownItem}>Music</a>
              <a href="#" className={styles.dropdownItem}>Math</a>
              <Link to="/groups" className={styles.dropdownItem}>→ Grp</Link>
              <Link to="/sets" className={styles.dropdownItem}>→ Set</Link>
              <Link to="/top" className={styles.dropdownItem}>→ Top</Link>
              <a href="#" className={styles.dropdownItem}>Chess</a>
              <a href="#" className={styles.dropdownItem}>Space</a>
            </div>
          </li>
          <li className={`${styles.navItem} nav-item`}>
            <a href="#" className={styles.navLink}>Blog</a>
          </li>
          <li className={`${styles.navItem} nav-item ${expandedItems.has('games') ? styles.expanded : ''}`}>
            <a
              href="#"
              className={styles.navLink}
              onClick={(e) => {
                if (window.innerWidth <= 768) {
                  e.preventDefault()
                  toggleAccordion('games')
                }
              }}
            >
              Games
              <span className={styles.accordionIcon}>›</span>
            </a>
            <div className={styles.dropdown}>
              <Link to="/thoughts" className={styles.dropdownItem}>Thoughts</Link>
              <Link to="/golf" className={styles.dropdownItem}>Golf</Link>
              <Link to="/party" className={styles.dropdownItem}>Party</Link>
              <Link to="/quest" className={styles.dropdownItem}>Quest</Link>
              <Link to="/aurum" className={styles.dropdownItem}>Aurum Siphon</Link>
            </div>
          </li>
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
