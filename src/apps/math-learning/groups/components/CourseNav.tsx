import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { CHAPTERS } from '../chapters'
import styles from './Groups.module.css'

const CourseNav = () => {
  const list = useRef<HTMLOListElement>(null)

  // On a phone the list is one row that scrolls sideways, and the page
  // remounts it on every chapter; bring the current chapter into view.
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'center' })
  }, [])

  return (
    <nav className={styles.courseNav} aria-label="Chapters">
      <ol ref={list}>
        <li>
          <NavLink to="/groups" end>
            Overview
          </NavLink>
        </li>
        {CHAPTERS.map(c => (
          <li key={c.slug}>
            <NavLink to={`/groups/${c.slug}`}>
              {c.number} · {c.short}
            </NavLink>
          </li>
        ))}
        <li>
          <NavLink to="/groups/lab">Lab</NavLink>
        </li>
      </ol>
    </nav>
  )
}

export default CourseNav
