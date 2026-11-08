// /proofs — a proof-first path through algebra and topology. No nav entry: the
// one way in is the homepage's π₁(S¹) ≅ ℤ link, and the page asks search
// engines not to index it.
import { useEffect, useState } from 'react'
import { Link, useNavigationType, useParams } from 'react-router-dom'
import Navigation from '@/shared/components/Navigation'
import { problemBySlug, unitById } from '../content'
import { nextDue } from '../gate'
import Overview from '../components/Overview'
import ProblemView from '../components/ProblemView'
import UnitView from '../components/UnitView'
import { useProgress } from '../useProgress'
import styles from '../Proofs.module.css'

function useUnlisted() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const title = document.title
    document.title = 'Proofs · MuchQ'
    return () => {
      meta.remove()
      document.title = title
    }
  }, [])
}

export default function ProofsPage() {
  useUnlisted()
  const { unitId, problemId } = useParams()
  const { progress, stateOf, act, merge } = useProgress()
  const now = Date.now()

  // Redo dates are days out. A page left open must still notice one passing,
  // so wake at the next due time (setTimeout caps a delay at about 24.8 days;
  // an early wake just schedules the next).
  const [wake, setWake] = useState(0)
  const due = nextDue(Object.values(progress), now)
  useEffect(() => {
    if (due === null) return
    const id = window.setTimeout(() => setWake(w => w + 1), Math.min(due - Date.now(), 2 ** 31 - 1))
    return () => window.clearTimeout(id)
  }, [due, wake])

  // A unit or problem opened by a link starts at its top, not wherever the last
  // one was left. Back and Forward (POP) leave the scroll to the browser.
  const navigation = useNavigationType()
  useEffect(() => {
    if (navigation === 'POP') return
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [unitId, problemId, navigation])

  const unit = unitId === undefined ? undefined : unitById(unitId)
  const problem = unit && problemId !== undefined ? problemBySlug(unit, problemId) : undefined
  const missing = (unitId !== undefined && !unit) || (problemId !== undefined && !problem)

  return (
    <div className={styles.page}>
      <Navigation appName="Proofs" />
      <main className={styles.main}>
        {missing ? (
          <p>
            No such {unit ? 'problem' : 'unit'}. <Link to={unit ? `/proofs/${unit.id}` : '/proofs'}>Back</Link>
          </p>
        ) : unit && problem ? (
          <ProblemView key={problem.id} unit={unit} problem={problem} state={stateOf(problem.id)} act={act} now={now} />
        ) : unit ? (
          <UnitView unit={unit} progress={progress} now={now} />
        ) : (
          <Overview progress={progress} merge={merge} now={now} />
        )}
      </main>
    </div>
  )
}
