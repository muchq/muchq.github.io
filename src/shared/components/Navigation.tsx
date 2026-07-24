import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from './Navigation.module.css'
import './NavigationFloating.css'

interface NavigationProps {
  className?: string
  /** Rendered as "MuchQ : {appName}" in the brand link */
  appName?: string
  /** Per-page slot rendered between the brand and the site menu */
  context?: ReactNode
  /** Home-page variant: the nav items drift around the screen */
  floating?: boolean
}

interface MenuLink {
  label: string
  to: string
  external?: boolean
}

interface MenuGroup {
  name: string
  label: string
  links: MenuLink[]
}

const MENU: MenuGroup[] = [
  {
    name: 'projects',
    label: 'Projects',
    links: [
      { label: 'Tracy', to: '/tracy' },
      { label: 'Posterize', to: '/posterize' },
      { label: 'Metrics', to: '/metrics' },
      { label: 'Wordchains', to: '/wordchains' },
    ],
  },
  {
    name: 'games',
    label: 'Games',
    links: [
      { label: 'Thoughts', to: '/thoughts' },
      { label: 'Golf', to: '/golf' },
      { label: 'Party', to: '/party' },
      { label: 'Resilience', to: '/resilience' },
    ],
  },
  {
    name: 'code',
    label: 'Code',
    links: [
      { label: 'MuchQ', to: 'https://git.muchq.com', external: true },
      { label: 'GitHub', to: 'https://github.com/muchq', external: true },
    ],
  },
]

const Navigation = ({ className, appName, context, floating }: NavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const { pathname } = useLocation()

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

  const isCurrentRoute = (to: string) =>
    pathname === to || pathname.startsWith(`${to}/`)

  const navClasses = [styles.nav, floating ? 'homepage-nav' : '', className || '']
    .filter(Boolean)
    .join(' ')

  return (
    <nav className={navClasses}>
      <div className={`${styles.navContainer} nav-container`}>
        <Link to="/" className={`${styles.navLogo} nav-logo`}>
          MuchQ{appName ? ` : ${appName}` : ''}
        </Link>
        {context && <div className={styles.contextSlot}>{context}</div>}
        <ul className={`${styles.navMenu} ${isMobileMenuOpen ? styles.active : ''}`}>
          {MENU.map(group => (
            <li
              key={group.name}
              className={`${styles.navItem} nav-item ${expandedItems.has(group.name) ? styles.expanded : ''}`}
            >
              <a
                href="#"
                className={styles.navLink}
                onClick={(e) => {
                  if (window.innerWidth <= 768) {
                    e.preventDefault()
                    toggleAccordion(group.name)
                  }
                }}
              >
                {group.label}
                <span className={styles.accordionIcon}>›</span>
              </a>
              <div className={styles.dropdown}>
                {group.links.map(link =>
                  link.external ? (
                    <a key={link.label} href={link.to} className={styles.dropdownItem}>
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.to}
                      className={`${styles.dropdownItem} ${isCurrentRoute(link.to) ? styles.currentItem : ''}`}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>
            </li>
          ))}
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
