import { Link } from 'react-router-dom'
import { CHAPTERS } from '../chapters'
import { useGroupsProgress } from '../progress'
import type { Chapter } from '../problems/types'
import DrillCard from './DrillCard'
import ProblemCard from './ProblemCard'
import styles from './Groups.module.css'

const ChapterView = ({ chapter }: { chapter: Chapter }) => {
  const { solved, setSolved } = useGroupsProgress()
  const { Body, number, problems, drills } = chapter
  const prev = CHAPTERS.find(c => c.number === number - 1)
  const next = CHAPTERS.find(c => c.number === number + 1)
  const done = problems.filter(p => solved.has(p.id)).length

  return (
    <article className={styles.card}>
      <p className={styles.chapterSummary}>Chapter {number}</p>
      <h1>{chapter.title}</h1>
      <p className={styles.chapterSummary}>{chapter.summary}</p>

      <Body />

      <section className={styles.section} aria-labelledby={`${chapter.slug}-problems`}>
        <h2 id={`${chapter.slug}-problems`}>Problems</h2>
        <p>
          {done} of {problems.length} done. Computational problems check your answer. For a proof, write it out first, then
          open the solution, compare, and mark it done.
        </p>
        <ol className={styles.problemList}>
          {problems.map((p, i) => (
            <li key={p.id}>
              <ProblemCard
                problem={p}
                number={`${number}.${i + 1}`}
                solved={solved.has(p.id)}
                onSolvedChange={s => setSolved(p.id, s)}
              />
            </li>
          ))}
        </ol>
      </section>

      {drills.length > 0 && (
        <section className={styles.section} aria-labelledby={`${chapter.slug}-drills`}>
          <h2 id={`${chapter.slug}-drills`}>Drills</h2>
          <p>Unlimited practice: each drill makes a fresh problem whenever you ask.</p>
          {drills.map(d => (
            <DrillCard key={d.id} drill={d} />
          ))}
        </section>
      )}

      <nav className={styles.pager} aria-label="Previous and next chapter">
        {prev ? <Link to={`/groups/${prev.slug}`}>← {prev.number}. {prev.title}</Link> : <Link to="/groups">← Overview</Link>}
        {next ? <Link to={`/groups/${next.slug}`}>{next.number}. {next.title} →</Link> : <Link to="/groups/lab">The lab →</Link>}
      </nav>
    </article>
  )
}

export default ChapterView
