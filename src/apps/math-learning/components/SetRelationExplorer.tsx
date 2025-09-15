import React, { useState } from 'react';
import styles from './SetRelationExplorer.module.css';

interface SetRelationExplorerProps {
  setA: number[];
  setB: number[];
  setC: number[];
}

interface Relation {
  name: string;
  symbol: string;
  check: (set1: number[], set2: number[]) => boolean;
  description: string;
}

const SetRelationExplorer: React.FC<SetRelationExplorerProps> = ({ setA, setB, setC }) => {
  const [selectedSets, setSelectedSets] = useState<[string, string]>(['A', 'B']);
  const [highlightedRelation, setHighlightedRelation] = useState<string | null>(null);

  const relations: Relation[] = [
    {
      name: 'Subset',
      symbol: '⊆',
      check: (set1, set2) => set1.every(el => set2.includes(el)),
      description: 'Every element of the first set is also in the second set'
    },
    {
      name: 'Proper Subset',
      symbol: '⊂',
      check: (set1, set2) => set1.every(el => set2.includes(el)) && set1.length < set2.length,
      description: 'The first set is a subset of the second, but they are not equal'
    },
    {
      name: 'Superset',
      symbol: '⊇',
      check: (set1, set2) => set2.every(el => set1.includes(el)),
      description: 'The first set contains all elements of the second set'
    },
    {
      name: 'Equality',
      symbol: '=',
      check: (set1, set2) => set1.length === set2.length && set1.every(el => set2.includes(el)),
      description: 'Both sets contain exactly the same elements'
    },
    {
      name: 'Disjoint',
      symbol: '∩ = ∅',
      check: (set1, set2) => !set1.some(el => set2.includes(el)),
      description: 'The sets have no elements in common'
    }
  ];

  const getSet = (setName: string): number[] => {
    switch (setName) {
      case 'A': return setA;
      case 'B': return setB;
      case 'C': return setC;
      default: return [];
    }
  };

  const checkRelation = (relation: Relation): boolean => {
    const set1 = getSet(selectedSets[0]);
    const set2 = getSet(selectedSets[1]);
    return relation.check(set1, set2);
  };

  const swapSets = () => {
    setSelectedSets([selectedSets[1], selectedSets[0]]);
  };


  const set1 = getSet(selectedSets[0]);
  const set2 = getSet(selectedSets[1]);

  // Calculate various set properties
  const unionSize = new Set([...set1, ...set2]).size;
  const intersectionSize = set1.filter(el => set2.includes(el)).length;
  const symmetricDifferenceSize = [...set1.filter(el => !set2.includes(el)), ...set2.filter(el => !set1.includes(el))].length;

  return (
    <div className={styles.explorer}>
      <div className={styles.instructions}>
        <h3>Set Relation Explorer</h3>
        <p>Explore relationships between sets. Test subset, equality, and disjointness properties interactively.</p>
      </div>

      <div className={styles.setSelector}>
        <div className={styles.selectorGroup}>
          <label>First Set:</label>
          <select 
            value={selectedSets[0]} 
            onChange={(e) => setSelectedSets([e.target.value, selectedSets[1]])}
            className={styles.select}
          >
            <option value="A">A = {`{ ${setA.join(', ')} }`}</option>
            <option value="B">B = {`{ ${setB.join(', ')} }`}</option>
            <option value="C">C = {`{ ${setC.join(', ')} }`}</option>
          </select>
        </div>

        <button className={styles.swapButton} onClick={swapSets}>
          ⇄ Swap
        </button>

        <div className={styles.selectorGroup}>
          <label>Second Set:</label>
          <select 
            value={selectedSets[1]} 
            onChange={(e) => setSelectedSets([selectedSets[0], e.target.value])}
            className={styles.select}
          >
            <option value="A">A = {`{ ${setA.join(', ')} }`}</option>
            <option value="B">B = {`{ ${setB.join(', ')} }`}</option>
            <option value="C">C = {`{ ${setC.join(', ')} }`}</option>
          </select>
        </div>
      </div>

      <div className={styles.relations}>
        <h4>Relation Tests:</h4>
        <div className={styles.relationGrid}>
          {relations.map(relation => {
            const isTrue = checkRelation(relation);
            return (
              <div
                key={relation.name}
                className={`${styles.relationCard} ${isTrue ? styles.true : styles.false}`}
                onMouseEnter={() => setHighlightedRelation(relation.name)}
                onMouseLeave={() => setHighlightedRelation(null)}
              >
                <div className={styles.relationHeader}>
                  <span className={styles.relationName}>{relation.name}</span>
                  <span className={styles.relationResult}>{isTrue ? '✓' : '✗'}</span>
                </div>
                <div className={styles.relationExpression}>
                  {selectedSets[0]} {relation.symbol} {selectedSets[1]}
                </div>
                {highlightedRelation === relation.name && (
                  <div className={styles.relationDescription}>
                    {relation.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.visualComparison}>
        <h4>Visual Comparison:</h4>
        <div className={styles.comparisonGrid}>
          <div className={styles.setDisplay}>
            <h5>{selectedSets[0]}</h5>
            <div className={styles.elementGrid}>
              {set1.length === 0 ? (
                <span className={styles.emptySet}>∅</span>
              ) : (
                set1.map(el => (
                  <div 
                    key={el} 
                    className={`${styles.element} ${set2.includes(el) ? styles.shared : ''}`}
                  >
                    {el}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.relationSymbols}>
            {relations.filter(r => checkRelation(r)).map(r => (
              <div key={r.symbol} className={styles.activeSymbol}>{r.symbol}</div>
            ))}
          </div>

          <div className={styles.setDisplay}>
            <h5>{selectedSets[1]}</h5>
            <div className={styles.elementGrid}>
              {set2.length === 0 ? (
                <span className={styles.emptySet}>∅</span>
              ) : (
                set2.map(el => (
                  <div 
                    key={el} 
                    className={`${styles.element} ${set1.includes(el) ? styles.shared : ''}`}
                  >
                    {el}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.properties}>
        <h4>Set Properties:</h4>
        <div className={styles.propertyGrid}>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Cardinality of {selectedSets[0]}:</span>
            <span className={styles.propertyValue}>|{selectedSets[0]}| = {set1.length}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Cardinality of {selectedSets[1]}:</span>
            <span className={styles.propertyValue}>|{selectedSets[1]}| = {set2.length}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Union size:</span>
            <span className={styles.propertyValue}>|{selectedSets[0]} ∪ {selectedSets[1]}| = {unionSize}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Intersection size:</span>
            <span className={styles.propertyValue}>|{selectedSets[0]} ∩ {selectedSets[1]}| = {intersectionSize}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Symmetric difference:</span>
            <span className={styles.propertyValue}>|{selectedSets[0]} △ {selectedSets[1]}| = {symmetricDifferenceSize}</span>
          </div>
          <div className={styles.property}>
            <span className={styles.propertyLabel}>Power set size of {selectedSets[0]}:</span>
            <span className={styles.propertyValue}>|P({selectedSets[0]})| = 2^{set1.length} = {Math.pow(2, set1.length)}</span>
          </div>
        </div>
      </div>

      <div className={styles.exercises}>
        <h4>Exploration Exercises:</h4>
        <ul>
          <li>Create sets where A ⊂ B (proper subset)</li>
          <li>Make two sets equal</li>
          <li>Create disjoint sets (no common elements)</li>
          <li>Find sets where A ⊆ B and B ⊆ A (what does this mean?)</li>
          <li>Create a chain: A ⊂ B ⊂ C</li>
        </ul>
      </div>
    </div>
  );
};

export default SetRelationExplorer;