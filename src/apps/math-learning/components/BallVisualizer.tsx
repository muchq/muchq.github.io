import React, { useState, useRef, useEffect } from 'react';
import styles from './BallVisualizer.module.css';

type MetricType = 'euclidean' | 'manhattan' | 'maximum' | 'discrete';
type ViewMode = '2D' | '3D';

interface Point2D {
  x: number;
  y: number;
}


const BallVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode] = useState<ViewMode>('2D');
  const [metric, setMetric] = useState<MetricType>('euclidean');
  const [epsilon, setEpsilon] = useState<number>(2);
  const [centerPoint, setCenterPoint] = useState<Point2D>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [animating, setAnimating] = useState<boolean>(false);

  const samplePoints: Point2D[] = [
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: -1.5, y: -1 },
    { x: 1.5, y: -1.5 },
    { x: 0.5, y: 1.5 },
    { x: -0.5, y: -1.5 }
  ];

  const calculateDistance = (p1: Point2D, p2: Point2D): number => {
    switch (metric) {
      case 'euclidean':
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      case 'manhattan':
        return Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
      case 'maximum':
        return Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
      case 'discrete':
        return (p1.x === p2.x && p1.y === p2.y) ? 0 : 1;
      default:
        return 0;
    }
  };

  const drawBall2D = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const scale = 40;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);
    
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      for (let x = -10; x <= 10; x++) {
        ctx.beginPath();
        ctx.moveTo(centerX + x * scale, 0);
        ctx.lineTo(centerX + x * scale, height);
        ctx.stroke();
      }
      
      for (let y = -10; y <= 10; y++) {
        ctx.beginPath();
        ctx.moveTo(0, centerY + y * scale);
        ctx.lineTo(width, centerY + y * scale);
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
    }

    const ballPoints: Point2D[] = [];
    const resolution = metric === 'discrete' ? 20 : 100;
    
    if (metric === 'discrete') {
      if (epsilon >= 1) {
        for (let x = -5; x <= 5; x += 0.5) {
          for (let y = -5; y <= 5; y += 0.5) {
            ballPoints.push({ x, y });
          }
        }
      } else {
        ballPoints.push({ x: centerPoint.x, y: centerPoint.y });
      }
    } else {
      for (let angle = 0; angle < 2 * Math.PI; angle += (2 * Math.PI) / resolution) {
        const r = epsilon;
        let x = 0, y = 0;
        
        switch (metric) {
          case 'euclidean':
            x = centerPoint.x + r * Math.cos(angle);
            y = centerPoint.y + r * Math.sin(angle);
            break;
          case 'manhattan': {
            const t = angle / (2 * Math.PI);
            if (t < 0.25) {
              x = centerPoint.x + epsilon * (1 - 4 * t);
              y = centerPoint.y + epsilon * (4 * t);
            } else if (t < 0.5) {
              x = centerPoint.x - epsilon * (4 * t - 1);
              y = centerPoint.y + epsilon * (2 - 4 * t);
            } else if (t < 0.75) {
              x = centerPoint.x - epsilon * (3 - 4 * t);
              y = centerPoint.y - epsilon * (4 * t - 2);
            } else {
              x = centerPoint.x + epsilon * (4 * t - 3);
              y = centerPoint.y - epsilon * (4 - 4 * t);
            }
            break;
          }
          case 'maximum':
            x = centerPoint.x + epsilon * Math.sign(Math.cos(angle)) * Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
            y = centerPoint.y + epsilon * Math.sign(Math.sin(angle)) * Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
            break;
        }
        ballPoints.push({ x, y });
      }
    }

    ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
    ctx.lineWidth = 2;
    
    if (metric === 'discrete') {
      ballPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(centerX + point.x * scale, centerY - point.y * scale, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    } else {
      ctx.beginPath();
      ballPoints.forEach((point, i) => {
        const screenX = centerX + point.x * scale;
        const screenY = centerY - point.y * scale;
        if (i === 0) {
          ctx.moveTo(screenX, screenY);
        } else {
          ctx.lineTo(screenX, screenY);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 107, 107, 1)';
    ctx.beginPath();
    ctx.arc(centerX + centerPoint.x * scale, centerY - centerPoint.y * scale, 5, 0, 2 * Math.PI);
    ctx.fill();

    if (showPoints) {
      samplePoints.forEach(point => {
        const dist = calculateDistance(centerPoint, point);
        const isInside = dist <= epsilon;
        
        ctx.fillStyle = isInside ? 'rgba(76, 175, 80, 1)' : 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(centerX + point.x * scale, centerY - point.y * scale, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        if (isInside) {
          ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(centerX + centerPoint.x * scale, centerY - centerPoint.y * scale);
          ctx.lineTo(centerX + point.x * scale, centerY - point.y * scale);
          ctx.stroke();
        }
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const animate = () => {
      if (viewMode === '2D') {
        drawBall2D(ctx, canvas.width, canvas.height);
      }
    };
    
    animate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, metric, epsilon, centerPoint, showGrid, showPoints]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scale = 40;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const worldX = (x - centerX) / scale;
    const worldY = -(y - centerY) / scale;
    
    setCenterPoint({ x: worldX, y: worldY });
  };

  const animateEpsilon = () => {
    setAnimating(true);
    let currentEpsilon = 0.1;
    const maxEpsilon = 4;
    const step = 0.05;
    
    const interval = setInterval(() => {
      currentEpsilon += step;
      if (currentEpsilon > maxEpsilon) {
        currentEpsilon = 0.1;
      }
      setEpsilon(currentEpsilon);
    }, 50);
    
    setTimeout(() => {
      clearInterval(interval);
      setAnimating(false);
      setEpsilon(2);
    }, 5000);
  };

  const metricDescriptions = {
    euclidean: 'Standard Euclidean distance - forms circles',
    manhattan: 'Manhattan/Taxicab distance - forms diamonds',
    maximum: 'Maximum/Chebyshev distance - forms squares',
    discrete: 'Discrete metric - all points or just center'
  };

  return (
    <div className={styles.visualizer}>
      <div className={styles.instructions}>
        <h3>Ball and Neighborhood Visualizer</h3>
        <p>Explore how different metrics create different shaped balls. Click on the canvas to move the center point and adjust epsilon to change the ball radius.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>Metric:</label>
          <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value as MetricType)}
            className={styles.select}
          >
            <option value="euclidean">Euclidean</option>
            <option value="manhattan">Manhattan</option>
            <option value="maximum">Maximum</option>
            <option value="discrete">Discrete</option>
          </select>
        </div>

        <div className={styles.controlGroup}>
          <label>Epsilon (ε): {epsilon.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={epsilon}
            onChange={(e) => setEpsilon(parseFloat(e.target.value))}
            className={styles.slider}
            disabled={animating}
          />
        </div>

        <div className={styles.controlGroup}>
          <label>Center: ({centerPoint.x.toFixed(1)}, {centerPoint.y.toFixed(1)})</label>
        </div>

        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Show Grid
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
            />
            Show Sample Points
          </label>
        </div>

        <button 
          className={styles.animateButton}
          onClick={animateEpsilon}
          disabled={animating}
        >
          {animating ? 'Animating...' : 'Animate Epsilon'}
        </button>
      </div>

      <div className={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className={styles.canvas}
          onClick={handleCanvasClick}
        />
        <p className={styles.metricDescription}>{metricDescriptions[metric]}</p>
      </div>

      <div className={styles.legend}>
        <h4>Legend:</h4>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ background: 'rgba(255, 107, 107, 1)' }}></span>
            Center point
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ background: 'rgba(102, 126, 234, 0.8)' }}></span>
            ε-ball boundary
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ background: 'rgba(76, 175, 80, 1)' }}></span>
            Points inside ball
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendColor} style={{ background: 'rgba(255, 255, 255, 0.5)' }}></span>
            Points outside ball
          </div>
        </div>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Click anywhere on the canvas to move the center of the ball</li>
          <li>Notice how the ball shape changes with different metrics</li>
          <li>In the discrete metric, the ball is either just the center (ε {'<'} 1) or the entire space (ε ≥ 1)</li>
          <li>The Manhattan metric creates diamond-shaped balls useful in grid-based navigation</li>
          <li>Maximum metric balls are squares - useful in chess king moves</li>
        </ul>
      </div>
    </div>
  );
};

export default BallVisualizer;