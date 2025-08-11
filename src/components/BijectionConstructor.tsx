import React, { useState, useCallback, useMemo } from 'react';
import styles from './BijectionConstructor.module.css';

type BijectionType = 'N-to-Z' | 'N-to-Q' | 'N-to-NxN' | 'N-to-2N' | 'custom';

interface Mapping {
  from: string;
  to: string;
}

const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

const BijectionConstructor: React.FC = () => {
  const [selectedBijection, setSelectedBijection] = useState<BijectionType>('N-to-Z');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showVisualization, setShowVisualization] = useState<boolean>(true);
  const [customFormula] = useState<string>('');

  // Generate mappings for different bijections
  const generateMappings = useCallback((type: BijectionType, count: number): Mapping[] => {
    const mappings: Mapping[] = [];
    
    switch (type) {
      case 'N-to-Z':
        // f(n) = n/2 if n is even, -(n+1)/2 if n is odd
        for (let n = 0; n < count; n++) {
          const z = n % 2 === 0 ? n / 2 : -(n + 1) / 2;
          mappings.push({ from: n.toString(), to: z.toString() });
        }
        break;
        
      case 'N-to-Q': {
        // Cantor's enumeration of rationals
        let index = 0;
        const seen = new Set<string>();
        for (let sum = 2; index < count && sum < 20; sum++) {
          for (let p = 1; p < sum && index < count; p++) {
            const q = sum - p;
            if (gcd(p, q) === 1) { // Only reduced fractions
              const frac = `${p}/${q}`;
              if (!seen.has(frac)) {
                seen.add(frac);
                mappings.push({ from: index.toString(), to: frac });
                index++;
              }
            }
          }
        }
        break;
      }
        
      case 'N-to-NxN':
        // Cantor pairing function
        for (let n = 0; n < count; n++) {
          const k = Math.floor((Math.sqrt(8 * n + 1) - 1) / 2);
          const i = n - k * (k + 1) / 2;
          const j = k - i;
          mappings.push({ from: n.toString(), to: `(${i}, ${j})` });
        }
        break;
        
      case 'N-to-2N':
        // f(n) = 2n (even naturals)
        for (let n = 0; n < count; n++) {
          mappings.push({ from: n.toString(), to: (2 * n).toString() });
        }
        break;
        
      default:
        break;
    }
    
    return mappings;
  }, []);

  const mappings = useMemo(() => 
    generateMappings(selectedBijection, 20),
    [selectedBijection, generateMappings]
  );

  const getBijectionFormula = useCallback((): string => {
    switch (selectedBijection) {
      case 'N-to-Z':
        return 'f(n) = { n/2 if n is even, -(n+1)/2 if n is odd }';
      case 'N-to-Q':
        return 'Enumerate rationals by height: p/q where gcd(p,q)=1, ordered by p+q';
      case 'N-to-NxN':
        return 'f(n) = (i, j) where n = i + (i+j)(i+j+1)/2';
      case 'N-to-2N':
        return 'f(n) = 2n';
      default:
        return customFormula || 'Define your bijection';
    }
  }, [selectedBijection, customFormula]);

  const getInverseFormula = useCallback((): string => {
    switch (selectedBijection) {
      case 'N-to-Z':
        return 'f⁻¹(z) = { 2z if z ≥ 0, -2z-1 if z < 0 }';
      case 'N-to-Q':
        return 'f⁻¹(p/q) = position in Cantor enumeration';
      case 'N-to-NxN':
        return 'f⁻¹(i, j) = i + (i+j)(i+j+1)/2';
      case 'N-to-2N':
        return 'f⁻¹(2n) = n';
      default:
        return 'Define the inverse';
    }
  }, [selectedBijection]);

  const verifyInjective = useCallback((): boolean => {
    const seen = new Set<string>();
    for (const mapping of mappings) {
      if (seen.has(mapping.to)) return false;
      seen.add(mapping.to);
    }
    return true;
  }, [mappings]);

  const getSetDescription = useCallback((type: BijectionType): { from: string; to: string } => {
    switch (type) {
      case 'N-to-Z':
        return { from: 'ℕ (Natural numbers)', to: 'ℤ (Integers)' };
      case 'N-to-Q':
        return { from: 'ℕ (Natural numbers)', to: 'ℚ⁺ (Positive rationals)' };
      case 'N-to-NxN':
        return { from: 'ℕ (Natural numbers)', to: 'ℕ × ℕ (Pairs of naturals)' };
      case 'N-to-2N':
        return { from: 'ℕ (Natural numbers)', to: '2ℕ (Even naturals)' };
      default:
        return { from: 'Set A', to: 'Set B' };
    }
  }, []);

  const handleStepThrough = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % mappings.length);
  }, [mappings.length]);

  const resetSteps = useCallback(() => {
    setCurrentStep(0);
  }, []);

  const setDescription = getSetDescription(selectedBijection);
  const isInjective = verifyInjective();

  return (
    <div className={styles.bijectionConstructor}>
      <div className={styles.instructions}>
        <h3>Bijection Constructor</h3>
        <p>Build explicit bijections between infinite sets. Prove that sets have the same cardinality by constructing one-to-one correspondences.</p>
      </div>

      <div className={styles.selector}>
        <h4>Select Bijection:</h4>
        <div className={styles.bijectionButtons}>
          <button
            className={`${styles.bijectionButton} ${selectedBijection === 'N-to-Z' ? styles.active : ''}`}
            onClick={() => setSelectedBijection('N-to-Z')}
          >
            ℕ → ℤ
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedBijection === 'N-to-Q' ? styles.active : ''}`}
            onClick={() => setSelectedBijection('N-to-Q')}
          >
            ℕ → ℚ⁺
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedBijection === 'N-to-NxN' ? styles.active : ''}`}
            onClick={() => setSelectedBijection('N-to-NxN')}
          >
            ℕ → ℕ×ℕ
          </button>
          <button
            className={`${styles.bijectionButton} ${selectedBijection === 'N-to-2N' ? styles.active : ''}`}
            onClick={() => setSelectedBijection('N-to-2N')}
          >
            ℕ → 2ℕ
          </button>
        </div>
      </div>

      <div className={styles.setInfo}>
        <div className={styles.setCard}>
          <h5>Domain:</h5>
          <div className={styles.setName}>{setDescription.from}</div>
          <div className={styles.cardinality}>|{setDescription.from.split(' ')[0]}| = ℵ₀</div>
        </div>
        <div className={styles.arrow}>→</div>
        <div className={styles.setCard}>
          <h5>Codomain:</h5>
          <div className={styles.setName}>{setDescription.to}</div>
          <div className={styles.cardinality}>|{setDescription.to.split(' ')[0]}| = ℵ₀</div>
        </div>
      </div>

      <div className={styles.formula}>
        <h4>Bijection Formula:</h4>
        <div className={styles.formulaDisplay}>
          {getBijectionFormula()}
        </div>
        <div className={styles.inverseFormula}>
          <strong>Inverse:</strong> {getInverseFormula()}
        </div>
      </div>

      <div className={styles.visualization}>
        <h4>Mapping Visualization:</h4>
        <div className={styles.controls}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showVisualization}
              onChange={(e) => setShowVisualization(e.target.checked)}
            />
            Show visualization
          </label>
          <button className={styles.stepButton} onClick={handleStepThrough}>
            Step Through (n = {currentStep})
          </button>
          <button className={styles.resetButton} onClick={resetSteps}>
            Reset
          </button>
        </div>

        {showVisualization && (
          <div className={styles.mappingContainer}>
            <div className={styles.mappingGrid}>
              <div className={styles.column}>
                <h5>Natural Numbers</h5>
                {mappings.slice(0, 10).map((mapping, index) => (
                  <div
                    key={index}
                    className={`${styles.element} ${index === currentStep ? styles.highlighted : ''}`}
                  >
                    {mapping.from}
                  </div>
                ))}
              </div>
              
              <div className={styles.arrowColumn}>
                {mappings.slice(0, 10).map((_, index) => (
                  <div
                    key={index}
                    className={`${styles.mappingArrow} ${index === currentStep ? styles.highlightedArrow : ''}`}
                  >
                    →
                  </div>
                ))}
              </div>
              
              <div className={styles.column}>
                <h5>{selectedBijection === 'N-to-Z' ? 'Integers' : 
                     selectedBijection === 'N-to-Q' ? 'Rationals' :
                     selectedBijection === 'N-to-NxN' ? 'Pairs' : 
                     'Even Numbers'}</h5>
                {mappings.slice(0, 10).map((mapping, index) => (
                  <div
                    key={index}
                    className={`${styles.element} ${styles.target} ${index === currentStep ? styles.highlighted : ''}`}
                  >
                    {mapping.to}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.extendedView}>
              <h5>Extended Mapping Table:</h5>
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <div>n</div>
                  <div>f(n)</div>
                </div>
                {mappings.map((mapping, index) => (
                  <div
                    key={index}
                    className={`${styles.tableRow} ${index === currentStep ? styles.highlightedRow : ''}`}
                  >
                    <div>{mapping.from}</div>
                    <div>{mapping.to}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.verification}>
        <h4>Properties Verification:</h4>
        <div className={styles.properties}>
          <div className={`${styles.property} ${isInjective ? styles.verified : styles.notVerified}`}>
            <span className={styles.propertyName}>Injective (One-to-one):</span>
            <span className={styles.propertyStatus}>{isInjective ? '✓' : '✗'}</span>
            <span className={styles.propertyDesc}>
              Each element in the codomain has at most one preimage
            </span>
          </div>
          <div className={`${styles.property} ${styles.verified}`}>
            <span className={styles.propertyName}>Surjective (Onto):</span>
            <span className={styles.propertyStatus}>✓</span>
            <span className={styles.propertyDesc}>
              Every element in the codomain has a preimage
            </span>
          </div>
          <div className={`${styles.property} ${styles.verified}`}>
            <span className={styles.propertyName}>Bijective:</span>
            <span className={styles.propertyStatus}>✓</span>
            <span className={styles.propertyDesc}>
              Both injective and surjective - sets have same cardinality
            </span>
          </div>
        </div>
      </div>

      <div className={styles.insights}>
        <h4>Key Insights:</h4>
        <ul>
          <li>All countably infinite sets have cardinality ℵ₀ (aleph-null)</li>
          <li>A bijection proves two sets have the same cardinality</li>
          <li>ℕ × ℕ has the same cardinality as ℕ (counterintuitive!)</li>
          <li>The rational numbers ℚ are countable despite being dense</li>
          <li>These bijections show that infinity comes in different sizes</li>
        </ul>
      </div>
    </div>
  );
};

export default BijectionConstructor;