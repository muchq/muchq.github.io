import React, { useState, useCallback, useMemo } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './RegularNormalConstructor.module.css';

interface Point {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface ClosedSet {
  id: string;
  points: string[];
  color: string;
  name: string;
  shape: 'circle' | 'rectangle';
  center?: { x: number; y: number };
  radius?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}

interface OpenSet {
  id: string;
  center: { x: number; y: number };
  radius: number;
  color: string;
  name: string;
}

interface Example {
  id: string;
  name: string;
  description: string;
  points: Point[];
  closedSets: ClosedSet[];
  isRegular: boolean;
  isNormal: boolean;
  explanation: string;
}

type Property = 'regular' | 'normal';
type Mode = 'explore' | 'construct';

type ExampleOption = {
  value: string;
  label: string;
};

type PropertyOption = {
  value: Property;
  label: string;
};

const propertyOptions: PropertyOption[] = [
  { value: 'regular', label: 'Regular (T₃)' },
  { value: 'normal', label: 'Normal (T₄)' }
];

const customSelectStylesExample: StylesConfig<ExampleOption, false> = {
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

const customSelectStylesProperty: StylesConfig<PropertyOption, false> = {
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

const RegularNormalConstructor: React.FC = () => {
  const [mode, setMode] = useState<Mode>('explore');
  const [selectedExample, setSelectedExample] = useState<string>('example1');
  const [targetProperty, setTargetProperty] = useState<Property>('regular');
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const [selectedClosedSet, setSelectedClosedSet] = useState<string | null>(null);
  const [separatingOpenSets, setSeparatingOpenSets] = useState<OpenSet[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  const examples: Example[] = useMemo(() => [
    {
      id: 'example1',
      name: 'Real Line ℝ',
      description: 'Standard topology on the real numbers',
      points: [
        { id: 'p1', x: 150, y: 150, label: 'x' }
      ],
      closedSets: [
        {
          id: 'interval',
          points: [],
          color: '#ff6b35',
          name: '[a,b]',
          shape: 'rectangle',
          bounds: { x: 100, y: 130, width: 100, height: 40 }
        }
      ],
      isRegular: true,
      isNormal: true,
      explanation: 'ℝ is both regular and normal. Points and closed sets can always be separated by disjoint open sets.'
    },
    {
      id: 'example2',
      name: 'Discrete Space',
      description: 'Every subset is both open and closed',
      points: [
        { id: 'a', x: 120, y: 120, label: 'a' },
        { id: 'b', x: 200, y: 120, label: 'b' },
        { id: 'c', x: 280, y: 120, label: 'c' }
      ],
      closedSets: [
        {
          id: 'singleton',
          points: ['a'],
          color: '#4ecdc4',
          name: '{a}',
          shape: 'circle',
          center: { x: 120, y: 120 },
          radius: 20
        }
      ],
      isRegular: true,
      isNormal: true,
      explanation: 'Discrete spaces are regular and normal since every subset is open.'
    },
    {
      id: 'example3',
      name: 'Cofinite Topology',
      description: 'Open sets have finite complement',
      points: [
        { id: 'p1', x: 100, y: 150, label: 'p₁' },
        { id: 'p2', x: 170, y: 150, label: 'p₂' },
        { id: 'p3', x: 240, y: 150, label: 'p₃' },
        { id: 'p4', x: 310, y: 150, label: '...' }
      ],
      closedSets: [
        {
          id: 'finite',
          points: ['p1', 'p2'],
          color: '#ff6b35',
          name: 'F',
          shape: 'rectangle',
          bounds: { x: 90, y: 130, width: 100, height: 40 }
        }
      ],
      isRegular: false,
      isNormal: false,
      explanation: 'On infinite sets, cofinite topology is neither regular nor normal.'
    },
    {
      id: 'example4',
      name: 'Lower Limit Topology',
      description: 'Topology generated by intervals [a,b)',
      points: [
        { id: 'x', x: 180, y: 150, label: 'x' }
      ],
      closedSets: [
        {
          id: 'complement',
          points: [],
          color: '#4ecdc4',
          name: '(-∞,a]',
          shape: 'rectangle',
          bounds: { x: 50, y: 130, width: 120, height: 40 }
        }
      ],
      isRegular: true,
      isNormal: true,
      explanation: 'Sorgenfrey line is regular and normal, but not metrizable.'
    },
    {
      id: 'example5',
      name: 'Niemytzki Plane',
      description: 'Upper half-plane with special topology at x-axis',
      points: [
        { id: 'rational', x: 150, y: 200, label: 'r' },
        { id: 'irrational', x: 250, y: 200, label: 's' }
      ],
      closedSets: [
        {
          id: 'rationals',
          points: [],
          color: '#ff6b35',
          name: 'ℚ∩[0,1]',
          shape: 'rectangle',
          bounds: { x: 100, y: 185, width: 200, height: 30 }
        }
      ],
      isRegular: true,
      isNormal: false,
      explanation: 'Niemytzki plane is regular but not normal. The rationals and irrationals on the x-axis cannot be separated.'
    }
  ], []);

  const currentExample = examples.find(ex => ex.id === selectedExample)!;

  const exampleOptions: ExampleOption[] = useMemo(() => 
    examples.map(ex => ({
      value: ex.id,
      label: ex.name
    })), [examples]);

  const isPointInClosedSet = useCallback((pointId: string, closedSet: ClosedSet): boolean => {
    if (closedSet.points.includes(pointId)) return true;
    
    const point = currentExample.points.find(p => p.id === pointId);
    if (!point) return false;

    if (closedSet.shape === 'circle' && closedSet.center && closedSet.radius) {
      const distance = Math.sqrt(
        Math.pow(point.x - closedSet.center.x, 2) + 
        Math.pow(point.y - closedSet.center.y, 2)
      );
      return distance <= closedSet.radius;
    }

    if (closedSet.shape === 'rectangle' && closedSet.bounds) {
      return point.x >= closedSet.bounds.x &&
             point.x <= closedSet.bounds.x + closedSet.bounds.width &&
             point.y >= closedSet.bounds.y &&
             point.y <= closedSet.bounds.y + closedSet.bounds.height;
    }

    return false;
  }, [currentExample.points]);

  const checkRegularity = useCallback((point: string, closedSet: string, openSets: OpenSet[]): boolean => {
    // Check if point is NOT in the closed set
    const pointNotInSet = !isPointInClosedSet(point, currentExample.closedSets.find(cs => cs.id === closedSet)!);
    if (!pointNotInSet) return false;

    const pointObj = currentExample.points.find(p => p.id === point)!;
    const closedSetObj = currentExample.closedSets.find(cs => cs.id === closedSet)!;

    // Find open sets containing the point
    const pointOpenSets = openSets.filter(os => {
      const distance = Math.sqrt(
        Math.pow(os.center.x - pointObj.x, 2) + 
        Math.pow(os.center.y - pointObj.y, 2)
      );
      return distance <= os.radius;
    });

    // Find open sets containing the closed set
    const setOpenSets = openSets.filter(os => {
      if (closedSetObj.shape === 'circle' && closedSetObj.center && closedSetObj.radius) {
        const distance = Math.sqrt(
          Math.pow(os.center.x - closedSetObj.center.x, 2) + 
          Math.pow(os.center.y - closedSetObj.center.y, 2)
        );
        return distance + closedSetObj.radius <= os.radius;
      }
      
      if (closedSetObj.shape === 'rectangle' && closedSetObj.bounds) {
        const setBounds = closedSetObj.bounds;
        const setCenter = {
          x: setBounds.x + setBounds.width / 2,
          y: setBounds.y + setBounds.height / 2
        };
        const distance = Math.sqrt(
          Math.pow(os.center.x - setCenter.x, 2) + 
          Math.pow(os.center.y - setCenter.y, 2)
        );
        const setRadius = Math.sqrt(
          Math.pow(setBounds.width / 2, 2) + 
          Math.pow(setBounds.height / 2, 2)
        );
        return distance + setRadius <= os.radius;
      }
      
      return false;
    });

    // Check if there exist disjoint open sets
    for (const pointSet of pointOpenSets) {
      for (const closedOpenSet of setOpenSets) {
        const distance = Math.sqrt(
          Math.pow(pointSet.center.x - closedOpenSet.center.x, 2) + 
          Math.pow(pointSet.center.y - closedOpenSet.center.y, 2)
        );
        if (distance >= pointSet.radius + closedOpenSet.radius) {
          return true; // Found disjoint separating neighborhoods
        }
      }
    }

    return false;
  }, [currentExample.points, currentExample.closedSets, isPointInClosedSet]);

  const handlePointClick = (pointId: string) => {
    setSelectedPoint(prev => prev === pointId ? null : pointId);
    setFeedback('');
  };

  const handleClosedSetClick = (setId: string) => {
    setSelectedClosedSet(prev => prev === setId ? null : setId);
    setFeedback('');
  };

  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'construct') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newOpenSet: OpenSet = {
      id: `open-${Date.now()}`,
      center: { x, y },
      radius: 40,
      color: separatingOpenSets.length % 2 === 0 ? '#00ff88' : '#ff6b35',
      name: `U${separatingOpenSets.length + 1}`
    };

    setSeparatingOpenSets(prev => [...prev, newOpenSet]);
  };

  const testConstruction = () => {
    if (targetProperty === 'regular') {
      if (!selectedPoint || !selectedClosedSet) {
        setFeedback('Please select a point and a closed set to test regularity.');
        return;
      }

      const isRegular = checkRegularity(selectedPoint, selectedClosedSet, separatingOpenSets);
      if (isRegular) {
        setFeedback(`🎉 Success! You've shown regularity by separating point ${selectedPoint} from closed set ${selectedClosedSet}!`);
      } else {
        setFeedback(`Not quite! The neighborhoods need to be disjoint and properly separate the point from the closed set.`);
      }
    } else {
      // For normal spaces, we'd check separation of disjoint closed sets
      setFeedback('Normal space construction requires two disjoint closed sets.');
    }
  };

  const clearConstruction = () => {
    setSeparatingOpenSets([]);
    setSelectedPoint(null);
    setSelectedClosedSet(null);
    setFeedback('');
  };

  const getHint = (): string => {
    if (mode === 'explore') {
      return `This space is ${currentExample.isRegular ? '' : 'NOT '}regular and ${currentExample.isNormal ? '' : 'NOT '}normal. ${currentExample.explanation}`;
    } else {
      if (targetProperty === 'regular') {
        return 'To show regularity: Select a point and a closed set not containing it, then place disjoint open neighborhoods around each.';
      } else {
        return 'To show normality: Select two disjoint closed sets, then place disjoint open neighborhoods around each.';
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Regular & Normal Space Constructor</h2>
        <p className={styles.subtitle}>
          Explore and construct examples of regular and normal topological spaces
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeButton} ${mode === 'explore' ? styles.active : ''}`}
            onClick={() => setMode('explore')}
          >
            🔍 Explore
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'construct' ? styles.active : ''}`}
            onClick={() => setMode('construct')}
          >
            🏗️ Construct
          </button>
        </div>

        <div className={styles.exampleSelector}>
          <label className={styles.label}>
            Example:
            <Select<ExampleOption>
              value={exampleOptions.find(opt => opt.value === selectedExample)}
              onChange={(newValue) => {
                if (newValue) {
                  setSelectedExample(newValue.value);
                  clearConstruction();
                }
              }}
              options={exampleOptions}
              styles={customSelectStylesExample}
              isSearchable={false}
              className={styles.selectContainer}
              classNamePrefix="retro-select"
            />
          </label>
        </div>

        {mode === 'construct' && (
          <div className={styles.propertySelector}>
            <label className={styles.label}>
              Test Property:
              <Select<PropertyOption>
                value={propertyOptions.find(opt => opt.value === targetProperty)}
                onChange={(newValue) => newValue && setTargetProperty(newValue.value)}
                options={propertyOptions}
                styles={customSelectStylesProperty}
                isSearchable={false}
                className={styles.selectContainer}
                classNamePrefix="retro-select"
              />
            </label>
          </div>
        )}

        <button
          className={styles.hintButton}
          onClick={() => setShowHint(!showHint)}
        >
          {showHint ? 'Hide Hint' : 'Show Hint'}
        </button>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.workspace}>
          <div className={styles.spaceViewer}>
            <h3>{currentExample.name}</h3>
            <p className={styles.description}>{currentExample.description}</p>
            
            <svg 
              width="400" 
              height="300" 
              className={styles.spaceSvg}
              onClick={handleSvgClick}
            >
              {/* Render closed sets */}
              {currentExample.closedSets.map(closedSet => (
                <g key={closedSet.id}>
                  {closedSet.shape === 'circle' && closedSet.center && closedSet.radius && (
                    <circle
                      cx={closedSet.center.x}
                      cy={closedSet.center.y}
                      r={closedSet.radius}
                      fill={closedSet.color}
                      fillOpacity={0.3}
                      stroke={closedSet.color}
                      strokeWidth={selectedClosedSet === closedSet.id ? 4 : 2}
                      className={styles.closedSet}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosedSetClick(closedSet.id);
                      }}
                    />
                  )}
                  {closedSet.shape === 'rectangle' && closedSet.bounds && (
                    <rect
                      x={closedSet.bounds.x}
                      y={closedSet.bounds.y}
                      width={closedSet.bounds.width}
                      height={closedSet.bounds.height}
                      fill={closedSet.color}
                      fillOpacity={0.3}
                      stroke={closedSet.color}
                      strokeWidth={selectedClosedSet === closedSet.id ? 4 : 2}
                      className={styles.closedSet}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosedSetClick(closedSet.id);
                      }}
                    />
                  )}
                  <text
                    x={closedSet.center?.x || (closedSet.bounds ? closedSet.bounds.x + closedSet.bounds.width / 2 : 0)}
                    y={closedSet.center?.y || (closedSet.bounds ? closedSet.bounds.y + closedSet.bounds.height / 2 : 0)}
                    textAnchor="middle"
                    className={styles.setLabel}
                    fill={closedSet.color}
                  >
                    {closedSet.name}
                  </text>
                </g>
              ))}

              {/* Render constructed open sets */}
              {separatingOpenSets.map(openSet => (
                <g key={openSet.id}>
                  <circle
                    cx={openSet.center.x}
                    cy={openSet.center.y}
                    r={openSet.radius}
                    fill={openSet.color}
                    fillOpacity={0.2}
                    stroke={openSet.color}
                    strokeWidth={3}
                    strokeDasharray="5,5"
                  />
                  <text
                    x={openSet.center.x}
                    y={openSet.center.y}
                    textAnchor="middle"
                    className={styles.openSetLabel}
                    fill={openSet.color}
                  >
                    {openSet.name}
                  </text>
                </g>
              ))}

              {/* Render points */}
              {currentExample.points.map(point => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={8}
                    fill={selectedPoint === point.id ? '#ffff00' : '#ffffff'}
                    stroke={selectedPoint === point.id ? '#ff6b35' : '#333333'}
                    strokeWidth={3}
                    className={styles.point}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePointClick(point.id);
                    }}
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

          {mode === 'construct' && (
            <div className={styles.constructionPanel}>
              <h4>Construction Tools</h4>
              <p>Click on the space to place separating open neighborhoods.</p>
              <div className={styles.constructActions}>
                <button
                  onClick={testConstruction}
                  disabled={!selectedPoint || !selectedClosedSet || separatingOpenSets.length === 0}
                  className={styles.actionButton}
                >
                  Test Construction
                </button>
                <button
                  onClick={clearConstruction}
                  className={styles.clearButton}
                >
                  Clear All
                </button>
              </div>
              <div className={styles.selectionInfo}>
                <div className={styles.selection}>
                  <strong>Selected Point:</strong> {selectedPoint || 'None'}
                </div>
                <div className={styles.selection}>
                  <strong>Selected Closed Set:</strong> {selectedClosedSet || 'None'}
                </div>
                <div className={styles.selection}>
                  <strong>Open Sets:</strong> {separatingOpenSets.length}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          {showHint && (
            <div className={styles.hint}>
              <h4>💡 Hint</h4>
              <p>{getHint()}</p>
            </div>
          )}

          {feedback && (
            <div className={styles.feedback}>
              <h4>Feedback</h4>
              <p>{feedback}</p>
            </div>
          )}

          <div className={styles.theoryPanel}>
            <h4>Theory</h4>
            <div className={styles.definition}>
              <p><strong>Regular Space (T₃):</strong></p>
              <p>For any point x and closed set F not containing x, there exist disjoint open sets U and V such that x ∈ U and F ⊆ V.</p>
              
              <p><strong>Normal Space (T₄):</strong></p>
              <p>For any two disjoint closed sets A and B, there exist disjoint open sets U and V such that A ⊆ U and B ⊆ V.</p>
            </div>
          </div>

          <div className={styles.propertiesPanel}>
            <h4>Current Example Properties</h4>
            <div className={styles.propertyStatus}>
              <div className={styles.property}>
                <span className={styles.propertyName}>Regular (T₃):</span>
                <span className={currentExample.isRegular ? styles.yes : styles.no}>
                  {currentExample.isRegular ? 'Yes ✓' : 'No ✗'}
                </span>
              </div>
              <div className={styles.property}>
                <span className={styles.propertyName}>Normal (T₄):</span>
                <span className={currentExample.isNormal ? styles.yes : styles.no}>
                  {currentExample.isNormal ? 'Yes ✓' : 'No ✗'}
                </span>
              </div>
            </div>
            <p className={styles.explanation}>{currentExample.explanation}</p>
          </div>

          <div className={styles.examplesInfo}>
            <h4>Key Examples</h4>
            <ul className={styles.examplesList}>
              <li><strong>ℝ:</strong> Regular and Normal</li>
              <li><strong>Discrete:</strong> Regular and Normal</li>
              <li><strong>Cofinite:</strong> Neither (on infinite sets)</li>
              <li><strong>Sorgenfrey:</strong> Regular and Normal</li>
              <li><strong>Niemytzki:</strong> Regular but not Normal</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegularNormalConstructor;