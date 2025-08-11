import React, { useState, useCallback } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './SeparationAxiomLab.module.css';

interface Point {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface OpenSet {
  id: string;
  points: string[];
  color: string;
  name: string;
}

type SeparationAxiom = 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

interface SeparationProperty {
  name: SeparationAxiom;
  displayName: string;
  description: string;
  satisfied: boolean;
  explanation: string;
}

type SeparationAxiomOption = {
  value: SeparationAxiom;
  label: string;
};

const separationAxiomOptions: SeparationAxiomOption[] = [
  { value: 'T0', label: 'T₀ (Kolmogorov)' },
  { value: 'T1', label: 'T₁ (Fréchet)' },
  { value: 'T2', label: 'T₂ (Hausdorff)' },
  { value: 'T3', label: 'T₃ (Regular)' },
  { value: 'T4', label: 'T₄ (Normal)' }
];

const customSelectStyles: StylesConfig<SeparationAxiomOption, false> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    borderColor: state.isFocused ? '#00ffff' : '#00ffff',
    borderWidth: '1px',
    borderRadius: 0,
    boxShadow: state.isFocused ? '0 0 15px #00ffff' : 'none',
    '&:hover': {
      borderColor: '#00ffff',
      boxShadow: '0 0 10px #00ffff'
    },
    fontFamily: 'monospace',
    cursor: 'pointer'
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    border: '2px solid #00ffff',
    borderRadius: 0,
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
    zIndex: 9999
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    backgroundColor: '#0a0a0a'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'rgba(0, 255, 255, 0.2)' 
      : state.isFocused 
        ? 'rgba(0, 255, 255, 0.1)' 
        : '#0a0a0a',
    color: state.isSelected ? '#00ffff' : '#00ffff',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderLeft: state.isSelected ? '3px solid #00ffff' : '3px solid transparent',
    '&:hover': {
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      color: '#00ffff'
    }
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: '0.9rem'
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#00ffff',
    '&:hover': {
      color: '#00ffff'
    }
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(0, 255, 255, 0.5)',
    fontFamily: 'monospace'
  })
};

