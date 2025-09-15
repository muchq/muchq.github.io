import React, { useState, useEffect, useRef } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './SequentialCompactnessExplorer.module.css';

type Point = {
  x: number;
  y: number;
  index: number;
  isSubsequence?: boolean;
  isLimit?: boolean;
};

type SequenceType = 'converging' | 'bounded' | 'unbounded' | 'oscillating';

type SequenceOption = {
  value: SequenceType;
  label: string;
};

const sequenceOptions: SequenceOption[] = [
  { value: 'converging', label: 'Converging Sequence' },
  { value: 'bounded', label: 'Bounded (Non-converging)' },
  { value: 'unbounded', label: 'Unbounded Sequence' },
  { value: 'oscillating', label: 'Oscillating Sequence' }
];

const customSelectStyles: StylesConfig<SequenceOption, false> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    borderColor: state.isFocused ? '#00ffff' : '#00ffff',
    borderWidth: '1px',
    borderRadius: 0,
    boxShadow: state.isFocused ? '0 0 15px #00ffff' : 'none',
    '&:hover': {
      borderColor: '#00ffff',
      boxShadow: '0 0 10px #00ffff'
    },
    fontFamily: 'monospace',
    cursor: 'pointer'
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    border: '2px solid #00ffff',
    borderRadius: 0,
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
    zIndex: 9999
  }),
  menuList: (provided) => ({
    ...provided,
    padding: 0,
    backgroundColor: '#0a0a0a'
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'rgba(0, 255, 255, 0.2)' 
      : state.isFocused 
        ? 'rgba(0, 255, 255, 0.1)' 
        : '#0a0a0a',
    color: state.isSelected ? '#00ffff' : '#00ffff',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderLeft: state.isSelected ? '3px solid #00ffff' : '3px solid transparent',
    '&:hover': {
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
      color: '#00ffff'
    }
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: '0.9rem'
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#00ffff',
    '&:hover': {
      color: '#00ffff'
    }
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(0, 255, 255, 0.5)',
    fontFamily: 'monospace'
  })
};


const SequentialCompactnessExplorer: React.FC = () => {
  const [sequenceType, setSequenceType] = useState<SequenceType>('converging');
  const [points, setPoints] = useState<Point[]>([]);
  const [subsequence, setSubsequence] = useState<Point[]>([]);
  const [limitPoint, setLimitPoint] = useState<Point | null>(null);
  const [showSubsequence, setShowSubsequence] = useState(false);
  const [animating, setAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    generateSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequenceType]);

  useEffect(() => {
    drawVisualization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, subsequence, limitPoint, showSubsequence]);

  const generateSequence = () => {
    const newPoints: Point[] = [];
    const n = 50;

    switch (sequenceType) {
      case 'converging':
        // Sequence converging to (300, 200)
        for (let i = 0; i < n; i++) {
          newPoints.push({
            x: 300 + (100 * Math.cos(i * 0.5)) / (i + 1),
            y: 200 + (100 * Math.sin(i * 0.5)) / (i + 1),
            index: i + 1
          });
        }
        setLimitPoint({ x: 300, y: 200, index: -1, isLimit: true });
        break;

      case 'bounded':
        // Bounded sequence in [100, 500] × [100, 300]
        for (let i = 0; i < n; i++) {
          newPoints.push({
            x: 300 + 150 * Math.cos(i * 0.3) * Math.sin(i * 0.1),
            y: 200 + 80 * Math.sin(i * 0.2) * Math.cos(i * 0.15),
            index: i + 1
          });
        }
        setLimitPoint(null);
        break;

      case 'unbounded':
        // Unbounded sequence spiraling outward
        for (let i = 0; i < n; i++) {
          const r = (i + 1) * 3;
          newPoints.push({
            x: 300 + r * Math.cos(i * 0.3),
            y: 200 + r * 0.5 * Math.sin(i * 0.3),
            index: i + 1
          });
        }
        setLimitPoint(null);
        break;

      case 'oscillating':
        // Oscillating between two points
        for (let i = 0; i < n; i++) {
          if (i % 2 === 0) {
            newPoints.push({
              x: 200 + (10 / (i + 1)),
              y: 200 + (10 / (i + 1)),
              index: i + 1
            });
          } else {
            newPoints.push({
              x: 400 - (10 / (i + 1)),
              y: 200 - (10 / (i + 1)),
              index: i + 1
            });
          }
        }
        setLimitPoint(null);
        break;
    }

    setPoints(newPoints);
    setSubsequence([]);
    setShowSubsequence(false);
  };

  const findConvergentSubsequence = () => {
    if (points.length === 0) return;

    let subseq: Point[] = [];

    switch (sequenceType) {
      case 'converging':
        // Take every 3rd point
        subseq = points.filter((_, i) => i % 3 === 0).map(p => ({ ...p, isSubsequence: true }));
        setLimitPoint({ x: 300, y: 200, index: -1, isLimit: true });
        break;

      case 'bounded':
        // Use Bolzano-Weierstrass: find accumulation point
        // Simplified: take points that cluster around (300, 200)
        subseq = points
          .filter(p => {
            const dist = Math.sqrt((p.x - 300) ** 2 + (p.y - 200) ** 2);
            return dist < 100;
          })
          .slice(0, 15)
          .map(p => ({ ...p, isSubsequence: true }));
        
        if (subseq.length > 0) {
          const avgX = subseq.reduce((sum, p) => sum + p.x, 0) / subseq.length;
          const avgY = subseq.reduce((sum, p) => sum + p.y, 0) / subseq.length;
          setLimitPoint({ x: avgX, y: avgY, index: -1, isLimit: true });
        }
        break;

      case 'unbounded':
        // No convergent subsequence for unbounded
        subseq = [];
        setLimitPoint(null);
        break;

      case 'oscillating':
        // Take the even-indexed points (converging to one limit)
        subseq = points.filter((_, i) => i % 2 === 0).map(p => ({ ...p, isSubsequence: true }));
        setLimitPoint({ x: 200, y: 200, index: -1, isLimit: true });
        break;
    }

    setSubsequence(subseq);
    setShowSubsequence(true);
  };

  const animateSequence = () => {
    if (animating) {
      setAnimating(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    setAnimating(true);
    let currentIndex = 0;
    const animatedPoints: Point[] = [];

    const animate = () => {
      if (currentIndex < points.length) {
        animatedPoints.push(points[currentIndex]);
        setPoints([...animatedPoints]);
        currentIndex++;
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setAnimating(false);
      }
    };

    animate();
  };

  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw bounding box for bounded sequences
    if (sequenceType === 'bounded') {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(150, 120, 300, 160);
      ctx.setLineDash([]);
    }

    // Draw sequence points
    points.forEach((point, index) => {
      const opacity = 0.3 + (index / points.length) * 0.7;
      const size = 2 + (index / points.length) * 2;
      
      ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, 2 * Math.PI);
      ctx.fill();

      // Draw index for first few and last few points
      if (index < 3 || index >= points.length - 2) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px monospace';
        ctx.fillText(`${point.index}`, point.x + 5, point.y - 5);
      }
    });

    // Connect consecutive points
    if (points.length > 1) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    // Draw subsequence
    if (showSubsequence && subsequence.length > 0) {
      // Highlight subsequence points
      subsequence.forEach(point => {
        ctx.fillStyle = 'rgba(255, 0, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Connect subsequence points
      if (subsequence.length > 1) {
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(subsequence[0].x, subsequence[0].y);
        for (let i = 1; i < subsequence.length; i++) {
          ctx.lineTo(subsequence[i].x, subsequence[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw limit point
    if (limitPoint) {
      // Draw epsilon-ball around limit
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(limitPoint.x, limitPoint.y, 30, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw limit point
      ctx.fillStyle = 'rgba(255, 255, 0, 1)';
      ctx.beginPath();
      ctx.arc(limitPoint.x, limitPoint.y, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(limitPoint.x - 10, limitPoint.y);
      ctx.lineTo(limitPoint.x + 10, limitPoint.y);
      ctx.moveTo(limitPoint.x, limitPoint.y - 10);
      ctx.lineTo(limitPoint.x, limitPoint.y + 10);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 0, 1)';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('L', limitPoint.x + 12, limitPoint.y - 8);
    }
  };

  return (
    <div className={styles.explorer}>
      <div className={styles.controls}>
        <div className={styles.sequenceSelector}>
          <label>Sequence Type:</label>
          <Select<SequenceOption>
            value={sequenceOptions.find(opt => opt.value === sequenceType)}
            onChange={(newValue) => newValue && setSequenceType(newValue.value)}
            options={sequenceOptions}
            styles={customSelectStyles}
            isSearchable={false}
            className={styles.selectContainer}
            classNamePrefix="retro-select"
          />
        </div>

        <button className={styles.generateBtn} onClick={generateSequence}>
          Generate New Sequence
        </button>

        <button className={styles.findBtn} onClick={findConvergentSubsequence}>
          Find Convergent Subsequence
        </button>

        <button className={styles.animateBtn} onClick={animateSequence}>
          {animating ? 'Stop Animation' : 'Animate Sequence'}
        </button>
      </div>

      <div className={styles.visualization}>
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className={styles.canvas}
        />
      </div>

      <div className={styles.info}>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: '#00ffff' }} />
            <span>Original Sequence</span>
          </div>
          {showSubsequence && (
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#ff00ff' }} />
              <span>Convergent Subsequence</span>
            </div>
          )}
          {limitPoint && (
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#ffff00' }} />
              <span>Limit Point</span>
            </div>
          )}
        </div>

        <div className={styles.explanation}>
          <h3>Sequential Compactness</h3>
          <p>
            {sequenceType === 'converging' && 
              "This sequence converges to a limit point. Every subsequence also converges to the same limit."}
            {sequenceType === 'bounded' && 
              "By the Bolzano-Weierstrass theorem, every bounded sequence has a convergent subsequence."}
            {sequenceType === 'unbounded' && 
              "Unbounded sequences may not have convergent subsequences. This shows non-compactness."}
            {sequenceType === 'oscillating' && 
              "This sequence oscillates between two values. We can extract convergent subsequences."}
          </p>
          <p className={styles.theorem}>
            In metric spaces: A space is compact ⟺ It is sequentially compact
          </p>
        </div>
      </div>
    </div>
  );
};

export default SequentialCompactnessExplorer;