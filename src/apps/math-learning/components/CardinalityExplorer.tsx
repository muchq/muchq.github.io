import { useState, useMemo } from 'react'
import styles from './CardinalityExplorer.module.css'

interface CardinalityExplorerProps {
  mode: 'finite' | 'infinite'
}

interface FiniteSet {
  name: string
  elements: (string | number)[]
  color: string
}

interface InfiniteSet {
  name: string
  description: string
  notation: string
  cardinality: string
  examples: string[]
  color: string
}

const CardinalityExplorer = ({ mode }: CardinalityExplorerProps) => {
  const [selectedSet1, setSelectedSet1] = useState<string>('')
  const [selectedSet2, setSelectedSet2] = useState<string>('')

  const finiteSets: FiniteSet[] = useMemo(() => [
    { name: 'Empty Set', elements: [], color: '#ff6b6b' },
    { name: 'Single Element', elements: ['a'], color: '#4ecdc4' },
    { name: 'Binary Digits', elements: [0, 1], color: '#45b7d1' },
    { name: 'Primary Colors', elements: ['red', 'blue', 'yellow'], color: '#96ceb4' },
    { name: 'Vowels', elements: ['a', 'e', 'i', 'o', 'u'], color: '#feca57' },
    { name: 'Decimal Digits', elements: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], color: '#ff9ff3' },
    { name: 'Months (First Half)', elements: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], color: '#54a0ff' }
  ], [])

  const infiniteSets: InfiniteSet[] = useMemo(() => [
    {
      name: 'Natural Numbers',
      description: 'The counting numbers starting from 1',
      notation: 'ℕ = {1, 2, 3, 4, ...}',
      cardinality: 'ℵ₀ (aleph-null)',
      examples: ['1', '2', '3', '...', '100', '...'],
      color: '#667eea'
    },
    {
      name: 'Whole Numbers',
      description: 'Natural numbers including zero',
      notation: 'ℕ₀ = {0, 1, 2, 3, ...}',
      cardinality: 'ℵ₀ (aleph-null)',
      examples: ['0', '1', '2', '...', '50', '...'],
      color: '#764ba2'
    },
    {
      name: 'Integers',
      description: 'All positive and negative whole numbers',
      notation: 'ℤ = {..., -2, -1, 0, 1, 2, ...}',
      cardinality: 'ℵ₀ (aleph-null)',
      examples: ['...', '-5', '0', '3', '...'],
      color: '#f093fb'
    },
    {
      name: 'Rational Numbers',
      description: 'All numbers that can be expressed as fractions',
      notation: 'ℚ = {p/q : p,q ∈ ℤ, q ≠ 0}',
      cardinality: 'ℵ₀ (aleph-null)',
      examples: ['1/2', '3/4', '0.5', '2', '...'],
      color: '#4ecdc4'
    },
    {
      name: 'Real Numbers',
      description: 'All rational and irrational numbers',
      notation: 'ℝ = ℚ ∪ {irrational numbers}',
      cardinality: '𝔠 (continuum)',
      examples: ['π', '√2', 'e', '1.414...', '...'],
      color: '#45b7d1'
    },
    {
      name: 'Complex Numbers',
      description: 'Numbers with real and imaginary parts',
      notation: 'ℂ = {a + bi : a,b ∈ ℝ, i² = -1}',
      cardinality: '𝔠 (continuum)',
      examples: ['3+4i', '1-2i', 'i', '5', '...'],
      color: '#96ceb4'
    }
  ], [])

  const comparisonResult = useMemo(() => {
    if (!selectedSet1 || !selectedSet2) return ''

    if (mode === 'finite') {
      const set1 = finiteSets.find(s => s.name === selectedSet1)
      const set2 = finiteSets.find(s => s.name === selectedSet2)
      
      if (!set1 || !set2) return ''
      
      const card1 = set1.elements.length
      const card2 = set2.elements.length
      
      if (card1 === card2) {
        return `Both sets have cardinality ${card1}. They are equipotent (same size).`
      } else if (card1 < card2) {
        return `${set1.name} (|A| = ${card1}) has smaller cardinality than ${set2.name} (|B| = ${card2}).`
      } else {
        return `${set1.name} (|A| = ${card1}) has larger cardinality than ${set2.name} (|B| = ${card2}).`
      }
    } else {
      const set1 = infiniteSets.find(s => s.name === selectedSet1)
      const set2 = infiniteSets.find(s => s.name === selectedSet2)
      
      if (!set1 || !set2) return ''
      
      const countableNames = ['Natural Numbers', 'Whole Numbers', 'Integers', 'Rational Numbers']
      
      const isSet1Countable = countableNames.includes(set1.name)
      const isSet2Countable = countableNames.includes(set2.name)
      
      if (isSet1Countable && isSet2Countable) {
        return `Both ${set1.name} and ${set2.name} have the same infinite cardinality ℵ₀ (countably infinite).`
      } else if (!isSet1Countable && !isSet2Countable) {
        return `Both ${set1.name} and ${set2.name} have the same infinite cardinality 𝔠 (uncountably infinite).`
      } else if (isSet1Countable && !isSet2Countable) {
        return `${set1.name} (ℵ₀) has smaller cardinality than ${set2.name} (𝔠). There are "more" real numbers than natural numbers!`
      } else {
        return `${set2.name} (ℵ₀) has smaller cardinality than ${set1.name} (𝔠). There are "more" real numbers than natural numbers!`
      }
    }
  }, [mode, selectedSet1, selectedSet2, finiteSets, infiniteSets])

  const FiniteSetCard = ({ set, isSelected, onClick }: { set: FiniteSet, isSelected: boolean, onClick: () => void }) => (
    <div 
      className={`${styles.setCard} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{ borderColor: set.color }}
    >
      <h4 style={{ color: set.color }}>{set.name}</h4>
      <div className={styles.cardinality}>|A| = {set.elements.length}</div>
      <div className={styles.elements}>
        {set.elements.length === 0 ? (
          <span className={styles.emptySet}>∅</span>
        ) : (
          <>
            {'{'}
            {set.elements.slice(0, 5).map((element, index) => (
              <span key={index} className={styles.element}>
                {element}
                {index < Math.min(4, set.elements.length - 1) ? ', ' : ''}
              </span>
            ))}
            {set.elements.length > 5 && <span>, ...</span>}
            {'}'}
          </>
        )}
      </div>
    </div>
  )

  const InfiniteSetCard = ({ set, isSelected, onClick }: { set: InfiniteSet, isSelected: boolean, onClick: () => void }) => (
    <div 
      className={`${styles.setCard} ${styles.infiniteCard} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{ borderColor: set.color }}
    >
      <h4 style={{ color: set.color }}>{set.name}</h4>
      <div className={styles.cardinality}>{set.cardinality}</div>
      <div className={styles.notation}>{set.notation}</div>
      <div className={styles.description}>{set.description}</div>
      <div className={styles.examples}>
        {set.examples.map((example, index) => (
          <span key={index} className={styles.exampleElement}>
            {example}
          </span>
        ))}
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Cardinality Explorer</h2>
        <div className={styles.modeIndicator}>
          <span className={`${styles.mode} ${mode === 'finite' ? styles.active : ''}`}>
            {mode === 'finite' ? '🔢' : '∞'} {mode === 'finite' ? 'Finite Sets' : 'Infinite Sets'}
          </span>
        </div>
      </div>

      <div className={styles.instructions}>
        {mode === 'finite' ? (
          <p>Select two finite sets to compare their cardinalities (number of elements)</p>
        ) : (
          <p>Explore infinite cardinalities and discover that some infinities are larger than others!</p>
        )}
      </div>

      <div className={styles.setsGrid}>
        {mode === 'finite' ? (
          <>
            <div className={styles.column}>
              <h3>Select First Set (A)</h3>
              <div className={styles.setsList}>
                {finiteSets.map(set => (
                  <FiniteSetCard 
                    key={set.name}
                    set={set}
                    isSelected={selectedSet1 === set.name}
                    onClick={() => setSelectedSet1(selectedSet1 === set.name ? '' : set.name)}
                  />
                ))}
              </div>
            </div>
            <div className={styles.column}>
              <h3>Select Second Set (B)</h3>
              <div className={styles.setsList}>
                {finiteSets.map(set => (
                  <FiniteSetCard 
                    key={set.name}
                    set={set}
                    isSelected={selectedSet2 === set.name}
                    onClick={() => setSelectedSet2(selectedSet2 === set.name ? '' : set.name)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.column}>
              <h3>Select First Set (A)</h3>
              <div className={styles.setsList}>
                {infiniteSets.map(set => (
                  <InfiniteSetCard 
                    key={set.name}
                    set={set}
                    isSelected={selectedSet1 === set.name}
                    onClick={() => setSelectedSet1(selectedSet1 === set.name ? '' : set.name)}
                  />
                ))}
              </div>
            </div>
            <div className={styles.column}>
              <h3>Select Second Set (B)</h3>
              <div className={styles.setsList}>
                {infiniteSets.map(set => (
                  <InfiniteSetCard 
                    key={set.name}
                    set={set}
                    isSelected={selectedSet2 === set.name}
                    onClick={() => setSelectedSet2(selectedSet2 === set.name ? '' : set.name)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {comparisonResult && (
        <div className={styles.comparisonResult}>
          <h4>Cardinality Comparison</h4>
          <div className={styles.result}>
            {comparisonResult}
          </div>
        </div>
      )}

      <div className={styles.educational}>
        <div className={styles.concepts}>
          <h4>Key Concepts</h4>
          {mode === 'finite' ? (
            <ul>
              <li><strong>Cardinality:</strong> The number of elements in a set, denoted |A|</li>
              <li><strong>Equipotent:</strong> Two sets with the same cardinality</li>
              <li><strong>Finite Set:</strong> A set with a countable number of elements</li>
              <li><strong>Empty Set:</strong> The unique set with no elements (|∅| = 0)</li>
            </ul>
          ) : (
            <ul>
              <li><strong>ℵ₀ (Aleph-null):</strong> The cardinality of countably infinite sets</li>
              <li><strong>𝔠 (Continuum):</strong> The cardinality of uncountably infinite sets</li>
              <li><strong>Countable:</strong> Can be put in one-to-one correspondence with ℕ</li>
              <li><strong>Cantor's Theorem:</strong> Some infinities are larger than others!</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default CardinalityExplorer