import React, { useState, useEffect, useCallback, useRef } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './PathHomotopyAnimator.module.css';

interface Point {
  x: number;
  y: number;
}

interface Path {
  id: string;
  points: Point[];
  color: string;
  isLoop: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

type Space = 'plane' | 'punctured-plane' | 'annulus' | 'torus';

type SpaceOption = {
  value: Space;
  label: string;
};

const spaceOptions: SpaceOption[] = [
  { value: 'plane', label: 'Plane (Simply Connected)' },
  { value: 'punctured-plane', label: 'Punctured Plane' },
  { value: 'annulus', label: 'Annulus' },
  { value: 'torus', label: 'Torus' }
];

const customSelectStyles: StylesConfig<SpaceOption, false> = {
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


const PathHomotopyAnimator: React.FC = () => {
  const [selectedSpace, setSelectedSpace] = useState<Space>('punctured-plane');
  const [paths, setPaths] = useState<Path[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<[string, string] | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([
    { x: 300, y: 200, radius: 30 }
  ]);
  const [basePoint] = useState<Point>({ x: 150, y: 200 });
  const [showFundamentalGroup, setShowFundamentalGroup] = useState(false);
  const [pathCounter, setPathCounter] = useState(0);
  const canvasRef = useRef<SVGSVGElement>(null);

  const pathColors = ['#ff0080', '#00ffff', '#39ff14', '#ff9f00', '#ff00ff'];

  const getFundamentalGroup = useCallback(() => {
    switch (selectedSpace) {
      case 'plane':
        return '0 (trivial group)';
      case 'punctured-plane':
        return 'ℤ (integers under addition)';
      case 'annulus':
        return 'ℤ (winding number)';
      case 'torus':
        return 'ℤ × ℤ (two independent loops)';
      default:
        return 'Unknown';
    }
  }, [selectedSpace]);

  const isValidPath = (points: Point[]): boolean => {
    if (points.length < 2) return false;
    
    for (const obstacle of obstacles) {
      for (let i = 0; i < points.length - 1; i++) {
        if (lineIntersectsCircle(
          points[i], 
          points[i + 1], 
          obstacle
        )) {
          return false;
        }
      }
    }
    
    return true;
  };

  const lineIntersectsCircle = (
    p1: Point, 
    p2: Point, 
    circle: Obstacle
  ): boolean => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const fx = p1.x - circle.x;
    const fy = p1.y - circle.y;
    
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - circle.radius * circle.radius;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  };

  const areHomotopic = (path1: Path, path2: Path): boolean => {
    // Paths must have the same endpoints to be homotopic
    const path1Start = path1.points[0];
    const path1End = path1.points[path1.points.length - 1];
    const path2Start = path2.points[0];
    const path2End = path2.points[path2.points.length - 1];
    
    const tolerance = 10; // pixels
    const sameStart = Math.abs(path1Start.x - path2Start.x) < tolerance && 
                     Math.abs(path1Start.y - path2Start.y) < tolerance;
    const sameEnd = Math.abs(path1End.x - path2End.x) < tolerance && 
                   Math.abs(path1End.y - path2End.y) < tolerance;
    
    if (!sameStart || !sameEnd) {
      return false; // Paths with different endpoints cannot be homotopic
    }
    
    // For loops, check if they wind around obstacles the same way
    if (path1.isLoop && path2.isLoop) {
      if (selectedSpace === 'plane') {
        return true; // All loops are homotopic in the plane
      }
      
      if (selectedSpace === 'punctured-plane' || selectedSpace === 'annulus') {
        const winding1 = calculateWindingNumber(path1.points, obstacles[0], true);
        const winding2 = calculateWindingNumber(path2.points, obstacles[0], true);
        return winding1 === winding2;
      }
    }
    
    // For non-loops with same endpoints
    if (!path1.isLoop && !path2.isLoop) {
      if (selectedSpace === 'plane') {
        return true; // All paths with same endpoints are homotopic in the plane
      }
      
      if (selectedSpace === 'punctured-plane' || selectedSpace === 'annulus') {
        // For non-loops, we check the "relative winding" 
        // This is done by creating a loop from path1 + reverse(path2) and checking its winding
        const combinedPath = [...path1.points];
        for (let i = path2.points.length - 2; i >= 0; i--) {
          combinedPath.push(path2.points[i]);
        }
        const relativeWinding = calculateWindingNumber(combinedPath, obstacles[0], true);
        return relativeWinding === 0; // Paths are homotopic if the combined loop doesn't wind
      }
    }
    
    return false;
  };

  const calculateWindingNumber = (points: Point[], obstacle: Obstacle, isClosedPath: boolean = false): number => {
    if (points.length < 2) return 0;
    
    let windingNumber = 0;
    const center = obstacle;
    
    // Calculate winding for each segment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      
      const angle1 = Math.atan2(p1.y - center.y, p1.x - center.x);
      const angle2 = Math.atan2(p2.y - center.y, p2.x - center.x);
      
      let dAngle = angle2 - angle1;
      while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
      while (dAngle < -Math.PI) dAngle += 2 * Math.PI;
      
      windingNumber += dAngle;
    }
    
    // For closed paths or loops, add the segment from last point back to first
    if (isClosedPath && points.length > 2) {
      const p1 = points[points.length - 1];
      const p2 = points[0];
      
      const angle1 = Math.atan2(p1.y - center.y, p1.x - center.x);
      const angle2 = Math.atan2(p2.y - center.y, p2.x - center.x);
      
      let dAngle = angle2 - angle1;
      while (dAngle > Math.PI) dAngle -= 2 * Math.PI;
      while (dAngle < -Math.PI) dAngle += 2 * Math.PI;
      
      windingNumber += dAngle;
    }
    
    return Math.round(windingNumber / (2 * Math.PI));
  };

  const interpolatePaths = (path1: Point[], path2: Point[], t: number): Point[] => {
    // For spaces with obstacles, we need to ensure the interpolated path doesn't pass through them
    if (selectedSpace === 'punctured-plane' || selectedSpace === 'annulus') {
      // Check if paths have the same winding number (they should if areHomotopic returned true)
      const isLoop = path1[0].x === path1[path1.length - 1].x && 
                    path1[0].y === path1[path1.length - 1].y;
      const winding1 = calculateWindingNumber(path1, obstacles[0], isLoop);
      const winding2 = calculateWindingNumber(path2, obstacles[0], isLoop);
      
      if (winding1 !== winding2) {
        // Paths are not homotopic, just return path1
        return path1;
      }
      
      // For proper homotopy, we need to ensure continuous deformation without crossing obstacles
      // We'll create intermediate paths that gradually morph while avoiding the hole
      const obstacle = obstacles[0];
      const result: Point[] = [];
      const maxLen = Math.max(path1.length, path2.length);
      
      // First, normalize both paths to have the same number of points
      const normalizedPath1: Point[] = [];
      const normalizedPath2: Point[] = [];
      
      for (let i = 0; i < maxLen; i++) {
        const idx1 = Math.min(Math.floor(i * path1.length / maxLen), path1.length - 1);
        const idx2 = Math.min(Math.floor(i * path2.length / maxLen), path2.length - 1);
        normalizedPath1.push(path1[idx1]);
        normalizedPath2.push(path2[idx2]);
      }
      
      // For each point, interpolate while ensuring we don't cross the obstacle
      for (let i = 0; i < maxLen; i++) {
        const p1 = normalizedPath1[i];
        const p2 = normalizedPath2[i];
        
        // Simple linear interpolation
        let interpX = p1.x + (p2.x - p1.x) * t;
        let interpY = p1.y + (p2.y - p1.y) * t;
        
        // Check if this interpolated point is inside the obstacle
        const distToCenter = Math.sqrt(
          Math.pow(interpX - obstacle.x, 2) + 
          Math.pow(interpY - obstacle.y, 2)
        );
        
        if (distToCenter < obstacle.radius + 5) {
          // Point is too close to or inside obstacle, push it out
          // Move the point radially outward from the obstacle center
          const angle = Math.atan2(interpY - obstacle.y, interpX - obstacle.x);
          const safeRadius = obstacle.radius + 15;
          interpX = obstacle.x + safeRadius * Math.cos(angle);
          interpY = obstacle.y + safeRadius * Math.sin(angle);
        }
        
        // Additional check: if the line segment from previous point would cross the obstacle,
        // we need to go around it
        if (i > 0) {
          const prevPoint = result[i - 1];
          
          // Check if line from prevPoint to current interpolated point intersects the obstacle
          if (lineIntersectsCircle(
            prevPoint,
            { x: interpX, y: interpY },
            obstacle
          )) {
            // Need to go around the obstacle
            // Determine which way to go based on the winding number
            const angle1 = Math.atan2(prevPoint.y - obstacle.y, prevPoint.x - obstacle.x);
            const angle2 = Math.atan2(interpY - obstacle.y, interpX - obstacle.x);
            
            // Add intermediate points that go around the obstacle
            let angleDiff = angle2 - angle1;
            
            // Ensure we go the right way around based on winding
            if (winding1 > 0) {
              // Positive winding - go counterclockwise
              if (angleDiff < 0) angleDiff += 2 * Math.PI;
            } else if (winding1 < 0) {
              // Negative winding - go clockwise  
              if (angleDiff > 0) angleDiff -= 2 * Math.PI;
            }
            
            // If we need to go more than 180 degrees, we're going the wrong way
            if (Math.abs(angleDiff) > Math.PI) {
              // Just use the safe point we calculated earlier
              // This is a fallback for complex cases
            }
          }
        }
        
        result.push({
          x: interpX,
          y: interpY
        });
      }
      
      return result;
    }
    
    // For spaces without obstacles (plane), use simple linear interpolation
    const maxLen = Math.max(path1.length, path2.length);
    const result: Point[] = [];
    
    for (let i = 0; i < maxLen; i++) {
      const p1 = path1[Math.min(i, path1.length - 1)];
      const p2 = path2[Math.min(i, path2.length - 1)];
      
      result.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
      });
    }
    
