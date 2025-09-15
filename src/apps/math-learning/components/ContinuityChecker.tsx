import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { retroSelectStyles } from '@/styles/ReactSelectStyles';
import styles from './ContinuityChecker.module.css';

type TopologyType = 'discrete' | 'trivial' | 'cofinite' | 'standard';

type TopologyOption = {
  value: TopologyType;
  label: string;
};

type FunctionOption = {
  value: number;
  label: string;
};

interface FunctionDef {
  name: string;
  description: string;
  map: (x: number) => number;
  formula: string;
}


interface ContinuityCheck {
  openSet: string;
  preimage: string;
  isOpen: boolean;
  reason: string;
}

const ContinuityChecker: React.FC = () => {
  const [domainSize] = useState<number>(5);
  const [codomainSize] = useState<number>(5);
  const [domainTopology, setDomainTopology] = useState<TopologyType>('discrete');
  const [codomainTopology, setCodomainTopology] = useState<TopologyType>('standard');
  const [selectedFunction, setSelectedFunction] = useState<number>(0);
  const [continuityChecks, setContinuityChecks] = useState<ContinuityCheck[]>([]);
  const [isContinuous, setIsContinuous] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(true);

  const domain = Array.from({ length: domainSize }, (_, i) => i + 1);

  const functions: FunctionDef[] = [
    {
      name: 'Identity',
      description: 'f(x) = x',
      map: (x) => x,
      formula: 'f(x) = x'
    },
    {
      name: 'Constant',
      description: 'f(x) = 3',
      map: () => 3,
      formula: 'f(x) = 3'
    },
    {
      name: 'Modulo',
      description: 'f(x) = (x mod 3) + 1',
      map: (x) => ((x - 1) % 3) + 1,
      formula: 'f(x) = (x mod 3) + 1'
    },
    {
      name: 'Floor Division',
      description: 'f(x) = ⌊(x+1)/2⌋',
      map: (x) => Math.floor((x + 1) / 2),
      formula: 'f(x) = ⌊(x+1)/2⌋'
    },
    {
      name: 'Reverse',
      description: 'f(x) = n - x + 1',
      map: (x) => domainSize - x + 1,
      formula: `f(x) = ${domainSize} - x + 1`
    }
  ];

  const currentFunction = functions[selectedFunction];

  const topologyOptions: TopologyOption[] = [
    { value: 'discrete', label: 'Discrete' },
    { value: 'trivial', label: 'Trivial' },
    { value: 'cofinite', label: 'Cofinite' },
    { value: 'standard', label: 'Standard (intervals)' }
  ];

  const functionOptions: FunctionOption[] = functions.map((func, index) => ({
    value: index,
    label: `${func.name}: ${func.formula}`
  }));

  const topologySelectStyles = retroSelectStyles<TopologyOption>();
  const functionSelectStyles = retroSelectStyles<FunctionOption>();

  const generateTopology = (type: TopologyType, size: number): Set<string> => {
    const topology = new Set<string>();
    const elements = Array.from({ length: size }, (_, i) => i + 1);
    
    topology.add('∅');
    topology.add(setToString(elements));
    
    switch (type) {
      case 'discrete':
        for (let i = 0; i < Math.pow(2, size); i++) {
          const subset: number[] = [];
          for (let j = 0; j < size; j++) {
            if (i & (1 << j)) {
              subset.push(elements[j]);
            }
          }
          topology.add(setToString(subset));
        }
        break;
      case 'trivial':
        break;
      case 'cofinite':
        for (let i = 0; i < Math.pow(2, size); i++) {
          const subset: number[] = [];
          for (let j = 0; j < size; j++) {
            if (i & (1 << j)) {
              subset.push(elements[j]);
            }
          }
          if (subset.length >= size - 1) {
            topology.add(setToString(subset));
          }
        }
        break;
      case 'standard':
        for (let i = 1; i <= size; i++) {
          for (let j = i; j <= size; j++) {
            const interval = elements.slice(i - 1, j);
            topology.add(setToString(interval));
          }
        }
        break;
    }
    
    return topology;
  };

  const setToString = (set: number[]): string => {
    if (set.length === 0) return '∅';
    return `{${set.join(', ')}}`;
  };

  const stringToSet = (str: string): number[] => {
    if (str === '∅') return [];
    return str.slice(1, -1).split(', ').map(Number).filter(n => !isNaN(n));
  };

  const computePreimage = (set: number[], func: (x: number) => number): number[] => {
    const preimage: number[] = [];
    for (const x of domain) {
      if (set.includes(func(x))) {
        preimage.push(x);
      }
    }
    return preimage;
  };

  const checkContinuity = () => {
    const codomainTop = generateTopology(codomainTopology, codomainSize);
    const domainTop = generateTopology(domainTopology, domainSize);
    const checks: ContinuityCheck[] = [];
    let continuous = true;
    
    for (const openSetStr of codomainTop) {
      const openSet = stringToSet(openSetStr);
      const preimage = computePreimage(openSet, currentFunction.map);
      const preimageStr = setToString(preimage);
      const isOpenInDomain = domainTop.has(preimageStr);
      
      if (!isOpenInDomain) {
        continuous = false;
      }
      
      checks.push({
        openSet: openSetStr,
        preimage: preimageStr,
        isOpen: isOpenInDomain,
        reason: isOpenInDomain 
          ? 'Preimage is open in domain topology' 
          : 'Preimage is NOT open in domain topology'
      });
    }
    
    setContinuityChecks(checks);
    setIsContinuous(continuous);
  };

  useEffect(() => {
    checkContinuity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domainTopology, codomainTopology, selectedFunction]);

  const visualizeMapping = () => {
    const mapping: { [key: number]: number } = {};
    for (const x of domain) {
      mapping[x] = currentFunction.map(x);
    }
    return mapping;
  };

  const mapping = visualizeMapping();

  return (
    <div className={styles.checker}>
      <div className={styles.instructions}>
        <h3>Continuity Checker</h3>
        <p>Test functions between topological spaces for continuity by examining preimages of open sets. A function is continuous if and only if the preimage of every open set is open.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <div className={styles.controlGroup}>
            <label>Domain Topology (X):</label>
            <Select<TopologyOption>
              value={topologyOptions.find(opt => opt.value === domainTopology)}
              onChange={(option) => option && setDomainTopology(option.value)}
              options={topologyOptions}
              styles={topologySelectStyles}
              isSearchable={false}
              className={styles.selectWrapper}
            />
          </div>

          <div className={styles.controlGroup}>
            <label>Codomain Topology (Y):</label>
            <Select<TopologyOption>
              value={topologyOptions.find(opt => opt.value === codomainTopology)}
              onChange={(option) => option && setCodomainTopology(option.value)}
              options={topologyOptions}
              styles={topologySelectStyles}
              isSearchable={false}
              className={styles.selectWrapper}
            />
          </div>

          <div className={styles.controlGroup}>
            <label>Function:</label>
            <Select<FunctionOption>
              value={functionOptions.find(opt => opt.value === selectedFunction)}
              onChange={(option) => option && setSelectedFunction(option.value)}
              options={functionOptions}
              styles={functionSelectStyles}
              isSearchable={false}
              className={styles.selectWrapper}
            />
          </div>
        </div>

        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showDetails}
              onChange={(e) => setShowDetails(e.target.checked)}
            />
            Show all preimage checks
          </label>
        </div>
      </div>

      <div className={styles.visualization}>
        <div className={styles.mappingDiagram}>
          <h4>Function Mapping</h4>
          <div className={styles.mappingContainer}>
            <div className={styles.domainColumn}>
              <h5>X (Domain)</h5>
              {domain.map(x => (
                <div key={x} className={styles.element}>
                  {x}
                </div>
              ))}
            </div>
            <div className={styles.arrows}>
              {domain.map(x => (
                <div key={x} className={styles.arrow}>
                  →
                </div>
              ))}
            </div>
            <div className={styles.codomainColumn}>
              <h5>Y (Codomain)</h5>
              {domain.map(x => (
                <div key={x} className={styles.element}>
                  {mapping[x]}
                </div>
              ))}
            </div>
          </div>
          <p className={styles.formula}>
            Function: {currentFunction.formula}
          </p>
        </div>

        <div className={styles.continuityResult}>
          <h4>Continuity Analysis</h4>
          <div className={`${styles.resultBox} ${isContinuous ? styles.continuous : styles.notContinuous}`}>
            {isContinuous ? (
              <>
                <span className={styles.resultIcon}>✓</span>
                <div>
                  <strong>Function is CONTINUOUS</strong>
                  <p>All preimages of open sets are open</p>
                </div>
              </>
            ) : (
              <>
                <span className={styles.resultIcon}>✗</span>
                <div>
                  <strong>Function is NOT CONTINUOUS</strong>
                  <p>Some preimages of open sets are not open</p>
                </div>
              </>
            )}
          </div>

          {!isContinuous && (
            <div className={styles.counterexamples}>
              <h5>Counterexamples (open sets with non-open preimages):</h5>
              {continuityChecks
                .filter(check => !check.isOpen)
                .slice(0, 3)
                .map((check, index) => (
                  <div key={index} className={styles.counterexample}>
                    <span>Open set {check.openSet} in Y</span>
                    <span>→</span>
                    <span>Preimage {check.preimage} is NOT open in X</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className={styles.detailsSection}>
          <h4>Preimage Check Details</h4>
          <div className={styles.checksGrid}>
            {continuityChecks.slice(0, 20).map((check, index) => (
              <div 
                key={index}
                className={`${styles.checkItem} ${check.isOpen ? styles.pass : styles.fail}`}
              >
                <div className={styles.checkHeader}>
                  {check.isOpen ? '✓' : '✗'} {check.openSet}
                </div>
                <div className={styles.checkDetails}>
                  <span>f⁻¹({check.openSet}) = {check.preimage}</span>
                  <span className={styles.checkStatus}>
                    {check.isOpen ? 'Open' : 'Not Open'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {continuityChecks.length > 20 && (
            <p className={styles.moreChecks}>
              ... and {continuityChecks.length - 20} more checks
            </p>
          )}
        </div>
      )}

      <div className={styles.insights}>
        <h4>Key Insights:</h4>
        <ul>
          <li>Functions from discrete topology are always continuous (all sets are open)</li>
          <li>Functions to trivial topology are always continuous (only two open sets)</li>
          <li>Constant functions are always continuous</li>
          <li>The identity function is continuous iff domain topology is finer than codomain</li>
          <li>Continuity depends on both topologies, not just the function formula</li>
        </ul>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Try the identity function with different topology combinations</li>
          <li>See how constant functions are always continuous</li>
          <li>Compare discrete→any vs any→trivial for guaranteed continuity</li>
          <li>Notice how coarser domain topologies make continuity easier</li>
          <li>Finer codomain topologies make continuity harder</li>
        </ul>
      </div>
    </div>
  );
};

export default ContinuityChecker;