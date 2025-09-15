import React, { useState, useCallback, useMemo } from 'react';
import styles from './CompositionLab.module.css';

interface FunctionDef {
  id: string;
  name: string;
  rule: string;
  evaluate: (x: number) => number;
}

const CompositionLab: React.FC = () => {
  const availableFunctions: FunctionDef[] = useMemo(() => [
    { id: 'f1', name: 'f(x)', rule: '2x', evaluate: (x) => 2 * x },
    { id: 'f2', name: 'g(x)', rule: 'x + 3', evaluate: (x) => x + 3 },
    { id: 'f3', name: 'h(x)', rule: 'x²', evaluate: (x) => x * x },
    { id: 'f4', name: 'k(x)', rule: '√x', evaluate: (x) => Math.sqrt(Math.abs(x)) },
    { id: 'f5', name: 'm(x)', rule: '1/x', evaluate: (x) => x !== 0 ? 1 / x : NaN },
    { id: 'f6', name: 'n(x)', rule: '|x|', evaluate: (x) => Math.abs(x) },
  ], []);

  const [compositionChain, setCompositionChain] = useState<FunctionDef[]>([]);
  const [inputValue, setInputValue] = useState<string>('2');
  const [showSteps, setShowSteps] = useState<boolean>(true);
  const [draggedFunction, setDraggedFunction] = useState<FunctionDef | null>(null);

  const addToChain = useCallback((func: FunctionDef) => {
    setCompositionChain([...compositionChain, func]);
  }, [compositionChain]);

  const removeFromChain = useCallback((index: number) => {
    setCompositionChain(compositionChain.filter((_, i) => i !== index));
  }, [compositionChain]);

  const clearChain = useCallback(() => {
    setCompositionChain([]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index?: number) => {
    e.preventDefault();
    if (draggedFunction) {
      if (index !== undefined) {
        const newChain = [...compositionChain];
        newChain.splice(index, 0, draggedFunction);
        setCompositionChain(newChain);
      } else {
        addToChain(draggedFunction);
      }
      setDraggedFunction(null);
    }
  }, [draggedFunction, compositionChain, addToChain]);

  const evaluateComposition = useCallback((): { steps: string[]; result: number | string } => {
    const input = parseFloat(inputValue);
    if (isNaN(input)) {
      return { steps: [], result: 'Invalid input' };
    }

    if (compositionChain.length === 0) {
      return { steps: [], result: input };
    }

    const steps: string[] = [];
    let current = input;
    steps.push(`Start: x = ${current}`);

    for (let i = compositionChain.length - 1; i >= 0; i--) {
      const func = compositionChain[i];
      const previous = current;
      current = func.evaluate(current);
      
      if (isNaN(current)) {
        steps.push(`${func.name} = ${func.rule} : ${previous} → undefined`);
        return { steps, result: 'Undefined' };
      }
      
      steps.push(`${func.name} = ${func.rule} : ${previous.toFixed(2)} → ${current.toFixed(2)}`);
    }

    return { steps, result: current };
  }, [inputValue, compositionChain]);

  const getCompositionNotation = useCallback((): string => {
    if (compositionChain.length === 0) return 'Identity';
    if (compositionChain.length === 1) return compositionChain[0].name;
    
    return compositionChain.map(f => f.name.replace('(x)', '')).join(' ∘ ') + '(x)';
  }, [compositionChain]);

  const getCompositionRule = useCallback((): string => {
    if (compositionChain.length === 0) return 'x';
    
    let rule = 'x';
    for (let i = compositionChain.length - 1; i >= 0; i--) {
      const funcRule = compositionChain[i].rule;
      rule = funcRule.replace(/x/g, `(${rule})`);
    }
    
    return rule;
  }, [compositionChain]);

  const { steps, result } = evaluateComposition();

  return (
    <div className={styles.lab}>
      <div className={styles.instructions}>
        <h3>Composition Laboratory</h3>
        <p>Chain functions together to create compositions. Trace how inputs flow through multiple transformations.</p>
      </div>

      <div className={styles.functionBank}>
        <h4>Available Functions:</h4>
        <div className={styles.functions}>
          {availableFunctions.map(func => (
            <div
              key={func.id}
              className={styles.functionCard}
              draggable
              onDragStart={() => setDraggedFunction(func)}
            >
              <div className={styles.functionName}>{func.name}</div>
              <div className={styles.functionRule}>{func.rule}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.compositionArea}>
        <h4>Composition Chain:</h4>
        <div className={styles.chainContainer}>
          {compositionChain.length === 0 ? (
            <div
              className={styles.emptyChain}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              Drag functions here to build a composition
            </div>
          ) : (
            <div className={styles.chain}>
              <div className={styles.inputBox}>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className={styles.inputField}
                />
                <label>Input</label>
              </div>
              
              {compositionChain.map((func, index) => (
                <React.Fragment key={index}>
                  <div className={styles.arrow}>→</div>
                  <div
                    className={styles.chainFunction}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <button
                      className={styles.removeButton}
                      onClick={() => removeFromChain(index)}
                    >
                      ×
                    </button>
                    <div className={styles.functionName}>{func.name}</div>
                    <div className={styles.functionRule}>{func.rule}</div>
                  </div>
                </React.Fragment>
              ))}
              
              <div className={styles.arrow}>→</div>
              <div className={styles.outputBox}>
                <div className={styles.outputValue}>
                  {typeof result === 'number' ? result.toFixed(2) : result}
                </div>
                <label>Output</label>
              </div>
            </div>
          )}
        </div>
        
        <button className={styles.clearButton} onClick={clearChain}>
          Clear Chain
        </button>
      </div>

      <div className={styles.notation}>
        <h4>Composition Notation:</h4>
        <div className={styles.notationDisplay}>
          <div className={styles.symbolic}>
            {getCompositionNotation()}
          </div>
          <div className={styles.expanded}>
            = {getCompositionRule()}
          </div>
        </div>
      </div>

      <div className={styles.evaluation}>
        <h4>Step-by-Step Evaluation:</h4>
        <div className={styles.stepsContainer}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showSteps}
              onChange={(e) => setShowSteps(e.target.checked)}
            />
            Show detailed steps
          </label>
          
          {showSteps && steps.length > 0 && (
            <div className={styles.steps}>
              {steps.map((step, index) => (
                <div key={index} className={styles.step}>
                  <span className={styles.stepNumber}>{index + 1}.</span>
                  <span className={styles.stepText}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.examples}>
        <h4>Try These Compositions:</h4>
        <div className={styles.exampleList}>
          <button
            className={styles.exampleButton}
            onClick={() => {
              setCompositionChain([
                availableFunctions[0], // f(x) = 2x
                availableFunctions[1], // g(x) = x + 3
              ]);
              setInputValue('5');
            }}
          >
            f ∘ g (First add, then double)
          </button>
          <button
            className={styles.exampleButton}
            onClick={() => {
              setCompositionChain([
                availableFunctions[1], // g(x) = x + 3
                availableFunctions[0], // f(x) = 2x
              ]);
              setInputValue('5');
            }}
          >
            g ∘ f (First double, then add)
          </button>
          <button
            className={styles.exampleButton}
            onClick={() => {
              setCompositionChain([
                availableFunctions[2], // h(x) = x²
                availableFunctions[3], // k(x) = √x
              ]);
              setInputValue('4');
            }}
          >
            h ∘ k (Square root then square)
          </button>
          <button
            className={styles.exampleButton}
            onClick={() => {
              setCompositionChain([
                availableFunctions[3], // k(x) = √x
                availableFunctions[2], // h(x) = x²
              ]);
              setInputValue('4');
            }}
          >
            k ∘ h (Square then square root)
          </button>
        </div>
      </div>

      <div className={styles.insights}>
        <h4>Key Insights:</h4>
        <ul>
          <li>Composition is read from right to left: (f ∘ g)(x) = f(g(x))</li>
          <li>Order matters! f ∘ g ≠ g ∘ f in general</li>
          <li>The output of one function becomes the input of the next</li>
          <li>Some compositions can simplify to simpler functions</li>
          <li>Not all functions can be composed (domain/range compatibility)</li>
        </ul>
      </div>
    </div>
  );
};

export default CompositionLab;