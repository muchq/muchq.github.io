import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './VennDiagram.module.css';

interface VennDiagramProps {
  setA: number[];
  setB: number[];
  setC: number[];
}

type Operation = 'union' | 'intersection' | 'difference' | 'complement';

const VennDiagram: React.FC<VennDiagramProps> = ({ setA, setB, setC }) => {
  const [selectedOperation, setSelectedOperation] = useState<Operation>('union');
  const [selectedSets, setSelectedSets] = useState<string[]>(['A', 'B']);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const universe = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8], []);

  const calculateOperation = useCallback((): number[] => {
    let result: number[] = [];
    const sets: { [key: string]: number[] } = { A: setA, B: setB, C: setC };
    const operandSets = selectedSets.map(s => sets[s]);

    if (operandSets.length === 0) return [];

    switch (selectedOperation) {
      case 'union':
        result = operandSets.reduce((acc, set) => {
          const union = [...acc];
          set.forEach(el => {
            if (!union.includes(el)) union.push(el);
          });
          return union;
        }, []);
        break;

      case 'intersection':
        if (operandSets.length === 1) {
          result = operandSets[0];
        } else {
          result = operandSets[0].filter(el =>
            operandSets.every(set => set.includes(el))
          );
        }
        break;

      case 'difference':
        if (operandSets.length >= 2) {
          result = operandSets[0].filter(el =>
            !operandSets[1].includes(el)
          );
        } else {
          result = operandSets[0];
        }
        break;

      case 'complement': {
        const firstSet = operandSets[0] || [];
        result = universe.filter(el => !firstSet.includes(el));
        break;
      }
    }

    return result.sort((a, b) => a - b);
  }, [selectedOperation, selectedSets, setA, setB, setC, universe]);

  const getOperationSymbol = (): string => {
    switch (selectedOperation) {
      case 'union': return '∪';
      case 'intersection': return '∩';
      case 'difference': return '−';
      case 'complement': return "'";
      default: return '';
    }
  };

  const getOperationExpression = (): string => {
    if (selectedSets.length === 0) return '';
    
    if (selectedOperation === 'complement') {
      return `${selectedSets[0]}'`;
    } else if (selectedOperation === 'difference' && selectedSets.length >= 2) {
      return `${selectedSets[0]} − ${selectedSets[1]}`;
    } else {
      return selectedSets.join(` ${getOperationSymbol()} `);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;

    // Calculate circle positions
    const circleA = { x: centerX - 50, y: centerY - 30 };
    const circleB = { x: centerX + 50, y: centerY - 30 };
    const circleC = { x: centerX, y: centerY + 40 };

    // Draw universe background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Helper function to check if element is in result
    const result = calculateOperation();
    const isInResult = (el: number) => result.includes(el);

    // Draw circles with transparency
    const drawCircle = (center: { x: number; y: number }, _set: number[], label: string, color: string) => {
      // Draw circle outline
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Fill if selected
      if (selectedSets.includes(label)) {
        ctx.fillStyle = color.replace('1)', '0.2)');
        ctx.fill();
      }

      // Draw label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px Lexend';
      ctx.fillText(label, center.x - 8, center.y - radius - 10);
    };

    // Draw all circles
    drawCircle(circleA, setA, 'A', 'rgba(255, 107, 107, 1)');
    drawCircle(circleB, setB, 'B', 'rgba(78, 205, 196, 1)');
    drawCircle(circleC, setC, 'C', 'rgba(254, 202, 87, 1)');

    // Highlight result area
    if (result.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      
      // Create a path for the result region
      ctx.beginPath();
      
      // This is a simplified visualization - in a real implementation,
      // we'd calculate the exact regions based on set membership
      result.forEach((_el, index) => {
        const angle = (index / result.length) * 2 * Math.PI;
        const x = centerX + Math.cos(angle) * 40;
        const y = centerY + Math.sin(angle) * 40;
        
        ctx.moveTo(x + 15, y);
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
      });
      
      ctx.fillStyle = 'rgba(150, 206, 180, 0.5)';
      ctx.fill();
      ctx.restore();
    }

    // Draw element positions
    const elementPositions: { [key: number]: { x: number; y: number } } = {};
    
    // Position elements based on set membership
    universe.forEach(el => {
      let x: number;
      let y: number;
      
      const inA = setA.includes(el);
      const inB = setB.includes(el);
      const inC = setC.includes(el);
      
      if (inA && inB && inC) {
        // Center of all three
        x = centerX;
        y = centerY;
      } else if (inA && inB) {
        // Between A and B
        x = centerX;
        y = centerY - 30;
      } else if (inA && inC) {
        // Between A and C
        x = centerX - 25;
        y = centerY + 5;
      } else if (inB && inC) {
        // Between B and C
        x = centerX + 25;
        y = centerY + 5;
      } else if (inA) {
        // Only in A
        x = circleA.x - 30;
        y = circleA.y;
      } else if (inB) {
        // Only in B
        x = circleB.x + 30;
        y = circleB.y;
      } else if (inC) {
        // Only in C
        x = circleC.x;
        y = circleC.y + 40;
      } else {
        // Outside all sets (in complement region)
        const angle = (el / universe.length) * 2 * Math.PI;
        x = centerX + Math.cos(angle) * 150;
        y = centerY + Math.sin(angle) * 120;
      }
      
      elementPositions[el] = { x, y };
      
      // Draw element
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, 2 * Math.PI);
      ctx.fillStyle = isInResult(el) ? 'rgba(150, 206, 180, 0.9)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
      ctx.strokeStyle = isInResult(el) ? 'rgba(150, 206, 180, 1)' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = isInResult(el) ? 2 : 1;
      ctx.stroke();
      
      // Draw element number
      ctx.fillStyle = isInResult(el) ? 'white' : 'rgba(255, 255, 255, 0.6)';
      ctx.font = isInResult(el) ? 'bold 14px Lexend' : '12px Lexend';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.toString(), x, y);
    });

  }, [setA, setB, setC, selectedOperation, selectedSets, calculateOperation, universe]);

  const toggleSetSelection = (set: string) => {
    if (selectedOperation === 'complement') {
      // For complement, only allow one set
      setSelectedSets([set]);
    } else if (selectedOperation === 'difference') {
      // For difference, allow max 2 sets
      if (selectedSets.includes(set)) {
        setSelectedSets(selectedSets.filter(s => s !== set));
      } else if (selectedSets.length < 2) {
        setSelectedSets([...selectedSets, set]);
      } else {
        setSelectedSets([set]);
      }
    } else {
      // For union and intersection, allow multiple sets
      if (selectedSets.includes(set)) {
        setSelectedSets(selectedSets.filter(s => s !== set));
      } else {
        setSelectedSets([...selectedSets, set]);
      }
    }
  };

  const result = calculateOperation();

  return (
    <div className={styles.vennDiagram}>
      <div className={styles.instructions}>
        <h3>Venn Diagram Playground</h3>
        <p>Visualize set operations with interactive Venn diagrams. Select sets and operations to see the results highlighted.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.operationSelector}>
          <h4>Select Operation:</h4>
          <div className={styles.operations}>
            <button
              className={`${styles.operationButton} ${selectedOperation === 'union' ? styles.active : ''}`}
              onClick={() => setSelectedOperation('union')}
            >
              Union (∪)
            </button>
            <button
              className={`${styles.operationButton} ${selectedOperation === 'intersection' ? styles.active : ''}`}
              onClick={() => setSelectedOperation('intersection')}
            >
              Intersection (∩)
            </button>
            <button
              className={`${styles.operationButton} ${selectedOperation === 'difference' ? styles.active : ''}`}
              onClick={() => setSelectedOperation('difference')}
            >
              Difference (−)
            </button>
            <button
              className={`${styles.operationButton} ${selectedOperation === 'complement' ? styles.active : ''}`}
              onClick={() => setSelectedOperation('complement')}
            >
              Complement (')
            </button>
          </div>
        </div>

        <div className={styles.setSelector}>
          <h4>Select Sets:</h4>
          <div className={styles.setButtons}>
            <button
              className={`${styles.setButton} ${selectedSets.includes('A') ? styles.activeA : ''}`}
              onClick={() => toggleSetSelection('A')}
              disabled={setA.length === 0}
            >
              A = {`{ ${setA.join(', ')} }`}
            </button>
            <button
              className={`${styles.setButton} ${selectedSets.includes('B') ? styles.activeB : ''}`}
              onClick={() => toggleSetSelection('B')}
              disabled={setB.length === 0}
            >
              B = {`{ ${setB.join(', ')} }`}
            </button>
            <button
              className={`${styles.setButton} ${selectedSets.includes('C') ? styles.activeC : ''}`}
              onClick={() => toggleSetSelection('C')}
              disabled={setC.length === 0}
            >
              C = {`{ ${setC.join(', ')} }`}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={500}
          height={400}
          className={styles.canvas}
        />
      </div>

      <div className={styles.result}>
        <h4>Operation Result:</h4>
        <div className={styles.expression}>
          {getOperationExpression()} = {`{ ${result.join(', ')} }`}
        </div>
        <div className={styles.cardinality}>
          |{getOperationExpression()}| = {result.length}
        </div>
      </div>

      <div className={styles.examples}>
        <h4>Try These Examples:</h4>
        <ul>
          <li>Union of all sets to see all elements</li>
          <li>Intersection to find common elements</li>
          <li>A − B to find elements only in A</li>
          <li>Complement to find elements outside a set</li>
        </ul>
      </div>
    </div>
  );
};

export default VennDiagram;