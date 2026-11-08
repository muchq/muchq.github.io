import { NavLink } from 'react-router-dom'
import { CHAPTERS } from '../chapters'
import styles from './Groups.module.css'

const CourseNav = () => (
  <nav className={styles.courseNav} aria-label="Chapters">
    <ol>
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

export default CourseNav