const SeparationAxiomLab: React.FC = () => {
  const [points] = useState<Point[]>([
    { id: 'a', x: 100, y: 100, label: 'a' },
    { id: 'b', x: 200, y: 100, label: 'b' },
    { id: 'c', x: 150, y: 180, label: 'c' },
    { id: 'd', x: 300, y: 150, label: 'd' }
  ]);

  const [openSets, setOpenSets] = useState<OpenSet[]>([
    { id: 'empty', points: [], color: '#00ff00', name: '∅' },
    { id: 'whole', points: ['a', 'b', 'c', 'd'], color: '#ff6b35', name: 'X' }
  ]);

  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [newSetName, setNewSetName] = useState('');
  const [targetAxiom, setTargetAxiom] = useState<SeparationAxiom>('T0');

  const availableColors = ['#00ff00', '#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];

  const checkSeparationAxioms = useCallback((): SeparationProperty[] => {
    const properties: SeparationProperty[] = [];

    // T0: For any two distinct points, there exists an open set containing one but not the other
    const checkT0 = (): boolean => {
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const p1 = points[i].id;
          const p2 = points[j].id;
          
          let separated = false;
          for (const set of openSets) {
            if ((set.points.includes(p1) && !set.points.includes(p2)) ||
                (!set.points.includes(p1) && set.points.includes(p2))) {
              separated = true;
              break;
            }
          }
          
          if (!separated) {
            properties.push({
              name: 'T0',
              displayName: 'T₀ (Kolmogorov)',
              description: 'For distinct points, one has a neighborhood not containing the other',
              satisfied: false,
              explanation: `Points ${p1} and ${p2} cannot be separated by open sets`
            });
            return false;
          }
        }
      }
      return true;
    };

    // T1: For any two distinct points, each has a neighborhood not containing the other
    const checkT1 = (): boolean => {
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const p1 = points[i].id;
          const p2 = points[j].id;
          
          let p1HasSeparatingSet = false;
          let p2HasSeparatingSet = false;
          
          for (const set of openSets) {
            if (set.points.includes(p1) && !set.points.includes(p2)) {
              p1HasSeparatingSet = true;
            }
            if (set.points.includes(p2) && !set.points.includes(p1)) {
              p2HasSeparatingSet = true;
            }
          }
          
          if (!p1HasSeparatingSet || !p2HasSeparatingSet) {
            properties.push({
              name: 'T1',
              displayName: 'T₁ (Fréchet)',
              description: 'For distinct points, each has a neighborhood not containing the other',
              satisfied: false,
              explanation: `Points ${p1} and ${p2} don't both have separating neighborhoods`
            });
            return false;
          }
        }
      }
      return true;
    };

    // T2 (Hausdorff): For any two distinct points, there exist disjoint open sets containing them
    const checkT2 = (): boolean => {
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const p1 = points[i].id;
          const p2 = points[j].id;
          
          let separated = false;
          for (const set1 of openSets) {
            if (!set1.points.includes(p1)) continue;
            
            for (const set2 of openSets) {
              if (!set2.points.includes(p2)) continue;
              
              // Check if sets are disjoint
              const intersection = set1.points.filter(p => set2.points.includes(p));
              if (intersection.length === 0) {
                separated = true;
                break;
              }
            }
            if (separated) break;
          }
          
          if (!separated) {
            properties.push({
              name: 'T2',
              displayName: 'T₂ (Hausdorff)',
              description: 'For distinct points, there exist disjoint open neighborhoods',
              satisfied: false,
              explanation: `Points ${p1} and ${p2} cannot be separated by disjoint open sets`
            });
            return false;
          }
        }
      }
      return true;
    };

    const t0Satisfied = checkT0();
    if (t0Satisfied) {
      properties.push({
        name: 'T0',
        displayName: 'T₀ (Kolmogorov)',
        description: 'For distinct points, one has a neighborhood not containing the other',
        satisfied: true,
        explanation: 'All pairs of distinct points can be separated'
      });
    }

    const t1Satisfied = t0Satisfied && checkT1();
    if (t1Satisfied) {
      properties.push({
        name: 'T1',
        displayName: 'T₁ (Fréchet)',
        description: 'For distinct points, each has a neighborhood not containing the other',
        satisfied: true,
        explanation: 'All pairs of distinct points have mutual separation'
      });
    }

    const t2Satisfied = t1Satisfied && checkT2();
    if (t2Satisfied) {
      properties.push({
        name: 'T2',
        displayName: 'T₂ (Hausdorff)',
        description: 'For distinct points, there exist disjoint open neighborhoods',
        satisfied: true,
        explanation: 'All pairs of distinct points can be separated by disjoint open sets'
      });
    }

    return properties;
  }, [points, openSets]);

  const handlePointClick = (pointId: string) => {
    setSelectedPoints(prev => {
      if (prev.includes(pointId)) {
        return prev.filter(id => id !== pointId);
      } else {
        return [...prev, pointId];
      }
    });
  };

  const addOpenSet = () => {
    if (selectedPoints.length === 0 || !newSetName) return;

    const newSet: OpenSet = {
      id: Date.now().toString(),
      points: [...selectedPoints],
      color: availableColors[openSets.length % availableColors.length],
      name: newSetName
    };

    setOpenSets(prev => [...prev, newSet]);
    setSelectedPoints([]);
    setNewSetName('');
  };

  const removeOpenSet = (setId: string) => {
    if (setId === 'empty' || setId === 'whole') return; // Can't remove empty set or whole space
    setOpenSets(prev => prev.filter(set => set.id !== setId));
  };

  const separationProperties = checkSeparationAxioms();

  const getHint = (): string => {
    switch (targetAxiom) {
      case 'T0':
        return "To satisfy T₀, for each pair of distinct points, create an open set containing one point but not the other.";
      case 'T1':
        return "To satisfy T₁, for each pair of distinct points, both points need open sets that exclude the other point.";
      case 'T2':
        return "To satisfy T₂ (Hausdorff), for each pair of distinct points, create disjoint open sets containing each point.";
      default:
        return "Explore different separation axioms by adding and removing open sets.";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Separation Axiom Laboratory</h2>
        <p className={styles.subtitle}>
          Explore how different collections of open sets satisfy separation axioms
        </p>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.workspace}>
          <div className={styles.spaceViewer}>
            <h3>Topological Space</h3>
            <svg width="400" height="300" className={styles.spaceSvg}>
              {/* Render open sets as colored regions */}
              {openSets.map(set => {
                if (set.points.length === 0) return null;
                
                const setPoints = points.filter(p => set.points.includes(p.id));
                if (setPoints.length === 0) return null;

                // Create a convex hull-like shape around the points
                const padding = 30;
                const minX = Math.min(...setPoints.map(p => p.x)) - padding;
                const maxX = Math.max(...setPoints.map(p => p.x)) + padding;
                const minY = Math.min(...setPoints.map(p => p.y)) - padding;
                const maxY = Math.max(...setPoints.map(p => p.y)) + padding;

                return (
                  <rect
                    key={`region-${set.id}`}
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={maxY - minY}
                    fill={set.color}
                    fillOpacity={0.2}
                    stroke={set.color}
                    strokeWidth={2}
                    strokeDasharray="5,5"
                    rx={15}
                  />
                );
              })}

              {/* Render points */}
              {points.map(point => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={8}
                    fill={selectedPoints.includes(point.id) ? '#ffff00' : '#ffffff'}
                    stroke={selectedPoints.includes(point.id) ? '#ff6b35' : '#333333'}
                    strokeWidth={3}
                    className={styles.point}
                    onClick={() => handlePointClick(point.id)}
                  />
                  <text
                    x={point.x}
                    y={point.y - 15}
                    textAnchor="middle"
                    className={styles.pointLabel}
                    fill="#ffffff"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className={styles.controls}>
            <div className={styles.setCreation}>
              <h4>Create Open Set</h4>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Set name (e.g., U₁)"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className={styles.input}
                />
                <button 
                  onClick={addOpenSet}
                  disabled={selectedPoints.length === 0 || !newSetName}
                  className={styles.button}
                >
                  Add Set
                </button>
              </div>
              <p className={styles.helpText}>
                Select points by clicking them, then add them to a new open set
              </p>
            </div>

            <div className={styles.targetSelector}>
              <label className={styles.label}>
                Target Axiom:
                <Select<SeparationAxiomOption>
                  value={separationAxiomOptions.find(opt => opt.value === targetAxiom)}
                  onChange={(newValue) => newValue && setTargetAxiom(newValue.value)}
                  options={separationAxiomOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                  className={styles.selectContainer}
                  classNamePrefix="retro-select"
                />
              </label>
            </div>

            <div className={styles.hint}>
              <h4>Hint</h4>
              <p>{getHint()}</p>
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.openSetsList}>
            <h3>Open Sets</h3>
            <div className={styles.setList}>
              {openSets.map(set => (
                <div key={set.id} className={styles.setItem}>
                  <div className={styles.setInfo}>
                    <div 
                      className={styles.colorIndicator}
                      style={{ backgroundColor: set.color }}
                    />
                    <span className={styles.setName}>{set.name}</span>
                    <span className={styles.setPoints}>
                      {set.points.length === 0 ? '∅' : `{${set.points.join(', ')}}`}
                    </span>
                  </div>
                  {set.id !== 'empty' && set.id !== 'whole' && (
                    <button 
                      onClick={() => removeOpenSet(set.id)}
                      className={styles.removeButton}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.properties}>
            <h3>Separation Properties</h3>
            <div className={styles.propertiesList}>
              {['T0', 'T1', 'T2'].map(axiom => {
                const property = separationProperties.find(p => p.name === axiom);
                const satisfied = property?.satisfied || false;
                
                return (
                  <div key={axiom} className={`${styles.property} ${satisfied ? styles.satisfied : styles.notSatisfied}`}>
                    <div className={styles.propertyHeader}>
                      <span className={styles.propertyName}>
                        {axiom === 'T0' ? 'T₀' : axiom === 'T1' ? 'T₁' : 'T₂'}
                      </span>
                      <span className={`${styles.status} ${satisfied ? styles.yes : styles.no}`}>
                        {satisfied ? '✓' : '✗'}
                      </span>
                    </div>
                    <p className={styles.propertyDescription}>
                      {property?.description || 'Not checked'}
                    </p>
                    {property && (
                      <p className={styles.propertyExplanation}>
                        {property.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeparationAxiomLab;