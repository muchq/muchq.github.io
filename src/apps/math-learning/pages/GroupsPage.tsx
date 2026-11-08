import { Navigate, useParams } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import { chapterBySlug } from '../groups/chapters'
import ChapterView from '../groups/components/ChapterView'
import CourseNav from '../groups/components/CourseNav'
import GroupLab from '../groups/components/GroupLab'
import GroupsProgressProvider from '../groups/components/GroupsProgressProvider'
import Overview from '../groups/components/Overview'
import styles from '../groups/components/Groups.module.css'

/** /groups is the overview, /groups/lab the lab, /groups/<slug> a chapter. */
const GroupsPage = () => {
  const { chapter: slug } = useParams()
  const chapter = slug === undefined || slug === 'lab' ? undefined : chapterBySlug(slug)
  if (slug !== undefined && slug !== 'lab' && chapter === undefined) return <Navigate to="/groups" replace />

  return (
    <GroupsProgressProvider>
      {/* Keyed by route so a new chapter starts scrolled to the top. */}
      <div className={styles.page} key={slug ?? 'overview'}>
        <Navigation appName="Groups" />
        <main className={styles.content}>
          <CourseNav />
          {chapter ? (
            <ChapterView chapter={chapter} />
          ) : slug === 'lab' ? (
            <article className={styles.card}>
              <h1>The group lab</h1>
              <p className={styles.chapterSummary}>
                Pick a group. Pick a subgroup to see its cosets, whether it is normal, and the quotient.
              </p>
              <GroupLab initialGroup="D4" />
            </article>
          ) : (
            <Overview />
          )}
        </main>
      </div>
    </GroupsProgressProvider>
  )
}

export default GroupsPage
