import React, { useState } from 'react';
import styles from './OpenSetInvestigator.module.css';

type TopologyType = 'trivial' | 'discrete' | 'cofinite' | 'cocountable' | 'particular' | 'sierpinski';

interface TopologyDefinition {
  name: string;
  description: string;
  generateOpenSets: (elements: string[]) => Set<string>;
}

const OpenSetInvestigator: React.FC = () => {
  const [setSize, setSetSize] = useState<number>(4);
  const [selectedTopologies, setSelectedTopologies] = useState<Set<TopologyType>>(
    new Set(['trivial', 'discrete'])
  );
  const [highlightedSet, setHighlightedSet] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<boolean>(true);

  const generateElements = (size: number): string[] => {
    return Array.from({ length: size }, (_, i) => String(i + 1));
  };

  const elements = generateElements(setSize);

  const subsetToString = (subset: string[]): string => {
    if (subset.length === 0) return '∅';
    return `{${subset.join(', ')}}`;
  };

  const generatePowerSet = (elems: string[]): string[][] => {
    const powerSet: string[][] = [];
    const n = elems.length;
    for (let i = 0; i < Math.pow(2, n); i++) {
      const subset: string[] = [];
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) {
          subset.push(elems[j]);
        }
      }
      powerSet.push(subset);
    }
    return powerSet;
  };

  const topologyDefinitions: Record<TopologyType, TopologyDefinition> = {
    trivial: {
      name: 'Trivial',
      description: 'Only ∅ and X are open',
      generateOpenSets: (elems) => {
        const sets = new Set<string>();
        sets.add('∅');
        sets.add(subsetToString(elems));
        return sets;
      }
    },
    discrete: {
      name: 'Discrete',
      description: 'All subsets are open',
      generateOpenSets: (elems) => {
        const sets = new Set<string>();
        const powerSet = generatePowerSet(elems);
        powerSet.forEach(subset => {
          sets.add(subsetToString(subset));
        });
        return sets;
      }
    },
    cofinite: {
      name: 'Cofinite',
      description: 'Open sets are ∅, X, and complements of finite sets',
      generateOpenSets: (elems) => {
        const sets = new Set<string>();
        sets.add('∅');
        sets.add(subsetToString(elems));
        const powerSet = generatePowerSet(elems);
        powerSet.forEach(subset => {
          if (elems.length - subset.length <= 1) {
            sets.add(subsetToString(subset));
          }
        });
        return sets;
      }
    },
    cocountable: {
      name: 'Cocountable',
      description: 'Open sets are ∅, X, and complements of countable sets (same as cofinite for finite X)',
      generateOpenSets: (elems) => {
        const sets = new Set<string>();
        sets.add('∅');
        sets.add(subsetToString(elems));
        const powerSet = generatePowerSet(elems);
        powerSet.forEach(subset => {
          if (elems.length - subset.length <= 1) {
            sets.add(subsetToString(subset));
          }
        });
        return sets;
      }
    },
    particular: {
      name: 'Particular Point',
      description: 'Open sets are ∅ and all sets containing point 1',
      generateOpenSets: (elems) => {
        const sets = new Set<string>();
        sets.add('∅');
        const powerSet = generatePowerSet(elems);
        powerSet.forEach(subset => {
          if (subset.includes('1')) {
            sets.add(subsetToString(subset));
          }
        });
        return sets;
      }
    },
    sierpinski: {
      name: 'Sierpiński',
      description: 'On {1,2}: open sets are ∅, {1}, and {1,2}',
      generateOpenSets: (elems) => {
        const sets = new Set<string>();
        if (elems.length >= 2) {
          sets.add('∅');
          sets.add('{1}');
          sets.add(subsetToString(elems));
        }
        return sets;
      }
    }
  };

  const allSubsets = generatePowerSet(elements);

  const isOpenIn = (subset: string, topology: TopologyType): boolean => {
    const openSets = topologyDefinitions[topology].generateOpenSets(elements);
    return openSets.has(subset);
  };

  const toggleTopology = (topology: TopologyType) => {
    const newSelected = new Set(selectedTopologies);
    if (newSelected.has(topology)) {
      if (newSelected.size > 1) {
        newSelected.delete(topology);
      }
    } else {
      newSelected.add(topology);
    }
    setSelectedTopologies(newSelected);
  };

  const getOpenSetCount = (topology: TopologyType): number => {
    return topologyDefinitions[topology].generateOpenSets(elements).size;
  };

  const compareTopologies = (t1: TopologyType, t2: TopologyType): 'finer' | 'coarser' | 'incomparable' => {
    const sets1 = topologyDefinitions[t1].generateOpenSets(elements);
    const sets2 = topologyDefinitions[t2].generateOpenSets(elements);
    
    const t1SubsetT2 = Array.from(sets1).every(s => sets2.has(s));
    const t2SubsetT1 = Array.from(sets2).every(s => sets1.has(s));
    
    if (t1SubsetT2 && t2SubsetT1) return 'incomparable';
    if (t1SubsetT2) return 'coarser';
    if (t2SubsetT1) return 'finer';
    return 'incomparable';
  };

  return (
    <div className={styles.investigator}>
      <div className={styles.instructions}>
        <h3>Open Set Investigator</h3>
        <p>Compare different topologies on the same set. See which sets are open in each topology and understand the relationships between different topological structures.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>Set Size: X = {'{'}1, ..., {setSize}{'}'}</label>
          <input
            type="range"
            min="2"
            max="5"
            value={setSize}
            onChange={(e) => setSetSize(parseInt(e.target.value))}
            className={styles.slider}
          />
        </div>

        <div className={styles.toggleGroup}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.checked)}
            />
            Comparison Mode
          </label>
        </div>
      </div>

      <div className={styles.topologySelector}>
        <h4>Select Topologies to Compare:</h4>
        <div className={styles.topologyButtons}>
          {(Object.keys(topologyDefinitions) as TopologyType[]).map(topology => (
            <button
              key={topology}
              className={`${styles.topologyButton} ${selectedTopologies.has(topology) ? styles.selected : ''}`}
              onClick={() => toggleTopology(topology)}
            >
              <span className={styles.topologyName}>{topologyDefinitions[topology].name}</span>
              <span className={styles.openSetCount}>({getOpenSetCount(topology)} open sets)</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.comparison}>
        <div className={styles.topologyColumns}>
          {Array.from(selectedTopologies).map(topology => (
            <div key={topology} className={styles.topologyColumn}>
              <h4>{topologyDefinitions[topology].name}</h4>
              <p className={styles.topologyDescription}>
                {topologyDefinitions[topology].description}
              </p>
              <div className={styles.openSetsList}>
                {allSubsets.map(subset => {
                  const subsetStr = subsetToString(subset);
                  const isOpen = isOpenIn(subsetStr, topology);
                  return (
                    <div
                      key={subsetStr}
                      className={`${styles.setItem} ${isOpen ? styles.open : styles.closed}`}
                      onMouseEnter={() => setHighlightedSet(subsetStr)}
                      onMouseLeave={() => setHighlightedSet(null)}
                      style={{
                        transform: highlightedSet === subsetStr ? 'scale(1.05)' : 'scale(1)',
                        fontWeight: highlightedSet === subsetStr ? '600' : '400'
                      }}
                    >
                      {subsetStr}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {comparisonMode && selectedTopologies.size === 2 && (
          <div className={styles.comparisonResult}>
            {(() => {
              const [t1, t2] = Array.from(selectedTopologies);
              const comparison = compareTopologies(t1, t2);
              const t1Name = topologyDefinitions[t1].name;
              const t2Name = topologyDefinitions[t2].name;
              
              const message = comparison === 'finer'
                ? `${t1Name} topology is finer than ${t2Name} topology`
                : comparison === 'coarser'
                  ? `${t1Name} topology is coarser than ${t2Name} topology`
                  : `${t1Name} and ${t2Name} topologies are incomparable`;
              
              return (
                <div className={styles.comparisonMessage}>
                  <strong>Comparison Result:</strong>
                  <p>{message}</p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <div className={styles.legend}>
        <h4>Legend:</h4>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.open}`}></span>
            Open set in this topology
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.closed}`}></span>
            Not open in this topology
          </div>
        </div>
      </div>

      <div className={styles.insights}>
        <h4>Key Insights:</h4>
        <ul>
          <li>The discrete topology has the most open sets (all {Math.pow(2, setSize)} subsets)</li>
          <li>The trivial topology has the fewest open sets (only 2)</li>
          <li>A topology τ₁ is finer than τ₂ if τ₁ ⊇ τ₂</li>
          <li>Hover over sets to see them highlighted across all topologies</li>
          <li>The particular point topology makes neighborhoods of point 1 special</li>
        </ul>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Compare trivial and discrete to see the extremes of coarse and fine</li>
          <li>Notice how cofinite topology has "almost all" large sets as open</li>
          <li>The Sierpiński topology is the simplest non-trivial topology on two points</li>
          <li>Particular point topology demonstrates non-Hausdorff behavior</li>
          <li>Select exactly two topologies to see their relationship</li>
        </ul>
      </div>
    </div>
  );
};

export default OpenSetInvestigator;