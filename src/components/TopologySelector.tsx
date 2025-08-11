import React, { useState, useCallback, useMemo } from 'react';
import Select from 'react-select';
import { retroSelectStyles } from '../styles/ReactSelectStyles';
import styles from './TopologySelector.module.css';

interface Function {
  id: string;
  formula: (x: number) => number;
  display: string;
  color: string;
}

type TopologyType = 'pointwise' | 'uniform' | 'compact-open';

type TopologyOption = {
  value: TopologyType;
  label: string;
};

type FunctionOption = {
  value: string;
  label: string;
};

const topologyOptions: TopologyOption[] = [
  { value: 'pointwise', label: 'Pointwise' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'compact-open', label: 'Compact-Open' }
];

const customSelectStylesTopology = retroSelectStyles<TopologyOption>();
const customSelectStylesFunction = retroSelectStyles<FunctionOption>();

const TopologySelector: React.FC = () => {
  const [selectedTopology, setSelectedTopology] = useState<TopologyType>('pointwise');
  const [selectedFunction, setSelectedFunction] = useState<string>('f1');
  const [epsilon, setEpsilon] = useState(0.3);
  const [compactSet, setCompactSet] = useState<[number, number]>([0.3, 0.7]);
  const [evaluationPoint, setEvaluationPoint] = useState(0.5);
  
  const functions: Function[] = useMemo(() => [
    { 
      id: 'f1', 
      formula: (x: number) => Math.sin(4 * Math.PI * x) * 0.3 + 0.5,
      display: 'sin(4πx)',
      color: '#ff0080'
    },
    { 
      id: 'f2', 
      formula: (x: number) => (x - 0.5) * (x - 0.5) * 4 + 0.2,
      display: '4(x-0.5)²',
      color: '#00ffff'
    },
    { 
      id: 'f3', 
      formula: (x: number) => 0.5 + 0.3 * Math.cos(6 * Math.PI * x),
      display: 'cos(6πx)',
      color: '#39ff14'
    },
    {
      id: 'f4',
      formula: (x: number) => Math.abs(Math.sin(8 * Math.PI * x)) * 0.4 + 0.3,
      display: '|sin(8πx)|',
      color: '#ff9f00'
    },
    {
      id: 'f5',
      formula: (x: number) => 0.5 + 0.4 * Math.sin(2 * Math.PI * x) * Math.cos(10 * Math.PI * x),
      display: 'sin(2πx)cos(10πx)',
      color: '#ff00ff'
    }
  ], []);

  const getNeighborhood = useCallback((f: Function): Function[] => {
    const baseFunc = functions.find(func => func.id === f.id);
    if (!baseFunc) return [];
    
    const neighbors: Function[] = [];
    
    switch (selectedTopology) {
      case 'pointwise': {
        // In pointwise topology, basic open sets are of the form:
        // U(x, ε) = {g : |g(x) - f(x)| < ε} for a single point x
        const fx = baseFunc.formula(evaluationPoint);
        
        functions.forEach(g => {
          const gx = g.formula(evaluationPoint);
          if (Math.abs(gx - fx) < epsilon) {
            neighbors.push(g);
          }
        });
        break;
      }
      
      case 'uniform': {
        // In uniform topology, basic open sets are:
        // U(ε) = {g : |g(x) - f(x)| < ε for all x}
        let allClose = true;
        
        functions.forEach(g => {
          allClose = true;
          // Sample many points to check uniform closeness
          for (let x = 0; x <= 1; x += 0.01) {
            if (Math.abs(g.formula(x) - baseFunc.formula(x)) >= epsilon) {
              allClose = false;
              break;
            }
          }
          if (allClose) {
            neighbors.push(g);
          }
        });
        break;
      }
      
      case 'compact-open': {
        // In compact-open topology, basic open sets are:
        // U(K, V) = {g : g(K) ⊆ V} where K is compact and V is open
        // Here K is our compact interval, V is the epsilon-ball around f(K)
        const [a, b] = compactSet;
        
        functions.forEach(g => {
          let inNeighborhood = true;
          
          // Check if g maps the compact set K into the epsilon-neighborhood of f(K)
          for (let x = a; x <= b; x += 0.01) {
            const fx = baseFunc.formula(x);
            const gx = g.formula(x);
            if (Math.abs(gx - fx) >= epsilon) {
              inNeighborhood = false;
              break;
            }
          }
          
          if (inNeighborhood) {
            neighbors.push(g);
          }
        });
        break;
      }
    }
    
    return neighbors;
  }, [selectedTopology, epsilon, evaluationPoint, compactSet, functions]);

  const currentNeighborhood = useMemo(() => {
    const f = functions.find(func => func.id === selectedFunction);
    return f ? getNeighborhood(f) : [];
  }, [selectedFunction, getNeighborhood, functions]);

  const functionOptions: FunctionOption[] = useMemo(() => 
    functions.map(f => ({
      value: f.id,
      label: f.display
    })), [functions]);

  const plotFunction = (f: Function, _opacity: number = 1) => {
    const points: string[] = [];
    for (let x = 0; x <= 1; x += 0.005) {
      const y = f.formula(x);
      points.push(`${50 + x * 500},${350 - y * 300}`);
    }
    return points.join(' ');
  };

  const getTopologyDescription = () => {
    switch (selectedTopology) {
      case 'pointwise':
        return 'Neighborhoods determined by function values at individual points. Weakest topology - convergence means pointwise convergence.';
      case 'uniform':
        return 'Neighborhoods determined by uniform distance over entire domain. Convergence means uniform convergence.';
      case 'compact-open':
        return 'Neighborhoods determined by behavior on compact sets. Natural topology for continuous functions.';
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Topology Selector for C(X,Y)</h2>
      <p className={styles.subtitle}>
        Explore different topologies on function spaces
      </p>
      
      <div className={styles.controls}>
        <div className={styles.topologySelector}>
          <label>Topology:</label>
          <Select<TopologyOption>
            value={topologyOptions.find(opt => opt.value === selectedTopology)}
            onChange={(newValue) => newValue && setSelectedTopology(newValue.value)}
            options={topologyOptions}
            styles={customSelectStylesTopology}
            isSearchable={false}
            className={styles.selectContainer}
            classNamePrefix="retro-select"
          />
        </div>
        
        <div className={styles.functionSelector}>
          <label>Base Function:</label>
          <Select<FunctionOption>
            value={functionOptions.find(opt => opt.value === selectedFunction)}
            onChange={(newValue) => newValue && setSelectedFunction(newValue.value)}
            options={functionOptions}
            styles={customSelectStylesFunction}
            isSearchable={false}
            className={styles.selectContainer}
            classNamePrefix="retro-select"
          />
        </div>
        
        <div className={styles.parameterControl}>
          <label>ε-radius: {epsilon.toFixed(2)}</label>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.05"
            value={epsilon}
            onChange={(e) => setEpsilon(Number(e.target.value))}
          />
        </div>
        
        {selectedTopology === 'pointwise' && (
          <div className={styles.parameterControl}>
            <label>Evaluation Point: {evaluationPoint.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={evaluationPoint}
              onChange={(e) => setEvaluationPoint(Number(e.target.value))}
            />
          </div>
        )}
        
        {selectedTopology === 'compact-open' && (
          <div className={styles.compactSetControl}>
            <label>Compact Set K:</label>
            <div className={styles.intervalInputs}>
              <input
                type="range"
                min="0"
                max={compactSet[1] - 0.1}
                step="0.05"
                value={compactSet[0]}
                onChange={(e) => setCompactSet([Number(e.target.value), compactSet[1]])}
              />
              <span>[{compactSet[0].toFixed(2)}, {compactSet[1].toFixed(2)}]</span>
              <input
                type="range"
                min={compactSet[0] + 0.1}
                max="1"
                step="0.05"
                value={compactSet[1]}
                onChange={(e) => setCompactSet([compactSet[0], Number(e.target.value)])}
              />
            </div>
          </div>
        )}
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
            
            {/* Show relevant region based on topology */}
            {selectedTopology === 'pointwise' && (
              <>
                <line
                  x1={50 + evaluationPoint * 500}
                  y1={50}
                  x2={50 + evaluationPoint * 500}
                  y2={350}
                  stroke="#ffff00"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  opacity="0.5"
                />
                {(() => {
                  const selectedFunc = functions.find(f => f.id === selectedFunction);
                  if (!selectedFunc) return null;
                  return (
                    <circle
                      cx={50 + evaluationPoint * 500}
                      cy={350 - selectedFunc.formula(evaluationPoint) * 300}
                      r={epsilon * 150}
                      fill="none"
                      stroke="#ffff00"
                      strokeWidth="2"
                      opacity="0.3"
                    />
                  );
                })()}
              </>
            )}
            
            {selectedTopology === 'compact-open' && (
              <rect
                x={50 + compactSet[0] * 500}
                y={50}
                width={(compactSet[1] - compactSet[0]) * 500}
                height={300}
                fill="#ffff00"
                opacity="0.1"
                stroke="#ffff00"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
            
            {/* Plot functions in neighborhood */}
            {currentNeighborhood.map(f => (
              f.id !== selectedFunction && (
                <polyline
                  key={f.id}
                  points={plotFunction(f)}
                  fill="none"
                  stroke={f.color}
                  strokeWidth="2"
                  opacity="0.4"
                />
              )
            ))}
            
            {/* Plot selected function */}
            {(() => {
              const selectedFunc = functions.find(f => f.id === selectedFunction);
              return selectedFunc ? (
                <polyline
                  points={plotFunction(selectedFunc)}
                  fill="none"
                  stroke={selectedFunc.color}
                  strokeWidth="3"
                  filter="url(#glow)"
                />
              ) : null;
            })()}
            
            {/* Labels */}
            <text x="300" y="30" fill="#ffff00" fontSize="14" textAnchor="middle" 
              style={{ fontFamily: 'monospace', textShadow: '0 0 5px #ffff00' }}>
              C([0,1], [0,1]) with {selectedTopology} topology
            </text>
          </svg>
        </div>
        
        <div className={styles.info}>
          <div className={styles.topologyInfo}>
            <h3>Current Topology</h3>
            <p className={styles.topologyName}>{selectedTopology}</p>
            <p className={styles.description}>{getTopologyDescription()}</p>
          </div>
          
          <div className={styles.neighborhoodInfo}>
            <h3>Basic Open Set</h3>
            <div className={styles.formula}>
              {selectedTopology === 'pointwise' && (
                <>U(f, {evaluationPoint.toFixed(2)}, {epsilon.toFixed(2)}) = {'{'} g : |g({evaluationPoint.toFixed(2)}) - f({evaluationPoint.toFixed(2)})| {'<'} {epsilon.toFixed(2)} {'}'}</>
              )}
              {selectedTopology === 'uniform' && (
                <>U(f, {epsilon.toFixed(2)}) = {'{'} g : sup|g(x) - f(x)| {'<'} {epsilon.toFixed(2)} {'}'}</>
              )}
              {selectedTopology === 'compact-open' && (
                <>U(K, V) = {'{'} g : g([{compactSet[0].toFixed(2)}, {compactSet[1].toFixed(2)}]) ⊆ B(f(K), {epsilon.toFixed(2)}) {'}'}</>
              )}
            </div>
          </div>
          
          <div className={styles.neighborhoodList}>
            <h3>Functions in Neighborhood</h3>
            <div className={styles.functionList}>
              {currentNeighborhood.length === 0 ? (
                <p className={styles.emptyMessage}>No functions in this neighborhood</p>
              ) : (
                currentNeighborhood.map(f => (
                  <div 
                    key={f.id} 
                    className={styles.functionItem}
                    style={{ borderColor: f.color }}
                  >
                    <span className={styles.functionIndicator} style={{ backgroundColor: f.color }} />
                    <span>{f.display}</span>
                    {f.id === selectedFunction && <span className={styles.baseLabel}>BASE</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopologySelector;