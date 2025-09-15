import React, { useState, useCallback, useMemo } from 'react';
import styles from './FunctionMachine.module.css';

interface Mapping {
  input: number;
  output: number;
}

type FunctionType = 'function' | 'not-function' | 'injective' | 'surjective' | 'bijective';

const FunctionMachine: React.FC = () => {
  const [mappings, setMappings] = useState<Mapping[]>([
    { input: 1, output: 2 },
    { input: 2, output: 4 },
    { input: 3, output: 6 },
  ]);
  
  const [newInput, setNewInput] = useState<string>('');
  const [newOutput, setNewOutput] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [draggedInput, setDraggedInput] = useState<number | null>(null);

  const domain = useMemo(() => [...new Set(mappings.map(m => m.input))].sort((a, b) => a - b), [mappings]);
  const codomain = useMemo(() => {
    const outputs = mappings.map(m => m.output);
    const min = Math.min(...outputs, 1);
    const max = Math.max(...outputs, 10);
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [mappings]);

  const isFunction = useCallback((): boolean => {
    const inputCounts = new Map<number, number>();
    for (const mapping of mappings) {
      inputCounts.set(mapping.input, (inputCounts.get(mapping.input) || 0) + 1);
    }
    return Array.from(inputCounts.values()).every(count => count === 1);
  }, [mappings]);

  const isInjective = useCallback((): boolean => {
    if (!isFunction()) return false;
    const outputCounts = new Map<number, number>();
    for (const mapping of mappings) {
      outputCounts.set(mapping.output, (outputCounts.get(mapping.output) || 0) + 1);
    }
    return Array.from(outputCounts.values()).every(count => count === 1);
  }, [mappings, isFunction]);

  const isSurjective = useCallback((): boolean => {
    if (!isFunction()) return false;
    const outputs = new Set(mappings.map(m => m.output));
    return codomain.every(val => outputs.has(val));
  }, [mappings, codomain, isFunction]);

  const isBijective = useCallback((): boolean => {
    return isInjective() && isSurjective();
  }, [isInjective, isSurjective]);

  const getFunctionType = useCallback((): FunctionType => {
    if (!isFunction()) return 'not-function';
    if (isBijective()) return 'bijective';
    if (isInjective()) return 'injective';
    if (isSurjective()) return 'surjective';
    return 'function';
  }, [isFunction, isBijective, isInjective, isSurjective]);

  const addMapping = () => {
    const input = parseInt(newInput);
    const output = parseInt(newOutput);
    
    if (!isNaN(input) && !isNaN(output)) {
      setMappings([...mappings, { input, output }]);
      setNewInput('');
      setNewOutput('');
    }
  };

  const removeMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent, output: number) => {
    e.preventDefault();
    if (draggedInput !== null) {
      const existingIndex = mappings.findIndex(m => m.input === draggedInput);
      if (existingIndex >= 0) {
        const newMappings = [...mappings];
        newMappings[existingIndex] = { input: draggedInput, output };
        setMappings(newMappings);
      } else {
        setMappings([...mappings, { input: draggedInput, output }]);
      }
      setDraggedInput(null);
    }
  };

  const loadPreset = (preset: string) => {
    setSelectedPreset(preset);
    switch (preset) {
      case 'identity':
        setMappings([
          { input: 1, output: 1 },
          { input: 2, output: 2 },
          { input: 3, output: 3 },
          { input: 4, output: 4 },
        ]);
        break;
      case 'square':
        setMappings([
          { input: 1, output: 1 },
          { input: 2, output: 4 },
          { input: 3, output: 9 },
          { input: 4, output: 16 },
        ]);
        break;
      case 'not-function':
        setMappings([
          { input: 1, output: 2 },
          { input: 1, output: 3 },
          { input: 2, output: 4 },
          { input: 3, output: 6 },
        ]);
        break;
      case 'constant':
        setMappings([
          { input: 1, output: 5 },
          { input: 2, output: 5 },
          { input: 3, output: 5 },
          { input: 4, output: 5 },
        ]);
        break;
      case 'bijective':
        setMappings([
          { input: 1, output: 3 },
          { input: 2, output: 1 },
          { input: 3, output: 4 },
          { input: 4, output: 2 },
        ]);
        break;
      default:
        break;
    }
  };

  const functionType = getFunctionType();

  return (
    <div className={styles.machine}>
      <div className={styles.instructions}>
        <h3>Function Machine Simulator</h3>
        <p>Build functions by connecting inputs to outputs. See if your mapping is a function, and test for injective, surjective, and bijective properties.</p>
      </div>

      <div className={styles.presets}>
        <h4>Load Preset:</h4>
        <div className={styles.presetButtons}>
          <button 
            className={`${styles.presetButton} ${selectedPreset === 'identity' ? styles.active : ''}`}
            onClick={() => loadPreset('identity')}
          >
            Identity
          </button>
          <button 
            className={`${styles.presetButton} ${selectedPreset === 'square' ? styles.active : ''}`}
            onClick={() => loadPreset('square')}
          >
            Square
          </button>
          <button 
            className={`${styles.presetButton} ${selectedPreset === 'constant' ? styles.active : ''}`}
            onClick={() => loadPreset('constant')}
          >
            Constant
          </button>
          <button 
            className={`${styles.presetButton} ${selectedPreset === 'bijective' ? styles.active : ''}`}
            onClick={() => loadPreset('bijective')}
          >
            Bijective
          </button>
          <button 
            className={`${styles.presetButton} ${selectedPreset === 'not-function' ? styles.active : ''}`}
            onClick={() => loadPreset('not-function')}
          >
            Not a Function
          </button>
        </div>
      </div>

      <div className={styles.machineContainer}>
        <div className={styles.domainColumn}>
          <h4>Domain</h4>
          <div className={styles.elementList}>
            {[1, 2, 3, 4, 5].map(val => (
              <div
                key={val}
                className={`${styles.domainElement} ${domain.includes(val) ? styles.active : ''}`}
                draggable
                onDragStart={() => setDraggedInput(val)}
              >
                {val}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mappingVisual}>
          <svg className={styles.arrows} viewBox="0 0 300 400">
            {mappings.map((mapping, index) => {
              const inputIndex = [1, 2, 3, 4, 5].indexOf(mapping.input);
              const outputIndex = codomain.indexOf(mapping.output);
              if (inputIndex === -1 || outputIndex === -1) return null;
              
              const x1 = 50;
              const y1 = 50 + inputIndex * 70;
              const x2 = 250;
              const y2 = 50 + outputIndex * 40;
              
              return (
                <g key={index}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isFunction() ? '#4ECDC4' : '#FF6B6B'}
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r="15"
                    fill="rgba(255, 255, 255, 0.1)"
                    stroke="rgba(255, 255, 255, 0.3)"
                    className={styles.removeButton}
                    onClick={() => removeMapping(index)}
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 + 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="16"
                    className={styles.removeText}
                    onClick={() => removeMapping(index)}
                  >
                    ×
                  </text>
                </g>
              );
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={isFunction() ? '#4ECDC4' : '#FF6B6B'}
                />
              </marker>
            </defs>
          </svg>
        </div>

        <div className={styles.codomainColumn}>
          <h4>Codomain</h4>
          <div className={styles.elementList}>
            {codomain.map(val => {
              const hasMapping = mappings.some(m => m.output === val);
              return (
                <div
                  key={val}
                  className={`${styles.codomainElement} ${hasMapping ? styles.active : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, val)}
                >
                  {val}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.addMapping}>
        <h4>Add Mapping:</h4>
        <div className={styles.inputGroup}>
          <input
            type="number"
            placeholder="Input"
            value={newInput}
            onChange={(e) => setNewInput(e.target.value)}
            className={styles.input}
          />
          <span className={styles.arrow}>→</span>
          <input
            type="number"
            placeholder="Output"
            value={newOutput}
            onChange={(e) => setNewOutput(e.target.value)}
            className={styles.input}
          />
          <button onClick={addMapping} className={styles.addButton}>
            Add
          </button>
        </div>
      </div>

      <div className={styles.mappingList}>
        <h4>Current Mappings:</h4>
        <div className={styles.mappings}>
          {mappings.length === 0 ? (
            <p className={styles.emptyMessage}>No mappings yet. Add some above!</p>
          ) : (
            mappings.map((mapping, index) => (
              <div key={index} className={styles.mappingItem}>
                f({mapping.input}) = {mapping.output}
                <button
                  className={styles.deleteMappingButton}
                  onClick={() => removeMapping(index)}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.analysis}>
        <h4>Function Analysis:</h4>
        <div className={styles.properties}>
          <div className={`${styles.property} ${isFunction() ? styles.true : styles.false}`}>
            <span className={styles.propertyName}>Is a Function:</span>
            <span className={styles.propertyValue}>{isFunction() ? '✓ Yes' : '✗ No'}</span>
            <div className={styles.propertyDescription}>
              {isFunction() 
                ? 'Each input maps to exactly one output'
                : 'Some input maps to multiple outputs'}
            </div>
          </div>

          <div className={`${styles.property} ${isInjective() ? styles.true : styles.false}`}>
            <span className={styles.propertyName}>Injective (One-to-One):</span>
            <span className={styles.propertyValue}>{isInjective() ? '✓ Yes' : '✗ No'}</span>
            <div className={styles.propertyDescription}>
              {isInjective()
                ? 'Each output has at most one input'
                : isFunction() 
                  ? 'Multiple inputs map to the same output'
                  : 'Not a function'}
            </div>
          </div>

          <div className={`${styles.property} ${isSurjective() ? styles.true : styles.false}`}>
            <span className={styles.propertyName}>Surjective (Onto):</span>
            <span className={styles.propertyValue}>{isSurjective() ? '✓ Yes' : '✗ No'}</span>
            <div className={styles.propertyDescription}>
              {isSurjective()
                ? 'Every codomain element has a preimage'
                : isFunction()
                  ? 'Some codomain elements have no preimage'
                  : 'Not a function'}
            </div>
          </div>

          <div className={`${styles.property} ${isBijective() ? styles.true : styles.false}`}>
            <span className={styles.propertyName}>Bijective (One-to-One Correspondence):</span>
            <span className={styles.propertyValue}>{isBijective() ? '✓ Yes' : '✗ No'}</span>
            <div className={styles.propertyDescription}>
              {isBijective()
                ? 'Both injective and surjective'
                : 'Not both injective and surjective'}
            </div>
          </div>
        </div>

        <div className={`${styles.functionType} ${styles[functionType]}`}>
          Function Type: {functionType === 'not-function' ? 'Not a Function' :
                          functionType === 'bijective' ? 'Bijective Function' :
                          functionType === 'injective' ? 'Injective Function' :
                          functionType === 'surjective' ? 'Surjective Function' :
                          'General Function'}
        </div>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Drag elements from the domain to codomain elements to create mappings</li>
          <li>Click the × on arrows to remove mappings</li>
          <li>Try the presets to see different function types</li>
          <li>A bijective function has an inverse function</li>
        </ul>
      </div>
    </div>
  );
};

export default FunctionMachine;