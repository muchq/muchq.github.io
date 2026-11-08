import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MIN_ATTEMPT, status } from '../gate'
import { ALL_PROBLEMS, CONVENTIONS, problemSlug, UNITS } from '../content'
import { MarkupInline } from '../markup'
import { exportProgress, importProgress, type Progress } from '../store'
import styles from '../Proofs.module.css'

interface Props {
  progress: Progress
  merge: (incoming: Progress) => void
  now: number
}

export default function Overview({ progress, merge, now }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Progress | null>(null)
  const [importError, setImportError] = useState(false)
  const due = ALL_PROBLEMS.filter(({ problem }) => status(progress[problem.id], now) === 'due')

  const download = () => {
    const blob = new Blob([exportProgress(progress)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'proofs-progress.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    const parsed = importProgress(await file.text())
    setImportError(parsed === null)
    setPending(parsed)
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <article aria-labelledby="overview-title">
      <header className={styles.hero}>
        <p className={styles.kicker}>Algebra and topology, by proof</p>
        <h1 id="overview-title" className={styles.unitTitle}>
          <MarkupInline text={String.raw`From the axioms to $\pi_1$ of the circle`} />
        </h1>
        <p className={styles.lede}>
          <MarkupInline
            text={String.raw`Twelve units, ${ALL_PROBLEMS.length} problems, one destination: $\pi_1(S^1) \cong \mathbb{Z}$, and with it Brouwer's fixed point theorem and the fundamental theorem of algebra. Getting there takes groups, quotients and actions on one side, and spaces, connectedness and compactness on the other.`}
          />
        </p>
      </header>

      <section aria-labelledby="method-title">
        <h2 id="method-title">How this works</h2>
        <ol className={styles.method}>
          <li>
            <strong>You prove everything.</strong> Units give definitions and nothing else. Every theorem is a
            problem, and later problems cite earlier ones by number.
          </li>
          <li>
            <strong>Write before you look.</strong> A hint, a verdict check and the reference proof each cost one
            revision of your written attempt: they unlock only when it is at least {MIN_ATTEMPT} characters and has
            changed since your last request. Stuck counts — if you write down where and why.
          </li>
          <li>
            <strong>Three kinds of problem.</strong> <em>Prove</em>. <em>Prove or disprove</em>: the truth value is
            hidden, and about half are true. <em>Find the flaw</em>: a confident wrong proof; pick the first line
            that does not follow, then say why.
          </li>
          <li>
            <strong>Grade yourself, then do it again.</strong> After the reference, grade your own write-up against
            its checks. Anything short of complete and unaided comes back days later for a redo from a blank page.
          </li>
          <li>
            <strong>Want a real referee?</strong> “Copy for a referee” packages the problem and your attempt, without
            the reference, for a person or a model to grade strictly.
          </li>
        </ol>
        <p className={styles.muted}>
          Work on paper if you like, but type the final version: it is the attempt that pays for help. Progress
          stays in this browser.
        </p>
      </section>

      {due.length > 0 && (
        <section aria-labelledby="due-title" className={styles.dueBox}>
          <h2 id="due-title">Due for a redo</h2>
          <ul>
            {due.map(({ unit, problem }) => (
              <li key={problem.id}>
                <Link to={`/proofs/${unit.id}/${problemSlug(problem.id)}`}>
                  {problem.id} <MarkupInline text={problem.title} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="units-title">
        <h2 id="units-title">Units</h2>
        <ol className={styles.unitList}>
          {UNITS.map(unit => {
            const solved = unit.problems.filter(p => status(progress[p.id], now) === 'solved').length
            return (
              <li key={unit.id}>
                <Link
                  to={`/proofs/${unit.id}`}
                  className={styles.unitCard}
                  aria-label={`Unit ${unit.n}: ${unit.title}, ${solved} of ${unit.problems.length} solved`}
                >
                  <span className={styles.unitNo}>{unit.n}</span>
                  <span className={styles.unitBody}>
                    <span className={styles.unitName}>{unit.title}</span>
                    <span className={styles.muted}>
                      {unit.track}
                      {unit.prereqs.length > 0 && ` · after ${unit.prereqs.join(', ')}`}
                    </span>
                  </span>
                  <span className={styles.unitCount}>
                    {solved}/{unit.problems.length}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="conventions-title">
        <h2 id="conventions-title">Conventions</h2>
        <ul className={styles.conventions}>
          {CONVENTIONS.map(c => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="data-title">
        <h2 id="data-title">Your progress</h2>
        <p className={styles.muted}>Saved in this browser only. Move it between devices with a file.</p>
        <div className={styles.actions}>
          <button type="button" onClick={download}>
            Export progress
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            Import progress…
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Progress file"
            onChange={e => void pick(e.target.files?.[0])}
          />
        </div>
        {importError && (
          <p className={styles.bad} role="status">
            That file is not an exported progress file.
          </p>
        )}
        {pending && (
          <div className={styles.confirm} role="group" aria-label="Confirm import">
            <p>
              Replace this browser’s progress on {Object.keys(pending).length} problem
              {Object.keys(pending).length === 1 ? '' : 's'} with the file’s? Other problems are kept.
            </p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  merge(pending)
                  setPending(null)
                }}
              >
                Replace
              </button>
              <button type="button" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </article>
  )
}
