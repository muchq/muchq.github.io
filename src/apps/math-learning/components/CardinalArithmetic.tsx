import React, { useState, useCallback, useMemo } from 'react';
import styles from './CardinalArithmetic.module.css';

type Cardinal = 'finite' | 'aleph0' | 'c' | '2^aleph0';
type Operation = 'addition' | 'multiplication' | 'exponentiation';

interface CalculationResult {
  expression: string;
  result: string;
  explanation: string;
}

const CardinalArithmetic: React.FC = () => {
  const [leftOperand, setLeftOperand] = useState<Cardinal>('aleph0');
  const [rightOperand, setRightOperand] = useState<Cardinal>('aleph0');
  const [operation, setOperation] = useState<Operation>('addition');
  const [finiteValue, setFiniteValue] = useState<number>(5);
  const [showExamples] = useState<boolean>(true);

  const getCardinalSymbol = useCallback((cardinal: Cardinal): string => {
    switch (cardinal) {
      case 'finite': return finiteValue.toString();
      case 'aleph0': return 'ℵ₀';
      case 'c': return 'c';
      case '2^aleph0': return '2^ℵ₀';
      default: return '';
    }
  }, [finiteValue]);

  const getCardinalDescription = useCallback((cardinal: Cardinal): string => {
    switch (cardinal) {
      case 'finite': return `Finite (${finiteValue})`;
      case 'aleph0': return 'Countably infinite (ℕ, ℤ, ℚ)';
      case 'c': return 'Continuum (ℝ, [0,1])';
      case '2^aleph0': return 'Power set of ℕ';
      default: return '';
    }
  }, [finiteValue]);

  const performOperation = useCallback((): CalculationResult => {
    const left = getCardinalSymbol(leftOperand);
    const right = getCardinalSymbol(rightOperand);
    let expression = '';
    let result = '';
    let explanation = '';

    switch (operation) {
      case 'addition':
        expression = `${left} + ${right}`;
        
        if (leftOperand === 'finite' && rightOperand === 'finite') {
          result = (2 * finiteValue).toString();
          explanation = 'Finite + Finite = Finite (standard addition)';
        } else if (leftOperand === 'finite' || rightOperand === 'finite') {
          if (leftOperand === 'aleph0' || rightOperand === 'aleph0') {
            result = 'ℵ₀';
            explanation = 'Adding finite to countably infinite gives countably infinite';
          } else {
            result = 'c';
            explanation = 'Adding finite to uncountable gives the same uncountable cardinal';
          }
        } else if (leftOperand === 'aleph0' && rightOperand === 'aleph0') {
          result = 'ℵ₀';
          explanation = 'ℵ₀ + ℵ₀ = ℵ₀ (union of two countable sets is countable)';
        } else if ((leftOperand === 'c' || leftOperand === '2^aleph0') || 
                   (rightOperand === 'c' || rightOperand === '2^aleph0')) {
          result = 'c';
          explanation = 'Adding any cardinal to the continuum gives the continuum';
        }
        break;

      case 'multiplication':
        expression = `${left} × ${right}`;
        
        if (leftOperand === 'finite' && rightOperand === 'finite') {
          result = (finiteValue * finiteValue).toString();
          explanation = 'Finite × Finite = Finite (standard multiplication)';
        } else if ((leftOperand === 'finite' && finiteValue === 0) || 
                   (rightOperand === 'finite' && finiteValue === 0)) {
          result = '0';
          explanation = 'Zero times any cardinal is zero';
        } else if (leftOperand === 'finite' || rightOperand === 'finite') {
          if (leftOperand === 'aleph0' || rightOperand === 'aleph0') {
            result = 'ℵ₀';
            explanation = 'Finite (non-zero) × ℵ₀ = ℵ₀';
          } else {
            result = 'c';
            explanation = 'Finite (non-zero) × continuum = continuum';
          }
        } else if (leftOperand === 'aleph0' && rightOperand === 'aleph0') {
          result = 'ℵ₀';
          explanation = 'ℵ₀ × ℵ₀ = ℵ₀ (Cartesian product ℕ×ℕ is countable)';
        } else if ((leftOperand === 'c' || leftOperand === '2^aleph0') || 
                   (rightOperand === 'c' || rightOperand === '2^aleph0')) {
          result = 'c';
          explanation = 'c × ℵ₀ = c, c × c = c';
        }
        break;

      case 'exponentiation':
        expression = `${left}^${right}`;
        
        if (leftOperand === 'finite' && rightOperand === 'finite') {
          result = Math.pow(finiteValue, finiteValue).toString();
          explanation = 'Finite ^ Finite = Finite (standard exponentiation)';
        } else if (leftOperand === 'finite') {
          if (finiteValue <= 1) {
            result = finiteValue.toString();
            explanation = `${finiteValue}^∞ = ${finiteValue}`;
          } else {
            if (rightOperand === 'aleph0') {
              result = 'c';
              explanation = `${finiteValue}^ℵ₀ = c (infinite sequences)`;
            } else {
              result = '2^c';
              explanation = `${finiteValue}^c = 2^c (larger than continuum)`;
            }
          }
        } else if (rightOperand === 'finite') {
          if (leftOperand === 'aleph0') {
            result = 'ℵ₀';
            explanation = `ℵ₀^${finiteValue} = ℵ₀ (finite tuples of naturals)`;
          } else {
            result = 'c';
            explanation = `c^${finiteValue} = c (ℝ^n has cardinality c)`;
          }
        } else if (leftOperand === 'aleph0' && rightOperand === 'aleph0') {
          result = 'c';
          explanation = 'ℵ₀^ℵ₀ = c (infinite sequences of naturals)';
        } else if (leftOperand === '2^aleph0' || leftOperand === 'c') {
          if (rightOperand === 'aleph0') {
            result = 'c';
            explanation = 'c^ℵ₀ = c (countable products of continuum)';
          } else {
            result = '2^c';
            explanation = 'c^c = 2^c (all functions from ℝ to ℝ)';
          }
        } else if (leftOperand === 'aleph0' && (rightOperand === 'c' || rightOperand === '2^aleph0')) {
          result = '2^c';
          explanation = 'ℵ₀^c = 2^c (larger than continuum)';
        }
        break;
    }

    return { expression, result, explanation };
  }, [leftOperand, rightOperand, operation, finiteValue, getCardinalSymbol]);

  const calculation = performOperation();

  const exampleCalculations = useMemo(() => [
    { expr: 'ℵ₀ + ℵ₀', result: 'ℵ₀', example: 'Even naturals ∪ Odd naturals = ℕ' },
    { expr: 'ℵ₀ × ℵ₀', result: 'ℵ₀', example: 'ℕ × ℕ (pairs of naturals)' },
    { expr: '2^ℵ₀', result: 'c', example: 'P(ℕ) = all subsets of naturals' },
    { expr: 'ℵ₀^ℵ₀', result: 'c', example: 'All sequences of naturals' },
    { expr: 'c + c', result: 'c', example: '[0,1] ∪ [2,3] ≈ [0,1]' },
    { expr: 'c × c', result: 'c', example: 'ℝ × ℝ = ℝ² has cardinality c' },
    { expr: 'c^ℵ₀', result: 'c', example: 'All real sequences' },
    { expr: '2^c', result: '2^c', example: 'P(ℝ) = all subsets of reals' },
  ], []);

  const cardinalHierarchy = useMemo(() => [
    { symbol: '0', description: 'Empty set' },
    { symbol: 'n', description: 'Finite cardinal' },
    { symbol: 'ℵ₀', description: 'Smallest infinite cardinal' },
    { symbol: 'c = 2^ℵ₀', description: 'Cardinality of continuum' },
    { symbol: '2^c', description: 'Power set of continuum' },
    { symbol: '...', description: 'Hierarchy continues forever' },
  ], []);

  return (
    <div className={styles.calculator}>
      <div className={styles.instructions}>
        <h3>Cardinal Arithmetic Calculator</h3>
        <p>Explore operations on infinite cardinals. See how arithmetic with infinity follows different rules than finite arithmetic.</p>
      </div>

      <div className={styles.inputSection}>
        <div className={styles.operandSelector}>
          <h4>Left Operand:</h4>
          <div className={styles.cardinalButtons}>
            <button
              className={`${styles.cardinalButton} ${leftOperand === 'finite' ? styles.active : ''}`}
              onClick={() => setLeftOperand('finite')}
            >
              n (finite)
            </button>
            <button
              className={`${styles.cardinalButton} ${leftOperand === 'aleph0' ? styles.active : ''}`}
              onClick={() => setLeftOperand('aleph0')}
            >
              ℵ₀
            </button>
            <button
              className={`${styles.cardinalButton} ${leftOperand === 'c' ? styles.active : ''}`}
              onClick={() => setLeftOperand('c')}
            >
              c
            </button>
            <button
              className={`${styles.cardinalButton} ${leftOperand === '2^aleph0' ? styles.active : ''}`}
              onClick={() => setLeftOperand('2^aleph0')}
            >
              2^ℵ₀
            </button>
          </div>
          {leftOperand === 'finite' && (
            <input
              type="number"
              min="0"
              max="100"
              value={finiteValue}
              onChange={(e) => setFiniteValue(parseInt(e.target.value) || 0)}
              className={styles.finiteInput}
            />
          )}
          <div className={styles.operandDescription}>
            {getCardinalDescription(leftOperand)}
          </div>
        </div>

        <div className={styles.operationSelector}>
          <h4>Operation:</h4>
          <div className={styles.operationButtons}>
            <button
              className={`${styles.operationButton} ${operation === 'addition' ? styles.active : ''}`}
              onClick={() => setOperation('addition')}
            >
              +
            </button>
            <button
              className={`${styles.operationButton} ${operation === 'multiplication' ? styles.active : ''}`}
              onClick={() => setOperation('multiplication')}
            >
              ×
            </button>
            <button
              className={`${styles.operationButton} ${operation === 'exponentiation' ? styles.active : ''}`}
              onClick={() => setOperation('exponentiation')}
            >
              ^
            </button>
          </div>
        </div>

        <div className={styles.operandSelector}>
          <h4>Right Operand:</h4>
          <div className={styles.cardinalButtons}>
            <button
              className={`${styles.cardinalButton} ${rightOperand === 'finite' ? styles.active : ''}`}
              onClick={() => setRightOperand('finite')}
            >
              n (finite)
            </button>
            <button
              className={`${styles.cardinalButton} ${rightOperand === 'aleph0' ? styles.active : ''}`}
              onClick={() => setRightOperand('aleph0')}
            >
              ℵ₀
            </button>
            <button
              className={`${styles.cardinalButton} ${rightOperand === 'c' ? styles.active : ''}`}
              onClick={() => setRightOperand('c')}
            >
              c
            </button>
            <button
              className={`${styles.cardinalButton} ${rightOperand === '2^aleph0' ? styles.active : ''}`}
              onClick={() => setRightOperand('2^aleph0')}
            >
              2^ℵ₀
            </button>
          </div>
          {rightOperand === 'finite' && (
            <input
              type="number"
              min="0"
              max="100"
              value={finiteValue}
              onChange={(e) => setFiniteValue(parseInt(e.target.value) || 0)}
              className={styles.finiteInput}
            />
          )}
          <div className={styles.operandDescription}>
            {getCardinalDescription(rightOperand)}
          </div>
        </div>
      </div>

      <div className={styles.result}>
        <h4>Result:</h4>
        <div className={styles.calculation}>
          <div className={styles.expression}>
            {calculation.expression}
          </div>
          <div className={styles.equals}>=</div>
          <div className={styles.answer}>
            {calculation.result}
          </div>
        </div>
        <div className={styles.explanation}>
          {calculation.explanation}
        </div>
      </div>

      {showExamples && (
        <div className={styles.examples}>
          <h4>Common Cardinal Arithmetic:</h4>
          <div className={styles.exampleGrid}>
            {exampleCalculations.map((calc, index) => (
              <div key={index} className={styles.exampleCard}>
                <div className={styles.exampleExpression}>
                  {calc.expr} = {calc.result}
                </div>
                <div className={styles.exampleDescription}>
                  {calc.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.hierarchy}>
        <h4>Cardinal Hierarchy:</h4>
        <div className={styles.hierarchyList}>
          {cardinalHierarchy.map((level, index) => (
            <div key={index} className={styles.hierarchyLevel}>
              <span className={styles.hierarchySymbol}>{level.symbol}</span>
              <span className={styles.hierarchyArrow}>{'<'}</span>
              <span className={styles.hierarchyDesc}>{level.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.insights}>
        <h4>Key Insights:</h4>
        <ul>
          <li>ℵ₀ + ℵ₀ = ℵ₀ (infinity plus infinity equals infinity)</li>
          <li>ℵ₀ × ℵ₀ = ℵ₀ (countable × countable = countable)</li>
          <li>2^ℵ₀ = c (power set of naturals has continuum cardinality)</li>
          <li>The continuum hypothesis asks: Is there a cardinal between ℵ₀ and c?</li>
          <li>Cardinal arithmetic is absorption-based: the larger cardinal dominates</li>
        </ul>
      </div>
    </div>
  );
};

export default CardinalArithmetic;