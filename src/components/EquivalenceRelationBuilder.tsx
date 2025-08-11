import React, { useState, useCallback, useMemo } from 'react';
import styles from './EquivalenceRelationBuilder.module.css';

interface Relation {
  from: number;
  to: number;
}

interface Partition {
  id: string;
  elements: number[];
  color: string;
}

const EquivalenceRelationBuilder: React.FC = () => {
  const elements = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8], []);
  const colors = useMemo(() => ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#DDA0DD', '#98D8C8', '#FFB6C1'], []);
  
  const [relations, setRelations] = useState<Relation[]>([]);
  const [mode, setMode] = useState<'manual' | 'partition'>('manual');
  const [partitions, setPartitions] = useState<Partition[]>([]);

  const isReflexive = useMemo(() => {
    return elements.every(el => 
      relations.some(r => r.from === el && r.to === el)
    );
  }, [relations, elements]);

  const isSymmetric = useMemo(() => {
    return relations.every(r => 
      relations.some(r2 => r2.from === r.to && r2.to === r.from)
    );
  }, [relations]);

  const isTransitive = useMemo(() => {
    for (const r1 of relations) {
      for (const r2 of relations) {
        if (r1.to === r2.from) {
          if (!relations.some(r3 => r3.from === r1.from && r3.to === r2.to)) {
            return false;
          }
        }
      }
    }
    return true;
  }, [relations]);

  const isEquivalence = useMemo(() => {
    return isReflexive && isSymmetric && isTransitive;
  }, [isReflexive, isSymmetric, isTransitive]);

  const getEquivalenceClasses = useCallback((): number[][] => {
    if (!isEquivalence) return [];
    
    const classes: number[][] = [];
    const visited = new Set<number>();
    
    for (const element of elements) {
      if (!visited.has(element)) {
        const equivalenceClass = elements.filter(el => 
          relations.some(r => r.from === element && r.to === el) ||
          relations.some(r => r.from === el && r.to === element)
        );
        
        if (equivalenceClass.length > 0) {
          classes.push(equivalenceClass);
          equivalenceClass.forEach(el => visited.add(el));
        }
      }
    }
    
    return classes;
  }, [relations, isEquivalence, elements]);

  const toggleRelation = useCallback((from: number, to: number) => {
    const existing = relations.findIndex(r => r.from === from && r.to === to);
    if (existing >= 0) {
      setRelations(relations.filter((_, i) => i !== existing));
    } else {
      setRelations([...relations, { from, to }]);
    }
  }, [relations]);


  const makeReflexive = useCallback(() => {
    const newRelations = [...relations];
    elements.forEach(el => {
      if (!newRelations.some(r => r.from === el && r.to === el)) {
        newRelations.push({ from: el, to: el });
      }
    });
    setRelations(newRelations);
  }, [relations, elements]);

  const makeSymmetric = useCallback(() => {
    const newRelations = [...relations];
    relations.forEach(r => {
      if (!newRelations.some(r2 => r2.from === r.to && r2.to === r.from)) {
        newRelations.push({ from: r.to, to: r.from });
      }
    });
    setRelations(newRelations);
  }, [relations]);

  const makeTransitive = useCallback(() => {
    const newRelations = [...relations];
    let changed = true;
    
    while (changed) {
      changed = false;
      for (const r1 of newRelations) {
        for (const r2 of newRelations) {
          if (r1.to === r2.from) {
            if (!newRelations.some(r3 => r3.from === r1.from && r3.to === r2.to)) {
              newRelations.push({ from: r1.from, to: r2.to });
              changed = true;
            }
          }
        }
      }
    }
    
    setRelations(newRelations);
  }, [relations]);

  const clearRelations = useCallback(() => {
    setRelations([]);
    setPartitions([]);
  }, []);

  const createPartition = useCallback(() => {
    const newPartition: Partition = {
      id: Date.now().toString(),
      elements: [],
      color: colors[partitions.length % colors.length],
    };
    setPartitions([...partitions, newPartition]);
  }, [partitions, colors]);

  const addToPartition = useCallback((partitionId: string, element: number) => {
    const newPartitions = partitions.map(p => {
      if (p.id === partitionId) {
        if (!p.elements.includes(element)) {
          return { ...p, elements: [...p.elements, element] };
        }
      } else {
        return { ...p, elements: p.elements.filter(el => el !== element) };
      }
      return p;
    });
    setPartitions(newPartitions);
    
    // Update relations based on partitions
    const newRelations: Relation[] = [];
    newPartitions.forEach(partition => {
      partition.elements.forEach(el1 => {
        partition.elements.forEach(el2 => {
          newRelations.push({ from: el1, to: el2 });
        });
      });
    });
    setRelations(newRelations);
  }, [partitions]);

  const deletePartition = useCallback((partitionId: string) => {
    const newPartitions = partitions.filter(p => p.id !== partitionId);
    setPartitions(newPartitions);
    
    // Update relations
    const newRelations: Relation[] = [];
    newPartitions.forEach(partition => {
      partition.elements.forEach(el1 => {
        partition.elements.forEach(el2 => {
          newRelations.push({ from: el1, to: el2 });
        });
      });
    });
    setRelations(newRelations);
  }, [partitions]);

  const loadPreset = useCallback((preset: string) => {
    clearRelations();
    
    switch (preset) {
      case 'modulo3': {
        setPartitions([
          { id: '1', elements: [3, 6], color: colors[0] },
          { id: '2', elements: [1, 4, 7], color: colors[1] },
          { id: '3', elements: [2, 5, 8], color: colors[2] },
        ]);
        setMode('partition');
        break;
      }
      case 'evenOdd': {
        setPartitions([
          { id: '1', elements: [2, 4, 6, 8], color: colors[0] },
          { id: '2', elements: [1, 3, 5, 7], color: colors[1] },
        ]);
        setMode('partition');
        break;
      }
      case 'identity': {
        const identityRelations: Relation[] = [];
        elements.forEach(el => {
          identityRelations.push({ from: el, to: el });
        });
        setRelations(identityRelations);
        setMode('manual');
        break;
      }
      case 'complete': {
        const completeRelations: Relation[] = [];
        elements.forEach(el1 => {
          elements.forEach(el2 => {
            completeRelations.push({ from: el1, to: el2 });
          });
        });
        setRelations(completeRelations);
        setMode('manual');
        break;
      }
    }
  }, [clearRelations, colors, elements]);

  const hasRelation = useCallback((from: number, to: number): boolean => {
    return relations.some(r => r.from === from && r.to === to);
  }, [relations]);

  const getPartitionForElement = useCallback((element: number): Partition | undefined => {
    return partitions.find(p => p.elements.includes(element));
  }, [partitions]);

  return (
    <div className={styles.builder}>
      <div className={styles.instructions}>
        <h3>Equivalence Relation Builder</h3>
        <p>Create equivalence relations by building partitions or manually adding relations. Check reflexive, symmetric, and transitive properties.</p>
      </div>

      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeButton} ${mode === 'manual' ? styles.active : ''}`}
          onClick={() => setMode('manual')}
        >
          Manual Relations
        </button>
        <button
          className={`${styles.modeButton} ${mode === 'partition' ? styles.active : ''}`}
          onClick={() => setMode('partition')}
        >
          Build from Partitions
        </button>
      </div>

      <div className={styles.presets}>
        <h4>Load Preset:</h4>
        <div className={styles.presetButtons}>
          <button className={styles.presetButton} onClick={() => loadPreset('modulo3')}>
            Modulo 3
          </button>
          <button className={styles.presetButton} onClick={() => loadPreset('evenOdd')}>
            Even/Odd
          </button>
          <button className={styles.presetButton} onClick={() => loadPreset('identity')}>
            Identity
          </button>
          <button className={styles.presetButton} onClick={() => loadPreset('complete')}>
            Complete
          </button>
        </div>
      </div>

      {mode === 'manual' ? (
        <div className={styles.matrixContainer}>
          <h4>Relation Matrix (click cells to toggle):</h4>
          <div className={styles.matrix}>
            <div className={styles.matrixHeader}>
              <div className={styles.cornerCell}></div>
              {elements.map(el => (
                <div key={el} className={styles.headerCell}>{el}</div>
              ))}
            </div>
            {elements.map(row => (
              <div key={row} className={styles.matrixRow}>
                <div className={styles.headerCell}>{row}</div>
                {elements.map(col => (
                  <div
                    key={`${row}-${col}`}
                    className={`${styles.matrixCell} ${hasRelation(row, col) ? styles.active : ''}`}
                    onClick={() => toggleRelation(row, col)}
                  >
                    {hasRelation(row, col) ? '●' : '○'}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className={styles.quickActions}>
            <button className={styles.actionButton} onClick={makeReflexive}>
              Make Reflexive
            </button>
            <button className={styles.actionButton} onClick={makeSymmetric}>
              Make Symmetric
            </button>
            <button className={styles.actionButton} onClick={makeTransitive}>
              Make Transitive
            </button>
            <button className={styles.clearButton} onClick={clearRelations}>
              Clear All
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.partitionBuilder}>
          <h4>Build Partitions:</h4>
          <div className={styles.elements}>
            <div className={styles.elementPool}>
              <h5>Available Elements:</h5>
              <div className={styles.elementList}>
                {elements.map(el => {
                  const partition = getPartitionForElement(el);
                  return (
                    <div
                      key={el}
                      className={`${styles.element} ${partition ? styles.assigned : ''}`}
                      style={partition ? { backgroundColor: partition.color } : {}}
                    >
                      {el}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.partitionList}>
              {partitions.map(partition => (
                <div key={partition.id} className={styles.partition} style={{ borderColor: partition.color }}>
                  <div className={styles.partitionHeader}>
                    <span>Partition</span>
                    <button 
                      className={styles.deleteButton}
                      onClick={() => deletePartition(partition.id)}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.partitionElements}>
                    {partition.elements.length === 0 ? (
                      <span className={styles.emptyMessage}>Click elements to add</span>
                    ) : (
                      partition.elements.map(el => (
                        <div
                          key={el}
                          className={styles.partitionElement}
                          style={{ backgroundColor: partition.color }}
                          onClick={() => addToPartition(partition.id, el)}
                        >
                          {el}
                        </div>
                      ))
                    )}
                  </div>
                  <div className={styles.addElements}>
                    {elements
                      .filter(el => !partition.elements.includes(el))
                      .map(el => (
                        <button
                          key={el}
                          className={styles.addElementButton}
                          onClick={() => addToPartition(partition.id, el)}
                        >
                          +{el}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
              <button className={styles.newPartitionButton} onClick={createPartition}>
                + New Partition
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.properties}>
        <h4>Properties Check:</h4>
        <div className={styles.propertyList}>
          <div className={`${styles.property} ${isReflexive ? styles.satisfied : styles.notSatisfied}`}>
            <span className={styles.propertyName}>Reflexive</span>
            <span className={styles.propertyStatus}>{isReflexive ? '✓' : '✗'}</span>
            <span className={styles.propertyDescription}>
              ∀x: (x, x) ∈ R
            </span>
          </div>

          <div className={`${styles.property} ${isSymmetric ? styles.satisfied : styles.notSatisfied}`}>
            <span className={styles.propertyName}>Symmetric</span>
            <span className={styles.propertyStatus}>{isSymmetric ? '✓' : '✗'}</span>
            <span className={styles.propertyDescription}>
              (x, y) ∈ R → (y, x) ∈ R
            </span>
          </div>

          <div className={`${styles.property} ${isTransitive ? styles.satisfied : styles.notSatisfied}`}>
            <span className={styles.propertyName}>Transitive</span>
            <span className={styles.propertyStatus}>{isTransitive ? '✓' : '✗'}</span>
            <span className={styles.propertyDescription}>
              (x, y) ∈ R ∧ (y, z) ∈ R → (x, z) ∈ R
            </span>
          </div>
        </div>

        <div className={`${styles.equivalenceStatus} ${isEquivalence ? styles.isEquivalence : styles.notEquivalence}`}>
          {isEquivalence ? '✓ This is an Equivalence Relation!' : '✗ Not an Equivalence Relation'}
        </div>

        {isEquivalence && (
          <div className={styles.equivalenceClasses}>
            <h5>Equivalence Classes:</h5>
            <div className={styles.classes}>
              {getEquivalenceClasses().map((eqClass, index) => (
                <div key={index} className={styles.equivalenceClass}>
                  [{eqClass.join(', ')}]
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.insights}>
        <h4>Key Insights:</h4>
        <ul>
          <li>Equivalence relations partition a set into disjoint subsets</li>
          <li>Each partition naturally defines an equivalence relation</li>
          <li>Elements in the same equivalence class are "equivalent"</li>
          <li>Common examples: congruence mod n, equality, similarity</li>
        </ul>
      </div>
    </div>
  );
};

export default EquivalenceRelationBuilder;