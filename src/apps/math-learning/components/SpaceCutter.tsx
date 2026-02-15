import React, { useState, useCallback, useMemo } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './SpaceCutter.module.css';

interface Point {
  id: string;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
}

interface Cut {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type SpaceType = 'line' | 'circle' | 'torus' | 'graph';

type SpaceOption = {
  value: SpaceType;
  label: string;
};

const spaceOptions: SpaceOption[] = [
  { value: 'graph', label: 'Graph' },
  { value: 'line', label: 'Line' },
  { value: 'circle', label: 'Circle' },
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


const lineSegmentsIntersect = (
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean => {
  const det = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
  if (Math.abs(det) < 0.0001) return false;

  const t = ((x3 - x1) * (y4 - y3) - (x4 - x3) * (y3 - y1)) / det;
  const u = -((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) / det;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

const SpaceCutter: React.FC = () => {
  const [selectedSpace, setSelectedSpace] = useState<SpaceType>('graph');
  const [points, setPoints] = useState<Point[]>([
    { id: 'A', x: 100, y: 200 },
    { id: 'B', x: 200, y: 100 },
    { id: 'C', x: 300, y: 200 },
    { id: 'D', x: 400, y: 100 },
    { id: 'E', x: 500, y: 200 },
    { id: 'F', x: 200, y: 300 },
    { id: 'G', x: 400, y: 300 }
  ]);
  const [edges, setEdges] = useState<Edge[]>([
    { from: 'A', to: 'B' },
    { from: 'B', to: 'C' },
    { from: 'C', to: 'D' },
    { from: 'D', to: 'E' },
    { from: 'B', to: 'F' },
    { from: 'C', to: 'G' },
    { from: 'F', to: 'G' }
  ]);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [isDrawingCut, setIsDrawingCut] = useState(false);
  const [currentCut, setCurrentCut] = useState<Partial<Cut>>({});
  const [removedPoints, setRemovedPoints] = useState<Set<string>>(new Set());
  const [highlightedComponent, setHighlightedComponent] = useState<Set<string>>(new Set());

  const isCutByAnyLine = useCallback((edge: Edge): boolean => {
    const p1 = points.find(p => p.id === edge.from);
    const p2 = points.find(p => p.id === edge.to);
    if (!p1 || !p2) return false;
    
    return cuts.some(cut => lineSegmentsIntersect(
      p1.x, p1.y, p2.x, p2.y,
      cut.x1, cut.y1, cut.x2, cut.y2
    ));
  }, [points, cuts]);

  const findConnectedComponents = useCallback(() => {
    const components: Set<string>[] = [];
    const visited = new Set<string>();
    
    const activePoints = points.filter(p => !removedPoints.has(p.id));
    const activeEdges = edges.filter(e => 
      !removedPoints.has(e.from) && !removedPoints.has(e.to) &&
      !isCutByAnyLine(e)
    );
    
    const dfs = (pointId: string, component: Set<string>) => {
      if (visited.has(pointId)) return;
      visited.add(pointId);
      component.add(pointId);
      
      activeEdges.forEach(edge => {
        if (edge.from === pointId && !visited.has(edge.to)) {
          dfs(edge.to, component);
        }
        if (edge.to === pointId && !visited.has(edge.from)) {
          dfs(edge.from, component);
        }
      });
    };
    
    activePoints.forEach(point => {
      if (!visited.has(point.id)) {
        const component = new Set<string>();
        dfs(point.id, component);
        components.push(component);
      }
    });
    
    return components;
  }, [points, edges, removedPoints, isCutByAnyLine]);

  const handleMouseDown = (e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawingCut(true);
    setCurrentCut({ x1: x, y1: y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (!isDrawingCut || !currentCut.x1) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentCut(prev => ({ ...prev, x2: x, y2: y }));
  };

  const handleMouseUp = () => {
    if (isDrawingCut && currentCut.x1 && currentCut.x2) {
      setCuts(prev => [...prev, currentCut as Cut]);
    }
    setIsDrawingCut(false);
    setCurrentCut({});
  };

  const handlePointClick = (pointId: string) => {
    setRemovedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  };

  const reset = () => {
    setCuts([]);
    setRemovedPoints(new Set());
    setHighlightedComponent(new Set());
    
    if (selectedSpace === 'graph') {
      setPoints([
        { id: 'A', x: 100, y: 200 },
        { id: 'B', x: 200, y: 100 },
        { id: 'C', x: 300, y: 200 },
        { id: 'D', x: 400, y: 100 },
        { id: 'E', x: 500, y: 200 },
        { id: 'F', x: 200, y: 300 },
        { id: 'G', x: 400, y: 300 }
      ]);
      setEdges([
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'D' },
        { from: 'D', to: 'E' },
        { from: 'B', to: 'F' },
        { from: 'C', to: 'G' },
        { from: 'F', to: 'G' }
      ]);
    }
  };

  const components = useMemo(() => findConnectedComponents(), [findConnectedComponents]);
  const isConnected = components.length <= 1;
  const isPathConnected = selectedSpace !== 'graph' ? isConnected : 
    components.length === 1 && components[0].size === points.filter(p => !removedPoints.has(p.id)).length;

  const renderSpace = () => {
    switch (selectedSpace) {
      case 'line':
        return (
          <>
            <line 
              x1="50" y1="200" x2="550" y2="200" 
              stroke="#3498db" 
              strokeWidth="4"
            />
            {Array.from({ length: 11 }, (_, i) => (
              <circle
                key={i}
                cx={50 + i * 50}
                cy={200}
                r="6"
                fill={removedPoints.has(`L${i}`) ? '#e74c3c' : '#2c3e50'}
                style={{ cursor: 'pointer' }}
                onClick={() => handlePointClick(`L${i}`)}
              />
            ))}
          </>
        );
      
      case 'circle':
        return (
          <>
            <circle 
              cx="300" cy="200" r="150" 
              fill="none" 
              stroke="#3498db" 
              strokeWidth="4"
            />
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i * Math.PI * 2) / 12;
              const x = 300 + 150 * Math.cos(angle);
              const y = 200 + 150 * Math.sin(angle);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="8"
                  fill={removedPoints.has(`C${i}`) ? '#e74c3c' : '#2c3e50'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePointClick(`C${i}`)}
                />
              );
            })}
          </>
        );
      
      case 'torus':
        return (
          <>
            <ellipse 
              cx="300" cy="200" rx="180" ry="100" 
              fill="none" 
              stroke="#3498db" 
              strokeWidth="3"
            />
            <ellipse 
              cx="300" cy="200" rx="120" ry="60" 
              fill="none" 
              stroke="#3498db" 
              strokeWidth="3"
              strokeDasharray="5,5"
            />
            <text x="300" y="50" textAnchor="middle" className={styles.label}>
              Torus (2D projection)
            </text>
          </>
        );
      
      case 'graph':
        return (
          <>
            {edges.map((edge, i) => {
              const p1 = points.find(p => p.id === edge.from);
              const p2 = points.find(p => p.id === edge.to);
              if (!p1 || !p2 || removedPoints.has(edge.from) || removedPoints.has(edge.to)) return null;
              
              const isCut = isCutByAnyLine(edge);
              return (
                <line
                  key={i}
                  x1={p1.x} y1={p1.y}
                  x2={p2.x} y2={p2.y}
                  stroke={isCut ? '#e74c3c' : '#3498db'}
                  strokeWidth="2"
                  strokeDasharray={isCut ? '5,5' : '0'}
                />
              );
            })}
            {points.map(point => (
              <g key={point.id}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill={removedPoints.has(point.id) ? '#e74c3c' : 
                        highlightedComponent.has(point.id) ? '#27ae60' : '#2c3e50'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePointClick(point.id)}
                />
                <text
                  x={point.x}
                  y={point.y + 5}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  style={{ pointerEvents: 'none' }}
                >
                  {point.id}
                </text>
              </g>
            ))}
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Space Cutter</h2>
      <p className={styles.subtitle}>
        Remove points or draw cuts to disconnect spaces
      </p>
      
      <div className={styles.controls}>
        <div className={styles.spaceSelector}>
          <label>Select Space:</label>
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
        
        <button onClick={reset} className={styles.button}>
          Reset Space
        </button>
        
        <button 
          onClick={() => setCuts([])} 
          className={styles.button}
        >
          Clear Cuts
        </button>
      </div>
      
      <div className={styles.canvasContainer}>
        <svg 
          width="600" 
          height="400" 
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {renderSpace()}
          
          {cuts.map((cut, i) => (
            <line
              key={i}
              x1={cut.x1} y1={cut.y1}
              x2={cut.x2} y2={cut.y2}
              stroke="#e74c3c"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          ))}
          
          {isDrawingCut && currentCut.x1 && currentCut.x2 && (
            <line
              x1={currentCut.x1} y1={currentCut.y1}
              x2={currentCut.x2!} y2={currentCut.y2!}
              stroke="#f39c12"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </svg>
      </div>
      
      <div className={styles.info}>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <span className={styles.label}>Connected Components:</span>
            <span className={styles.value}>{components.length}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.label}>Is Connected:</span>
            <span className={isConnected ? styles.yes : styles.no}>
              {isConnected ? 'Yes' : 'No'}
            </span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.label}>Is Path-Connected:</span>
            <span className={isPathConnected ? styles.yes : styles.no}>
              {isPathConnected ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        
        {components.length > 1 && (
          <div className={styles.components}>
            <h3>Components:</h3>
            <div className={styles.componentList}>
              {components.map((comp, i) => (
                <button
                  key={i}
                  className={styles.componentButton}
                  onMouseEnter={() => setHighlightedComponent(comp)}
                  onMouseLeave={() => setHighlightedComponent(new Set())}
                >
                  Component {i + 1}: {Array.from(comp).join(', ')}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className={styles.instructions}>
          <h3>Instructions:</h3>
          <ul>
            <li>Click on points to remove/restore them</li>
            <li>Click and drag to draw cuts that disconnect edges</li>
            <li>Observe how different cuts affect connectivity</li>
            <li>Try to find minimal cuts that disconnect the space</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SpaceCutter;