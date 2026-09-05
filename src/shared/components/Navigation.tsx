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
  /** One-line subtitle shown under the label, for links whose names don't explain themselves */
  description?: string
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
    // Projects are the house's own; they carry no subtitle, unlike Elsewhere's.
    links: [
      { label: 'Tracy', to: '/tracy' },
      { label: 'Posterize', to: '/posterize' },
      { label: 'Wordchains', to: '/wordchains' },
      { label: 'iili', to: '/iili' },
      { label: 'Stats', to: '/stats' },
      { label: 'Metrics', to: '/metrics' },
    ],
  },
  {
    name: 'games',
    label: 'Games',
    links: [
      { label: 'Lobby', to: '/games' },
      { label: 'Thoughts', to: '/thoughts' },
      { label: 'Golf', to: '/golf' },
      { label: 'Castle', to: '/castle' },
      { label: 'Party', to: '/party' },
      { label: 'Resilience', to: '/resilience' },
    ],
  },
  {
    name: 'elsewhere',
    label: 'Elsewhere',
    links: [
      { label: 'Snowbonk', to: 'https://snowbonk.com', external: true, description: 'N-body simulation viewer' },
      { label: '1d4', to: 'https://1d4.net', external: true, description: 'Chess game indexer' },
      { label: 'HoverCrap', to: 'https://hovercrap.com', external: true, description: 'ASCII hovercraft' },
      { label: '3xe', to: 'https://3xe.org', external: true, description: 'Madrid-style cheesecake' },
      { label: 'BitFear', to: 'https://bitfear.net', external: true, description: 'Text-to-binary converter' },
      { label: 'Smallcat', to: 'https://smallcat.dog', external: true, description: 'Pong' },
      { label: '2n-1', to: 'https://2n-1.org', external: true, description: 'Odd-number mathematics' },
      { label: 'tty1', to: 'https://tty1.uk', external: true, description: 'Web terminal' },
      { label: '里に春が来ました', to: 'https://sato-ni-haru-ga-kimashita.uk', external: true, description: 'Japanese sentence breakdown' },
      { label: 'p2bx', to: 'https://p2bx.uk', external: true, description: 'Stone–Čech compactification' },
      { label: 'iili.uk', to: 'https://iili.uk', external: true, description: 'The shortener on its own domain' },
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
                {group.links.map(link => {
                  const children = (
                    <>
                      {link.label}
                      {link.external && (
                        <>
                          {/* U+FE0E pins text presentation: a bare ↗ renders as a color emoji on some platforms */}
                          <span className={styles.externalMark} aria-hidden="true">
                            {' ↗︎'}
                          </span>
                          <span className={styles.srOnly}> (external site)</span>
                        </>
                      )}
                      {link.description && (
                        <span className={styles.linkDescription}>{link.description}</span>
                      )}
                    </>
                  )
                  return link.external ? (
                    <a key={link.label} href={link.to} className={styles.dropdownItem}>
                      {children}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.to}
                      className={`${styles.dropdownItem} ${isCurrentRoute(link.to) ? styles.currentItem : ''}`}
                    >
                      {children}
                    </Link>
                  )
                })}
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
