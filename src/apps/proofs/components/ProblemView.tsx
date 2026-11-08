import { useState } from 'react'
import { Link } from 'react-router-dom'
import { canCheck, canHint, canReveal, MIN_ATTEMPT, status, writingBlock, type Grade, type ProblemState } from '../gate'
import { problemById, problemSlug } from '../content'
import Markup, { MarkupInline } from '../markup'
import { REFEREE_QUESTIONS, refereePrompt } from '../referee'
import type { Action } from '../gate'
import type { Problem, Unit } from '../types'
import { KIND_LABEL } from '../labels'
import { StatusChip } from './bits'
import styles from '../Proofs.module.css'


const GRADES: { grade: Grade; label: string; hint: string }[] = [
  { grade: 'complete', label: 'Complete', hint: 'every check holds' },
  { grade: 'gap', label: 'Gap', hint: 'a fixable omission' },
  { grade: 'wrong', label: 'Wrong', hint: 'the idea fails' },
]

function gateMessage(p: Problem, s: ProblemState): string | null {
  if (s.solution) return null
  const block = writingBlock(s)
  if (block === 'short') {
    const left = MIN_ATTEMPT - s.attempt.trim().length
    return `Write ${left} more character${left === 1 ? '' : 's'} before asking for anything. Stuck? Write down where, and why.`
  }
  if (block === 'unrevised') return 'Revise your attempt to ask for more: each hint, check or reveal costs one revision.'
  if (p.kind === 'decide' && !s.confirmed) return s.verdict === null ? 'Commit to a verdict, then check it.' : null
  if (p.kind === 'flaw' && !s.confirmed) return s.line === null ? 'Pick the first bad line, then check it.' : null
  return null
}

function checkFeedback(p: Problem, s: ProblemState): string | null {
  if (p.kind === 'prove') return null
  if (s.confirmed) {
    return p.kind === 'decide'
      ? 'Right verdict. Make the argument airtight; your next revision unlocks the reference.'
      : 'That is the line. Say exactly why it fails — with a counterexample to the claim if there is one.'
  }
  if (s.misses === 0) return null
  const tries = `${s.misses} wrong check${s.misses === 1 ? '' : 's'}.`
  return p.kind === 'decide'
    ? `${tries} If you wrote a proof, it has a hole: find it, revise, check again.`
    : `${tries} That line holds up. Revise your explanation, then pick again.`
}

const formatDay = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

interface Props {
  unit: Unit
  problem: Problem
  state: ProblemState
  act: (p: Problem, a: Action) => void
  now: number
}

