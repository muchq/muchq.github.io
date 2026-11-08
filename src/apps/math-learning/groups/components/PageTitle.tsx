import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './Groups.module.css'

/**
 * The page's h1. Arriving by navigation within the course — not on a fresh
 * load, whose location key is "default" — it takes focus, so a screen
 * reader announces the new page and Tab continues from its top.
 */
const PageTitle = ({ children }: { children: ReactNode }) => {
  const heading = useRef<HTMLHeadingElement>(null)
  const { key } = useLocation()

  useEffect(() => {
    if (key !== 'default') heading.current?.focus({ preventScroll: true })
  }, [key])

  return (
    <h1 ref={heading} tabIndex={-1} className={styles.pageTitle}>
      {children}
    </h1>
  )
}

export default PageTitle
