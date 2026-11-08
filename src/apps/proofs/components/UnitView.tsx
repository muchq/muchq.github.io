import { Link } from 'react-router-dom'
import { status } from '../gate'
import { problemSlug, UNITS } from '../content'
import Markup, { MarkupInline } from '../markup'
import type { Progress } from '../store'
import type { Unit } from '../types'
import { KIND_LABEL } from '../labels'
import { StatusChip } from './bits'
import styles from '../Proofs.module.css'

interface Props {
  unit: Unit
  progress: Progress
  now: number
}

export default function UnitView({ unit, progress, now }: Props) {
  const prev = UNITS[unit.n - 1]
  const next = UNITS[unit.n + 1]
  return (
    <article aria-labelledby="unit-title">
      <p className={styles.crumb}>
        <Link to="/proofs">← All units</Link>
      </p>
      <header>
        <p className={styles.kicker}>
          Unit {unit.n} · {unit.track}
          {unit.prereqs.length > 0 && ` · after ${unit.prereqs.map(n => `Unit ${n}`).join(' and ')}`}
        </p>
        <h1 id="unit-title" className={styles.unitTitle}>
          {unit.title}
        </h1>
        <Markup text={unit.why} className={styles.lede} />
      </header>

      {unit.definitions.length > 0 && (
      <section aria-labelledby="defs-title">
        <h2 id="defs-title">Definitions</h2>
        <p className={styles.muted}>
          The unit states definitions, never theorems: every theorem below is yours to prove.
        </p>
        <dl className={styles.defs}>
          {unit.definitions.map(d => (
            <div key={d.term} className={styles.def}>
              <dt>{d.term}</dt>
              <dd>
                <Markup text={d.body} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
      )}

      <section aria-labelledby="problems-title">
        <h2 id="problems-title">Problems</h2>
        <ol className={styles.problemList}>
          {unit.problems.map(p => (
            <li key={p.id}>
              <Link to={`/proofs/${unit.id}/${problemSlug(p.id)}`} className={styles.problemRow}>
                <span className={styles.problemId}>{p.id}</span>{' '}
                <span className={styles.problemRowTitle}>
                  <MarkupInline text={p.title} />{' '}
                  <span className={styles.muted}>
                    · {KIND_LABEL[p.kind]}
                    {p.challenge ? ' · challenge' : ''}
                  </span>
                </span>{' '}
                <StatusChip status={status(progress[p.id], now)} />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <nav className={styles.pager} aria-label="Units">
        {prev ? <Link to={`/proofs/${prev.id}`}>← Unit {prev.n}</Link> : <span />}
        {next ? <Link to={`/proofs/${next.id}`}>Unit {next.n} →</Link> : <span />}
      </nav>
    </article>
  )
}