export default function ProblemView({ unit, problem: p, state: s, act, now }: Props) {
  const [preview, setPreview] = useState(false)
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)
  const index = unit.problems.indexOf(p)
  const prev = unit.problems[index - 1]
  const next = unit.problems[index + 1]
  const gate = gateMessage(p, s)
  const feedback = checkFeedback(p, s)
  const st = status(s, now)
  const hintsShown = s.solution ? p.hints.length : s.hints

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(refereePrompt(p, s))
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }

  return (
    <article className={styles.problem} aria-labelledby="problem-title">
      <p className={styles.crumb}>
        <Link to={`/proofs/${unit.id}`}>
          ← Unit {unit.n}: {unit.title}
        </Link>
      </p>
      <header className={styles.problemHead}>
        <p className={styles.kicker}>
          {KIND_LABEL[p.kind]}
          {p.challenge ? ' · challenge' : ''} <StatusChip status={st} />
        </p>
        <h1 id="problem-title" className={styles.problemTitle}>
          <span className={styles.problemId}>{p.id}</span> <MarkupInline text={p.title} />
        </h1>
        {p.uses && p.uses.length > 0 && (
          <p className={styles.uses}>
            May cite:{' '}
            {p.uses.map((id, i) => {
              const target = problemById(id)
              return (
                <span key={id}>
                  {i > 0 && ', '}
                  {target ? <Link to={`/proofs/${target.unit.id}/${problemSlug(id)}`}>{id}</Link> : id}
                </span>
              )
            })}
          </p>
        )}
      </header>

      <Markup text={p.statement} className={styles.statement} />

      {p.kind === 'flaw' && p.lines && (
        <ol className={styles.bogus} aria-label="The argument under examination">
          {p.lines.map((line, i) => {
            const n = i + 1
            const picked = s.line === n
            return (
              <li key={n}>
                <button
                  type="button"
                  className={`${styles.bogusLine} ${picked ? styles.picked : ''} ${picked && s.confirmed ? styles.confirmed : ''}`}
                  aria-pressed={picked}
                  aria-label={`Line ${n}`}
                  disabled={s.confirmed || s.solution}
                  onClick={() => act(p, { type: 'pickLine', line: n })}
                >
                  <span className={styles.lineNo}>{n}</span>
                  <span className={styles.lineText}>
                    <MarkupInline text={line} />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {p.kind === 'decide' && (
        <div className={styles.verdict} role="group" aria-label="Your verdict">
          {[true, false].map(v => (
            <button
              key={String(v)}
              type="button"
              className={`${styles.verdictButton} ${s.verdict === v ? styles.picked : ''} ${s.verdict === v && s.confirmed ? styles.confirmed : ''}`}
              aria-pressed={s.verdict === v}
              disabled={s.confirmed || s.solution}
              onClick={() => act(p, { type: 'pickVerdict', value: v })}
            >
              {v ? 'True — I will prove it' : 'False — I will refute it'}
            </button>
          ))}
        </div>
      )}

      <label htmlFor="attempt" className={styles.attemptLabel}>
        Your {p.kind === 'flaw' ? 'diagnosis' : 'attempt'}
      </label>
      <textarea
        id="attempt"
        className={styles.attempt}
        value={s.attempt}
        readOnly={s.solution}
        onChange={e => act(p, { type: 'edit', text: e.target.value })}
        placeholder={
          p.kind === 'flaw'
            ? 'Which line fails, why, and what would a counterexample to the claim look like?'
            : 'Write the proof. $…$ for math, a blank line between paragraphs.'
        }
        rows={10}
        spellCheck
      />
      {gate && (
        <p className={styles.gate} role="status">
          {gate}
        </p>
      )}

      <div className={styles.actions}>
        {!s.solution && s.hints < p.hints.length && (
          <button type="button" onClick={() => act(p, { type: 'hint' })} disabled={!canHint(p, s)}>
            Hint {s.hints + 1} of {p.hints.length}
          </button>
        )}
        {p.kind !== 'prove' && !s.confirmed && (
          <button type="button" onClick={() => act(p, { type: 'check' })} disabled={!canCheck(p, s)}>
            {p.kind === 'decide' ? 'Check verdict' : 'Check line'}
          </button>
        )}
        {!s.solution && (
          <button type="button" className={styles.primary} onClick={() => act(p, { type: 'reveal' })} disabled={!canReveal(p, s)}>
            Show reference proof
          </button>
        )}
        <button type="button" onClick={copy} disabled={!s.attempt.trim()}>
          Copy for a referee
        </button>
        <button type="button" onClick={() => setPreview(v => !v)} aria-pressed={preview} disabled={!s.attempt.trim()}>
          {preview ? 'Hide preview' : 'Preview'}
        </button>
      </div>
      {copied === 'yes' && (
        <p className={styles.note} role="status">
          Copied: the problem and your attempt, with instructions to grade strictly. The reference proof is not included.
        </p>
      )}
      {copied === 'failed' && (
        <p className={styles.note} role="status">
          Copying was blocked by the browser.
        </p>
      )}
      {feedback && (
        <p className={s.confirmed ? styles.good : styles.bad} role="status">
          {feedback}
        </p>
      )}

      {preview && s.attempt.trim() && (
        <section className={styles.preview} aria-label="Preview of your attempt">
          <Markup text={s.attempt} />
        </section>
      )}

      {hintsShown > 0 && (
        <section className={styles.hints} aria-label="Hints">
          {p.hints.slice(0, hintsShown).map((h, i) => (
            <div key={i} className={styles.hint}>
              <span className={styles.hintNo}>Hint {i + 1}</span>
              <Markup text={h} />
            </div>
          ))}
        </section>
      )}

      {s.solution && (
        <section className={styles.solution} aria-labelledby="reference-title">
          <h2 id="reference-title">Reference proof</h2>
          <Markup text={p.solution} />
          <h3>A complete answer…</h3>
          <ul className={styles.checks}>
            {p.checks.map((c, i) => (
              <li key={i}>
                <Markup text={c} />
              </li>
            ))}
          </ul>
          <h3>…and every proof</h3>
          <ul className={styles.checks}>
            {REFEREE_QUESTIONS.map(q => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <p className={styles.note}>
            A different correct route is a complete answer. Grade what you wrote before you looked.
          </p>
          {s.grade === null ? (
            <div className={styles.actions} role="group" aria-label="Grade your attempt">
              {GRADES.map(g => (
                <button key={g.grade} type="button" onClick={() => act(p, { type: 'grade', grade: g.grade, now: Date.now() })}>
                  {g.label} <span className={styles.muted}>— {g.hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.graded}>
              <p>
                Graded <strong>{s.grade}</strong>
                {s.hints > 0 ? ` with ${s.hints} hint${s.hints === 1 ? '' : 's'}` : ''}.{' '}
                {s.redoAt === null
                  ? 'Unaided and complete: no redo owed.'
                  : st === 'due'
                    ? 'A redo from a blank page is due now.'
                    : `A redo from a blank page comes due ${formatDay(s.redoAt)}.`}
              </p>
              <button type="button" onClick={() => act(p, { type: 'restart' })}>
                Start over from a blank page
              </button>
            </div>
          )}
        </section>
      )}

      <nav className={styles.pager} aria-label="Problems in this unit">
        {prev ? <Link to={`/proofs/${unit.id}/${problemSlug(prev.id)}`}>← {prev.id}</Link> : <span />}
        {next ? <Link to={`/proofs/${unit.id}/${problemSlug(next.id)}`}>{next.id} →</Link> : <span />}
      </nav>
    </article>
  )
}
