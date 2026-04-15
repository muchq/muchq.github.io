import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { retroSelectStyles } from '@/styles/ReactSelectStyles';
import styles from './SequenceConvergence.module.css';

type MetricType = 'euclidean' | 'manhattan' | 'maximum';
type SequenceType = 'converging' | 'cauchy' | 'diverging' | 'oscillating';

type SequenceOption = {
  value: SequenceType;
  label: string;
};

type MetricOption = {
  value: MetricType;
  label: string;
};

interface Point {
  x: number;
  y: number;
  n: number;
}

const SequenceConvergence: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metric, setMetric] = useState<MetricType>('euclidean');
  const [sequenceType, setSequenceType] = useState<SequenceType>('converging');
  const [epsilon, setEpsilon] = useState<number>(0.5);
  const [animationSpeed, setAnimationSpeed] = useState<number>(20);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showEpsilonBall, setShowEpsilonBall] = useState<boolean>(true);
  const [showTail, setShowTail] = useState<boolean>(true);

  const generateSequence = (type: SequenceType): Point[] => {
    const points: Point[] = [];
    const numPoints = type === 'oscillating' ? 20 : 100;
    
    for (let n = 1; n <= numPoints; n++) {
      let x = 0, y = 0;
      
      switch (type) {
        case 'converging': {
          // Spiral that actually converges to (2, 0)
          // Start from far out and spiral inward to (2, 0)
          const decayFactor = Math.exp(-n/10); // Exponential decay
          const angle = n * 0.3; // Spiral rotation
          // Start at large radius, converge to point (2, 0)
          x = 2 + 3 * decayFactor * Math.cos(angle);
          y = 3 * decayFactor * Math.sin(angle);
          break;
        }
        case 'cauchy':
          x = 3 * Math.cos(Math.log(n + 1)) / Math.sqrt(n);
          y = 3 * Math.sin(Math.log(n + 1)) / Math.sqrt(n);
          break;
        case 'diverging':
          x = 0.2 * n * Math.cos(n * 0.3);
          y = 0.2 * n * Math.sin(n * 0.3);
          break;
        case 'oscillating':
          x = 3 * Math.cos(n * Math.PI / 4) * (n % 2 === 0 ? 1 : 0.5);
          y = 3 * Math.sin(n * Math.PI / 4) * (n % 2 === 0 ? 1 : 0.5);
          break;
      }
      
      points.push({ x, y, n });
    }
    
    return points;
  };

  const sequence = useMemo(() => generateSequence(sequenceType), [sequenceType]);
  const prevSequenceTypeRef = useRef(sequenceType);

  const sequenceOptions: SequenceOption[] = [
    { value: 'converging', label: 'Converging Spiral' },
    { value: 'cauchy', label: 'Cauchy Sequence' },
    { value: 'diverging', label: 'Diverging Spiral' },
    { value: 'oscillating', label: 'Oscillating' }
  ];

  const metricOptions: MetricOption[] = [
    { value: 'euclidean', label: 'Euclidean' },
    { value: 'manhattan', label: 'Manhattan' },
    { value: 'maximum', label: 'Maximum' }
  ];

  const sequenceSelectStyles = retroSelectStyles<SequenceOption>();
  const metricSelectStyles = retroSelectStyles<MetricOption>();

  // Reset index when sequence type changes
  if (prevSequenceTypeRef.current !== sequenceType) {
    prevSequenceTypeRef.current = sequenceType;
    setCurrentIndex(0);
  }

  const calculateDistance = (p1: Point, p2: { x: number; y: number }): number => {
    switch (metric) {
      case 'euclidean':
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      case 'manhattan':
        return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
      case 'maximum':
        return Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
      default:
        return 0;
    }
  };

  const getLimitPoint = (): { x: number; y: number } | null => {
    switch (sequenceType) {
      case 'converging':
        return { x: 2, y: 0 };
      case 'cauchy':
        return { x: 0, y: 0 };
      case 'diverging':
      case 'oscillating':
        return null;
      default:
        return null;
    }
  };

  const findConvergenceIndex = (): number => {
    const limit = getLimitPoint();
    if (!limit) return -1;
    
    for (let i = 0; i < sequence.length; i++) {
      if (calculateDistance(sequence[i], limit) < epsilon) {
        return i;
      }
    }
    return -1;
  };

  const getOptimalScale = (): number => {
    // Find the bounds of all points in the sequence
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    sequence.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    
    // Include limit point if it exists
    const limit = getLimitPoint();
    if (limit) {
      minX = Math.min(minX, limit.x - epsilon);
      maxX = Math.max(maxX, limit.x + epsilon);
      minY = Math.min(minY, limit.y - epsilon);
      maxY = Math.max(maxY, limit.y + epsilon);
    }
    
    // Add some padding
    const padding = 1.2;
    const rangeX = (maxX - minX) * padding;
    const rangeY = (maxY - minY) * padding;
    
    // Calculate scale to fit the canvas
    const canvas = canvasRef.current;
    if (!canvas) return 40;
    
    const scaleX = canvas.width / (rangeX || 10);
    const scaleY = canvas.height / (rangeY || 10);
    
    // Use the smaller scale to ensure everything fits
    return Math.min(scaleX, scaleY, 100); // Cap at 100 for very small sequences
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const scale = getOptimalScale();
    
    // Center on the limit point if it exists, otherwise center at origin
    const limit = getLimitPoint();
    const centerPoint = limit || { x: 0, y: 0 };
    const centerX = width / 2 - centerPoint.x * scale;
    const centerY = height / 2 + centerPoint.y * scale;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Draw grid lines based on scale, offset by center point
    const gridSpacing = scale > 50 ? 1 : scale > 20 ? 2 : 5;
    const gridStartX = Math.floor((0 - centerX) / scale / gridSpacing) * gridSpacing;
    const gridEndX = Math.ceil((width - centerX) / scale / gridSpacing) * gridSpacing;
    const gridStartY = Math.floor((0 - centerY) / scale / gridSpacing) * gridSpacing;
    const gridEndY = Math.ceil((height - centerY) / scale / gridSpacing) * gridSpacing;
    
    for (let x = gridStartX; x <= gridEndX; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(centerX + x * scale, 0);
      ctx.lineTo(centerX + x * scale, height);
      ctx.stroke();
    }
    for (let y = gridStartY; y <= gridEndY; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, centerY - y * scale);
      ctx.lineTo(width, centerY - y * scale);
      ctx.stroke();
    }
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    
    if (limit && showEpsilonBall) {
      ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
      ctx.lineWidth = 2;
      
      if (metric === 'euclidean') {
        ctx.beginPath();
        ctx.arc(centerX + limit.x * scale, centerY - limit.y * scale, epsilon * scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (metric === 'manhattan') {
        ctx.beginPath();
        const lx = centerX + limit.x * scale;
        const ly = centerY - limit.y * scale;
        const e = epsilon * scale;
        ctx.moveTo(lx + e, ly);
        ctx.lineTo(lx, ly - e);
        ctx.lineTo(lx - e, ly);
        ctx.lineTo(lx, ly + e);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (metric === 'maximum') {
        const lx = centerX + limit.x * scale;
        const ly = centerY - limit.y * scale;
        const e = epsilon * scale;
        ctx.fillRect(lx - e, ly - e, 2 * e, 2 * e);
        ctx.strokeRect(lx - e, ly - e, 2 * e, 2 * e);
      }
    }
    
    if (showTail && currentIndex > 0) {
      ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= Math.min(currentIndex, sequence.length - 1); i++) {
        const point = sequence[i];
        const x = centerX + point.x * scale;
        const y = centerY - point.y * scale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    for (let i = 0; i <= Math.min(currentIndex, sequence.length - 1); i++) {
      const point = sequence[i];
      const x = centerX + point.x * scale;
      const y = centerY - point.y * scale;
      
      const opacity = showTail ? 0.3 + 0.7 * (i / currentIndex) : 1;
      const size = i === currentIndex ? 5 : 3;
      
      let isInEpsilonBall = false;
      if (limit) {
        isInEpsilonBall = calculateDistance(point, limit) < epsilon;
      }
      
      ctx.fillStyle = isInEpsilonBall ? 
        `rgba(76, 175, 80, ${opacity})` : 
        `rgba(102, 126, 234, ${opacity})`;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
      
      if (i === currentIndex || (i % 10 === 0 && i > 0)) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px monospace';
        ctx.fillText(`n=${point.n}`, x + 8, y - 8);
      }
    }
    
    if (limit) {
      ctx.fillStyle = 'rgba(255, 107, 107, 1)';
      ctx.beginPath();
      ctx.arc(centerX + limit.x * scale, centerY - limit.y * scale, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '14px monospace';
      ctx.fillText('L', centerX + limit.x * scale + 10, centerY - limit.y * scale - 10);
    }
  };

  useEffect(() => {
    draw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence, currentIndex, epsilon, metric, showEpsilonBall, showTail]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentIndex >= sequence.length - 1) return;

    const timeoutId = setTimeout(() => {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (nextIndex >= sequence.length - 1) {
        setIsPlaying(false);
      }
    }, 1000 / animationSpeed);

    return () => clearTimeout(timeoutId);
  }, [isPlaying, currentIndex, sequence.length, animationSpeed]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentIndex >= sequence.length - 1) {
        setCurrentIndex(0);
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const convergenceIndex = findConvergenceIndex();

  const sequenceDescriptions = {
    converging: 'Converges to the limit point L = (2, 0)',
    cauchy: 'Cauchy sequence converging to origin',
    diverging: 'Diverges - terms grow without bound',
    oscillating: 'Oscillates between two regions'
  };

  return (
    <div className={styles.convergence}>
      <div className={styles.instructions}>
        <h3>Sequence Convergence Animator</h3>
        <p>Visualize how sequences converge in different metric spaces. Adjust epsilon to see when sequences enter the ε-neighborhood of the limit.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <div className={styles.controlGroup}>
            <label>Sequence Type:</label>
            <Select<SequenceOption>
              value={sequenceOptions.find(opt => opt.value === sequenceType)}
              onChange={(option) => option && setSequenceType(option.value)}
              options={sequenceOptions}
              styles={sequenceSelectStyles}
              isSearchable={false}
              className={styles.selectWrapper}
            />
          </div>

          <div className={styles.controlGroup}>
            <label>Metric:</label>
            <Select<MetricOption>
              value={metricOptions.find(opt => opt.value === metric)}
              onChange={(option) => option && setMetric(option.value)}
              options={metricOptions}
              styles={metricSelectStyles}
              isSearchable={false}
              className={styles.selectWrapper}
            />
          </div>
        </div>

        <div className={styles.controlRow}>
          <div className={styles.controlGroup}>
            <label>Epsilon (ε): {epsilon.toFixed(2)}</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.controlGroup}>
            <label>Animation Speed: {animationSpeed}</label>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseInt(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>

        <div className={styles.controlRow}>
          <div className={styles.toggles}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showEpsilonBall}
                onChange={(e) => setShowEpsilonBall(e.target.checked)}
              />
              Show ε-ball
            </label>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={showTail}
                onChange={(e) => setShowTail(e.target.checked)}
              />
              Show tail
            </label>
          </div>

          <div className={styles.playbackControls}>
            <button 
              className={styles.playButton}
              onClick={handlePlayPause}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button 
              className={styles.resetButton}
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>

        <div className={styles.info}>
          <p>Current term: n = {sequence[currentIndex]?.n || 1}</p>
          <p>{sequenceDescriptions[sequenceType]}</p>
          {convergenceIndex >= 0 && (
            <p className={styles.convergenceInfo}>
              Sequence enters ε-ball at n = {sequence[convergenceIndex].n}
            </p>
          )}
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={styles.canvas}
        />
      </div>

      <div className={styles.analysis}>
        <h4>Convergence Analysis</h4>
        <div className={styles.analysisGrid}>
          <div className={styles.analysisItem}>
            <strong>Sequence Type:</strong>
            <p>{sequenceType === 'converging' || sequenceType === 'cauchy' ? 'Convergent' : 'Divergent'}</p>
          </div>
          {getLimitPoint() && (
            <div className={styles.analysisItem}>
              <strong>Limit Point:</strong>
              <p>L = ({getLimitPoint()!.x.toFixed(2)}, {getLimitPoint()!.y.toFixed(2)})</p>
            </div>
          )}
          <div className={styles.analysisItem}>
            <strong>Current Distance to Limit:</strong>
            <p>{getLimitPoint() && currentIndex < sequence.length ? 
              calculateDistance(sequence[currentIndex], getLimitPoint()!).toFixed(3) : 
              'N/A'}</p>
          </div>
          <div className={styles.analysisItem}>
            <strong>ε-δ Definition:</strong>
            <p>∀ε {'>'} 0, ∃N: n {'>'} N ⟹ d(xₙ, L) {'<'} ε</p>
          </div>
        </div>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Watch how converging sequences eventually stay within the ε-ball around the limit</li>
          <li>Cauchy sequences have terms that get arbitrarily close to each other</li>
          <li>Different metrics affect when sequences enter the ε-neighborhood</li>
          <li>Try adjusting ε to find the exact convergence point</li>
          <li>Diverging sequences never settle into any ε-ball</li>
        </ul>
      </div>
    </div>
  );
};

export default SequenceConvergence;