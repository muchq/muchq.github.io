import React, { useState, useCallback, useMemo } from 'react';
import Select from 'react-select';
import { retroSelectStyles } from '../styles/ReactSelectStyles';
import styles from './HausdorffDetective.module.css';

interface Point {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface OpenSet {
  id: string;
  center: { x: number; y: number };
  radius: number;
  color: string;
  name: string;
}

interface TestCase {
  id: string;
  name: string;
  points: Point[];
  openSets: OpenSet[];
  isHausdorff: boolean;
  description: string;
}

type Mode = 'investigate' | 'construct';

type TestCaseOption = {
  value: string;
  label: string;
};

const HausdorffDetective: React.FC = () => {
  const [mode, setMode] = useState<Mode>('investigate');
  const [selectedCase, setSelectedCase] = useState<string>('case1');
  const [selectedPoints, setSelectedPoints] = useState<string[]>([]);
  const [separatingNeighborhoods, setSeparatingNeighborhoods] = useState<OpenSet[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  const testCases: TestCase[] = useMemo(() => [
    {
      id: 'case1',
      name: 'Discrete Space',
      points: [
        { id: 'a', x: 100, y: 100, label: 'a' },
        { id: 'b', x: 200, y: 100, label: 'b' },
        { id: 'c', x: 150, y: 180, label: 'c' }
      ],
      openSets: [], // All subsets are open in discrete topology
      isHausdorff: true,
      description: 'In the discrete topology, every subset is open, making separation trivial.'
    },
    {
      id: 'case2',
      name: 'Cofinite Topology on Infinite Set',
      points: [
        { id: 'a', x: 80, y: 120, label: 'a' },
        { id: 'b', x: 160, y: 120, label: 'b' },
        { id: 'c', x: 240, y: 120, label: 'c' },
        { id: 'd', x: 320, y: 120, label: 'd' },
        { id: 'e', x: 120, y: 200, label: '...' }
      ],
      openSets: [
        { id: 'U1', center: { x: 200, y: 160 }, radius: 150, color: '#ff6b35', name: 'U₁' },
        { id: 'U2', center: { x: 200, y: 160 }, radius: 120, color: '#4ecdc4', name: 'U₂' }
      ],
      isHausdorff: false,
      description: 'Cofinite topology: open sets have finite complement. Any two non-empty open sets intersect.'
    },
    {
      id: 'case3',
      name: 'Sierpiński Space',
      points: [
        { id: 'a', x: 150, y: 120, label: 'a' },
        { id: 'b', x: 250, y: 120, label: 'b' }
      ],
      openSets: [
        { id: 'empty', center: { x: 0, y: 0 }, radius: 0, color: '#00ff00', name: '∅' },
        { id: 'whole', center: { x: 200, y: 120 }, radius: 100, color: '#ff6b35', name: 'X' },
        { id: 'singleton', center: { x: 250, y: 120 }, radius: 30, color: '#4ecdc4', name: '{b}' }
      ],
      isHausdorff: false,
      description: 'Topology: {∅, {b}, {a,b}}. Points a and b cannot be separated.'
    },
    {
      id: 'case4',
      name: 'Real Line (Standard)',
      points: [
        { id: 'a', x: 120, y: 150, label: '1' },
        { id: 'b', x: 280, y: 150, label: '2' }
      ],
      openSets: [
        { id: 'int1', center: { x: 120, y: 150 }, radius: 40, color: '#00ff88', name: '(0.5, 1.5)' },
        { id: 'int2', center: { x: 280, y: 150 }, radius: 40, color: '#ff6b35', name: '(1.5, 2.5)' }
      ],
      isHausdorff: true,
      description: 'Standard topology on ℝ. Any two distinct points can be separated by disjoint intervals.'
    },
    {
      id: 'case5',
      name: 'Line with Two Origins',
      points: [
        { id: 'o1', x: 150, y: 120, label: '0₁' },
        { id: 'o2', x: 250, y: 120, label: '0₂' },
        { id: 'p1', x: 100, y: 180, label: '-1' },
        { id: 'p2', x: 300, y: 180, label: '1' }
      ],
      openSets: [
        { id: 'N1', center: { x: 150, y: 120 }, radius: 60, color: '#ff6b35', name: 'N₁' },
        { id: 'N2', center: { x: 250, y: 120 }, radius: 60, color: '#4ecdc4', name: 'N₂' }
      ],
      isHausdorff: false,
      description: 'Two copies of 0 in ℝ. Any neighborhood of 0₁ intersects any neighborhood of 0₂.'
    }
  ], []);

  const currentCase = testCases.find(c => c.id === selectedCase)!;

  const checkSeparation = useCallback((point1Id: string, point2Id: string, neighborhoods: OpenSet[]): boolean => {
    const point1Neighborhoods = neighborhoods.filter(n => {
      const point1 = currentCase.points.find(p => p.id === point1Id)!;
      const distance = Math.sqrt(
        Math.pow(n.center.x - point1.x, 2) + Math.pow(n.center.y - point1.y, 2)
      );
      return distance <= n.radius;
    });

    const point2Neighborhoods = neighborhoods.filter(n => {
      const point2 = currentCase.points.find(p => p.id === point2Id)!;
      const distance = Math.sqrt(
        Math.pow(n.center.x - point2.x, 2) + Math.pow(n.center.y - point2.y, 2)
      );
      return distance <= n.radius;
    });

    // Check if any pair of neighborhoods is disjoint
    for (const n1 of point1Neighborhoods) {
      for (const n2 of point2Neighborhoods) {
        const distance = Math.sqrt(
          Math.pow(n1.center.x - n2.center.x, 2) + Math.pow(n1.center.y - n2.center.y, 2)
        );
        if (distance >= n1.radius + n2.radius) {
          return true; // Disjoint neighborhoods found
        }
      }
    }

    return false;
  }, [currentCase.points]);

  const handlePointClick = (pointId: string) => {
    setSelectedPoints(prev => {
      if (prev.includes(pointId)) {
        return prev.filter(id => id !== pointId);
      } else if (prev.length < 2) {
        return [...prev, pointId];
      } else {
        return [pointId]; // Start fresh selection
      }
    });
    setFeedback('');
  };

  const investigateSeparation = () => {
    if (selectedPoints.length !== 2) {
      setFeedback('Please select exactly two points to investigate their separation.');
      return;
    }

    const [point1, point2] = selectedPoints;
    const canSeparate = checkSeparation(point1, point2, currentCase.openSets);

    if (canSeparate) {
      setFeedback(`✅ Points ${point1} and ${point2} can be separated by disjoint open sets!`);
    } else {
      setFeedback(`❌ Points ${point1} and ${point2} cannot be separated by disjoint open sets.`);
    }
  };

  const addSeparatingNeighborhood = (center: { x: number; y: number }) => {
    const newNeighborhood: OpenSet = {
      id: `sep-${Date.now()}`,
      center,
      radius: 30,
      color: separatingNeighborhoods.length % 2 === 0 ? '#00ff88' : '#ff6b35',
      name: `N${separatingNeighborhoods.length + 1}`
    };

    setSeparatingNeighborhoods(prev => [...prev, newNeighborhood]);
  };

  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'construct') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    addSeparatingNeighborhood({ x, y });
  };

