import React, { useState, useMemo } from 'react';
import styles from './DistanceFunctionDesigner.module.css';

type MetricType = 'euclidean' | 'manhattan' | 'discrete' | 'custom';

interface Point {
  x: number;
  y: number;
}

interface VerificationResult {
  nonNegativity: boolean;
  symmetry: boolean;
  triangleInequality: boolean;
  identityOfIndiscernibles: boolean;
  isMetric: boolean;
  counterExample?: string;
}

const DistanceFunctionDesigner: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('euclidean');
  const [customFormula, setCustomFormula] = useState<string>('sqrt((x2-x1)^2 + (y2-y1)^2)');
  const [testPoints, setTestPoints] = useState<Point[]>([
    { x: 0, y: 0 },
    { x: 3, y: 4 },
    { x: 1, y: 1 },
    { x: -2, y: 2 }
  ]);
  // verificationResult and distanceMatrix are computed via useMemo below

  const calculateDistance = (p1: Point, p2: Point): number => {
    switch (selectedMetric) {
      case 'euclidean':
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      case 'manhattan':
        return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
      case 'discrete':
        return (p1.x === p2.x && p1.y === p2.y) ? 0 : 1;
      case 'custom':
        try {
          const formula = customFormula
            .replace(/\^/g, '**')
            .replace(/sqrt/g, 'Math.sqrt')
            .replace(/abs/g, 'Math.abs')
            .replace(/max/g, 'Math.max')
            .replace(/min/g, 'Math.min')
            .replace(/x1/g, p1.x.toString())
            .replace(/y1/g, p1.y.toString())
            .replace(/x2/g, p2.x.toString())
            .replace(/y2/g, p2.y.toString());
          return eval(formula);
        } catch {
          return 0;
        }
      default:
        return 0;
    }
  };

  const verifyMetricAxioms = () => {
    const n = testPoints.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        matrix[i][j] = calculateDistance(testPoints[i], testPoints[j]);
      }
    }
    
    const result: VerificationResult = {
      nonNegativity: true,
      symmetry: true,
      triangleInequality: true,
      identityOfIndiscernibles: true,
      isMetric: false
    };

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] < 0) {
          result.nonNegativity = false;
          result.counterExample = `d(P${i+1}, P${j+1}) = ${matrix[i][j].toFixed(2)} < 0`;
        }

        if (Math.abs(matrix[i][j] - matrix[j][i]) > 0.0001) {
          result.symmetry = false;
          result.counterExample = `d(P${i+1}, P${j+1}) ≠ d(P${j+1}, P${i+1})`;
        }

        if (i === j) {
          if (matrix[i][j] !== 0) {
            result.identityOfIndiscernibles = false;
            result.counterExample = `d(P${i+1}, P${i+1}) = ${matrix[i][j].toFixed(2)} ≠ 0`;
          }
        } else {
          if (matrix[i][j] === 0) {
            result.identityOfIndiscernibles = false;
            result.counterExample = `d(P${i+1}, P${j+1}) = 0 but P${i+1} ≠ P${j+1}`;
          }
        }

        for (let k = 0; k < n; k++) {
          if (matrix[i][j] > matrix[i][k] + matrix[k][j] + 0.0001) {
            result.triangleInequality = false;
            result.counterExample = `d(P${i+1}, P${j+1}) > d(P${i+1}, P${k+1}) + d(P${k+1}, P${j+1})`;
          }
        }
      }
    }

    result.isMetric = result.nonNegativity && result.symmetry && 
                      result.triangleInequality && result.identityOfIndiscernibles;
    
    return { matrix, result };
  };

  const { matrix: distanceMatrix, result: verificationResult } = useMemo(() => {
    return verifyMetricAxioms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMetric, customFormula, testPoints]);

  const addTestPoint = () => {
    const newPoint = { 
      x: Math.floor(Math.random() * 10 - 5), 
      y: Math.floor(Math.random() * 10 - 5) 
    };
    setTestPoints([...testPoints, newPoint]);
  };

  const removeTestPoint = (index: number) => {
    if (testPoints.length > 3) {
      setTestPoints(testPoints.filter((_, i) => i !== index));
    }
  };

  const updateTestPoint = (index: number, field: 'x' | 'y', value: string) => {
    const newPoints = [...testPoints];
    newPoints[index] = { ...newPoints[index], [field]: parseFloat(value) || 0 };
    setTestPoints(newPoints);
  };

  const metricExamples = {
    euclidean: 'Standard Euclidean distance: d(p,q) = √[(x₂-x₁)² + (y₂-y₁)²]',
    manhattan: 'Manhattan/Taxicab distance: d(p,q) = |x₂-x₁| + |y₂-y₁|',
    discrete: 'Discrete metric: d(p,q) = 0 if p=q, 1 otherwise',
    custom: 'Define your own distance function'
  };

  return (
    <div className={styles.designer}>
      <div className={styles.instructions}>
        <h3>Distance Function Designer</h3>
        <p>Create custom metric spaces by defining distance functions. The system automatically verifies the metric axioms and generates counterexamples for non-metrics.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.metricSelector}>
          <h4>Select Metric Type</h4>
          <div className={styles.metricButtons}>
            {(['euclidean', 'manhattan', 'discrete', 'custom'] as MetricType[]).map(type => (
              <button
                key={type}
                className={`${styles.metricButton} ${selectedMetric === type ? styles.active : ''}`}
                onClick={() => setSelectedMetric(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <p className={styles.metricDescription}>{metricExamples[selectedMetric]}</p>
        </div>

        {selectedMetric === 'custom' && (
          <div className={styles.customFormulaSection}>
            <h4>Custom Formula</h4>
            <input
              type="text"
              className={styles.formulaInput}
              value={customFormula}
              onChange={(e) => setCustomFormula(e.target.value)}
              placeholder="Enter formula using x1, y1, x2, y2"
            />
            <p className={styles.formulaHelp}>
              Available: sqrt(), abs(), max(), min(), ^, +, -, *, /
            </p>
          </div>
        )}
      </div>

      <div className={styles.testSection}>
        <div className={styles.testPoints}>
          <h4>Test Points</h4>
          <div className={styles.pointsList}>
            {testPoints.map((point, index) => (
              <div key={index} className={styles.pointRow}>
                <span className={styles.pointLabel}>P{index + 1}:</span>
                <input
                  type="number"
                  className={styles.coordinateInput}
                  value={point.x}
                  onChange={(e) => updateTestPoint(index, 'x', e.target.value)}
                  step="0.5"
                />
                <input
                  type="number"
                  className={styles.coordinateInput}
                  value={point.y}
                  onChange={(e) => updateTestPoint(index, 'y', e.target.value)}
                  step="0.5"
                />
                {testPoints.length > 3 && (
                  <button
                    className={styles.removeButton}
                    onClick={() => removeTestPoint(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button className={styles.addButton} onClick={addTestPoint}>
            Add Test Point
          </button>
        </div>

        <div className={styles.distanceMatrix}>
          <h4>Distance Matrix</h4>
          {distanceMatrix.length > 0 && (
            <table className={styles.matrix}>
              <thead>
                <tr>
                  <th></th>
                  {testPoints.map((_, i) => (
                    <th key={i}>P{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {distanceMatrix.map((row, i) => (
                  <tr key={i}>
                    <th>P{i + 1}</th>
                    {row.map((dist, j) => (
                      <td key={j} className={i === j ? styles.diagonal : ''}>
                        {dist.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className={styles.verification}>
        <h4>Metric Axiom Verification</h4>
        {verificationResult && (
          <div className={styles.axiomsList}>
            <div className={`${styles.axiom} ${verificationResult.nonNegativity ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {verificationResult.nonNegativity ? '✓' : '✗'}
              </span>
              <div>
                <strong>Non-negativity:</strong> d(x,y) ≥ 0
                {!verificationResult.nonNegativity && verificationResult.counterExample?.includes('< 0') && (
                  <p className={styles.counterExample}>{verificationResult.counterExample}</p>
                )}
              </div>
            </div>

            <div className={`${styles.axiom} ${verificationResult.identityOfIndiscernibles ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {verificationResult.identityOfIndiscernibles ? '✓' : '✗'}
              </span>
              <div>
                <strong>Identity of Indiscernibles:</strong> d(x,y) = 0 ⟺ x = y
                {!verificationResult.identityOfIndiscernibles && verificationResult.counterExample?.includes('P') && (
                  <p className={styles.counterExample}>{verificationResult.counterExample}</p>
                )}
              </div>
            </div>

            <div className={`${styles.axiom} ${verificationResult.symmetry ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {verificationResult.symmetry ? '✓' : '✗'}
              </span>
              <div>
                <strong>Symmetry:</strong> d(x,y) = d(y,x)
                {!verificationResult.symmetry && verificationResult.counterExample?.includes('≠') && (
                  <p className={styles.counterExample}>{verificationResult.counterExample}</p>
                )}
              </div>
            </div>

            <div className={`${styles.axiom} ${verificationResult.triangleInequality ? styles.passed : styles.failed}`}>
              <span className={styles.axiomIcon}>
                {verificationResult.triangleInequality ? '✓' : '✗'}
              </span>
              <div>
                <strong>Triangle Inequality:</strong> d(x,z) ≤ d(x,y) + d(y,z)
                {!verificationResult.triangleInequality && verificationResult.counterExample?.includes('>') && (
                  <p className={styles.counterExample}>{verificationResult.counterExample}</p>
                )}
              </div>
            </div>

            <div className={`${styles.result} ${verificationResult.isMetric ? styles.isMetric : styles.notMetric}`}>
              {verificationResult.isMetric ? 
                '✓ This is a valid metric!' : 
                '✗ This is not a metric - see failed axioms above'}
            </div>
          </div>
        )}
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Try breaking the triangle inequality with a custom formula like "abs(x2-x1)"</li>
          <li>Experiment with different p-norms: (|x₂-x₁|^p + |y₂-y₁|^p)^(1/p)</li>
          <li>The discrete metric works on any set, not just ℝ²</li>
          <li>Not all distance functions are metrics - symmetry and triangle inequality are often violated</li>
        </ul>
      </div>
    </div>
  );
};

export default DistanceFunctionDesigner;