import React, { useState, useEffect, useCallback } from 'react';
import styles from './ConvergenceComparator.module.css';

interface FunctionSequence {
  id: string;
  name: string;
  formula: (n: number, x: number) => number;
  limit: (x: number) => number;
  color: string;
}

type ConvergenceType = 'pointwise' | 'uniform' | 'none';

const ConvergenceComparator: React.FC = () => {
  const [selectedSequence, setSelectedSequence] = useState<string>('seq1');
  const [n, setN] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [evaluationPoints] = useState<number[]>([0.25, 0.5, 0.75]);
  
  const sequences: FunctionSequence[] = [
    {
      id: 'seq1',
      name: 'fₙ(x) = xⁿ',
      formula: (n: number, x: number) => Math.pow(x, n),
      limit: (_x: number) => _x < 1 ? 0 : 1,
      color: '#ff0080'
    },
    {
      id: 'seq2',
      name: 'fₙ(x) = sin(nx)/n',
      formula: (n: number, x: number) => Math.sin(n * x * Math.PI * 2) / n,
      limit: (_x: number) => 0,
      color: '#00ffff'
    },
    {
      id: 'seq3',
      name: 'fₙ(x) = x/(1 + nx²)',
      formula: (n: number, x: number) => x / (1 + n * x * x),
      limit: (_x: number) => _x === 0 ? 0 : 0,
      color: '#39ff14'
    },
    {
      id: 'seq4',
      name: 'fₙ(x) = nxe^(-nx)',
      formula: (n: number, x: number) => n * x * Math.exp(-n * x),
      limit: (_x: number) => 0,
      color: '#ff9f00'
    },
    {
      id: 'seq5',
      name: 'fₙ(x) = arctan(nx)/π',
      formula: (n: number, x: number) => Math.atan(n * (x - 0.5)) / Math.PI + 0.5,
      limit: (_x: number) => _x < 0.5 ? 0 : _x > 0.5 ? 1 : 0.5,
      color: '#ff00ff'
    }
  ];

  const checkConvergence = useCallback((seq: FunctionSequence): { 
    pointwise: boolean; 
    uniform: boolean; 
    pointwiseError: number[];
    uniformError: number;
  } => {
    const pointwiseErrors: number[] = [];
    let maxError = 0;
    
    // Check pointwise convergence at evaluation points
    evaluationPoints.forEach(x => {
      const error = Math.abs(seq.formula(n, x) - seq.limit(x));
      pointwiseErrors.push(error);
    });
    
    // Check uniform convergence (sample many points)
    for (let x = 0; x <= 1; x += 0.01) {
      const error = Math.abs(seq.formula(n, x) - seq.limit(x));
      maxError = Math.max(maxError, error);
    }
    
    return {
      pointwise: pointwiseErrors.every(e => e < 0.1),
      uniform: maxError < 0.1,
      pointwiseError: pointwiseErrors,
      uniformError: maxError
    };
  }, [n, evaluationPoints]);

  const plotFunction = (f: (x: number) => number, color: string, strokeWidth: number = 2, opacity: number = 1) => {
    const points: string[] = [];
    for (let x = 0; x <= 1; x += 0.005) {
      const y = Math.max(0, Math.min(1, f(x))); // Clamp to [0, 1]
      points.push(`${50 + x * 500},${350 - y * 300}`);
    }
    return (
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
    );
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setInterval(() => {
        setN(prev => {
          if (prev >= 50) {
            setIsAnimating(false);
            return 50;
          }
          return prev + 1;
        });
      }, 100);
      
      return () => clearInterval(timer);
    }
  }, [isAnimating]);

  const currentSequence = sequences.find(s => s.id === selectedSequence)!;
  const convergenceInfo = checkConvergence(currentSequence);

  const getConvergenceType = (): ConvergenceType => {
    if (convergenceInfo.uniform) return 'uniform';
    if (convergenceInfo.pointwise) return 'pointwise';
    return 'none';
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Convergence Comparator</h2>
      <p className={styles.subtitle}>
        Compare pointwise vs uniform convergence of function sequences
      </p>
      
      <div className={styles.controls}>
        <div className={styles.sequenceSelector}>
          <label>Sequence:</label>
          <select 
            value={selectedSequence} 
            onChange={(e) => {
              setSelectedSequence(e.target.value);
              setN(1);
            }}
          >
            {sequences.map(seq => (
              <option key={seq.id} value={seq.id}>{seq.name}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.nControl}>
          <label>n = {n}</label>
          <input
            type="range"
            min="1"
            max="50"
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
          />
        </div>
        
        <button 
          className={styles.button}
          onClick={() => {
            setN(1);
            setIsAnimating(true);
          }}
        >
          Animate n→∞
        </button>
        
        <button 
          className={styles.button}
          onClick={() => {
            setIsAnimating(false);
            setN(1);
          }}
        >
          Reset
        </button>
      </div>
      
      <div className={styles.visualizationContainer}>
        <div className={styles.plotContainer}>
          <svg width="600" height="400" className={styles.plot}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Background */}
            <rect width="600" height="400" fill="#0a0a0a" />
            
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(val => (
              <g key={val}>
                <line
                  x1={50 + val * 500}
                  y1={50}
                  x2={50 + val * 500}
                  y2={350}
                  stroke="#1a0033"
                  strokeWidth="1"
                />
                <text
                  x={50 + val * 500}
                  y={370}
                  fill="#00ffff"
                  fontSize="10"
                  textAnchor="middle"
                  style={{ fontFamily: 'monospace' }}
                >
                  {val}
                </text>
              </g>
            ))}
            
            {[0, 0.5, 1].map(val => (
              <g key={val}>
                <line
                  x1={50}
                  y1={350 - val * 300}
                  x2={550}
                  y2={350 - val * 300}
                  stroke="#1a0033"
                  strokeWidth="1"
                />
                <text
                  x={40}
                  y={355 - val * 300}
                  fill="#00ffff"
                  fontSize="10"
                  textAnchor="end"
                  style={{ fontFamily: 'monospace' }}
                >
                  {val}
                </text>
              </g>
            ))}
            
            {/* Evaluation points for pointwise convergence */}
            {evaluationPoints.map((x, i) => (
              <g key={i}>
                <line
                  x1={50 + x * 500}
                  y1={50}
                  x2={50 + x * 500}
                  y2={350}
                  stroke="#ffff00"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                  opacity="0.3"
                />
                <circle
                  cx={50 + x * 500}
                  cy={350 - currentSequence.formula(n, x) * 300}
                  r="4"
                  fill={currentSequence.color}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
                <circle
                  cx={50 + x * 500}
                  cy={350 - currentSequence.limit(x) * 300}
                  r="4"
                  fill="none"
                  stroke="#ffff00"
                  strokeWidth="2"
                />
              </g>
            ))}
            
            {/* Limit function */}
            {plotFunction(currentSequence.limit, '#ffff00', 2, 0.6)}
            
            {/* Current function in sequence */}
            {plotFunction(
              (x) => currentSequence.formula(n, x),
              currentSequence.color,
              3,
              1
            )}
            
            {/* Uniform error band */}
            {convergenceInfo.uniformError < 0.5 && (
              <>
                {plotFunction(
                  (x) => currentSequence.limit(x) + convergenceInfo.uniformError,
                  '#ffff00',
                  1,
                  0.2
                )}
                {plotFunction(
                  (x) => currentSequence.limit(x) - convergenceInfo.uniformError,
                  '#ffff00',
                  1,
                  0.2
                )}
              </>
            )}
            
            {/* Labels */}
            <text x="300" y="30" fill="#ffff00" fontSize="14" textAnchor="middle" 
              style={{ fontFamily: 'monospace', textShadow: '0 0 5px #ffff00' }}>
              {currentSequence.name} with n = {n}
            </text>
          </svg>
        </div>
        
        <div className={styles.info}>
          <div className={styles.convergenceStatus}>
            <h3>Convergence Status</h3>
            <div className={styles.statusIndicators}>
              <div className={`${styles.indicator} ${convergenceInfo.pointwise ? styles.converged : styles.notConverged}`}>
                <span className={styles.indicatorLabel}>Pointwise</span>
                <span className={styles.indicatorStatus}>
                  {convergenceInfo.pointwise ? 'Converging' : 'Not Yet'}
                </span>
              </div>
              <div className={`${styles.indicator} ${convergenceInfo.uniform ? styles.converged : styles.notConverged}`}>
                <span className={styles.indicatorLabel}>Uniform</span>
                <span className={styles.indicatorStatus}>
                  {convergenceInfo.uniform ? 'Converging' : 'Not Yet'}
                </span>
              </div>
            </div>
          </div>
          
          <div className={styles.errorMetrics}>
            <h3>Error Metrics</h3>
            <div className={styles.metricsList}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Uniform Error:</span>
                <span className={styles.metricValue}>
                  {convergenceInfo.uniformError.toFixed(4)}
                </span>
              </div>
              {evaluationPoints.map((x, i) => (
                <div key={i} className={styles.metric}>
                  <span className={styles.metricLabel}>Error at x={x.toFixed(2)}:</span>
                  <span className={styles.metricValue}>
                    {convergenceInfo.pointwiseError[i]?.toFixed(4) || '0.0000'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.explanation}>
            <h3>Convergence Type</h3>
            <p className={styles.convergenceType}>
              {getConvergenceType() === 'uniform' && 'Uniform Convergence'}
              {getConvergenceType() === 'pointwise' && 'Pointwise Only'}
              {getConvergenceType() === 'none' && 'Not Converged'}
            </p>
            <p className={styles.description}>
              {getConvergenceType() === 'uniform' && 
                'The sequence converges uniformly - the same rate of convergence works for all points simultaneously.'}
              {getConvergenceType() === 'pointwise' && 
                'The sequence converges pointwise but not uniformly - different points converge at different rates.'}
              {getConvergenceType() === 'none' && 
                'The sequence has not yet converged. Increase n to see convergence behavior.'}
            </p>
          </div>
          
          <div className={styles.legend}>
            <h3>Legend</h3>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: currentSequence.color }} />
              <span>fₙ(x) - Current</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#ffff00' }} />
              <span>f(x) - Limit</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendCircle} style={{ borderColor: '#ffff00' }} />
              <span>Evaluation Points</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvergenceComparator;