import { useState } from 'react'
import styles from './SignCalculator.module.css'

const SignCalculator = () => {
  const [permutation, setPermutation] = useState('2 3 1 5 4')
  const [showMatrix, setShowMatrix] = useState(false)

  const parsePermutation = (input: string): number[] => {
    return input.split(/\s+/).map(n => parseInt(n)).filter(n => !isNaN(n))
  }

  const countInversions = (perm: number[]): number => {
    let inversions = 0
    for (let i = 0; i < perm.length; i++) {
      for (let j = i + 1; j < perm.length; j++) {
        if (perm[i] > perm[j]) {
          inversions++
        }
      }
    }
    return inversions
  }

  const getTranspositions = (perm: number[]): string[] => {
    const n = perm.length
    const visited = new Array(n).fill(false)
    const transpositions: string[] = []

    for (let i = 0; i < n; i++) {
      if (!visited[i]) {
        const cycle: number[] = []
        let current = i
        
        while (!visited[current]) {
          visited[current] = true
          cycle.push(current + 1)
          current = perm[current] - 1
        }
        
        for (let j = cycle.length - 1; j > 0; j--) {
          transpositions.push(`(${cycle[0]} ${cycle[j]})`)
        }
      }
    }
    
    return transpositions
  }

  const perm = parsePermutation(permutation)
  const inversions = perm.length > 0 ? countInversions(perm) : 0
  const sign = inversions % 2 === 0 ? 1 : -1
  const transpositions = perm.length > 0 ? getTranspositions(perm) : []

  return (
    <div className={styles.calculator}>
      <div className={styles.inputSection}>
        <label className={styles.label}>
          Enter permutation (as images: where 1,2,3,... map to):
        </label>
        <input
          type="text"
          value={permutation}
          onChange={(e) => setPermutation(e.target.value)}
          className={styles.input}
          placeholder="e.g., 2 3 1 5 4"
        />
      </div>

      {perm.length > 0 && (
        <>
          <div className={styles.visualization}>
            <div className={styles.permutationDisplay}>
              <div className={styles.row}>
                {perm.map((_, i) => (
                  <div key={i} className={styles.cell}>{i + 1}</div>
                ))}
              </div>
              <div className={styles.row}>
                {perm.map((val, i) => (
                  <div key={i} className={styles.cell}>{val}</div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.results}>
            <div className={styles.resultCard}>
              <h4>Sign of Permutation</h4>
              <div className={`${styles.sign} ${sign === 1 ? styles.even : styles.odd}`}>
                sgn(σ) = {sign === 1 ? '+1' : '-1'}
              </div>
              <p className={styles.type}>
                This is an <strong>{sign === 1 ? 'even' : 'odd'}</strong> permutation
              </p>
            </div>

            <div className={styles.resultCard}>
              <h4>Number of Inversions</h4>
              <div className={styles.inversions}>{inversions}</div>
              <button
                onClick={() => setShowMatrix(!showMatrix)}
                className={styles.toggleButton}
              >
                {showMatrix ? 'Hide' : 'Show'} Inversion Pairs
              </button>
              
              {showMatrix && (
                <div className={styles.inversionPairs}>
                  {perm.map((val1, i) => 
                    perm.slice(i + 1).map((val2, j) => 
                      val1 > val2 ? (
                        <span key={`${i}-${j}`} className={styles.pair}>
                          ({val1}, {val2})
                        </span>
                      ) : null
                    )
                  )}
                </div>
              )}
            </div>

            <div className={styles.resultCard}>
              <h4>Transposition Decomposition</h4>
              <div className={styles.transpositions}>
                {transpositions.length > 0 ? transpositions.join('') : 'Identity'}
              </div>
              <p className={styles.count}>
                Number of transpositions: {transpositions.length}
                {transpositions.length > 0 && ` (${transpositions.length % 2 === 0 ? 'even' : 'odd'})`}
              </p>
            </div>
          </div>

          <div className={styles.theorem}>
            <h4>Key Theorem</h4>
            <p>
              A permutation is even if it can be written as a product of an even number of transpositions,
              and odd if it requires an odd number. This property is well-defined and independent of the
              particular decomposition chosen.
            </p>
            <p>
              The alternating group A<sub>n</sub> consists of all even permutations in S<sub>n</sub>,
              and has order n!/2 for n ≥ 2.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default SignCalculator