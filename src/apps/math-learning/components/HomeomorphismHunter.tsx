import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './HomeomorphismHunter.module.css';

interface Space {
  id: string;
  name: string;
  description: string;
  properties: {
    connected: boolean;
    compact: boolean;
    hausdorff: boolean;
    pathConnected: boolean;
    simplyConnected: boolean;
    cardinality: string;
    fundamentalGroup: string;
    eulerCharacteristic?: number;
    dimension: number;
  };
  visual: string;
  homeomorphicTo?: string[];
  commonMaps?: string;
}

interface GameState {
  score: number;
  attempts: number;
  streak: number;
  bestStreak: number;
  history: Array<{
    space1: string;
    space2: string;
    guess: boolean;
    correct: boolean;
  }>;
}

const spaces: Space[] = [
    {
      id: 'circle',
      name: 'Circle S¹',
      description: 'Unit circle in ℝ²',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ',
        dimension: 1
      },
      visual: '○',
      homeomorphicTo: ['ellipse', 'square_boundary'],
      commonMaps: 'Any simple closed curve in ℝⁿ'
    },
    {
      id: 'ellipse',
      name: 'Ellipse',
      description: 'Boundary of an ellipse',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ',
        dimension: 1
      },
      visual: '⬭',
      homeomorphicTo: ['circle', 'square_boundary'],
      commonMaps: 'Radial projection to/from circle'
    },
    {
      id: 'square_boundary',
      name: 'Square Boundary',
      description: 'Boundary of unit square',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ',
        dimension: 1
      },
      visual: '□',
      homeomorphicTo: ['circle', 'ellipse'],
      commonMaps: 'Radial projection from center'
    },
    {
      id: 'interval',
      name: 'Closed Interval [0,1]',
      description: 'Closed unit interval',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        dimension: 1
      },
      visual: '━━━',
      homeomorphicTo: ['closed_disc_radius'],
      commonMaps: 'Any closed bounded interval [a,b]'
    },
    {
      id: 'closed_disc_radius',
      name: 'Closed Line Segment',
      description: 'Any closed line segment',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        dimension: 1
      },
      visual: '╌╌╌',
      homeomorphicTo: ['interval'],
      commonMaps: 'Linear scaling and translation'
    },
    {
      id: 'open_interval',
      name: 'Open Interval (0,1)',
      description: 'Open unit interval',
      properties: {
        connected: true,
        compact: false,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        dimension: 1
      },
      visual: '┅┅┅',
      homeomorphicTo: ['real_line', 'positive_reals'],
      commonMaps: 'f(x) = tan(π(x - 1/2)) maps to ℝ'
    },
    {
      id: 'real_line',
      name: 'Real Line ℝ',
      description: 'All real numbers',
      properties: {
        connected: true,
        compact: false,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        dimension: 1
      },
      visual: '←──→',
      homeomorphicTo: ['open_interval', 'positive_reals'],
      commonMaps: 'f(x) = x/(1+|x|) maps to (-1,1)'
    },
    {
      id: 'positive_reals',
      name: 'Positive Reals (0,∞)',
      description: 'All positive real numbers',
      properties: {
        connected: true,
        compact: false,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        dimension: 1
      },
      visual: '──→',
      homeomorphicTo: ['real_line', 'open_interval'],
      commonMaps: 'f(x) = ln(x) maps to ℝ'
    },
    {
      id: 'two_points',
      name: 'Discrete Two Points',
      description: 'Two isolated points',
      properties: {
        connected: false,
        compact: true,
        hausdorff: true,
        pathConnected: false,
        simplyConnected: true,
        cardinality: 'Finite (2)',
        fundamentalGroup: '{0}',
        dimension: 0
      },
      visual: '• •',
      homeomorphicTo: ['n_points_2'],
      commonMaps: 'Any bijection between 2-point sets'
    },
    {
      id: 'n_points_2',
      name: 'Two Discrete Points {a,b}',
      description: 'Any two-point discrete space',
      properties: {
        connected: false,
        compact: true,
        hausdorff: true,
        pathConnected: false,
        simplyConnected: true,
        cardinality: 'Finite (2)',
        fundamentalGroup: '{0}',
        dimension: 0
      },
      visual: '◦ ◦',
      homeomorphicTo: ['two_points'],
      commonMaps: 'Any bijection is a homeomorphism'
    },
    {
      id: 'cantor',
      name: 'Cantor Set',
      description: 'Middle-third Cantor set',
      properties: {
        connected: false,
        compact: true,
        hausdorff: true,
        pathConnected: false,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        dimension: 0
      },
      visual: '⋯⋮⋯',
      homeomorphicTo: ['cantor_general'],
      commonMaps: 'Binary expansion mapping'
    },
    {
      id: 'cantor_general',
      name: 'Generalized Cantor Set',
      description: 'Any nowhere dense perfect set',
      properties: {
        connected: false,
        compact: true,
        hausdorff: true,
        pathConnected: false,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        dimension: 0
      },
      visual: ':::',
      homeomorphicTo: ['cantor'],
      commonMaps: 'Continuous bijection via ternary/binary'
    },
    {
      id: 'torus',
      name: 'Torus T²',
      description: 'Surface of a donut S¹ × S¹',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ × ℤ',
        eulerCharacteristic: 0,
        dimension: 2
      },
      visual: '◯',
      homeomorphicTo: ['coffee_mug'],
      commonMaps: 'Continuous deformation preserving one hole'
    },
    {
      id: 'coffee_mug',
      name: 'Coffee Mug (with handle)',
      description: 'Surface with one handle',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ × ℤ',
        eulerCharacteristic: 0,
        dimension: 2
      },
      visual: '☕',
      homeomorphicTo: ['torus'],
      commonMaps: 'Classic topology joke: continuous deformation'
    },
    {
      id: 'sphere',
      name: 'Sphere S²',
      description: 'Surface of a ball',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        eulerCharacteristic: 2,
        dimension: 2
      },
      visual: '●',
      homeomorphicTo: ['cube_surface', 'ellipsoid'],
      commonMaps: 'Radial projection from center'
    },
    {
      id: 'cube_surface',
      name: 'Cube Surface',
      description: 'Boundary of a cube',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        eulerCharacteristic: 2,
        dimension: 2
      },
      visual: '⬜',
      homeomorphicTo: ['sphere', 'ellipsoid'],
      commonMaps: 'Inflate from center to get sphere'
    },
    {
      id: 'ellipsoid',
      name: 'Ellipsoid',
      description: 'Stretched sphere',
      properties: {
        connected: true,
        compact: true,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: true,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: '{0}',
        eulerCharacteristic: 2,
        dimension: 2
      },
      visual: '⬮',
      homeomorphicTo: ['sphere', 'cube_surface'],
      commonMaps: 'Continuous deformation to sphere'
    },
    {
      id: 'punctured_plane',
      name: 'Punctured Plane ℝ² \\ {0}',
      description: 'Plane with origin removed',
      properties: {
        connected: true,
        compact: false,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ',
        dimension: 2
      },
      visual: '⊙',
      homeomorphicTo: ['cylinder', 'annulus_open'],
      commonMaps: 'Deformation retract to S¹'
    },
    {
      id: 'cylinder',
      name: 'Cylinder S¹ × ℝ',
      description: 'Infinite cylinder',
      properties: {
        connected: true,
        compact: false,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ',
        dimension: 2
      },
      visual: '⦀',
      homeomorphicTo: ['punctured_plane', 'annulus_open'],
      commonMaps: 'Logarithmic/exponential maps'
    },
    {
      id: 'annulus_open',
      name: 'Open Annulus',
      description: 'Region between two circles',
      properties: {
        connected: true,
        compact: false,
        hausdorff: true,
        pathConnected: true,
        simplyConnected: false,
        cardinality: 'Uncountable (c)',
        fundamentalGroup: 'ℤ',
        dimension: 2
      },
      visual: '◎',
      homeomorphicTo: ['punctured_plane', 'cylinder'],
      commonMaps: 'Conformal maps preserve structure'
    }
];

// Build set of homeomorphic pairs
const homeomorphicPairs = (() => {
  const pairs = new Set<string>();
  spaces.forEach(space => {
    if (space.homeomorphicTo) {
      space.homeomorphicTo.forEach(otherId => {
        pairs.add(`${space.id}-${otherId}`);
        pairs.add(`${otherId}-${space.id}`);
      });
    }
  });
  return pairs;
})();

const HomeomorphismHunter: React.FC = () => {

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    attempts: 0,
    streak: 0,
    bestStreak: 0,
    history: []
  });

  const [selectedSpaces, setSelectedSpaces] = useState<[Space | null, Space | null]>([null, null]);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<'practice' | 'challenge'>('practice');
  const [showVisualization, setShowVisualization] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectSpace = (space: Space, slot: 0 | 1) => {
    const newSelection: [Space | null, Space | null] = [...selectedSpaces];
    newSelection[slot] = space;
    setSelectedSpaces(newSelection);
    setShowExplanation(false);
    setShowVisualization(false);
  };

  const checkHomeomorphism = useCallback((space1: Space, space2: Space): boolean => {
    if (space1.id === space2.id) return true;
    
    const pairId = `${space1.id}-${space2.id}`;
    return homeomorphicPairs.has(pairId);
  }, []);

  const getInvariantDifferences = (space1: Space, space2: Space): string[] => {
    const differences: string[] = [];
    
    if (space1.properties.connected !== space2.properties.connected) {
      differences.push(`Connectedness: ${space1.name} is ${space1.properties.connected ? 'connected' : 'disconnected'}, ${space2.name} is ${space2.properties.connected ? 'connected' : 'disconnected'}`);
    }
    
    if (space1.properties.compact !== space2.properties.compact) {
      differences.push(`Compactness: ${space1.name} is ${space1.properties.compact ? 'compact' : 'not compact'}, ${space2.name} is ${space2.properties.compact ? 'compact' : 'not compact'}`);
    }
    
    if (space1.properties.fundamentalGroup !== space2.properties.fundamentalGroup) {
      differences.push(`Fundamental group: π₁(${space1.name}) = ${space1.properties.fundamentalGroup}, π₁(${space2.name}) = ${space2.properties.fundamentalGroup}`);
    }
    
    if (space1.properties.cardinality !== space2.properties.cardinality) {
      differences.push(`Cardinality: ${space1.name} is ${space1.properties.cardinality}, ${space2.name} is ${space2.properties.cardinality}`);
    }
    
    if (space1.properties.dimension !== space2.properties.dimension) {
      differences.push(`Dimension: ${space1.name} has dimension ${space1.properties.dimension}, ${space2.name} has dimension ${space2.properties.dimension}`);
    }
    
    if (space1.properties.eulerCharacteristic !== undefined && 
        space2.properties.eulerCharacteristic !== undefined &&
        space1.properties.eulerCharacteristic !== space2.properties.eulerCharacteristic) {
      differences.push(`Euler characteristic: χ(${space1.name}) = ${space1.properties.eulerCharacteristic}, χ(${space2.name}) = ${space2.properties.eulerCharacteristic}`);
    }
    
    if (space1.properties.simplyConnected !== space2.properties.simplyConnected) {
      differences.push(`Simple connectivity: ${space1.name} is ${space1.properties.simplyConnected ? 'simply connected' : 'not simply connected'}, ${space2.name} is ${space2.properties.simplyConnected ? 'simply connected' : 'not simply connected'}`);
    }
    
    return differences;
  };

  const makeGuess = (guess: boolean) => {
    if (!selectedSpaces[0] || !selectedSpaces[1]) return;
    
    const isHomeomorphic = checkHomeomorphism(selectedSpaces[0]!, selectedSpaces[1]!);
    const correct = guess === isHomeomorphic;
    
    setGameState(prev => ({
      ...prev,
      score: correct ? prev.score + 1 : prev.score,
      attempts: prev.attempts + 1,
      streak: correct ? prev.streak + 1 : 0,
      bestStreak: correct ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
      history: [...prev.history, {
        space1: selectedSpaces[0]!.name,
        space2: selectedSpaces[1]!.name,
        guess,
        correct
      }]
    }));
    
    setShowExplanation(true);
  };

  const startChallenge = () => {
    const space1 = spaces[Math.floor(Math.random() * spaces.length)];
    let space2 = spaces[Math.floor(Math.random() * spaces.length)];
    while (space2.id === space1.id) {
      space2 = spaces[Math.floor(Math.random() * spaces.length)];
    }
    
    setSelectedSpaces([space1, space2]);
    setShowExplanation(false);
    setShowVisualization(false);
    setGameMode('challenge');
  };

  const resetGame = () => {
    setGameState({
      score: 0,
      attempts: 0,
      streak: 0,
      bestStreak: 0,
      history: []
    });
    setSelectedSpaces([null, null]);
    setShowExplanation(false);
    setShowVisualization(false);
    setGameMode('practice');
  };

  // Visualize homeomorphism when both spaces are selected
  useEffect(() => {
    if (!showVisualization || !canvasRef.current || !selectedSpaces[0] || !selectedSpaces[1]) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw transformation visualization
    const isHomeo = checkHomeomorphism(selectedSpaces[0], selectedSpaces[1]);
    
    ctx.fillStyle = '#00ffff';
    ctx.font = '14px monospace';
    ctx.fillText(selectedSpaces[0].name, 50, 30);
    ctx.fillText(selectedSpaces[1].name, 350, 30);
    
    // Draw spaces
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    
    // Left space
    ctx.beginPath();
    if (selectedSpaces[0].id.includes('circle') || selectedSpaces[0].id.includes('ellipse')) {
      ctx.arc(100, 100, 40, 0, 2 * Math.PI);
    } else if (selectedSpaces[0].id.includes('interval')) {
      ctx.moveTo(60, 100);
      ctx.lineTo(140, 100);
    } else if (selectedSpaces[0].id.includes('sphere')) {
      ctx.arc(100, 100, 40, 0, 2 * Math.PI);
      ctx.moveTo(60, 100);
      ctx.lineTo(140, 100);
    } else {
      ctx.rect(60, 60, 80, 80);
    }
    ctx.stroke();
    
    // Right space
    ctx.beginPath();
    if (selectedSpaces[1].id.includes('circle') || selectedSpaces[1].id.includes('ellipse')) {
      ctx.arc(400, 100, 40, 0, 2 * Math.PI);
    } else if (selectedSpaces[1].id.includes('interval')) {
      ctx.moveTo(360, 100);
      ctx.lineTo(440, 100);
    } else if (selectedSpaces[1].id.includes('sphere')) {
      ctx.arc(400, 100, 40, 0, 2 * Math.PI);
      ctx.moveTo(360, 100);
      ctx.lineTo(440, 100);
    } else {
      ctx.rect(360, 60, 80, 80);
    }
    ctx.stroke();
    
    // Draw arrow
    ctx.strokeStyle = isHomeo ? '#00ff00' : '#ff0000';
    ctx.beginPath();
    ctx.moveTo(160, 100);
    ctx.lineTo(340, 100);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(330, 95);
    ctx.lineTo(340, 100);
    ctx.lineTo(330, 105);
    ctx.stroke();
    
    // Label arrow
    ctx.fillStyle = isHomeo ? '#00ff00' : '#ff0000';
    ctx.font = '12px monospace';
    ctx.fillText(isHomeo ? 'f: homeomorphism' : 'no homeomorphism', 200, 90);
    
    if (isHomeo && selectedSpaces[0].commonMaps) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      const lines = selectedSpaces[0].commonMaps.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, 150, 130 + i * 15);
      });
    }
  }, [showVisualization, selectedSpaces, checkHomeomorphism]);

  return (
    <div className={styles.hunter}>
      <div className={styles.instructions}>
        <h3>Homeomorphism Hunter - Enhanced Edition</h3>
        <p>Test your knowledge of topological equivalence! Two spaces are homeomorphic if there exists a continuous bijection with continuous inverse between them.</p>
      </div>

      <div className={styles.gameControls}>
        <div className={styles.modeSelector}>
          <button
            className={`${styles.modeButton} ${gameMode === 'practice' ? styles.active : ''}`}
            onClick={() => setGameMode('practice')}
          >
            Practice Mode
          </button>
          <button
            className={`${styles.modeButton} ${gameMode === 'challenge' ? styles.active : ''}`}
            onClick={startChallenge}
          >
            Challenge Mode
          </button>
        </div>

        <div className={styles.scoreBoard}>
          <div className={styles.score}>
            Score: {gameState.score} / {gameState.attempts}
            {gameState.attempts > 0 && (
              <span className={styles.percentage}>
                ({Math.round((gameState.score / gameState.attempts) * 100)}%)
              </span>
            )}
          </div>
          <div className={styles.streak}>
            Streak: {gameState.streak} | Best: {gameState.bestStreak}
          </div>
        </div>
      </div>

      <div className={styles.spaceSelector}>
        <h4>Select Spaces to Compare:</h4>
        <div className={styles.spaceGrid}>
          {spaces.map(space => (
            <div
              key={space.id}
              className={`${styles.spaceCard} ${
                selectedSpaces[0]?.id === space.id || selectedSpaces[1]?.id === space.id
                  ? styles.selected
                  : ''
              }`}
            >
              <div className={styles.spaceVisual}>{space.visual}</div>
              <div className={styles.spaceName}>{space.name}</div>
              <div className={styles.spaceDescription}>{space.description}</div>
              <div className={styles.spaceActions}>
                <button
                  className={`${styles.selectButton} ${
                    selectedSpaces[0]?.id === space.id ? styles.active : ''
                  }`}
                  onClick={() => selectSpace(space, 0)}
                >
                  Space 1
                </button>
                <button
                  className={`${styles.selectButton} ${
                    selectedSpaces[1]?.id === space.id ? styles.active : ''
                  }`}
                  onClick={() => selectSpace(space, 1)}
                >
                  Space 2
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSpaces[0] && selectedSpaces[1] && (
        <div className={styles.comparison}>
          <h4>Comparing Spaces:</h4>
          <div className={styles.comparisonGrid}>
            <div className={styles.spaceDetails}>
              <h5>{selectedSpaces[0].name}</h5>
              <div className={styles.propertyList}>
                <div>Connected: {selectedSpaces[0].properties.connected ? '✓' : '✗'}</div>
                <div>Compact: {selectedSpaces[0].properties.compact ? '✓' : '✗'}</div>
                <div>Simply Connected: {selectedSpaces[0].properties.simplyConnected ? '✓' : '✗'}</div>
                <div>Dimension: {selectedSpaces[0].properties.dimension}</div>
                <div>Cardinality: {selectedSpaces[0].properties.cardinality}</div>
                <div>π₁: {selectedSpaces[0].properties.fundamentalGroup}</div>
                {selectedSpaces[0].properties.eulerCharacteristic !== undefined && (
                  <div>χ: {selectedSpaces[0].properties.eulerCharacteristic}</div>
                )}
              </div>
            </div>

            <div className={styles.versus}>VS</div>

            <div className={styles.spaceDetails}>
              <h5>{selectedSpaces[1].name}</h5>
              <div className={styles.propertyList}>
                <div>Connected: {selectedSpaces[1].properties.connected ? '✓' : '✗'}</div>
                <div>Compact: {selectedSpaces[1].properties.compact ? '✓' : '✗'}</div>
                <div>Simply Connected: {selectedSpaces[1].properties.simplyConnected ? '✓' : '✗'}</div>
                <div>Dimension: {selectedSpaces[1].properties.dimension}</div>
                <div>Cardinality: {selectedSpaces[1].properties.cardinality}</div>
                <div>π₁: {selectedSpaces[1].properties.fundamentalGroup}</div>
                {selectedSpaces[1].properties.eulerCharacteristic !== undefined && (
                  <div>χ: {selectedSpaces[1].properties.eulerCharacteristic}</div>
                )}
              </div>
            </div>
          </div>

          {!showExplanation && (
            <div className={styles.guessButtons}>
              <button
                className={`${styles.guessButton} ${styles.homeomorphic}`}
                onClick={() => makeGuess(true)}
              >
                Homeomorphic ≅
              </button>
              <button
                className={`${styles.guessButton} ${styles.notHomeomorphic}`}
                onClick={() => makeGuess(false)}
              >
                Not Homeomorphic ≇
              </button>
              <button
                className={styles.visualizeButton}
                onClick={() => setShowVisualization(!showVisualization)}
              >
                {showVisualization ? 'Hide' : 'Show'} Visualization
              </button>
            </div>
          )}

          {showVisualization && (
            <div className={styles.visualization}>
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className={styles.canvas}
              />
            </div>
          )}

          {showExplanation && (
            <div className={styles.explanation}>
              <div className={`${styles.result} ${
                checkHomeomorphism(selectedSpaces[0], selectedSpaces[1])
                  ? styles.homeomorphicResult
                  : styles.notHomeomorphicResult
              }`}>
                {checkHomeomorphism(selectedSpaces[0], selectedSpaces[1]) ? (
                  <>
                    <strong>✓ These spaces ARE homeomorphic!</strong>
                    <p>There exists a continuous bijection with continuous inverse between them.</p>
                    {selectedSpaces[0].commonMaps && (
                      <p className={styles.mapDescription}>
                        <strong>Common homeomorphism:</strong> {selectedSpaces[0].commonMaps}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <strong>✗ These spaces are NOT homeomorphic!</strong>
                    <p>They can be distinguished by topological invariants:</p>
                    <ul>
                      {getInvariantDifferences(selectedSpaces[0], selectedSpaces[1]).map((diff, index) => (
                        <li key={index}>{diff}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              
              {gameMode === 'challenge' && (
                <button className={styles.nextButton} onClick={startChallenge}>
                  Next Challenge
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {gameState.history.length > 0 && (
        <div className={styles.history}>
          <h4>Game History:</h4>
          <div className={styles.historyList}>
            {gameState.history.slice(-5).reverse().map((item, index) => (
              <div
                key={index}
                className={`${styles.historyItem} ${
                  item.correct ? styles.correct : styles.incorrect
                }`}
              >
                <span>{item.space1} vs {item.space2}</span>
                <span>Guess: {item.guess ? '≅' : '≇'}</span>
                <span>{item.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>
          <button className={styles.resetButton} onClick={resetGame}>
            Reset Game
          </button>
        </div>
      )}

      <div className={styles.tips}>
        <h4>💡 Key Insights:</h4>
        <ul>
          <li><strong>Dimension</strong> is a topological invariant - spaces of different dimensions cannot be homeomorphic</li>
          <li><strong>Connectedness</strong> is preserved: connected spaces map to connected spaces</li>
          <li><strong>Compactness</strong> is preserved: compact spaces map to compact spaces</li>
          <li><strong>Fundamental group π₁</strong> must be isomorphic for homeomorphic spaces</li>
          <li><strong>Euler characteristic χ</strong> is preserved for compact surfaces</li>
          <li>Open interval (0,1) ≅ ℝ via tan(π(x-1/2))</li>
          <li>All simple closed curves in ℝⁿ are homeomorphic to S¹</li>
          <li>A coffee mug with handle is homeomorphic to a torus (both have genus 1)</li>
          <li>Removing a point from ℝⁿ (n≥2) doesn't disconnect it, but removing a point from ℝ¹ does</li>
        </ul>
      </div>
    </div>
  );
};

export default HomeomorphismHunter;