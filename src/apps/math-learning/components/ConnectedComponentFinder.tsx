import React, { useState, useEffect, useCallback } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './ConnectedComponentFinder.module.css';

interface Node {
  id: string;
  x: number;
  y: number;
  component: number;
  visited: boolean;
}

interface Edge {
  from: string;
  to: string;
}

interface AlgorithmStep {
  type: 'visit' | 'explore' | 'backtrack' | 'complete';
  node: string;
  component: number;
  message: string;
}

type AlgorithmType = 'dfs' | 'bfs' | 'union-find';

type AlgorithmOption = {
  value: AlgorithmType;
  label: string;
};

const algorithmOptions: AlgorithmOption[] = [
  { value: 'dfs', label: 'Depth-First Search (DFS)' },
  { value: 'bfs', label: 'Breadth-First Search (BFS)' },
  { value: 'union-find', label: 'Union-Find' }
];

const customSelectStyles: StylesConfig<AlgorithmOption, false> = {
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


const ConnectedComponentFinder: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'A', x: 100, y: 100, component: -1, visited: false },
    { id: 'B', x: 200, y: 50, component: -1, visited: false },
    { id: 'C', x: 300, y: 100, component: -1, visited: false },
    { id: 'D', x: 150, y: 200, component: -1, visited: false },
    { id: 'E', x: 250, y: 200, component: -1, visited: false },
    { id: 'F', x: 450, y: 100, component: -1, visited: false },
    { id: 'G', x: 550, y: 50, component: -1, visited: false },
    { id: 'H', x: 500, y: 200, component: -1, visited: false },
    { id: 'I', x: 100, y: 350, component: -1, visited: false },
    { id: 'J', x: 200, y: 350, component: -1, visited: false },
    { id: 'K', x: 350, y: 350, component: -1, visited: false },
    { id: 'L', x: 450, y: 350, component: -1, visited: false }
  ]);
  
  const [edges, setEdges] = useState<Edge[]>([
    { from: 'A', to: 'B' },
    { from: 'B', to: 'C' },
    { from: 'A', to: 'D' },
    { from: 'B', to: 'E' },
    { from: 'C', to: 'E' },
    { from: 'D', to: 'E' },
    { from: 'F', to: 'G' },
    { from: 'F', to: 'H' },
    { from: 'G', to: 'H' },
    { from: 'I', to: 'J' },
    { from: 'K', to: 'L' }
  ]);
  
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('dfs');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<AlgorithmStep[]>([]);
  const [speed, setSpeed] = useState(500);
  const [stack, setStack] = useState<string[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [unionFind, setUnionFind] = useState<Map<string, string>>(new Map());
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [exploringEdge, setExploringEdge] = useState<{ from: string; to: string } | null>(null);

  const componentColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
  ];

  const resetVisualization = useCallback(() => {
    setNodes(prev => prev.map(node => ({ 
      ...node, 
      component: -1, 
      visited: false 
    })));
    setCurrentStep(0);
    setSteps([]);
    setStack([]);
    setQueue([]);
    setUnionFind(new Map());
    setCurrentNode(null);
    setExploringEdge(null);
  }, []);

  const generateDFSSteps = useCallback(() => {
    const newSteps: AlgorithmStep[] = [];
    const visited = new Set<string>();
    const components = new Map<string, number>();
    let componentId = 0;
    
    const dfs = (nodeId: string, compId: number) => {
      visited.add(nodeId);
      components.set(nodeId, compId);
      newSteps.push({
        type: 'visit',
        node: nodeId,
        component: compId,
        message: `Visiting node ${nodeId}, assigning to component ${compId}`
      });
      
      const neighbors = edges
        .filter(e => (e.from === nodeId || e.to === nodeId))
        .map(e => e.from === nodeId ? e.to : e.from)
        .filter(n => !visited.has(n));
      
      neighbors.forEach(neighbor => {
        newSteps.push({
          type: 'explore',
          node: nodeId,
          component: compId,
          message: `Exploring edge from ${nodeId} to ${neighbor}`
        });
        dfs(neighbor, compId);
        newSteps.push({
          type: 'backtrack',
          node: nodeId,
          component: compId,
          message: `Backtracking to ${nodeId}`
        });
      });
    };
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        newSteps.push({
          type: 'complete',
          node: node.id,
          component: componentId,
          message: `Starting new component ${componentId} from ${node.id}`
        });
        dfs(node.id, componentId);
        componentId++;
      }
    });
    
    newSteps.push({
      type: 'complete',
      node: '',
      component: -1,
      message: `Algorithm complete! Found ${componentId} components`
    });
    
    return newSteps;
  }, [nodes, edges]);

  const generateBFSSteps = useCallback(() => {
    const newSteps: AlgorithmStep[]  = [];
    const visited = new Set<string>();
    const components = new Map<string, number>();
    let componentId = 0;
    
    const bfs = (startNode: string, compId: number) => {
      const queue = [startNode];
      visited.add(startNode);
      
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        components.set(nodeId, compId);
        
        newSteps.push({
          type: 'visit',
          node: nodeId,
          component: compId,
          message: `Processing node ${nodeId} from queue, component ${compId}`
        });
        
        const neighbors = edges
          .filter(e => (e.from === nodeId || e.to === nodeId))
          .map(e => e.from === nodeId ? e.to : e.from)
          .filter(n => !visited.has(n));
        
        neighbors.forEach(neighbor => {
          visited.add(neighbor);
          queue.push(neighbor);
          newSteps.push({
            type: 'explore',
            node: nodeId,
            component: compId,
            message: `Adding ${neighbor} to queue from ${nodeId}`
          });
        });
      }
    };
    
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        newSteps.push({
          type: 'complete',
          node: node.id,
          component: componentId,
          message: `Starting new component ${componentId} with BFS from ${node.id}`
        });
        bfs(node.id, componentId);
        componentId++;
      }
    });
    
    newSteps.push({
      type: 'complete',
      node: '',
      component: -1,
      message: `Algorithm complete! Found ${componentId} components`
    });
    
    return newSteps;
  }, [nodes, edges]);

  const generateUnionFindSteps = useCallback(() => {
    const newSteps: AlgorithmStep[] = [];
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();
    
    nodes.forEach(node => {
      parent.set(node.id, node.id);
      rank.set(node.id, 0);
      newSteps.push({
        type: 'visit',
        node: node.id,
        component: -1,
        message: `Initialize ${node.id} as its own parent`
      });
    });
    
    const find = (x: string): string => {
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };
    
    const union = (x: string, y: string) => {
      const px = find(x);
      const py = find(y);
      
      if (px === py) return;
      
      if (rank.get(px)! < rank.get(py)!) {
        parent.set(px, py);
      } else if (rank.get(px)! > rank.get(py)!) {
        parent.set(py, px);
      } else {
        parent.set(py, px);
        rank.set(px, rank.get(px)! + 1);
      }
    };
    
    edges.forEach(edge => {
      newSteps.push({
        type: 'explore',
        node: edge.from,
        component: -1,
        message: `Processing edge ${edge.from} - ${edge.to}`
      });
      
      const root1 = find(edge.from);
      const root2 = find(edge.to);
      
      if (root1 !== root2) {
        union(edge.from, edge.to);
        newSteps.push({
          type: 'visit',
          node: edge.from,
          component: -1,
          message: `Union ${edge.from} and ${edge.to} into same component`
        });
      }
    });
    
    const components = new Map<string, number>();
    const roots = new Map<string, number>();
    let componentId = 0;
    
    nodes.forEach(node => {
      const root = find(node.id);
      if (!roots.has(root)) {
        roots.set(root, componentId++);
      }
      components.set(node.id, roots.get(root)!);
    });
    
    nodes.forEach(node => {
      newSteps.push({
        type: 'complete',
        node: node.id,
        component: components.get(node.id)!,
        message: `Node ${node.id} belongs to component ${components.get(node.id)}`
      });
    });
    
    newSteps.push({
      type: 'complete',
      node: '',
      component: -1,
      message: `Algorithm complete! Found ${componentId} components`
    });
    
    return newSteps;
  }, [nodes, edges]);

  const runAlgorithm = useCallback(() => {
    resetVisualization();
    let algorithmSteps: AlgorithmStep[] = [];
    
    switch (algorithm) {
      case 'dfs':
        algorithmSteps = generateDFSSteps();
        break;
      case 'bfs':
        algorithmSteps = generateBFSSteps();
        break;
      case 'union-find':
        algorithmSteps = generateUnionFindSteps();
        break;
    }
    
    setSteps(algorithmSteps);
    setIsRunning(true);
  }, [algorithm, generateDFSSteps, generateBFSSteps, generateUnionFindSteps, resetVisualization]);

  useEffect(() => {
    if (!isRunning || currentStep >= steps.length) {
      if (currentStep >= steps.length) {
        setIsRunning(false);
      }
      return;
    }
    
    const timer = setTimeout(() => {
      const step = steps[currentStep];
      
      if (step.type === 'visit' || step.type === 'complete') {
        setNodes(prev => prev.map(node => 
          node.id === step.node ? 
            { ...node, component: step.component, visited: true } : 
            node
        ));
        setCurrentNode(step.node);
      } else if (step.type === 'explore') {
        const edge = edges.find(e => 
          (e.from === step.node && !nodes.find(n => n.id === e.to)?.visited) ||
          (e.to === step.node && !nodes.find(n => n.id === e.from)?.visited)
        );
        if (edge) {
          setExploringEdge(edge);
        }
      }
      
      if (algorithm === 'dfs' && step.type === 'visit') {
        setStack(prev => [...prev, step.node]);
      } else if (algorithm === 'dfs' && step.type === 'backtrack') {
        setStack(prev => prev.slice(0, -1));
      }
      
      if (algorithm === 'bfs' && step.type === 'explore') {
        const target = edges.find(e => 
          (e.from === step.node || e.to === step.node)
        );
        if (target) {
          const neighbor = target.from === step.node ? target.to : target.from;
          setQueue(prev => [...prev, neighbor]);
        }
      } else if (algorithm === 'bfs' && step.type === 'visit') {
        setQueue(prev => prev.slice(1));
      }
      
      setCurrentStep(prev => prev + 1);
    }, speed);
    
    return () => clearTimeout(timer);
  }, [isRunning, currentStep, steps, speed, algorithm, nodes, edges]);

  const addRandomEdge = () => {
    const unconnectedPairs: [string, string][] = [];
    nodes.forEach((n1, i) => {
      nodes.slice(i + 1).forEach(n2 => {
        if (!edges.some(e => 
          (e.from === n1.id && e.to === n2.id) || 
          (e.from === n2.id && e.to === n1.id)
        )) {
          unconnectedPairs.push([n1.id, n2.id]);
        }
      });
    });
    
    if (unconnectedPairs.length > 0) {
      const [from, to] = unconnectedPairs[Math.floor(Math.random() * unconnectedPairs.length)];
      setEdges(prev => [...prev, { from, to }]);
      resetVisualization();
    }
  };

  const removeRandomEdge = () => {
    if (edges.length > 0) {
      const indexToRemove = Math.floor(Math.random() * edges.length);
      setEdges(prev => prev.filter((_, i) => i !== indexToRemove));
      resetVisualization();
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Connected Component Finder</h2>
      <p className={styles.subtitle}>
        Visualize algorithms that find connected components in graphs
      </p>
      
      <div className={styles.controls}>
        <div className={styles.algorithmSelector}>
          <label>Algorithm:</label>
          <Select<AlgorithmOption>
            value={algorithmOptions.find(opt => opt.value === algorithm)}
            onChange={(newValue) => {
              if (newValue) {
                setAlgorithm(newValue.value);
                resetVisualization();
              }
            }}
            options={algorithmOptions}
            styles={customSelectStyles}
            isSearchable={false}
            isDisabled={isRunning}
            className={styles.selectContainer}
            classNamePrefix="retro-select"
          />
        </div>
        
        <div className={styles.speedControl}>
          <label>Speed:</label>
          <input
            type="range"
            min="100"
            max="1000"
            value={1100 - speed}
            onChange={(e) => setSpeed(1100 - Number(e.target.value))}
            disabled={isRunning}
          />
        </div>
        
        <button 
          onClick={runAlgorithm} 
          className={styles.button}
          disabled={isRunning}
        >
          Run Algorithm
        </button>
        
        <button 
          onClick={() => {
            setIsRunning(false);
            resetVisualization();
          }} 
          className={styles.button}
        >
          Reset
        </button>
        
        <button 
          onClick={addRandomEdge} 
          className={styles.button}
          disabled={isRunning}
        >
          Add Edge
        </button>
        
        <button 
          onClick={removeRandomEdge} 
          className={styles.button}
          disabled={isRunning || edges.length === 0}
        >
          Remove Edge
        </button>
      </div>
      
      <div className={styles.visualizationContainer}>
        <div className={styles.graphContainer}>
          <svg width="650" height="450" className={styles.graph}>
            {edges.map((edge, i) => {
              const from = nodes.find(n => n.id === edge.from);
              const to = nodes.find(n => n.id === edge.to);
              if (!from || !to) return null;
              
              const isExploring = exploringEdge && 
                ((exploringEdge.from === edge.from && exploringEdge.to === edge.to) ||
                 (exploringEdge.from === edge.to && exploringEdge.to === edge.from));
              
              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke={isExploring ? '#f39c12' : '#95a5a6'}
                  strokeWidth={isExploring ? 3 : 2}
                  opacity={isExploring ? 1 : 0.6}
                />
              );
            })}
            
            {nodes.map(node => (
              <g key={node.id}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="20"
                  fill={
                    node.component >= 0 
                      ? componentColors[node.component % componentColors.length]
                      : '#ecf0f1'
                  }
                  stroke={currentNode === node.id ? '#2c3e50' : '#95a5a6'}
                  strokeWidth={currentNode === node.id ? 3 : 2}
                />
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fill={node.visited ? 'white' : '#2c3e50'}
                  fontSize="14"
                  fontWeight="bold"
                >
                  {node.id}
                </text>
              </g>
            ))}
          </svg>
        </div>
        
        <div className={styles.dataStructures}>
          {algorithm === 'dfs' && (
            <div className={styles.structure}>
              <h3>DFS Stack</h3>
              <div className={styles.stackContainer}>
                {stack.length === 0 ? (
                  <div className={styles.emptyStructure}>Empty</div>
                ) : (
                  stack.map((node, i) => (
                    <div key={i} className={styles.stackItem}>
                      {node}
                    </div>
                  )).reverse()
                )}
              </div>
            </div>
          )}
          
          {algorithm === 'bfs' && (
            <div className={styles.structure}>
              <h3>BFS Queue</h3>
              <div className={styles.queueContainer}>
                {queue.length === 0 ? (
                  <div className={styles.emptyStructure}>Empty</div>
                ) : (
                  queue.map((node, i) => (
                    <div key={i} className={styles.queueItem}>
                      {node}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {algorithm === 'union-find' && (
            <div className={styles.structure}>
              <h3>Parent Pointers</h3>
              <div className={styles.unionFindContainer}>
                {nodes.map(node => (
                  <div key={node.id} className={styles.parentItem}>
                    {node.id} → {unionFind.get(node.id) || node.id}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className={styles.messageBox}>
            <h3>Current Step</h3>
            <p>{steps[currentStep - 1]?.message || 'Ready to start'}</p>
          </div>
          
          <div className={styles.statistics}>
            <h3>Statistics</h3>
            <div className={styles.statItem}>
              <span>Nodes visited:</span>
              <span>{nodes.filter(n => n.visited).length} / {nodes.length}</span>
            </div>
            <div className={styles.statItem}>
              <span>Components found:</span>
              <span>{Math.max(0, ...nodes.map(n => n.component)) + 1}</span>
            </div>
            <div className={styles.statItem}>
              <span>Step:</span>
              <span>{currentStep} / {steps.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectedComponentFinder;