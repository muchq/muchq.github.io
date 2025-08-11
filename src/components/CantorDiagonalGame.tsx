import React, { useState, useCallback, useMemo } from 'react';
import styles from './CantorDiagonalGame.module.css';

interface RealNumber {
  id: number;
  digits: number[];
}

const CantorDiagonalGame: React.FC = () => {
  const [userList, setUserList] = useState<RealNumber[]>([
    { id: 0, digits: [3, 1, 4, 1, 5, 9, 2, 6, 5, 3] },
    { id: 1, digits: [2, 7, 1, 8, 2, 8, 1, 8, 2, 8] },
    { id: 2, digits: [1, 4, 1, 4, 2, 1, 3, 5, 6, 2] },
    { id: 3, digits: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { id: 4, digits: [6, 6, 6, 6, 6, 6, 6, 6, 6, 6] },
  ]);
  
  const [diagonalDigits, setDiagonalDigits] = useState<number[]>([]);
  const [constructedNumber, setConstructedNumber] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showExplanation] = useState<boolean>(true);
  const [gameMode, setGameMode] = useState<'demo' | 'challenge'>('demo');

  const resetDiagonalization = useCallback(() => {
    setDiagonalDigits([]);
    setConstructedNumber([]);
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const addNumber = useCallback(() => {
    const newDigits: number[] = [];
    for (let i = 0; i < 10; i++) {
      newDigits.push(Math.floor(Math.random() * 10));
    }
    setUserList([...userList, { id: userList.length, digits: newDigits }]);
  }, [userList]);

  const removeNumber = useCallback((id: number) => {
    setUserList(userList.filter(num => num.id !== id));
    resetDiagonalization();
  }, [userList, resetDiagonalization]);

  const updateDigit = useCallback((numberId: number, digitIndex: number, value: number) => {
    const newList = userList.map(num => {
      if (num.id === numberId) {
        const newDigits = [...num.digits];
        newDigits[digitIndex] = value;
        return { ...num, digits: newDigits };
      }
      return num;
    });
    setUserList(newList);
    resetDiagonalization();
  }, [userList, resetDiagonalization]);

  const extractDiagonal = useCallback(() => {
    const diagonal: number[] = [];
    for (let i = 0; i < Math.min(userList.length, 10); i++) {
      if (userList[i] && userList[i].digits[i] !== undefined) {
        diagonal.push(userList[i].digits[i]);
      }
    }
    return diagonal;
  }, [userList]);

  const constructDifferentNumber = useCallback((diagonal: number[]) => {
    return diagonal.map(digit => (digit + 1) % 10);
  }, []);

  const stepThroughDiagonalization = useCallback(() => {
    if (currentStep < Math.min(userList.length, 10)) {
      const diagonal = extractDiagonal();
      const newDiagonal = diagonal.slice(0, currentStep + 1);
      const newConstructed = constructDifferentNumber(newDiagonal);
      
      setDiagonalDigits(newDiagonal);
      setConstructedNumber(newConstructed);
      setCurrentStep(currentStep + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentStep, userList.length, extractDiagonal, constructDifferentNumber]);

  const playDiagonalization = useCallback(() => {
    resetDiagonalization();
    setIsPlaying(true);
    
    let step = 0;
    const interval = setInterval(() => {
      if (step < Math.min(userList.length, 10)) {
        const diagonal = extractDiagonal();
        const newDiagonal = diagonal.slice(0, step + 1);
        const newConstructed = constructDifferentNumber(newDiagonal);
        
        setDiagonalDigits(newDiagonal);
        setConstructedNumber(newConstructed);
        setCurrentStep(step + 1);
        step++;
      } else {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 1000);
  }, [userList.length, extractDiagonal, constructDifferentNumber, resetDiagonalization]);

  const isDifferentFromAll = useMemo(() => {
    if (constructedNumber.length === 0) return false;
    
    for (let i = 0; i < userList.length && i < constructedNumber.length; i++) {
      if (userList[i].digits[i] === constructedNumber[i]) {
        return false;
      }
    }
    return true;
  }, [constructedNumber, userList]);

  const loadPreset = useCallback((preset: string) => {
    switch (preset) {
      case 'binary':
        setUserList([
          { id: 0, digits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
          { id: 1, digits: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
          { id: 2, digits: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0] },
          { id: 3, digits: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
          { id: 4, digits: [0, 0, 1, 1, 0, 0, 1, 1, 0, 0] },
        ]);
        break;
      case 'repeating':
        setUserList([
          { id: 0, digits: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
          { id: 1, digits: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
          { id: 2, digits: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
          { id: 3, digits: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4] },
          { id: 4, digits: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5] },
        ]);
        break;
      case 'counting':
        setUserList([
          { id: 0, digits: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
          { id: 1, digits: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] },
          { id: 2, digits: [2, 3, 4, 5, 6, 7, 8, 9, 0, 1] },
          { id: 3, digits: [3, 4, 5, 6, 7, 8, 9, 0, 1, 2] },
          { id: 4, digits: [4, 5, 6, 7, 8, 9, 0, 1, 2, 3] },
        ]);
        break;
    }
    resetDiagonalization();
  }, [resetDiagonalization]);

  return (
    <div className={styles.game}>
      <div className={styles.instructions}>
        <h3>Cantor's Diagonal Game</h3>
        <p>Prove that the real numbers are uncountable by constructing a number not in any list. This interactive demonstration shows why no list can contain all real numbers.</p>
      </div>

      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeButton} ${gameMode === 'demo' ? styles.active : ''}`}
          onClick={() => setGameMode('demo')}
        >
          Demo Mode
        </button>
        <button
          className={`${styles.modeButton} ${gameMode === 'challenge' ? styles.active : ''}`}
          onClick={() => setGameMode('challenge')}
        >
          Challenge Mode
        </button>
      </div>

      {gameMode === 'demo' && (
        <div className={styles.presets}>
          <h4>Load Preset List:</h4>
          <div className={styles.presetButtons}>
            <button className={styles.presetButton} onClick={() => loadPreset('binary')}>
              Binary
            </button>
            <button className={styles.presetButton} onClick={() => loadPreset('repeating')}>
              Repeating
            </button>
            <button className={styles.presetButton} onClick={() => loadPreset('counting')}>
              Counting
            </button>
          </div>
        </div>
      )}

      <div className={styles.listContainer}>
        <h4>Your List of Real Numbers (0.d₁d₂d₃...):</h4>
        <div className={styles.numberList}>
          {userList.map((number, rowIndex) => (
            <div key={number.id} className={styles.numberRow}>
              <span className={styles.numberLabel}>r{rowIndex + 1}:</span>
              <span className={styles.decimalPoint}>0.</span>
              {number.digits.map((digit, colIndex) => (
                <div
                  key={colIndex}
                  className={`${styles.digit} ${
                    rowIndex === colIndex && colIndex < currentStep ? styles.diagonal : ''
                  } ${
                    rowIndex < constructedNumber.length && 
                    colIndex === rowIndex && 
                    digit !== constructedNumber[rowIndex] ? styles.different : ''
                  }`}
                >
                  {gameMode === 'challenge' ? (
                    <input
                      type="number"
                      min="0"
                      max="9"
                      value={digit}
                      onChange={(e) => updateDigit(number.id, colIndex, parseInt(e.target.value) || 0)}
                      className={styles.digitInput}
                    />
                  ) : (
                    digit
                  )}
                </div>
              ))}
              {gameMode === 'challenge' && (
                <button
                  className={styles.removeButton}
                  onClick={() => removeNumber(number.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        {gameMode === 'challenge' && userList.length < 10 && (
          <button className={styles.addButton} onClick={addNumber}>
            + Add Number
          </button>
        )}
      </div>

      <div className={styles.diagonalization}>
        <h4>Diagonalization Process:</h4>
        
        <div className={styles.controls}>
          <button 
            className={styles.playButton} 
            onClick={playDiagonalization}
            disabled={isPlaying || userList.length === 0}
          >
            {isPlaying ? 'Playing...' : 'Play Animation'}
          </button>
          <button 
            className={styles.stepButton} 
            onClick={stepThroughDiagonalization}
            disabled={currentStep >= Math.min(userList.length, 10)}
          >
            Step {currentStep + 1}
          </button>
          <button className={styles.resetButton} onClick={resetDiagonalization}>
            Reset
          </button>
        </div>

        {diagonalDigits.length > 0 && (
          <div className={styles.result}>
            <div className={styles.diagonalExtract}>
              <h5>Diagonal Digits:</h5>
              <div className={styles.digitSequence}>
                {diagonalDigits.map((digit, index) => (
                  <span key={index} className={styles.extractedDigit}>
                    d{index + 1}={digit}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.construction}>
              <h5>Constructed Number:</h5>
              <div className={styles.constructedSequence}>
                <span className={styles.decimalPoint}>0.</span>
                {constructedNumber.map((digit, index) => (
                  <span key={index} className={styles.constructedDigit}>
                    {digit}
                  </span>
                ))}
              </div>
              <div className={styles.formula}>
                Formula: d'ᵢ = (dᵢ + 1) mod 10
              </div>
            </div>

            {constructedNumber.length === Math.min(userList.length, 10) && (
              <div className={`${styles.verification} ${isDifferentFromAll ? styles.success : styles.failure}`}>
                {isDifferentFromAll ? (
                  <>
                    <span className={styles.checkmark}>✓</span>
                    <span>This number differs from every number in your list!</span>
                  </>
                ) : (
                  <>
                    <span className={styles.cross}>✗</span>
                    <span>Error in construction - check the diagonal</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showExplanation && (
        <div className={styles.explanation}>
          <h4>How It Works:</h4>
          <ol>
            <li>Take the diagonal: d₁ from r₁, d₂ from r₂, etc.</li>
            <li>Change each digit: d'ᵢ = (dᵢ + 1) mod 10</li>
            <li>The new number 0.d'₁d'₂d'₃... differs from rᵢ at position i</li>
            <li>Therefore, it cannot be in the list!</li>
            <li>This works for ANY list, proving ℝ is uncountable</li>
          </ol>
        </div>
      )}

      <div className={styles.insights}>
        <h4>Key Insights:</h4>
        <ul>
          <li>No matter how you list real numbers, there's always one missing</li>
          <li>The reals have a strictly larger cardinality than the naturals</li>
          <li>|ℝ| = 2^ℵ₀ = ℵ₁ (the cardinality of the continuum)</li>
          <li>This proof works for any interval, like [0,1]</li>
          <li>The same technique proves that infinite binary sequences are uncountable</li>
        </ul>
      </div>
    </div>
  );
};

export default CantorDiagonalGame;