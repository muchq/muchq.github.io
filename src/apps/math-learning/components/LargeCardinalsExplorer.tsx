import React, { useState } from 'react'
import styles from '@/styles/ModuleStyles.module.css'

type CardinalType = 'inaccessible' | 'measurable' | 'supercompact' | 'weakly-compact' | 'mahlo' | 'woodin'

interface CardinalInfo {
  name: string
  symbol: string
  definition: string
  properties: string[]
  consistency: string
  applications: string[]
}

const cardinalData: Record<CardinalType, CardinalInfo> = {
  'inaccessible': {
    name: 'Inaccessible Cardinal',
    symbol: 'κ',
    definition: 'A cardinal κ is inaccessible if it is uncountable, regular (cf(κ) = κ), and a strong limit (2^λ < κ for all λ < κ).',
    properties: [
      'Cannot be reached by cardinal arithmetic from smaller cardinals',
      'V_κ models ZFC (Zermelo-Fraenkel with Choice)',
      'The existence of one inaccessible implies the consistency of ZFC',
      'Forms a universe for "small" sets'
    ],
    consistency: 'Con(ZFC + "there exists an inaccessible") → Con(ZFC)',
    applications: [
      'Category theory: Grothendieck universes',
      'Model theory: Standard models of set theory',
      'Topos theory: Large categories'
    ]
  },
  'measurable': {
    name: 'Measurable Cardinal',
    symbol: 'κ',
    definition: 'A cardinal κ is measurable if there exists a κ-complete, non-principal ultrafilter on κ.',
    properties: [
      'Every measurable cardinal is inaccessible',
      'The least measurable is larger than infinitely many inaccessibles',
      'Implies the existence of 0# (zero sharp)',
      'Has a non-trivial elementary embedding j: V → M'
    ],
    consistency: 'Much stronger than inaccessible cardinals',
    applications: [
      'Descriptive set theory: Determinacy results',
      'Model theory: Elementary embeddings',
      'Measure theory: Two-valued measures'
    ]
  },
  'supercompact': {
    name: 'Supercompact Cardinal',
    symbol: 'κ',
    definition: 'A cardinal κ is supercompact if for every λ ≥ κ, there exists an elementary embedding j: V → M with critical point κ and j(κ) > λ.',
    properties: [
      'Implies the existence of many measurable cardinals below',
      'Reflection principle: Many properties true at κ reflect down',
      'Laver indestructibility: Can be made indestructible by forcing',
      'Strong compactness properties for infinitary logic'
    ],
    consistency: 'Near the top of the large cardinal hierarchy',
    applications: [
      'Forcing theory: Indestructibility',
      'Infinitary logic: Compactness theorems',
      'Algebra: Abelian group theory'
    ]
  },
  'weakly-compact': {
    name: 'Weakly Compact Cardinal',
    symbol: 'κ',
    definition: 'A cardinal κ is weakly compact if it is uncountable and every κ-tree has a κ-branch.',
    properties: [
      'Equivalent to κ → (κ)²₂ partition property',
      'L_κ,κ logic has compactness property',
      'Every weakly compact is Mahlo',
      'Tree property holds at κ'
    ],
    consistency: 'Weaker than measurable, stronger than Mahlo',
    applications: [
      'Combinatorics: Tree property',
      'Model theory: Compactness of infinitary logic',
      'Partition calculus: Ramsey-type properties'
    ]
  },
  'mahlo': {
    name: 'Mahlo Cardinal',
    symbol: 'κ',
    definition: 'A cardinal κ is Mahlo if it is inaccessible and the set of regular cardinals below κ is stationary in κ.',
    properties: [
      'κ is regular and strong limit',
      'The set of inaccessible cardinals below κ is stationary',
      'Weakly Mahlo: regular cardinals below κ form a stationary set',
      'Can iterate: α-Mahlo for any ordinal α'
    ],
    consistency: 'Stronger than inaccessible, weaker than weakly compact',
    applications: [
      'Proof theory: Ordinal analysis',
      'Stationary sets: Reflection principles',
      'Model theory: Indescribability'
    ]
  },
  'woodin': {
    name: 'Woodin Cardinal',
    symbol: 'δ',
    definition: 'A cardinal δ is Woodin if for every function f: δ → δ, there exists κ < δ with an elementary embedding j: V → M where Vⱼ(f)(κ) ⊆ M.',
    properties: [
      'Key to determinacy: AD^L(ℝ) from ω Woodin cardinals',
      'Connected to Ω-logic completeness',
      'Implies projective determinacy',
      'Central to inner model theory'
    ],
    consistency: 'Between superstrong and supercompact',
    applications: [
      'Determinacy: All projective sets determined',
      'Descriptive set theory: Structure of L(ℝ)',
      'Inner model theory: Ultimate L conjecture'
    ]
  }
}