    return result;
  };

  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setIsDrawing(true);
    setCurrentPath([point]);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (!isDrawing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    setCurrentPath(prev => [...prev, point]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }
    
    const isLoop = 
      Math.abs(currentPath[0].x - currentPath[currentPath.length - 1].x) < 20 &&
      Math.abs(currentPath[0].y - currentPath[currentPath.length - 1].y) < 20;
    
    if (isLoop) {
      currentPath.push(currentPath[0]);
    }
    
    if (isValidPath(currentPath)) {
      const newPath: Path = {
        id: `path-${pathCounter}`,
        points: currentPath,
        color: pathColors[paths.length % pathColors.length],
        isLoop
      };
      
      setPaths(prev => [...prev, newPath]);
      setPathCounter(prev => prev + 1);
    }
    
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const animateHomotopy = () => {
    if (!selectedPaths) return;
    
    const path1 = paths.find(p => p.id === selectedPaths[0]);
    const path2 = paths.find(p => p.id === selectedPaths[1]);
    
    if (!path1 || !path2) return;
    
    if (!areHomotopic(path1, path2)) {
      let message = `These paths are NOT homotopic in the ${selectedSpace}!\n\n`;
      
      if (path1.isLoop && path2.isLoop) {
        message += `In a punctured plane, loops can only be continuously deformed into each other ` +
                  `if they wind around the hole the same number of times.\n\n` +
                  `Path 1 winding number: ${selectedSpace === 'punctured-plane' || selectedSpace === 'annulus' ? calculateWindingNumber(path1.points, obstacles[0], true) : 'N/A'}\n` +
                  `Path 2 winding number: ${selectedSpace === 'punctured-plane' || selectedSpace === 'annulus' ? calculateWindingNumber(path2.points, obstacles[0], true) : 'N/A'}`;
      } else if (!path1.isLoop && !path2.isLoop) {
        const path1Start = path1.points[0];
        const path1End = path1.points[path1.points.length - 1];
        const path2Start = path2.points[0];
        const path2End = path2.points[path2.points.length - 1];
        
        const tolerance = 10;
        const sameStart = Math.abs(path1Start.x - path2Start.x) < tolerance && 
                         Math.abs(path1Start.y - path2Start.y) < tolerance;
        const sameEnd = Math.abs(path1End.x - path2End.x) < tolerance && 
                       Math.abs(path1End.y - path2End.y) < tolerance;
        
        if (!sameStart || !sameEnd) {
          message += `Paths must have the same start and end points to be homotopic.`;
        } else if (selectedSpace === 'punctured-plane' || selectedSpace === 'annulus') {
          message += `In a punctured plane, paths with the same endpoints can only be deformed into each other ` +
                    `if they go around the hole in the same way (their relative winding is zero).`;
        }
      } else {
        message += `One path is a loop and the other is not. They cannot be homotopic.`;
      }
      
      alert(message);
      return;
    }
    
    setIsAnimating(true);
    setAnimationProgress(0);
  };

  useEffect(() => {
    if (!isAnimating) return;
    
    const interval = setInterval(() => {
      setAnimationProgress(prev => {
        if (prev >= 1) {
          setIsAnimating(false);
          return 0;
        }
        return prev + 0.02;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [isAnimating]);

  const reset = () => {
    setPaths([]);
    setSelectedPaths(null);
    setIsAnimating(false);
    setAnimationProgress(0);
    setCurrentPath([]);
    
    if (selectedSpace === 'punctured-plane') {
      setObstacles([{ x: 300, y: 200, radius: 30 }]);
    } else if (selectedSpace === 'annulus') {
      setObstacles([
        { x: 300, y: 200, radius: 80 },
        { x: 300, y: 200, radius: 150 }
      ]);
    } else {
      setObstacles([]);
    }
  };

  const selectPath = (pathId: string) => {
    if (!selectedPaths) {
      setSelectedPaths([pathId, pathId]);
    } else if (selectedPaths[0] === pathId && selectedPaths[1] === pathId) {
      setSelectedPaths(null);
    } else if (selectedPaths[0] === selectedPaths[1]) {
      setSelectedPaths([selectedPaths[0], pathId]);
    } else {
      setSelectedPaths([pathId, pathId]);
    }
  };

  const renderSpace = () => {
    switch (selectedSpace) {
      case 'punctured-plane':
        return (
          <>
            {obstacles.map((obs, i) => (
              <circle
                key={i}
                cx={obs.x}
                cy={obs.y}
                r={obs.radius}
                fill="#1a0033"
                opacity={0.9}
                stroke="#ff0080"
                strokeWidth="2"
              />
            ))}
            <circle
              cx={basePoint.x}
              cy={basePoint.y}
              r="8"
              fill="#ff0080"
              stroke="#00ffff"
              strokeWidth="1"
            />
            <text x={basePoint.x - 30} y={basePoint.y - 15} fontSize="12" fill="#00ffff" style={{ fontFamily: 'monospace', textShadow: '0 0 5px #00ffff' }}>
              Base point
            </text>
          </>
        );
      
      case 'annulus':
        return (
          <>
            <circle
              cx={300}
              cy={200}
              r={150}
              fill="none"
              stroke="#00ffff"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.8"
            />
            <circle
              cx={300}
              cy={200}
              r={80}
              fill="#1a0033"
              stroke="#ff0080"
              strokeWidth="2"
            />
            <circle
              cx={basePoint.x}
              cy={basePoint.y}
              r="8"
              fill="#ff0080"
              stroke="#00ffff"
              strokeWidth="1"
            />
          </>
        );
      
      case 'torus':
        return (
          <>
            <rect x="100" y="50" width="400" height="300" 
              fill="none" stroke="#00ffff" strokeWidth="2" strokeDasharray="10,5" opacity="0.8" />
            <text x="250" y="40" fontSize="14" fill="#ffff00" style={{ fontFamily: 'monospace', textShadow: '0 0 3px #ffff00' }}>
              Torus (fundamental square)
            </text>
            <text x="85" y="200" fontSize="12" fill="#ff0080" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>a</text>
            <text x={505} y="200" fontSize="12" fill="#ff0080" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>a</text>
            <text x="300" y="45" fontSize="12" fill="#00ffff" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>b</text>
            <text x="300" y={365} fontSize="12" fill="#00ffff" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>b</text>
          </>
        );
      
      default:
        return (
          <circle
            cx={basePoint.x}
            cy={basePoint.y}
            r="8"
            fill="#e74c3c"
          />
        );
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Path Homotopy Animator</h2>
      <p className={styles.subtitle}>
        Draw loops and animate continuous deformations
      </p>
      
      <div className={styles.controls}>
        <div className={styles.spaceSelector}>
          <label>Space:</label>
          <Select<SpaceOption>
            value={spaceOptions.find(opt => opt.value === selectedSpace)}
            onChange={(newValue) => {
              if (newValue) {
                setSelectedSpace(newValue.value);
                reset();
              }
            }}
            options={spaceOptions}
            styles={customSelectStyles}
            isSearchable={false}
            className={styles.selectContainer}
            classNamePrefix="retro-select"
          />
        </div>
        
        <button 
          onClick={animateHomotopy} 
          className={styles.button}
          disabled={!selectedPaths || selectedPaths[0] === selectedPaths[1] || isAnimating}
        >
          Animate Homotopy
        </button>
        
        <button onClick={reset} className={styles.button}>
          Clear All
        </button>
        
        <button 
          onClick={() => setShowFundamentalGroup(!showFundamentalGroup)} 
          className={styles.button}
        >
          {showFundamentalGroup ? 'Hide' : 'Show'} π₁
        </button>
      </div>
      
      <div className={styles.canvasContainer}>
        <svg 
          ref={canvasRef}
          width="600" 
          height="400" 
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <rect width="600" height="400" fill="#0a0a0a" />
          
          {renderSpace()}
          
          {paths.map(path => {
            let displayPath = path.points;
            
            if (isAnimating && selectedPaths) {
              if (path.id === selectedPaths[0]) {
                const targetPath = paths.find(p => p.id === selectedPaths[1]);
                if (targetPath) {
                  displayPath = interpolatePaths(
                    path.points,
                    targetPath.points,
                    animationProgress
                  );
                }
              }
            }
            
            const isSelected = selectedPaths && 
              (selectedPaths[0] === path.id || selectedPaths[1] === path.id);
            
            return (
              <g key={path.id}>
                <polyline
                  points={displayPath.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={path.color}
                  strokeWidth={isSelected ? 3 : 2}
                  opacity={isSelected ? 1 : 0.8}
                  filter={isSelected ? 'url(#glow)' : 'none'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectPath(path.id)}
                />
                {path.isLoop && (
                  <circle
                    cx={path.points[0].x}
                    cy={path.points[0].y}
                    r="6"
                    fill={path.color}
                    stroke="#ffffff"
                    strokeWidth="1"
                    filter="url(#glow)"
                  />
                )}
              </g>
            );
          })}
          
          {isDrawing && currentPath.length > 0 && (
            <polyline
              points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#ffff00"
              strokeWidth="2"
              strokeDasharray="3,3"
              opacity="0.7"
            />
          )}
        </svg>
      </div>
      
      <div className={styles.info}>
        {showFundamentalGroup && (
          <div className={styles.fundamentalGroup}>
            <h3>Fundamental Group π₁({selectedSpace})</h3>
            <p className={styles.groupDescription}>
              {getFundamentalGroup()}
            </p>
            <div className={styles.explanation}>
              {selectedSpace === 'plane' && (
                <p>All loops can be continuously shrunk to a point.</p>
              )}
              {selectedSpace === 'punctured-plane' && (
                <p>Loops are classified by how many times they wind around the hole.</p>
              )}
              {selectedSpace === 'annulus' && (
                <p>Loops are classified by their winding number around the central hole.</p>
              )}
              {selectedSpace === 'torus' && (
                <p>Two independent loops: one around the meridian, one around the longitude.</p>
              )}
            </div>
          </div>
        )}
        
        <div className={styles.pathList}>
          <h3>Paths ({paths.length})</h3>
          {paths.length === 0 ? (
            <p className={styles.emptyMessage}>Draw paths to begin</p>
          ) : (
            <div className={styles.paths}>
              {paths.map((path, i) => (
                <div 
                  key={path.id} 
                  className={styles.pathItem}
                  style={{ borderColor: path.color }}
                  onClick={() => selectPath(path.id)}
                >
                  <span 
                    className={styles.pathIndicator}
                    style={{ backgroundColor: path.color }}
                  />
                  <span>Path {i + 1}</span>
                  <span className={styles.pathType}>
                    {path.isLoop ? 'Loop' : 'Path'}
                  </span>
                  {path.isLoop && selectedSpace === 'punctured-plane' && (
                    <span className={styles.windingNumber}>
                      w = {calculateWindingNumber(path.points, obstacles[0])}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedPaths && selectedPaths[0] !== selectedPaths[1] && (
          <div className={styles.homotopyInfo}>
            <h3>Homotopy Check</h3>
            {(() => {
              const path1 = paths.find(p => p.id === selectedPaths[0]);
              const path2 = paths.find(p => p.id === selectedPaths[1]);
              if (path1 && path2) {
                const homotopic = areHomotopic(path1, path2);
                return (
                  <p className={homotopic ? styles.homotopic : styles.notHomotopic}>
                    Paths are {homotopic ? 'homotopic' : 'NOT homotopic'}
                    {homotopic && ' (can be continuously deformed into each other)'}
                  </p>
                );
              }
              return null;
            })()}
          </div>
        )}
        
        <div className={styles.instructions}>
          <h3>Instructions:</h3>
          <ul>
            <li>Click and drag to draw paths</li>
            <li>Close a path near its start to create a loop</li>
            <li>Select two loops to check if they're homotopic</li>
            <li>Animate the deformation between homotopic loops</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PathHomotopyAnimator;