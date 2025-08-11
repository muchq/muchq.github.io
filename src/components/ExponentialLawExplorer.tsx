import React, { useState, useCallback } from 'react';
import Select from 'react-select';
import { retroSelectStyles } from '../styles/ReactSelectStyles';
import styles from './ExponentialLawExplorer.module.css';

type MappingView = 'overview' | 'curry-demo' | 'uncurry-demo';

type FunctionOption = {
  value: 'product' | 'sum' | 'max';
  label: string;
};

const functionOptions: FunctionOption[] = [
  { value: 'product', label: 'Product: f(x,y) = xy' },
  { value: 'sum', label: 'Average: f(x,y) = (x+y)/2' },
  { value: 'max', label: 'Maximum: f(x,y) = max(x,y)' }
];

const customSelectStyles = retroSelectStyles<FunctionOption>();

const ExponentialLawExplorer: React.FC = () => {
  const [mappingView, setMappingView] = useState<MappingView>('overview');
  const [selectedX, setSelectedX] = useState(0.5);
  const [selectedY, setSelectedY] = useState(0.5);
  const [selectedFunction, setSelectedFunction] = useState<'product' | 'sum' | 'max'>('product');
  const [step, setStep] = useState(0);
  
  // Example function f: X × Y → Z
  const functions = {
    product: {
      name: 'f(x,y) = xy',
      compute: (x: number, y: number) => x * y,
      color: '#ff0080'
    },
    sum: {
      name: 'f(x,y) = (x+y)/2',
      compute: (x: number, y: number) => (x + y) / 2,
      color: '#00ffff'
    },
    max: {
      name: 'f(x,y) = max(x,y)',
      compute: (x: number, y: number) => Math.max(x, y),
      color: '#39ff14'
    }
  };
  
  const currentFunc = functions[selectedFunction];
  
  // Curry: transforms f(x,y) into g(x)(y)
  const curriedValue = useCallback((x: number) => {
    return (y: number) => currentFunc.compute(x, y);
  }, [currentFunc]);
  
  // Compute the actual values
  const directValue = currentFunc.compute(selectedX, selectedY);
  const curriedResult = curriedValue(selectedX)(selectedY);
  
  const renderInteractiveDemo = () => {
    if (mappingView === 'curry-demo') {
      return (
        <div className={styles.demoContainer}>
          <h3>Curry Transformation: f(x,y) → g(x)(y)</h3>
          
          <div className={styles.demoSteps}>
            <div className={`${styles.step} ${step >= 0 ? styles.active : ''}`}>
              <h4>Step 1: Original Function</h4>
              <div className={styles.codeBlock}>
                {currentFunc.name} = {directValue.toFixed(3)}
              </div>
              <p>Takes both x={selectedX.toFixed(2)} and y={selectedY.toFixed(2)} at once</p>
            </div>
            
            <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
              <h4>Step 2: Fix x = {selectedX.toFixed(2)}</h4>
              <div className={styles.codeBlock}>
                g(y) = f({selectedX.toFixed(2)}, y) = {selectedX.toFixed(2)} * y
              </div>
              <p>Creates a new function that only needs y</p>
            </div>
            
            <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
              <h4>Step 3: Apply y = {selectedY.toFixed(2)}</h4>
              <div className={styles.codeBlock}>
                g({selectedY.toFixed(2)}) = {curriedResult.toFixed(3)}
              </div>
              <p>Get the same result: {directValue.toFixed(3)} = {curriedResult.toFixed(3)} ✓</p>
            </div>
          </div>
          
          <div className={styles.stepControls}>
            <button 
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className={styles.button}
            >
              Previous
            </button>
            <button 
              onClick={() => setStep(Math.min(2, step + 1))}
              disabled={step === 2}
              className={styles.button}
            >
              Next
            </button>
          </div>
        </div>
      );
    }
    
    if (mappingView === 'uncurry-demo') {
      return (
        <div className={styles.demoContainer}>
          <h3>Uncurry Transformation: g(x)(y) → f(x,y)</h3>
          
          <div className={styles.demoSteps}>
            <div className={`${styles.step} ${step >= 0 ? styles.active : ''}`}>
              <h4>Step 1: Curried Function</h4>
              <div className={styles.codeBlock}>
                g: X → (Y → Z)
              </div>
              <p>A function that returns another function</p>
            </div>
            
            <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
              <h4>Step 2: Apply x = {selectedX.toFixed(2)}</h4>
              <div className={styles.codeBlock}>
                h = g({selectedX.toFixed(2)}): Y → Z
              </div>
              <p>Get a function from Y to Z</p>
            </div>
            
            <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
              <h4>Step 3: Combine into f(x,y)</h4>
              <div className={styles.codeBlock}>
                f({selectedX.toFixed(2)}, {selectedY.toFixed(2)}) = g({selectedX.toFixed(2)})({selectedY.toFixed(2)}) = {curriedResult.toFixed(3)}
              </div>
              <p>Same result through different path!</p>
            </div>
          </div>
          
          <div className={styles.stepControls}>
            <button 
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className={styles.button}
            >
              Previous
            </button>
            <button 
              onClick={() => setStep(Math.min(2, step + 1))}
              disabled={step === 2}
              className={styles.button}
            >
              Next
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Exponential Law Explorer</h2>
      <p className={styles.subtitle}>
        Understanding the bijection C(X×Y, Z) ≅ C(X, C(Y, Z))
      </p>
      
      <div className={styles.controls}>
        <div className={styles.functionSelector}>
          <label>Function:</label>
          <Select<FunctionOption>
            value={functionOptions.find(opt => opt.value === selectedFunction)}
            onChange={(newValue) => newValue && setSelectedFunction(newValue.value)}
            options={functionOptions}
            styles={customSelectStyles}
            isSearchable={false}
            className={styles.selectContainer}
            classNamePrefix="retro-select"
          />
        </div>
        
        <div className={styles.inputControls}>
          <div className={styles.sliderGroup}>
            <label>x = {selectedX.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedX}
              onChange={(e) => setSelectedX(Number(e.target.value))}
            />
          </div>
          
          <div className={styles.sliderGroup}>
            <label>y = {selectedY.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedY}
              onChange={(e) => setSelectedY(Number(e.target.value))}
            />
          </div>
        </div>
        
        <div className={styles.viewSelector}>
          <button
            className={`${styles.viewButton} ${mappingView === 'overview' ? styles.active : ''}`}
            onClick={() => {
              setMappingView('overview');
              setStep(0);
            }}
          >
            Overview
          </button>
          <button
            className={`${styles.viewButton} ${mappingView === 'curry-demo' ? styles.active : ''}`}
            onClick={() => {
              setMappingView('curry-demo');
              setStep(0);
            }}
          >
            Curry Demo
          </button>
          <button
            className={`${styles.viewButton} ${mappingView === 'uncurry-demo' ? styles.active : ''}`}
            onClick={() => {
              setMappingView('uncurry-demo');
              setStep(0);
            }}
          >
            Uncurry Demo
          </button>
        </div>
      </div>
      
      <div className={styles.visualizationContainer}>
        {mappingView === 'overview' ? (
          <>
            <div className={styles.mainVisualization}>
              <svg width="800" height="400" className={styles.diagram}>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#ffff00" />
                  </marker>
                </defs>
                
                <rect width="800" height="400" fill="#0a0a0a" />
                
                {/* Left side: Direct mapping */}
                <g transform="translate(50, 50)">
                  <text x="150" y="20" fill="#ff0080" fontSize="16" textAnchor="middle"
                    style={{ fontFamily: 'monospace', textShadow: '0 0 5px #ff0080' }}>
                    Direct: C(X × Y, Z)
                  </text>
                  
                  {/* Product space X × Y */}
                  <rect x="50" y="50" width="200" height="150" fill="none" stroke="#00ffff" strokeWidth="2" />
                  <text x="150" y="40" fill="#00ffff" fontSize="12" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    X × Y
                  </text>
                  
                  {/* Selected point */}
                  <circle
                    cx={50 + selectedX * 200}
                    cy={50 + selectedY * 150}
                    r="8"
                    fill="#ff0080"
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                  <text
                    x={50 + selectedX * 200}
                    y={45 + selectedY * 150}
                    fill="#ffffff"
                    fontSize="10"
                    textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}
                  >
                    ({selectedX.toFixed(1)}, {selectedY.toFixed(1)})
                  </text>
                  
                  {/* Arrow to Z */}
                  <path d="M 150 210 L 150 250" stroke="#ffff00" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="160" y="235" fill="#ffff00" fontSize="12" style={{ fontFamily: 'monospace' }}>f</text>
                  
                  {/* Target space Z */}
                  <line x1="50" y1="270" x2="250" y2="270" stroke="#39ff14" strokeWidth="3" />
                  <text x="150" y="290" fill="#39ff14" fontSize="12" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    Z = [0, 1]
                  </text>
                  
                  {/* Result point */}
                  <circle
                    cx={50 + directValue * 200}
                    cy={270}
                    r="8"
                    fill="#ff0080"
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                  <text x={50 + directValue * 200} y={260} fill="#ffffff" fontSize="10" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    {directValue.toFixed(2)}
                  </text>
                </g>
                
                {/* Right side: Curried mapping */}
                <g transform="translate(400, 50)">
                  <text x="150" y="20" fill="#39ff14" fontSize="16" textAnchor="middle"
                    style={{ fontFamily: 'monospace', textShadow: '0 0 5px #39ff14' }}>
                    Curried: C(X, C(Y, Z))
                  </text>
                  
                  {/* Space X */}
                  <line x1="50" y1="70" x2="150" y2="70" stroke="#00ffff" strokeWidth="3" />
                  <text x="100" y="60" fill="#00ffff" fontSize="12" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    X
                  </text>
                  <circle
                    cx={50 + selectedX * 100}
                    cy={70}
                    r="6"
                    fill="#ff0080"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  
                  {/* Arrow to function space */}
                  <path d="M 160 70 L 200 70" stroke="#ffff00" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="180" y="65" fill="#ffff00" fontSize="12" style={{ fontFamily: 'monospace' }}>g</text>
                  
                  {/* Function space C(Y, Z) */}
                  <rect x="210" y="50" width="120" height="100" fill="none" stroke="#9b59b6" strokeWidth="2" strokeDasharray="5,5" />
                  <text x="270" y="40" fill="#9b59b6" fontSize="12" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    C(Y, Z)
                  </text>
                  
                  {/* Inner function visualization */}
                  <text x="270" y="100" fill="#ffff00" fontSize="10" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    h(y) = {selectedFunction === 'product' ? `${selectedX.toFixed(1)}*y` : 
                            selectedFunction === 'sum' ? `(${selectedX.toFixed(1)}+y)/2` : 
                            `max(${selectedX.toFixed(1)},y)`}
                  </text>
                  
                  {/* Y input */}
                  <line x1="210" y1="180" x2="330" y2="180" stroke="#00ffff" strokeWidth="3" />
                  <text x="270" y="170" fill="#00ffff" fontSize="12" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    Y
                  </text>
                  <circle
                    cx={210 + selectedY * 120}
                    cy={180}
                    r="6"
                    fill="#ff0080"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  
                  {/* Arrow to Z */}
                  <path d="M 270 190 L 270 250" stroke="#ffff00" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="280" y="220" fill="#ffff00" fontSize="12" style={{ fontFamily: 'monospace' }}>h</text>
                  
                  {/* Result in Z */}
                  <line x1="210" y1="270" x2="330" y2="270" stroke="#39ff14" strokeWidth="3" />
                  <text x="270" y="290" fill="#39ff14" fontSize="12" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    Z
                  </text>
                  <circle
                    cx={210 + curriedResult * 120}
                    cy={270}
                    r="8"
                    fill="#ff0080"
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#glow)"
                  />
                  <text x={210 + curriedResult * 120} y={260} fill="#ffffff" fontSize="10" textAnchor="middle"
                    style={{ fontFamily: 'monospace' }}>
                    {curriedResult.toFixed(2)}
                  </text>
                </g>
                
                {/* Bijection symbol */}
                <text x="400" y="200" fill="#ffff00" fontSize="30" textAnchor="middle"
                  style={{ fontFamily: 'monospace', textShadow: '0 0 10px #ffff00' }}>
                  ≅
                </text>
              </svg>
            </div>
            
            <div className={styles.info}>
              <div className={styles.resultComparison}>
                <h3>Result Comparison</h3>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <span className={styles.label}>Direct:</span>
                    <span className={styles.value}>{currentFunc.name} = {directValue.toFixed(3)}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.label}>Curried:</span>
                    <span className={styles.value}>g({selectedX.toFixed(2)})({selectedY.toFixed(2)}) = {curriedResult.toFixed(3)}</span>
                  </div>
                  <div className={styles.resultItem}>
                    <span className={styles.label}>Match:</span>
                    <span className={styles.value}>✓ Both equal {directValue.toFixed(3)}</span>
                  </div>
                </div>
              </div>
              
              <div className={styles.explanation}>
                <h3>What's Happening?</h3>
                <p>
                  The Exponential Law shows two equivalent ways to define functions:
                </p>
                <ul>
                  <li><strong>Left (Direct):</strong> Take a pair (x,y) and map it directly to z</li>
                  <li><strong>Right (Curried):</strong> Take x, return a function that takes y and gives z</li>
                </ul>
                <p>
                  Both approaches give the same result! This bijection is fundamental in:
                </p>
                <ul>
                  <li>Functional programming (currying)</li>
                  <li>Category theory (exponential objects)</li>
                  <li>Topology (function spaces)</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          renderInteractiveDemo()
        )}
      </div>
    </div>
  );
};

export default ExponentialLawExplorer;