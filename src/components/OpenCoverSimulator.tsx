import React, { useState, useEffect, useRef } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './OpenCoverSimulator.module.css';

type Interval = {
  id: string;
  start: number;
  end: number;
  color: string;
  selected: boolean;
};

type Space = 'unit' | 'real' | 'finite' | 'cantor';

type SpaceOption = {
  value: Space;
  label: string;
};

const spaceOptions: SpaceOption[] = [
  { value: 'unit', label: '[0,1] - Compact' },
  { value: 'real', label: 'ℝ - Non-compact' },
  { value: 'finite', label: 'Finite Discrete - Compact' },
  { value: 'cantor', label: 'Cantor Set - Compact' }
];

const customSelectStyles: StylesConfig<SpaceOption, false> = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#0a0a0a',
    borderColor: state.isFocused ? '#00ffff' : '#00ffff',
    borderWidth: '2px',
    borderRadius: 0,
    boxShadow: state.isFocused ? '0 0 15px #00ffff' : 'none',
    '&:hover': {
      borderColor: '#00ffff',
      boxShadow: '0 0 10px #00ffff'
    },
    fontFamily: 'monospace',
    cursor: 'pointer',
    minHeight: '42px',
    height: '42px'
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

const OpenCoverSimulator: React.FC = () => {
  const [space, setSpace] = useState<Space>('unit');
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [isCompact, setIsCompact] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate initial open cover based on space
  useEffect(() => {
    generateOpenCover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space]);

  // Draw visualization
  useEffect(() => {
    drawVisualization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervals, space]);

  const generateOpenCover = () => {
    let newIntervals: Interval[] = [];
    
    switch (space) {
      case 'unit':
        // Generate overlapping intervals that cover [0,1]
        newIntervals = [
          { id: '1', start: -0.1, end: 0.3, color: '#00ffff', selected: false },
          { id: '2', start: 0.2, end: 0.5, color: '#ff00ff', selected: false },
          { id: '3', start: 0.4, end: 0.7, color: '#ffff00', selected: false },
          { id: '4', start: 0.6, end: 0.9, color: '#00ff00', selected: false },
          { id: '5', start: 0.8, end: 1.1, color: '#ff0080', selected: false },
        ];
        setIsCompact(true);
        break;
      
      case 'real':
        // Generate intervals that cover ℝ (non-compact)
        newIntervals = [
          { id: '1', start: -1000, end: -10, color: '#00ffff', selected: false },
          { id: '2', start: -15, end: -5, color: '#ff00ff', selected: false },
          { id: '3', start: -8, end: 2, color: '#ffff00', selected: false },
          { id: '4', start: -1, end: 10, color: '#00ff00', selected: false },
          { id: '5', start: 8, end: 100, color: '#ff0080', selected: false },
          { id: '6', start: 95, end: 1000, color: '#0080ff', selected: false },
        ];
        setIsCompact(false);
        break;
      
      case 'finite':
        // Finite discrete space (always compact)
        newIntervals = [
          { id: '1', start: 0.5, end: 1.5, color: '#00ffff', selected: false },
          { id: '2', start: 1.8, end: 2.2, color: '#ff00ff', selected: false },
          { id: '3', start: 2.5, end: 3.5, color: '#ffff00', selected: false },
          { id: '4', start: 3.8, end: 4.2, color: '#00ff00', selected: false },
        ];
        setIsCompact(true);
        break;
      
      case 'cantor': {
        // Cantor set (compact but interesting)
        const cantorIntervals: Interval[] = [];
        let id = 1;
        
        // Generate intervals covering Cantor set points
        const addCantorInterval = (start: number, end: number, depth: number) => {
          if (depth === 0) return;
          
          const third = (end - start) / 3;
          cantorIntervals.push({
            id: `${id++}`,
            start: start - 0.01,
            end: start + third + 0.01,
            color: `hsl(${(id * 60) % 360}, 100%, 50%)`,
            selected: false
          });
          cantorIntervals.push({
            id: `${id++}`,
            start: end - third - 0.01,
            end: end + 0.01,
            color: `hsl(${(id * 60) % 360}, 100%, 50%)`,
            selected: false
          });
          
          addCantorInterval(start, start + third, depth - 1);
          addCantorInterval(end - third, end, depth - 1);
        };
        
        addCantorInterval(0, 1, 3);
        newIntervals = cantorIntervals;
        setIsCompact(true);
        break;
      }
    }
    
    setIntervals(newIntervals);
    setShowResult(false);
  };

  const toggleInterval = (id: string) => {
    setIntervals(intervals.map(interval => 
      interval.id === id 
        ? { ...interval, selected: !interval.selected }
        : interval
    ));
  };

  const checkFiniteSubcover = () => {
    const selected = intervals.filter(i => i.selected);
    
    if (selected.length === 0) {
      setShowResult(true);
      return;
    }
    
    setShowResult(true);
  };

  const checkCoverage = (intervals: Interval[], start: number, end: number): boolean => {
    // Sort intervals by start point
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    
    if (sorted.length === 0 || sorted[0].start > start) return false;
    
    let currentEnd = sorted[0].end;
    
    for (let i = 1; i < sorted.length; i++) {
      if (currentEnd >= end) return true;
      if (sorted[i].start > currentEnd) return false;
      currentEnd = Math.max(currentEnd, sorted[i].end);
    }
    
    return currentEnd >= end;
  };

  const checkDiscreteCoverage = (intervals: Interval[], points: number[]): boolean => {
    return points.every(point => 
      intervals.some(interval => point > interval.start && point < interval.end)
    );
  };

  const checkCantorCoverage = (intervals: Interval[]): boolean => {
    // Simplified check - in reality would need to check all Cantor set points
    const cantorPoints = [0, 1/3, 2/3, 1, 1/9, 2/9, 7/9, 8/9];
    return cantorPoints.every(point => 
      intervals.some(interval => point >= interval.start && point <= interval.end)
    );
  };

  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the space
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    
    switch (space) {
      case 'unit': {
        // Draw [0,1] interval
        ctx.beginPath();
        ctx.moveTo(50, 150);
        ctx.lineTo(550, 150);
        ctx.stroke();
        
        // Draw endpoints
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(50, 150, 4, 0, 2 * Math.PI);
        ctx.arc(550, 150, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText('0', 45, 180);
        ctx.fillText('1', 545, 180);
        break;
      }
      
      case 'finite': {
        // Draw discrete points
        ctx.fillStyle = '#00ffff';
        for (let i = 1; i <= 4; i++) {
          const x = 100 + i * 100;
          ctx.beginPath();
          ctx.arc(x, 150, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px monospace';
          ctx.fillText(`${i}`, x - 5, 180);
          ctx.fillStyle = '#00ffff';
        }
        break;
      }
      
      case 'cantor': {
        // Draw Cantor set (simplified)
        const drawCantorSegment = (x1: number, x2: number, y: number, depth: number) => {
          if (depth === 0) {
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
          } else {
            const third = (x2 - x1) / 3;
            drawCantorSegment(x1, x1 + third, y, depth - 1);
            drawCantorSegment(x2 - third, x2, y, depth - 1);
          }
        };
        ctx.strokeStyle = '#00ffff';
        drawCantorSegment(50, 550, 150, 4);
        break;
      }
    }
    
    // Draw intervals
    intervals.forEach((interval, index) => {
      const y = 100 - index * 15;
      let x1, x2;
      
      if (space === 'unit' || space === 'cantor') {
        x1 = 50 + (interval.start + 0.1) * 500 / 1.2;
        x2 = 50 + (interval.end + 0.1) * 500 / 1.2;
      } else if (space === 'finite') {
        x1 = 100 + interval.start * 100;
        x2 = 100 + interval.end * 100;
      } else {
        // Map to canvas for real line
        x1 = 300 + interval.start * 2;
        x2 = 300 + interval.end * 2;
        x1 = Math.max(0, Math.min(600, x1));
        x2 = Math.max(0, Math.min(600, x2));
      }
      
      ctx.globalAlpha = interval.selected ? 0.6 : 0.3;
      ctx.fillStyle = interval.color;
      ctx.fillRect(x1, y - 5, x2 - x1, 10);
      
      ctx.globalAlpha = 1;
      ctx.strokeStyle = interval.color;
      ctx.lineWidth = interval.selected ? 3 : 1;
      ctx.strokeRect(x1, y - 5, x2 - x1, 10);
    });
  };

  const getResultMessage = () => {
    const selected = intervals.filter(i => i.selected);
    
    if (selected.length === 0) {
      return "No intervals selected. Select some intervals to form a subcover.";
    }
    
    let covered = false;
    switch (space) {
      case 'unit':
        covered = checkCoverage(selected, 0, 1);
        break;
      case 'finite':
        covered = checkDiscreteCoverage(selected, [1, 2, 3, 4]);
        break;
      case 'cantor':
        covered = checkCantorCoverage(selected);
        break;
      case 'real':
        covered = false;
        break;
    }
    
    if (space === 'real') {
      return "ℝ is not compact - no finite subcover can cover the entire real line!";
    }
    
    if (covered) {
      return `✓ Finite subcover found! You've covered the space with ${selected.length} intervals.`;
    } else {
      return "✗ Selected intervals don't cover the entire space. Try adding more intervals.";
    }
  };

  return (
    <div className={styles.simulator}>
      <div className={styles.controls}>
        <div className={styles.spaceSelector}>
          <label>Select Space:</label>
          <Select<SpaceOption>
            value={spaceOptions.find(opt => opt.value === space)}
            onChange={(newValue) => newValue && setSpace(newValue.value)}
            options={spaceOptions}
            styles={customSelectStyles}
            isSearchable={false}
            className={styles.selectContainer}
            classNamePrefix="retro-select"
          />
        </div>
        
        <button className={styles.generateBtn} onClick={generateOpenCover}>
          Generate New Cover
        </button>
        
        <button className={styles.checkBtn} onClick={checkFiniteSubcover}>
          Check Finite Subcover
        </button>
      </div>
      
      <div className={styles.visualization}>
        <canvas 
          ref={canvasRef}
          width={600}
          height={200}
          className={styles.canvas}
        />
      </div>
      
      <div className={styles.intervalList}>
        <h3>Open Sets in Cover (Click to select/deselect):</h3>
        <div className={styles.intervals}>
          {intervals.map(interval => (
            <div
              key={interval.id}
              className={`${styles.interval} ${interval.selected ? styles.selected : ''}`}
              onClick={() => toggleInterval(interval.id)}
              style={{ borderColor: interval.color }}
            >
              <span className={styles.intervalColor} style={{ backgroundColor: interval.color }} />
              <span className={styles.intervalLabel}>
                ({interval.start.toFixed(2)}, {interval.end.toFixed(2)})
              </span>
              {interval.selected && <span className={styles.checkmark}>✓</span>}
            </div>
          ))}
        </div>
      </div>
      
      {showResult && (
        <div className={styles.result}>
          <p>{getResultMessage()}</p>
          <p className={styles.theory}>
            {isCompact 
              ? "This space is compact - every open cover has a finite subcover."
              : "This space is not compact - some open covers have no finite subcover."}
          </p>
        </div>
      )}
    </div>
  );
};

export default OpenCoverSimulator;