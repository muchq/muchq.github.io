import React, { useState, useMemo } from 'react';
import styles from './TopologyGenerator.module.css';


const TopologyGenerator: React.FC = () => {
  const [setSize, setSetSize] = useState<number>(3);
  const [selectedSubsets, setSelectedSubsets] = useState<Set<string>>(new Set());
  const [autoComplete, setAutoComplete] = useState<boolean>(false);
  const [showViolations, setShowViolations] = useState<boolean>(true);

  const generateElements = (size: number): string[] => {
    return Array.from({ length: size }, (_, i) => String(i + 1));
  };

  const generatePowerSet = (elements: string[]): string[][] => {
    const powerSet: string[][] = [];
    const n = elements.length;
    for (let i = 0; i < Math.pow(2, n); i++) {
      const subset: string[] = [];
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          subset.push(elements[j]);
        }
      }
      powerSet.push(subset);
    }
    return powerSet;
  };

  const subsetToString = (subset: string[]): string => {
    if (subset.length === 0) return '∅';
    return `{${subset.join(', ')}}`;
  };

  const stringToSubset = (str: string): string[] => {
    if (str === '∅') return [];
    return str.slice(1, -1).split(', ').filter(x => x);
  };

  const elements = generateElements(setSize);
  const powerSet = generatePowerSet(elements);


  const union = (a: string[], b: string[]): string[] => {
    return [...new Set([...a, ...b])];
  };

  const intersection = (a: string[], b: string[]): string[] => {
    return a.filter(elem => b.includes(elem));
  };

  const checkTopologyAxioms = () => {
    const subsets = Array.from(selectedSubsets).map(stringToSubset);
    
    const hasEmptySet = subsets.some(s => s.length === 0);
    const hasFullSet = subsets.some(s => s.length === elements.length);
    
    let finiteUnionsValid = true;
    const unionViolations: string[] = [];
    
    for (let i = 0; i < subsets.length; i++) {
      for (let j = i + 1; j < subsets.length; j++) {
        const u = union(subsets[i], subsets[j]);
        const uStr = subsetToString(u);
        if (!selectedSubsets.has(uStr)) {
          finiteUnionsValid = false;
          unionViolations.push(`${subsetToString(subsets[i])} ∪ ${subsetToString(subsets[j])} = ${uStr}`);
        }
      }
    }
    
    let arbitraryIntersectionsValid = true;
    const intersectionViolations: string[] = [];
    
    for (let i = 0; i < subsets.length; i++) {
      for (let j = i + 1; j < subsets.length; j++) {
        const inter = intersection(subsets[i], subsets[j]);
        const interStr = subsetToString(inter);
        if (!selectedSubsets.has(interStr)) {
          arbitraryIntersectionsValid = false;
          intersectionViolations.push(`${subsetToString(subsets[i])} ∩ ${subsetToString(subsets[j])} = ${interStr}`);
        }
      }
    }
    
    return {
      axiomCheck: {
        emptySet: hasEmptySet,
        fullSet: hasFullSet,
        finiteUnions: finiteUnionsValid,
        arbitraryIntersections: arbitraryIntersectionsValid,
        isTopology: hasEmptySet && hasFullSet && finiteUnionsValid && arbitraryIntersectionsValid
      },
      violations: { unionViolations, intersectionViolations }
    };
  };

  const completeToTopology = () => {
    const newSelected = new Set(selectedSubsets);
    
    newSelected.add('∅');
    newSelected.add(subsetToString(elements));
    
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      const currentSubsets = Array.from(newSelected).map(stringToSubset);
      
      for (let i = 0; i < currentSubsets.length; i++) {
        for (let j = i; j < currentSubsets.length; j++) {
          const u = union(currentSubsets[i], currentSubsets[j]);
          const uStr = subsetToString(u);
          if (!newSelected.has(uStr)) {
            newSelected.add(uStr);
            changed = true;
          }
          
          const inter = intersection(currentSubsets[i], currentSubsets[j]);
          const interStr = subsetToString(inter);
          if (!newSelected.has(interStr)) {
            newSelected.add(interStr);
            changed = true;
          }
        }
      }
    }
    
    setSelectedSubsets(newSelected);
  };

  const { axiomCheck, violations } = useMemo(() => {
    return checkTopologyAxioms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubsets, setSize]);

  const toggleSubset = (subset: string[]) => {
    const str = subsetToString(subset);
    const newSelected = new Set(selectedSubsets);
    
    if (newSelected.has(str)) {
      newSelected.delete(str);
    } else {
      newSelected.add(str);
      
      if (autoComplete) {
        newSelected.add('∅');
        newSelected.add(subsetToString(elements));
      }
    }
    
    setSelectedSubsets(newSelected);
  };

  const clearSelection = () => {
    setSelectedSubsets(new Set());
  };

  const selectStandardTopology = (type: 'trivial' | 'discrete' | 'cofinite') => {
    const newSelected = new Set<string>();
    
    switch (type) {
      case 'trivial':
        newSelected.add('∅');
        newSelected.add(subsetToString(elements));
        break;
      case 'discrete':
        powerSet.forEach(subset => {
          newSelected.add(subsetToString(subset));
        });
        break;
      case 'cofinite':
        newSelected.add('∅');
        newSelected.add(subsetToString(elements));
        powerSet.forEach(subset => {
          if (elements.length - subset.length <= 1) {
            newSelected.add(subsetToString(subset));
          }
        });
        break;
    }
    
    setSelectedSubsets(newSelected);
  };

  return (
    <div className={styles.generator}>
      <div className={styles.instructions}>
        <h3>Topology Generator</h3>
        <p>Build topologies on finite sets by selecting subsets. The system verifies topology axioms and can automatically complete your selection to form a valid topology.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <div className={styles.controlGroup}>
            <label>Set Size: X = {'{'}1, ..., {setSize}{'}'}</label>
            <input
              type="range"
              min="2"
              max="5"
              value={setSize}
              onChange={(e) => {
                setSetSize(parseInt(e.target.value));
                setSelectedSubsets(new Set());
              }}
              className={styles.slider}
            />
          </div>

          <div className={styles.toggles}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={autoComplete}
                onChange={(e) => setAutoComplete(e.target.checked)}
              />
              Auto-add ∅ and X
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showViolations}
                onChange={(e) => setShowViolations(e.target.checked)}
              />
              Show violations
            </label>
          </div>
        </div>

        <div className={styles.standardTopologies}>
          <span>Standard topologies:</span>
          <button onClick={() => selectStandardTopology('trivial')}>Trivial</button>
          <button onClick={() => selectStandardTopology('discrete')}>Discrete</button>
          <button onClick={() => selectStandardTopology('cofinite')}>Cofinite</button>
          <button onClick={clearSelection}>Clear All</button>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.powerSet}>
          <h4>Power Set P(X)</h4>
          <div className={styles.subsetGrid}>
            {powerSet.map((subset, index) => {
              const str = subsetToString(subset);
              const isSelected = selectedSubsets.has(str);
              const isRequired = (subset.length === 0 || subset.length === elements.length) && 
                               axiomCheck.isTopology;
              
              return (
                <div
                  key={index}
                  className={`${styles.subset} ${isSelected ? styles.selected : ''} ${isRequired ? styles.required : ''}`}
                  onClick={() => toggleSubset(subset)}
                >
                  {str}
                </div>
              );
            })}
          </div>
          <p className={styles.stats}>
            Selected: {selectedSubsets.size} / {powerSet.length} subsets
          </p>
        </div>

        <div className={styles.verification}>
          <h4>Topology Axiom Verification</h4>
          
          <div className={styles.axiomList}>
            <div className={`${styles.axiom} ${axiomCheck.emptySet ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {axiomCheck.emptySet ? '✓' : '✗'}
              </span>
              <div>
                <strong>Empty set ∅ ∈ τ</strong>
                {!axiomCheck.emptySet && <p className={styles.hint}>The empty set must be in the topology</p>}
              </div>
            </div>

            <div className={`${styles.axiom} ${axiomCheck.fullSet ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {axiomCheck.fullSet ? '✓' : '✗'}
              </span>
              <div>
                <strong>Full set X ∈ τ</strong>
                {!axiomCheck.fullSet && <p className={styles.hint}>The entire set X must be in the topology</p>}
              </div>
            </div>

            <div className={`${styles.axiom} ${axiomCheck.finiteUnions ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {axiomCheck.finiteUnions ? '✓' : '✗'}
              </span>
              <div>
                <strong>Closed under finite unions</strong>
                {!axiomCheck.finiteUnions && showViolations && violations.unionViolations.length > 0 && (
                  <div className={styles.violations}>
                    <p className={styles.hint}>Missing unions:</p>
                    {violations.unionViolations.slice(0, 3).map((v, i) => (
                      <p key={i} className={styles.violation}>{v}</p>
                    ))}
                    {violations.unionViolations.length > 3 && (
                      <p className={styles.violation}>... and {violations.unionViolations.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`${styles.axiom} ${axiomCheck.arbitraryIntersections ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {axiomCheck.arbitraryIntersections ? '✓' : '✗'}
              </span>
              <div>
                <strong>Closed under finite intersections</strong>
                {!axiomCheck.arbitraryIntersections && showViolations && violations.intersectionViolations.length > 0 && (
                  <div className={styles.violations}>
                    <p className={styles.hint}>Missing intersections:</p>
                    {violations.intersectionViolations.slice(0, 3).map((v, i) => (
                      <p key={i} className={styles.violation}>{v}</p>
                    ))}
                    {violations.intersectionViolations.length > 3 && (
                      <p className={styles.violation}>... and {violations.intersectionViolations.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={`${styles.result} ${axiomCheck.isTopology ? styles.valid : styles.invalid}`}>
              {axiomCheck.isTopology ? 
                '✓ This is a valid topology!' : 
                '✗ Not yet a topology - see failed axioms above'}
            </div>

            {!axiomCheck.isTopology && (
              <button 
                className={styles.completeButton}
                onClick={completeToTopology}
              >
                Complete to Minimal Topology
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Start with a few subsets and use "Complete to Minimal Topology" to see the smallest topology containing them</li>
          <li>The trivial topology has only ∅ and X - it's the coarsest topology</li>
          <li>The discrete topology has all subsets - it's the finest topology</li>
          <li>The cofinite topology: open sets are ∅, X, and complements of finite sets</li>
          <li>Every intersection and union of open sets must also be open</li>
        </ul>
      </div>
    </div>
  );
};

export default TopologyGenerator;