import React, { useState, useEffect } from 'react';
import styles from './BasisBuilder.module.css';

interface BasisElement {
  id: string;
  elements: string[];
  color: string;
}

const BasisBuilder: React.FC = () => {
  const [setSize, setSetSize] = useState<number>(5);
  const [basisElements, setBasisElements] = useState<BasisElement[]>([]);
  const [generatedTopology, setGeneratedTopology] = useState<Set<string>>(new Set());
  const [showSteps, setShowSteps] = useState<boolean>(false);
  const [subbasisMode, setSubbasisMode] = useState<boolean>(false);

  const generateElements = (size: number): string[] => {
    return Array.from({ length: size }, (_, i) => String(i + 1));
  };

  const elements = generateElements(setSize);

  const subsetToString = (subset: string[]): string => {
    if (subset.length === 0) return '∅';
    return `{${subset.join(', ')}}`;
  };

  const stringToSubset = (str: string): string[] => {
    if (str === '∅') return [];
    return str.slice(1, -1).split(', ').filter(x => x);
  };

  const getRandomColor = (): string => {
    const colors = [
      'rgba(255, 99, 132, 0.3)',
      'rgba(54, 162, 235, 0.3)',
      'rgba(255, 206, 86, 0.3)',
      'rgba(75, 192, 192, 0.3)',
      'rgba(153, 102, 255, 0.3)',
      'rgba(255, 159, 64, 0.3)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const union = (a: string[], b: string[]): string[] => {
    return [...new Set([...a, ...b])];
  };

  const intersection = (a: string[], b: string[]): string[] => {
    return a.filter(elem => b.includes(elem));
  };

  const generateTopologyFromBasis = () => {
    const topology = new Set<string>();
    topology.add('∅');
    
    if (subbasisMode) {
      const allFiniteIntersections = new Set<string>();
      allFiniteIntersections.add(subsetToString(elements));
      
      for (let size = 1; size <= basisElements.length; size++) {
        const combinations = getCombinations(basisElements, size);
        for (const combo of combinations) {
          let result = elements;
          for (const basis of combo) {
            result = intersection(result, basis.elements);
          }
          allFiniteIntersections.add(subsetToString(result));
        }
      }
      
      for (const inter of allFiniteIntersections) {
        topology.add(inter);
      }
      
      const basisSets = Array.from(allFiniteIntersections).map(stringToSubset);
      const powerSetSize = Math.pow(2, basisSets.length);
      for (let i = 0; i < Math.min(powerSetSize, 1000); i++) {
        let unionResult: string[] = [];
        for (let j = 0; j < basisSets.length; j++) {
          if (i & (1 << j)) {
            unionResult = union(unionResult, basisSets[j]);
          }
        }
        topology.add(subsetToString(unionResult));
      }
    } else {
      basisElements.forEach(basis => {
        topology.add(subsetToString(basis.elements));
      });
      
      const basisSets = basisElements.map(b => b.elements);
      const powerSetSize = Math.pow(2, basisSets.length);
      for (let i = 0; i < Math.min(powerSetSize, 1000); i++) {
        let unionResult: string[] = [];
        for (let j = 0; j < basisSets.length; j++) {
          if (i & (1 << j)) {
            unionResult = union(unionResult, basisSets[j]);
          }
        }
        topology.add(subsetToString(unionResult));
      }
    }
    
    setGeneratedTopology(topology);
  };

  const getCombinations = <T,>(arr: T[], size: number): T[][] => {
    if (size === 1) return arr.map(el => [el]);
    const combinations: T[][] = [];
    for (let i = 0; i <= arr.length - size; i++) {
      const head = arr.slice(i, i + 1);
      const tailCombinations = getCombinations(arr.slice(i + 1), size - 1);
      for (const tail of tailCombinations) {
        combinations.push([...head, ...tail]);
      }
    }
    return combinations;
  };

  const addBasisElement = (subset: string[]) => {
    const newBasis: BasisElement = {
      id: Date.now().toString(),
      elements: subset,
      color: getRandomColor()
    };
    setBasisElements([...basisElements, newBasis]);
  };

  const removeBasisElement = (id: string) => {
    setBasisElements(basisElements.filter(b => b.id !== id));
  };

  const addInterval = (start: number, end: number) => {
    const interval = elements.filter(e => {
      const num = parseInt(e);
      return num >= start && num <= end;
    });
    if (interval.length > 0) {
      addBasisElement(interval);
    }
  };

  const loadPresetBasis = (preset: string) => {
    setBasisElements([]);
    
    switch (preset) {
      case 'intervals':
        for (let i = 1; i <= setSize; i++) {
          for (let j = i; j <= setSize; j++) {
            const interval = elements.slice(i - 1, j);
            if (interval.length > 0) {
              setTimeout(() => addBasisElement(interval), (i + j) * 50);
            }
          }
        }
        break;
      case 'singletons':
        elements.forEach((e, i) => {
          setTimeout(() => addBasisElement([e]), i * 100);
        });
        break;
      case 'opens':
        for (let i = 0; i < setSize - 1; i++) {
          const openSet = elements.slice(i);
          setTimeout(() => addBasisElement(openSet), i * 100);
        }
        break;
      case 'covers': {
        const mid = Math.floor(setSize / 2);
        setTimeout(() => addBasisElement(elements.slice(0, mid + 1)), 100);
        setTimeout(() => addBasisElement(elements.slice(mid)), 200);
        break;
      }
    }
  };

  useEffect(() => {
    if (basisElements.length > 0) {
      generateTopologyFromBasis();
    } else {
      setGeneratedTopology(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basisElements, subbasisMode]);

  const checkBasisCoverage = (): boolean => {
    const covered = new Set<string>();
    basisElements.forEach(basis => {
      basis.elements.forEach(e => covered.add(e));
    });
    return covered.size === elements.length;
  };

  const checkBasisIntersectionProperty = (): boolean => {
    for (let i = 0; i < basisElements.length; i++) {
      for (let j = i + 1; j < basisElements.length; j++) {
        const inter = intersection(basisElements[i].elements, basisElements[j].elements);
        if (inter.length > 0) {
          let canBeCovered = false;
          for (const point of inter) {
            let pointCovered = false;
            for (const basis of basisElements) {
              if (basis.elements.includes(point) && 
                  basis.elements.every(e => inter.includes(e))) {
                pointCovered = true;
                break;
              }
            }
            if (!pointCovered) {
              canBeCovered = false;
              break;
            }
            canBeCovered = true;
          }
          if (!canBeCovered && inter.length > 0) {
            return false;
          }
        }
      }
    }
    return true;
  };


  return (
    <div className={styles.builder}>
      <div className={styles.instructions}>
        <h3>Basis Builder</h3>
        <p>Construct topologies from bases and subbases. See how basis elements generate open sets through unions and understand the basis axioms.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <div className={styles.controlGroup}>
            <label>Set Size: X = {'{'}1, ..., {setSize}{'}'}</label>
            <input
              type="range"
              min="3"
              max="7"
              value={setSize}
              onChange={(e) => {
                setSetSize(parseInt(e.target.value));
                setBasisElements([]);
              }}
              className={styles.slider}
            />
          </div>

          <div className={styles.toggles}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={subbasisMode}
                onChange={(e) => setSubbasisMode(e.target.checked)}
              />
              Subbasis Mode
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showSteps}
                onChange={(e) => setShowSteps(e.target.checked)}
              />
              Show Generation Steps
            </label>
          </div>
        </div>

        <div className={styles.presets}>
          <span>Preset Bases:</span>
          <button onClick={() => loadPresetBasis('intervals')}>Interval Basis</button>
          <button onClick={() => loadPresetBasis('singletons')}>Singleton Basis</button>
          <button onClick={() => loadPresetBasis('opens')}>Open Ray Basis</button>
          <button onClick={() => loadPresetBasis('covers')}>Simple Cover</button>
          <button onClick={() => setBasisElements([])}>Clear</button>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.basisSection}>
          <h4>{subbasisMode ? 'Subbasis' : 'Basis'} Elements</h4>
          
          <div className={styles.elementSelector}>
            <p>Click to add subsets to the {subbasisMode ? 'subbasis' : 'basis'}:</p>
            <div className={styles.quickAdd}>
              {elements.map(e => (
                <button
                  key={e}
                  className={styles.elementButton}
                  onClick={() => addBasisElement([e])}
                >
                  {'{' + e + '}'}
                </button>
              ))}
              <button
                className={styles.elementButton}
                onClick={() => addBasisElement(elements)}
              >
                X
              </button>
            </div>
            
            <div className={styles.intervalAdd}>
              <label>Add interval [a, b]:</label>
              <div className={styles.intervalControls}>
                <input
                  type="number"
                  min="1"
                  max={setSize}
                  placeholder="start"
                  id="interval-start"
                  className={styles.intervalInput}
                />
                <span>to</span>
                <input
                  type="number"
                  min="1"
                  max={setSize}
                  placeholder="end"
                  id="interval-end"
                  className={styles.intervalInput}
                />
                <button
                  onClick={() => {
                    const start = parseInt((document.getElementById('interval-start') as HTMLInputElement).value);
                    const end = parseInt((document.getElementById('interval-end') as HTMLInputElement).value);
                    if (!isNaN(start) && !isNaN(end)) {
                      addInterval(start, end);
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className={styles.basisList}>
            {basisElements.map(basis => (
              <div
                key={basis.id}
                className={styles.basisElement}
                style={{ backgroundColor: basis.color }}
              >
                <span>{subsetToString(basis.elements)}</span>
                <button
                  className={styles.removeButton}
                  onClick={() => removeBasisElement(basis.id)}
                >
                  ×
                </button>
              </div>
            ))}
            {basisElements.length === 0 && (
              <p className={styles.emptyMessage}>No basis elements selected</p>
            )}
          </div>

          <div className={styles.validation}>
            <h5>Basis Properties:</h5>
            <div className={`${styles.property} ${checkBasisCoverage() ? styles.valid : styles.invalid}`}>
              <span>{checkBasisCoverage() ? '✓' : '✗'}</span>
              Coverage: Every point is in some basis element
            </div>
            {!subbasisMode && (
              <div className={`${styles.property} ${checkBasisIntersectionProperty() ? styles.valid : styles.invalid}`}>
                <span>{checkBasisIntersectionProperty() ? '✓' : '✗'}</span>
                Intersection: B₁ ∩ B₂ can be written as union of basis elements
              </div>
            )}
          </div>
        </div>

        <div className={styles.topologySection}>
          <h4>Generated Topology</h4>
          <p className={styles.generationInfo}>
            {subbasisMode 
              ? 'Topology = all unions of finite intersections of subbasis elements'
              : 'Topology = {∅} ∪ all unions of basis elements'}
          </p>
          
          <div className={styles.topologyList}>
            {Array.from(generatedTopology).sort((a, b) => {
              const aLen = stringToSubset(a).length;
              const bLen = stringToSubset(b).length;
              if (aLen !== bLen) return aLen - bLen;
              return a.localeCompare(b);
            }).map(openSet => (
              <div key={openSet} className={styles.openSet}>
                {openSet}
              </div>
            ))}
            {generatedTopology.size === 0 && (
              <p className={styles.emptyMessage}>Add basis elements to generate topology</p>
            )}
          </div>
          
          <p className={styles.stats}>
            Generated {generatedTopology.size} open sets
          </p>
        </div>
      </div>

      {showSteps && basisElements.length > 0 && (
        <div className={styles.steps}>
          <h4>Generation Steps:</h4>
          <ol>
            <li>Start with ∅ (always in topology)</li>
            {subbasisMode ? (
              <>
                <li>Form all finite intersections of subbasis elements</li>
                <li>Take all possible unions of these intersections</li>
              </>
            ) : (
              <>
                <li>Add all basis elements to topology</li>
                <li>Form all possible unions of basis elements</li>
              </>
            )}
            <li>Result: {generatedTopology.size} open sets form the topology</li>
          </ol>
        </div>
      )}

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>The interval basis generates the standard topology on finite ordered sets</li>
          <li>Singleton basis generates the discrete topology</li>
          <li>A subbasis needs only to cover X - no intersection property required</li>
          <li>Every topology has many different bases</li>
          <li>Try combining different types of sets to create interesting topologies</li>
        </ul>
      </div>
    </div>
  );
};

export default BasisBuilder;