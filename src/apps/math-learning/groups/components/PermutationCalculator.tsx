import { useId, useState } from 'react'
import { sub } from '../engine/catalog'
import {
  compose,
  cycleType,
  formatCycles,
  invert,
  parseCycles,
  permOrder,
  sign,
  type Perm,
} from '../engine/permutations'
import styles from './Groups.module.css'

const DEGREES = [3, 4, 5, 6, 7, 8, 9]

const Facts = ({ name, p }: { name: string; p: Perm }) => (
  <dl className={styles.facts}>
    <dt>Two-line</dt>
    <dd>
      <span className={styles.twoLine}>
        <span>{p.map((_, i) => i + 1).join(' ')}</span>
        <span>{p.map(x => x + 1).join(' ')}</span>
      </span>
    </dd>
    <dt>Cycles</dt>
    <dd>{formatCycles(p)}</dd>
    <dt>Inverse</dt>
    <dd>
      {name}⁻¹ = {formatCycles(invert(p))}
    </dd>
    <dt>Order</dt>
    <dd>{permOrder(p)}</dd>
    <dt>Cycle type</dt>
    <dd>({cycleType(p).join(', ')})</dd>
    <dt>Sign</dt>
    <dd>{sign(p) === 1 ? '+1 (even)' : '−1 (odd)'}</dd>
  </dl>
)

/** Type two permutations in cycle notation; see everything the chapter computes. */
const PermutationCalculator = () => {
  const id = useId()
  const [degree, setDegree] = useState(5)
  const [sigmaText, setSigmaText] = useState('(1 2 3)(4 5)')
  const [tauText, setTauText] = useState('(1 4)')
  const sigma = parseCycles(sigmaText, degree)
  const tau = parseCycles(tauText, degree)

  const field = (label: string, value: string, set: (v: string) => void, parsed: Perm | null) => (
    <div className={styles.field}>
      <label htmlFor={`${id}-${label}`}>{label} =</label>
      <input
        id={`${id}-${label}`}
        className={styles.answerInput}
        value={value}
        onChange={e => set(e.target.value)}
        spellCheck={false}
        aria-invalid={parsed === null}
        aria-describedby={parsed === null ? `${id}-${label}-error` : undefined}
      />
      {parsed === null && (
        <span id={`${id}-${label}-error`} className={styles.wrong}>
          Not a permutation of {'{'}1, …, {degree}{'}'}
        </span>
      )}
    </div>
  )

  return (
    <div className={styles.tool} aria-label="Permutation calculator" role="group">
      <div className={styles.toolControls}>
        <div className={styles.field}>
          <label htmlFor={`${id}-n`}>Work in</label>
          <select id={`${id}-n`} value={degree} onChange={e => setDegree(Number(e.target.value))}>
            {DEGREES.map(n => (
              <option key={n} value={n}>
                S{sub(n)}
              </option>
            ))}
          </select>
        </div>
        {field('σ', sigmaText, setSigmaText, sigma)}
        {field('τ', tauText, setTauText, tau)}
      </div>
      <p className={styles.toolHint}>Cycle notation: (1 2 3)(4 5). Products of overlapping cycles are fine; they multiply right to left.</p>
      <div className={styles.toolGrid}>
        {sigma && (
          <section aria-label="σ">
            <h4>σ</h4>
            <Facts name="σ" p={sigma} />
          </section>
        )}
        {tau && (
          <section aria-label="τ">
            <h4>τ</h4>
            <Facts name="τ" p={tau} />
          </section>
        )}
        {sigma && tau && (
          <section aria-label="Products">
            <h4>Products</h4>
            <dl className={styles.facts}>
              <dt>στ</dt>
              <dd>{formatCycles(compose(sigma, tau))}</dd>
              <dt>τσ</dt>
              <dd>{formatCycles(compose(tau, sigma))}</dd>
              <dt>τστ⁻¹</dt>
              <dd>{formatCycles(compose(compose(tau, sigma), invert(tau)))}</dd>
            </dl>
            <p className={styles.toolHint}>
              τστ⁻¹ is σ with every entry relabeled by τ — the same cycle type, always.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

export default PermutationCalculator
