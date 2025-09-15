import { useState } from 'react'
import styles from './CycleDecomposer.module.css'

const CycleDecomposer = () => {
  const [inputPermutation, setInputPermutation] = useState('2 4 1 3 5')
  const [showSteps, setShowSteps] = useState(false)
  const [highlightedCycle, setHighlightedCycle] = useState<number | null>(null)

  const parsePermutation = (input: string): number[] => {
    return input.split(/\s+/).map(n => parseInt(n)).filter(n => !isNaN(n))
  }

  const findCycles = (perm: number[]): number[][] => {
    const n = perm.length
    const visited = new Array(n).fill(false)
    const cycles: number[][] = []

    for (let i = 0; i < n; i++) {
      if (!visited[i]) {
        const cycle: number[] = []
        let current = i
        
        while (!visited[current]) {
          visited[current] = true
          cycle.push(current + 1)
          current = perm[current] - 1
        }
        
        if (cycle.length > 1) {
          cycles.push(cycle)
        }
      }
    }
    
    return cycles
  }

  const perm = parsePermutation(inputPermutation)
  const cycles = perm.length > 0 ? findCycles(perm) : []


  const getTranspositionDecomposition = () => {
    const transpositions: string[] = []
    cycles.forEach(cycle => {
      for (let i = cycle.length - 1; i > 0; i--) {
        transpositions.push(`(${cycle[0]} ${cycle[i]})`)
      }
    })
    return transpositions.length > 0 ? transpositions.join('') : 'Identity'
  }

  const calculateOrder = () => {
    if (cycles.length === 0) return 1
    const lengths = cycles.map(c => c.length)
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    const lcm = (a: number, b: number): number => (a * b) / gcd(a, b)
    return lengths.reduce(lcm, 1)
  }

  return (
    <div className={styles.decomposer}>
      <div className={styles.inputSection}>
        <label className={styles.label}>
          Enter permutation (bottom row of two-line notation):
        </label>
        <input
          type="text"
          value={inputPermutation}
          onChange={(e) => setInputPermutation(e.target.value)}
          className={styles.input}
          placeholder="e.g., 2 4 1 3 5"
        />
        <div className={styles.hint}>
          For S₅, enter where each element 1,2,3,4,5 maps to
        </div>
      </div>

      {perm.length > 0 && (
        <>
          <div className={styles.visualization}>
            <div className={styles.permutationGrid}>
              <div className={styles.row}>
                {perm.map((_, i) => (
                  <div key={i} className={styles.cell}>{i + 1}</div>
                ))}
              </div>
              <div className={styles.row}>
                {perm.map((val, i) => (
                  <div 
                    key={i} 
                    className={`${styles.cell} ${
                      cycles.find(c => c.includes(i + 1))?.includes(i + 1) && 
                      cycles.findIndex(c => c.includes(i + 1)) === highlightedCycle
                        ? styles.highlighted
                        : ''
                    }`}
                  >
                    {val}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.results}>
            <div className={styles.resultItem}>
              <h4>Cycle Decomposition:</h4>
              <div className={styles.cycles}>
                {cycles.map((cycle, idx) => (
                  <span
                    key={idx}
                    className={styles.cycle}
                    onMouseEnter={() => setHighlightedCycle(idx)}
                    onMouseLeave={() => setHighlightedCycle(null)}
                    onTouchStart={() => setHighlightedCycle(idx)}
                    onTouchEnd={() => setTimeout(() => setHighlightedCycle(null), 1000)}
                    style={{
                      color: `hsl(${idx * 60}, 70%, 50%)`
                    }}
                  >
                    ({cycle.join(' ')})
                  </span>
                ))}
                {cycles.length === 0 && <span>Identity</span>}
              </div>
            </div>

            <div className={styles.resultItem}>
              <h4>As Transpositions:</h4>
              <p className={styles.transpositions}>{getTranspositionDecomposition()}</p>
            </div>

            <div className={styles.resultItem}>
              <h4>Order:</h4>
              <p className={styles.order}>{calculateOrder()}</p>
              <span className={styles.explanation}>
                (LCM of cycle lengths: {cycles.map(c => c.length).join(', ') || '1'})
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowSteps(!showSteps)}
            className={styles.toggleButton}
          >
            {showSteps ? 'Hide' : 'Show'} Step-by-Step Process
          </button>

          {showSteps && (
            <div className={styles.steps}>
              <h4>Step-by-Step Decomposition:</h4>
              {cycles.map((cycle, idx) => (
                <div key={idx} className={styles.step}>
                  <strong>Cycle {idx + 1}:</strong> Start at {cycle[0]}
                  <br />
                  {cycle.map((el, i) => (
                    <span key={i}>
                      {el} → {perm[el - 1]}
                      {i < cycle.length - 1 ? ', ' : ' (back to start)'}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CycleDecomposer