  const clearSeparatingNeighborhoods = () => {
    setSeparatingNeighborhoods([]);
    setFeedback('');
  };

  const testConstructedSeparation = () => {
    if (selectedPoints.length !== 2) {
      setFeedback('Please select exactly two points to test separation.');
      return;
    }

    const [point1, point2] = selectedPoints;
    const canSeparate = checkSeparation(point1, point2, separatingNeighborhoods);

    if (canSeparate) {
      setFeedback(`🎉 Success! You've separated points ${point1} and ${point2} with disjoint neighborhoods!`);
    } else {
      setFeedback(`Not quite! The neighborhoods for points ${point1} and ${point2} still overlap. Try adjusting their positions or sizes.`);
    }
  };

  const getHint = (): string => {
    if (mode === 'investigate') {
      if (currentCase.isHausdorff) {
        return "This space is Hausdorff. Try to find disjoint neighborhoods for any pair of distinct points.";
      } else {
        return "This space is NOT Hausdorff. Try to find a pair of points that cannot be separated.";
      }
    } else {
      if (selectedPoints.length === 2) {
        const [p1, p2] = selectedPoints;
        return `Click on the space to place neighborhoods around points ${p1} and ${p2}. Make sure the neighborhoods don't overlap!`;
      }
      return "First select two points, then click on the space to place separating neighborhoods.";
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Hausdorff Detective</h2>
        <p className={styles.subtitle}>
          Investigate whether topological spaces satisfy the Hausdorff property
        </p>
      </div>

      <div className={styles.controls}>
        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeButton} ${mode === 'investigate' ? styles.active : ''}`}
            onClick={() => setMode('investigate')}
          >
            🔍 Investigate
          </button>
          <button
            className={`${styles.modeButton} ${mode === 'construct' ? styles.active : ''}`}
            onClick={() => setMode('construct')}
          >
            🏗️ Construct
          </button>
        </div>

        <div className={styles.selector}>
          <div className={styles.selectorRow}>
            <span className={styles.selectorLabel}>Test Case:</span>
            <div className={styles.selectorControl}>
              <Select<TestCaseOption>
                value={{ value: selectedCase, label: testCases.find(tc => tc.id === selectedCase)?.name || '' }}
                onChange={(option) => {
                  if (option) {
                    setSelectedCase(option.value);
                    setSelectedPoints([]);
                    setSeparatingNeighborhoods([]);
                    setFeedback('');
                  }
                }}
                options={testCases.map(tc => ({ value: tc.id, label: tc.name }))}
                styles={retroSelectStyles<TestCaseOption>()}
                isSearchable={false}
              />
            </div>
          </div>
        </div>

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
            <h3>{currentCase.name}</h3>
            <p className={styles.description}>{currentCase.description}</p>
            
            <svg 
              width="400" 
              height="300" 
              className={styles.spaceSvg}
              onClick={handleSvgClick}
            >
              {/* Render existing open sets */}
              {currentCase.openSets.map(set => (
                <circle
                  key={set.id}
                  cx={set.center.x}
                  cy={set.center.y}
                  r={set.radius}
                  fill={set.color}
                  fillOpacity={0.2}
                  stroke={set.color}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                />
              ))}

              {/* Render constructed separating neighborhoods */}
              {separatingNeighborhoods.map(neighborhood => (
                <circle
                  key={neighborhood.id}
                  cx={neighborhood.center.x}
                  cy={neighborhood.center.y}
                  r={neighborhood.radius}
                  fill={neighborhood.color}
                  fillOpacity={0.3}
                  stroke={neighborhood.color}
                  strokeWidth={3}
                />
              ))}

              {/* Render points */}
              {currentCase.points.map(point => (
                <g key={point.id}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={10}
                    fill={selectedPoints.includes(point.id) ? '#ffff00' : '#ffffff'}
                    stroke={selectedPoints.includes(point.id) ? '#ff6b35' : '#333333'}
                    strokeWidth={3}
                    className={styles.point}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePointClick(point.id);
                    }}
                  />
                  <text
                    x={point.x}
                    y={point.y - 20}
                    textAnchor="middle"
                    className={styles.pointLabel}
                    fill="#ffffff"
                  >
                    {point.label}
                  </text>
                </g>
              ))}

              {/* Labels for existing open sets */}
              {currentCase.openSets.map(set => (
                <text
                  key={`label-${set.id}`}
                  x={set.center.x}
                  y={set.center.y}
                  textAnchor="middle"
                  className={styles.setLabel}
                  fill={set.color}
                >
                  {set.name}
                </text>
              ))}
            </svg>
          </div>

          <div className={styles.actionPanel}>
            {mode === 'investigate' ? (
              <div className={styles.investigatePanel}>
                <h4>Investigation Tools</h4>
                <p>Select two points and check if they can be separated by disjoint open sets.</p>
                <button
                  onClick={investigateSeparation}
                  disabled={selectedPoints.length !== 2}
                  className={styles.actionButton}
                >
                  Test Separation
                </button>
                <div className={styles.selectedPoints}>
                  <strong>Selected Points:</strong> {selectedPoints.length > 0 ? selectedPoints.join(', ') : 'None'}
                </div>
              </div>
            ) : (
              <div className={styles.constructPanel}>
                <h4>Construction Tools</h4>
                <p>Click on the space to place separating neighborhoods around your selected points.</p>
                <div className={styles.constructActions}>
                  <button
                    onClick={testConstructedSeparation}
                    disabled={selectedPoints.length !== 2 || separatingNeighborhoods.length === 0}
                    className={styles.actionButton}
                  >
                    Test My Construction
                  </button>
                  <button
                    onClick={clearSeparatingNeighborhoods}
                    className={styles.clearButton}
                  >
                    Clear Neighborhoods
                  </button>
                </div>
                <div className={styles.selectedPoints}>
                  <strong>Selected Points:</strong> {selectedPoints.length > 0 ? selectedPoints.join(', ') : 'None'}
                </div>
                <div className={styles.neighborhoodCount}>
                  <strong>Neighborhoods:</strong> {separatingNeighborhoods.length}
                </div>
              </div>
            )}
          </div>
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
            <h4>Theory Reminder</h4>
            <div className={styles.definition}>
              <p><strong>Hausdorff Space (T₂):</strong></p>
              <p>A space where any two distinct points can be separated by disjoint open neighborhoods.</p>
              <p className={styles.mathNotation}>
                ∀x,y ∈ X, x ≠ y ⟹ ∃U,V open: x ∈ U, y ∈ V, U ∩ V = ∅
              </p>
            </div>
          </div>

          <div className={styles.caseInfo}>
            <h4>Current Space</h4>
            <div className={styles.caseDetails}>
              <p><strong>Name:</strong> {currentCase.name}</p>
              <p><strong>Hausdorff:</strong> 
                <span className={currentCase.isHausdorff ? styles.yes : styles.no}>
                  {currentCase.isHausdorff ? ' Yes ✓' : ' No ✗'}
                </span>
              </p>
              <p><strong>Points:</strong> {currentCase.points.length}</p>
              <p><strong>Open Sets:</strong> {currentCase.openSets.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HausdorffDetective;