const LargeCardinalsExplorer: React.FC = () => {
  const [selectedCardinal, setSelectedCardinal] = useState<CardinalType>('inaccessible')

  const currentCardinal = cardinalData[selectedCardinal]

  return (
    <div className={styles.bijectionConstructor}>
      <div className={styles.instructions}>
        <h3>Large Cardinals Explorer</h3>
        <p>
          Large cardinals are cardinal numbers with properties so strong that their existence cannot be proved in ZFC.
          They form a hierarchy of increasing consistency strength and have profound implications for mathematics.
        </p>
      </div>

      <div className={styles.selector}>
        <h4>Select Cardinal Type</h4>
        <div className={styles.bijectionButtons}>
          <button
            className={`${styles.bijectionButton} ${selectedCardinal === 'inaccessible' ? styles.active : ''}`}
            onClick={() => setSelectedCardinal('inaccessible')}
          >
            Inaccessible
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedCardinal === 'mahlo' ? styles.active : ''}`}
            onClick={() => setSelectedCardinal('mahlo')}
          >
            Mahlo
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedCardinal === 'weakly-compact' ? styles.active : ''}`}
            onClick={() => setSelectedCardinal('weakly-compact')}
          >
            Weakly Compact
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedCardinal === 'measurable' ? styles.active : ''}`}
            onClick={() => setSelectedCardinal('measurable')}
          >
            Measurable
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedCardinal === 'woodin' ? styles.active : ''}`}
            onClick={() => setSelectedCardinal('woodin')}
          >
            Woodin
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedCardinal === 'supercompact' ? styles.active : ''}`}
            onClick={() => setSelectedCardinal('supercompact')}
          >
            Supercompact
          </button>
        </div>
      </div>

      <div className={styles.setInfo}>
        <div className={styles.setCardLarge}>
          <h4>{currentCardinal.name}</h4>
          <span className={styles.symbol}>{currentCardinal.symbol}</span>
          
          <div className={styles.formulaDisplay}>
            <p className={styles.description}>{currentCardinal.definition}</p>
          </div>
          
          <div className={styles.insights}>
            <h5>Key Properties</h5>
            <ul>
              {currentCardinal.properties.map((prop, idx) => (
                <li key={idx}>{prop}</li>
              ))}
            </ul>
          </div>

          <div className={styles.formula}>
            <span className={styles.formulaText}>
              {currentCardinal.consistency}
            </span>
          </div>

          <div className={styles.insights}>
            <h5>Applications</h5>
            <ul>
              {currentCardinal.applications.map((app, idx) => (
                <li key={idx}>{app}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.hierarchyContainer}>
        <h4 className={styles.hierarchyTitle}>
          Consistency Strength Hierarchy
        </h4>
        
        <div className={styles.hierarchyContent}>
          {/* Y-axis label */}
          <div className={styles.axisLabel}>
            Stronger →
          </div>
          
          {/* Cardinal levels */}
          <div className={styles.levelContainer}>
            {[
              { name: 'Supercompact', type: 'supercompact' as CardinalType, properties: ['Laver indestructible', 'Reflection principle'] },
              { name: 'Woodin', type: 'woodin' as CardinalType, properties: ['Determinacy', 'Ω-logic complete'] },
              { name: 'Measurable', type: 'measurable' as CardinalType, properties: ['Elementary embedding', 'Zero sharp exists'] },
              { name: 'Weakly Compact', type: 'weakly-compact' as CardinalType, properties: ['Tree property', 'Partition property'] },
              { name: 'Mahlo', type: 'mahlo' as CardinalType, properties: ['Stationary reflection', 'Regular limit'] },
              { name: 'Inaccessible', type: 'inaccessible' as CardinalType, properties: ['Regular', 'Strong limit'] },
              { name: 'ZFC', type: null, properties: ['Base theory'] }
            ].map((level, idx) => (
              <div 
                key={level.name} 
                className={`${styles.cardinalLevel} ${level.type === selectedCardinal ? styles.cardinalLevelActive : ''}`}
                onClick={() => level.type && setSelectedCardinal(level.type)}
              >
                <div className={styles.cardinalHeader}>
                  <span className={styles.cardinalName}>{level.name}</span>
                  {idx < 6 && (
                    <span className={styles.strengthIndicator}>↑</span>
                  )}
                </div>
                <div className={styles.cardinalProperties}>
                  {level.properties.map((prop, propIdx) => (
                    <span key={propIdx} className={styles.propertyTag}>
                      {prop}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Legend */}
          <div className={styles.legendBox}>
            <p className={styles.legendText}>Each level implies consistency of all below</p>
            <p className={styles.legendText}>Click on a cardinal to explore its properties</p>
          </div>
        </div>
      </div>

      <div className={`${styles.insights} ${styles.philosophicalSection}`}>
        <h4>Why Large Cardinals Matter</h4>
        <div className={styles.mappingGrid}>
          <div className={styles.mappingPair}>
            <div className={styles.mappingFrom}>Consistency Results</div>
            <div className={styles.arrow}>→</div>
            <div className={styles.mappingTo}>
              Hierarchy of consistency strengths beyond ZFC
            </div>
          </div>
          
          <div className={styles.mappingPair}>
            <div className={styles.mappingFrom}>Determinacy</div>
            <div className={styles.arrow}>→</div>
            <div className={styles.mappingTo}>
              All sets in L(ℝ) are determined
            </div>
          </div>

          <div className={styles.mappingPair}>
            <div className={styles.mappingFrom}>Inner Models</div>
            <div className={styles.arrow}>→</div>
            <div className={styles.mappingTo}>
              Deep structure in the universe of sets
            </div>
          </div>

          <div className={styles.mappingPair}>
            <div className={styles.mappingFrom}>Category Theory</div>
            <div className={styles.arrow}>→</div>
            <div className={styles.mappingTo}>
              Grothendieck universes for large categories
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.insights} ${styles.philosophicalSection}`}>
        <h4>Philosophical Implications</h4>
        <p className={styles.philosophicalContent}>
          Large cardinals suggest that the universe of sets extends far beyond what ZFC can prove. 
          They provide a natural hierarchy for measuring the strength of mathematical theories and 
          hint at absolute truths about mathematical reality that transcend any particular formal system.
        </p>
        <blockquote className={styles.philosophicalQuote}>
          "The large cardinal axioms are not merely a technical device; they reflect our intuition 
          about the richness and extent of the mathematical universe." - W. Hugh Woodin
        </blockquote>
      </div>
    </div>
  )
}

export default LargeCardinalsExplorer