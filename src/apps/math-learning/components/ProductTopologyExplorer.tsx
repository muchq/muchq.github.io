import React, { useState, useRef, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { retroSelectStyles } from '@/styles/ReactSelectStyles';
import styles from './ProductTopologyExplorer.module.css';

type TopologyType = 'discrete' | 'trivial' | 'standard' | 'cofinite' | 'sierpinski';
type ProductType = 'product' | 'box';
type SpaceType = 'discrete' | 'continuous';
type ContinuousSpaceType = 'disc' | 'interval' | 'circle';

interface OpenSet {
  x: number[];
  y: number[];
  label: string;
}

interface ContinuousOpenSet {
  type: 'ball' | 'rectangle' | 'strip' | 'custom';
  center?: { x: number; y: number };
  radius?: number;
  bounds?: { x1: number; y1: number; x2: number; y2: number };
  label: string;
}

type SelectOption<T> = {
  value: T;
  label: string;
};

const ProductTopologyExplorer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const continuousCanvasRef = useRef<HTMLCanvasElement>(null);
  const [spaceType, setSpaceType] = useState<SpaceType>('discrete');
  const [xTopology, setXTopology] = useState<TopologyType>('standard');
  const [yTopology, setYTopology] = useState<TopologyType>('standard');
  const [productType, setProductType] = useState<ProductType>('product');
  const [xContinuousSpace, setXContinuousSpace] = useState<ContinuousSpaceType>('disc');
  const [yContinuousSpace, setYContinuousSpace] = useState<ContinuousSpaceType>('interval');
  const [showBasis, setShowBasis] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const [highlightedSet, setHighlightedSet] = useState<OpenSet | null>(null);
  // const [continuousOpenSets] = useState<ContinuousOpenSet[]>([]);
  const [_animationTime, setAnimationTime] = useState(0);
  
  // 3D visualization state
  const [camera, setCamera] = useState({
    rotationX: -0.5,
    rotationY: 0.5,
    zoom: 1,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // Sierpinski space requires exactly 2 points
  const xSize = xTopology === 'sierpinski' ? 2 : 4;
  const ySize = yTopology === 'sierpinski' ? 2 : 4;

  const generateTopology = (type: TopologyType, size: number): number[][] => {
    const topology: number[][] = [];
    topology.push([]); // empty set
    topology.push(Array.from({ length: size }, (_, i) => i + 1)); // full set
    
    switch (type) {
      case 'discrete':
        for (let i = 0; i < Math.pow(2, size); i++) {
          const subset: number[] = [];
          for (let j = 0; j < size; j++) {
            if (i & (1 << j)) {
              subset.push(j + 1);
            }
          }
          topology.push(subset);
        }
        break;
      case 'trivial':
        break;
      case 'standard':
        for (let i = 1; i <= size; i++) {
          for (let j = i; j <= size; j++) {
            const interval: number[] = [];
            for (let k = i; k <= j; k++) {
              interval.push(k);
            }
            topology.push(interval);
          }
        }
        break;
      case 'cofinite':
        for (let i = 0; i < Math.pow(2, size); i++) {
          const subset: number[] = [];
          for (let j = 0; j < size; j++) {
            if (i & (1 << j)) {
              subset.push(j + 1);
            }
          }
          if (subset.length >= size - 1) {
            topology.push(subset);
          }
        }
        break;
      case 'sierpinski':
        // Sierpinski space: exactly two points {1,2} with topology {{}, {1}, {1,2}}
        // Only valid for size = 2
        if (size === 2) {
          topology.push([1]); // The singleton {1} is open, but {2} is not
        } else {
          // Sierpinski topology is only defined for 2 points
          // Fall back to trivial topology for other sizes
          // (Alternative: we could throw an error or use discrete topology)
        }
        break;
    }
    
    return topology;
  };

  const xOpenSets = generateTopology(xTopology, xSize);
  const yOpenSets = generateTopology(yTopology, ySize);

  const generateProductBasis = (): OpenSet[] => {
    const basis: OpenSet[] = [];
    
    for (const xSet of xOpenSets) {
      for (const ySet of yOpenSets) {
        if (xSet.length > 0 && ySet.length > 0) {
          basis.push({
            x: xSet,
            y: ySet,
            label: `{${xSet.join(',')}} × {${ySet.join(',')}}`
          });
        }
      }
    }
    
    return basis;
  };

  // @ts-expect-error - Function kept for potential future use
  const _isInOpenSet = (point: { x: number; y: number }, openSet: OpenSet): boolean => {
    return openSet.x.includes(point.x) && openSet.y.includes(point.y);
  };

  // Removed unused function findContainingOpenSets

  // @ts-expect-error - Unused function kept for potential future use
  const _drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const cellWidth = width / xSize;
    const cellHeight = height / ySize;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= xSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();
    }
    
    for (let j = 0; j <= ySize; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cellHeight);
      ctx.lineTo(width, j * cellHeight);
      ctx.stroke();
    }
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px monospace';
    for (let i = 1; i <= xSize; i++) {
      ctx.fillText(i.toString(), (i - 0.5) * cellWidth - 5, height + 20);
    }
    for (let j = 1; j <= ySize; j++) {
      ctx.fillText(j.toString(), -20, height - (j - 0.5) * cellHeight + 5);
    }
  };

  // @ts-expect-error - Unused function kept for potential future use
  const _drawOpenSet = (
    ctx: CanvasRenderingContext2D,
    openSet: OpenSet,
    width: number,
    height: number,
    color: string,
    alpha: number = 0.3
  ) => {
    const cellWidth = width / xSize;
    const cellHeight = height / ySize;
    
    ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    
    for (const x of openSet.x) {
      for (const y of openSet.y) {
        ctx.fillRect(
          (x - 1) * cellWidth,
          height - y * cellHeight,
          cellWidth,
          cellHeight
        );
      }
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const minX = Math.min(...openSet.x);
    const maxX = Math.max(...openSet.x);
    const minY = Math.min(...openSet.y);
    const maxY = Math.max(...openSet.y);
    
    ctx.strokeRect(
      (minX - 1) * cellWidth,
      height - maxY * cellHeight,
      (maxX - minX + 1) * cellWidth,
      (maxY - minY + 1) * cellHeight
    );
  };

  useEffect(() => {
    if (spaceType !== 'discrete') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Use 3D rendering for discrete spaces
    drawDiscreteSpace3D(ctx, width, height);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xTopology, yTopology, productType, showBasis, showGrid, selectedPoint, highlightedSet, camera, spaceType]);

  // Check if a point is in a discrete open set
  const isPointInOpenSet = (point: { x: number; y: number }, set: OpenSet): boolean => {
    return set.x.includes(point.x) && set.y.includes(point.y);
  };

  // Draw discrete space in 3D
  const drawDiscreteSpace3D = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw title
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 16px monospace';
    const xLabel = xTopology === 'trivial' ? 'Trivial' : 
                   xTopology === 'discrete' ? 'Discrete' : 
                   xTopology === 'sierpinski' ? 'Sierpinski' :
                   xTopology === 'cofinite' ? 'Cofinite' : 'Standard';
    const yLabel = yTopology === 'trivial' ? 'Trivial' : 
                   yTopology === 'discrete' ? 'Discrete' : 
                   yTopology === 'sierpinski' ? 'Sierpinski' :
                   yTopology === 'cofinite' ? 'Cofinite' : 'Standard';
    ctx.fillText(`Product Space: X(${xLabel}) × Y(${yLabel})`, width/2 - 120, 30);
    
    // Instructions
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('Drag to rotate • Scroll to zoom • Click to select point', width/2 - 140, height - 20);
    
    // Create 3D grid points
    const points: Array<{x: number, y: number, z: number}> = [];
    const lines: Array<[number, number]> = [];
    
    // Generate grid points lifted to z=0 plane
    for (let i = 0; i < xSize; i++) {
      for (let j = 0; j < ySize; j++) {
        const x = (i - (xSize - 1) / 2) / (xSize - 1) * 2;
        const y = (j - (ySize - 1) / 2) / (ySize - 1) * 2;
        points.push({ x, y, z: 0 });
      }
    }
    
    // Create grid lines
    for (let i = 0; i < xSize; i++) {
      for (let j = 0; j < ySize; j++) {
        const idx = i * ySize + j;
        if (i < xSize - 1) lines.push([idx, idx + ySize]);
        if (j < ySize - 1) lines.push([idx, idx + 1]);
      }
    }
    
    // Project points and lines
    const projectedPoints = points.map((p, idx) => ({
      original: p,
      projected: project3D(p.x, p.y, p.z, width, height),
      gridX: Math.floor(idx / ySize) + 1,
      gridY: (idx % ySize) + 1
    }));
    
    // Draw grid lines
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    
    lines.forEach(([i1, i2]) => {
      const p1 = project3D(points[i1].x, points[i1].y, points[i1].z, width, height);
      const p2 = project3D(points[i2].x, points[i2].y, points[i2].z, width, height);
      
      if (p1.z > -1 && p2.z > -1) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });
    
    // Draw basis elements if enabled
    if (showBasis) {
      const basis = generateProductBasis();
      const colors = ['#667eea', '#764ba2', '#ed7551', '#4caf50', '#f6ad55', '#fc8181', '#90cdf4', '#9ae6b4'];
      
      // Group sets by size for better visualization
      const sortedBasis = [...basis].sort((a, b) => {
        const sizeA = a.x.length * a.y.length;
        const sizeB = b.x.length * b.y.length;
        return sizeB - sizeA; // Larger sets first so smaller ones render on top
      });
      
      // Limit display based on topology complexity
      const maxSets = productType === 'box' ? 12 : 8;
      
      sortedBasis.slice(0, maxSets).forEach((set, index) => {
        const color = colors[index % colors.length];
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        
        const isHighlighted = highlightedSet?.label === set.label;
        ctx.globalAlpha = isHighlighted ? 0.6 : 0.2;
        
        // Calculate elevation based on set size (smaller sets higher)
        const setSize = set.x.length * set.y.length;
        const maxSize = xSize * ySize;
        const elevation = 0.3 * (1 - setSize / maxSize) + 0.1;
        
        // Draw the open set as elevated colored regions
        const setPoints: Array<{x: number, y: number, projected: {x: number, y: number, z: number, scale: number}}> = [];
        projectedPoints.forEach(p => {
          if (isPointInOpenSet({ x: p.gridX, y: p.gridY }, set)) {
            const elevated = project3D(p.original.x, p.original.y, elevation, width, height);
            setPoints.push({x: elevated.x, y: elevated.y, projected: elevated});
          }
        });
        
        // Draw connections between points in the same set
        if (setPoints.length > 0 && isHighlighted) {
          ctx.lineWidth = 2;
          setPoints.forEach((p1, i) => {
            setPoints.slice(i + 1).forEach(p2 => {
              const dx = Math.abs(p1.x - p2.x);
              const dy = Math.abs(p1.y - p2.y);
              if (dx < 100 && dy < 100) { // Only connect nearby points
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
              }
            });
          });
        }
        
        // Draw the points
        setPoints.forEach(p => {
          const size = Math.max(2, 15 * p.projected.scale);
          ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
        });
      });
    }
    
    // Draw points
    ctx.globalAlpha = 1;
    projectedPoints.sort((a, b) => a.projected.z - b.projected.z);
    
    projectedPoints.forEach(p => {
      const isSelected = selectedPoint && 
        selectedPoint.x === p.gridX && 
        selectedPoint.y === p.gridY;
      
      const size = Math.max(2, 8 * p.projected.scale);
      ctx.fillStyle = isSelected ? '#ff6b6b' : '#00ff88';
      ctx.beginPath();
      ctx.arc(p.projected.x, p.projected.y, size, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw point label for selected point
      if (isSelected) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(10, 12 * p.projected.scale)}px monospace`;
        ctx.fillText(`(${p.gridX},${p.gridY})`, p.projected.x + 10, p.projected.y - 10);
      }
    });
  };

  // 3D transformation functions
  const project3D = useCallback((x: number, y: number, z: number, width: number, height: number) => {
    // Apply rotation around Y axis
    const cosY = Math.cos(camera.rotationY);
    const sinY = Math.sin(camera.rotationY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    
    // Apply rotation around X axis  
    const cosX = Math.cos(camera.rotationX);
    const sinX = Math.sin(camera.rotationX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    
    // Apply perspective projection
    const scale = 300 * camera.zoom;
    const perspective = 1000;
    const factor = perspective / (perspective + z2 * scale);
    
    return {
      x: width / 2 + x1 * scale * factor,
      y: height / 2 - y1 * scale * factor,
      z: z2,
      scale: factor
    };
  }, [camera]);

  // Draw 3D product space based on the selected continuous spaces
  const draw3DProductSpace = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const points: Array<{x: number, y: number, z: number}> = [];
    const lines: Array<[number, number]> = [];
    
    // Generate geometry based on product type
    if (xContinuousSpace === 'interval' && yContinuousSpace === 'interval') {
      // [0,1] × [0,1] = Unit square
      generateSquare(points, lines);
    } else if (xContinuousSpace === 'interval' && yContinuousSpace === 'circle') {
      // [0,1] × S¹ = Cylinder
      generateCylinder(points, lines);
    } else if (xContinuousSpace === 'circle' && yContinuousSpace === 'interval') {
      // S¹ × [0,1] = Cylinder (rotated)
      generateCylinder(points, lines, true);
    } else if (xContinuousSpace === 'circle' && yContinuousSpace === 'circle') {
      // S¹ × S¹ = Torus
      generateTorus(points, lines);
    } else if (xContinuousSpace === 'disc' && yContinuousSpace === 'interval') {
      // D² × [0,1] = Solid cylinder
      generateSolidCylinder(points, lines);
    } else if (xContinuousSpace === 'interval' && yContinuousSpace === 'disc') {
      // [0,1] × D² = Solid cylinder (rotated)
      generateSolidCylinder(points, lines, true);
    } else if (xContinuousSpace === 'disc' && yContinuousSpace === 'disc') {
      // D² × D² = 4D ball (project to 3D)
      generate4DBallProjection(points, lines);
    } else if (xContinuousSpace === 'disc' && yContinuousSpace === 'circle') {
      // D² × S¹ = Solid torus
      generateSolidTorus(points, lines);
    } else if (xContinuousSpace === 'circle' && yContinuousSpace === 'disc') {
      // S¹ × D² = Solid torus
      generateSolidTorus(points, lines);
    }
    
    // Sort points by z-coordinate for proper rendering order
    const projectedPoints = points.map(p => ({
      ...p,
      projected: project3D(p.x, p.y, p.z, width, height)
    }));
    
    // Draw edges
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    
    lines.forEach(([i, j]) => {
      const p1 = projectedPoints[i].projected;
      const p2 = projectedPoints[j].projected;
      
      // Only draw if both points are in front of camera
      if (p1.z > -1 && p2.z > -1) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });
    
    // Draw points
    ctx.globalAlpha = 1;
    projectedPoints.sort((a, b) => a.projected.z - b.projected.z);
    
    projectedPoints.forEach(p => {
      if (p.projected.z > -1) {
        const size = Math.max(0.5, 2 * p.projected.scale); // Ensure minimum size
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(p.projected.x, p.projected.y, size, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [xContinuousSpace, yContinuousSpace, project3D]);

  // Continuous space visualization with 3D rendering
  const drawContinuousSpace = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw title and labels
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 16px monospace';
    const xLabel = xContinuousSpace === 'disc' ? 'D²' : xContinuousSpace === 'interval' ? '[0,1]' : 'S¹';
    const yLabel = yContinuousSpace === 'disc' ? 'D²' : yContinuousSpace === 'interval' ? '[0,1]' : 'S¹';
    ctx.fillText(`${xLabel} × ${yLabel}`, width/2 - 30, 30);
    
    // Instructions
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('Drag to rotate • Scroll to zoom', width/2 - 100, height - 20);
    
    // Draw the 3D product space
    draw3DProductSpace(ctx, width, height);
  }, [draw3DProductSpace, xContinuousSpace, yContinuousSpace]);
  
  // Geometry generation functions
  const generateSquare = (points: Array<{x: number, y: number, z: number}>, lines: Array<[number, number]>) => {
    // Create a flat square in the XY plane
    const n = 20;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        points.push({
          x: (i / n - 0.5) * 2,
          y: (j / n - 0.5) * 2,
          z: 0
        });
        
        const idx = i * (n + 1) + j;
        if (i < n) lines.push([idx, idx + n + 1]);
        if (j < n) lines.push([idx, idx + 1]);
      }
    }
  };
  
  const generateCylinder = (points: Array<{x: number, y: number, z: number}>, lines: Array<[number, number]>, rotated = false) => {
    const n = 20;
    const m = 10;
    
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= m; j++) {
        const theta = (i / n) * 2 * Math.PI;
        const h = (j / m - 0.5) * 2;
        
        if (rotated) {
          points.push({
            x: h,
            y: Math.cos(theta),
            z: Math.sin(theta)
          });
        } else {
          points.push({
            x: Math.cos(theta),
            y: h,
            z: Math.sin(theta)
          });
        }
        
        const idx = i * (m + 1) + j;
        if (i < n) lines.push([idx, idx + m + 1]);
        if (j < m) lines.push([idx, idx + 1]);
      }
    }
  };
  
  const generateTorus = (points: Array<{x: number, y: number, z: number}>, lines: Array<[number, number]>) => {
    const n = 24;
    const m = 16;
    const R = 1.5; // Major radius
    const r = 0.5; // Minor radius
    
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= m; j++) {
        const theta = (i / n) * 2 * Math.PI;
        const phi = (j / m) * 2 * Math.PI;
        
        points.push({
          x: (R + r * Math.cos(phi)) * Math.cos(theta),
          y: r * Math.sin(phi),
          z: (R + r * Math.cos(phi)) * Math.sin(theta)
        });
        
        const idx = i * (m + 1) + j;
        if (i < n) lines.push([idx, idx + m + 1]);
        if (j < m) lines.push([idx, idx + 1]);
      }
    }
  };
  
  const generateSolidCylinder = (points: Array<{x: number, y: number, z: number}>, lines: Array<[number, number]>, rotated = false) => {
    const n = 16;
    // const m = 8; // Unused variable
    const h = 8;
    
    // Cylinder surface
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= h; j++) {
        const theta = (i / n) * 2 * Math.PI;
        const height = (j / h - 0.5) * 2;
        
        if (rotated) {
          points.push({
            x: height,
            y: Math.cos(theta),
            z: Math.sin(theta)
          });
        } else {
          points.push({
            x: Math.cos(theta),
            y: height,
            z: Math.sin(theta)
          });
        }
      }
    }
    
    // Add some interior structure
    for (let r = 0.3; r < 1; r += 0.3) {
      for (let i = 0; i <= n/2; i++) {
        const theta = (i / (n/2)) * 2 * Math.PI;
        if (rotated) {
          points.push({
            x: -1,
            y: r * Math.cos(theta),
            z: r * Math.sin(theta)
          });
          points.push({
            x: 1,
            y: r * Math.cos(theta),
            z: r * Math.sin(theta)
          });
        } else {
          points.push({
            x: r * Math.cos(theta),
            y: -1,
            z: r * Math.sin(theta)
          });
          points.push({
            x: r * Math.cos(theta),
            y: 1,
            z: r * Math.sin(theta)
          });
        }
      }
    }
    
    // Connect surface points
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < h; j++) {
        const idx = i * (h + 1) + j;
        lines.push([idx, idx + 1]);
        lines.push([idx, idx + h + 1]);
      }
    }
  };
  
  const generate4DBallProjection = (points: Array<{x: number, y: number, z: number}>, lines: Array<[number, number]>) => {
    // Project a 4D ball to 3D - we'll show a sphere with internal structure
    const n = 16;
    
    // Multiple concentric spheres
    for (let r = 0.3; r <= 1; r += 0.35) {
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= n/2; j++) {
          const theta = (i / n) * 2 * Math.PI;
          const phi = (j / (n/2)) * Math.PI;
          
          points.push({
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
          });
        }
      }
    }
    
    // Connect points in a grid pattern
    for (let shell = 0; shell < 3; shell++) {
      const offset = shell * (n + 1) * (n/2 + 1);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n/2; j++) {
          const idx = offset + i * (n/2 + 1) + j;
          lines.push([idx, idx + 1]);
          lines.push([idx, idx + n/2 + 1]);
        }
      }
    }
  };
  
  const generateSolidTorus = (points: Array<{x: number, y: number, z: number}>, lines: Array<[number, number]>) => {
    const n = 20;
    const m = 12;
    const R = 1.5;
    
    // Outer torus surface
    for (let r = 0.2; r <= 0.5; r += 0.15) {
      for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= m; j++) {
          const theta = (i / n) * 2 * Math.PI;
          const phi = (j / m) * 2 * Math.PI;
          
          points.push({
            x: (R + r * Math.cos(phi)) * Math.cos(theta),
            y: r * Math.sin(phi),
            z: (R + r * Math.cos(phi)) * Math.sin(theta)
          });
        }
      }
    }
    
    // Connect surface points
    for (let shell = 0; shell < 3; shell++) {
      const offset = shell * (n + 1) * (m + 1);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
          const idx = offset + i * (m + 1) + j;
          if (i < n) lines.push([idx, idx + m + 1]);
          if (j < m) lines.push([idx, idx + 1]);
        }
      }
    }
  };
  
  // @ts-expect-error - Unused function kept for potential future use
  const _drawContinuousOpenSet = (ctx: CanvasRenderingContext2D, set: ContinuousOpenSet, width: number, height: number, time: number) => {
    ctx.save();
    
    switch (set.type) {
      case 'ball':
        if (set.center && set.radius) {
          // Animate the radius slightly
          const animatedRadius = set.radius * (1 + 0.05 * Math.sin(time * 2));
          
          // Draw open ball
          const gradient = ctx.createRadialGradient(
            set.center.x * width, 
            set.center.y * height, 
            0,
            set.center.x * width, 
            set.center.y * height, 
            animatedRadius * Math.min(width, height)
          );
          gradient.addColorStop(0, 'rgba(255, 0, 128, 0.4)');
          gradient.addColorStop(0.7, 'rgba(255, 0, 128, 0.2)');
          gradient.addColorStop(1, 'rgba(255, 0, 128, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(set.center.x * width, set.center.y * height, animatedRadius * Math.min(width, height), 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw boundary (dashed for open set)
          ctx.strokeStyle = '#ff0080';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(set.center.x * width, set.center.y * height, animatedRadius * Math.min(width, height), 0, 2 * Math.PI);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        break;
        
      case 'rectangle':
        if (set.bounds) {
          const { x1, y1, x2, y2 } = set.bounds;
          
          // Draw open rectangle
          ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
          ctx.fillRect(x1 * width, y1 * height, (x2 - x1) * width, (y2 - y1) * height);
          
          // Draw boundary (dashed for open set)
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x1 * width, y1 * height, (x2 - x1) * width, (y2 - y1) * height);
          ctx.setLineDash([]);
        }
        break;
        
      case 'strip':
        if (set.bounds) {
          const { x1, y1, x2, y2 } = set.bounds;
          
          // Draw strip (could be horizontal or vertical)
          const gradient = ctx.createLinearGradient(x1 * width, y1 * height, x2 * width, y2 * height);
          gradient.addColorStop(0, 'rgba(57, 255, 20, 0)');
          gradient.addColorStop(0.5, 'rgba(57, 255, 20, 0.3)');
          gradient.addColorStop(1, 'rgba(57, 255, 20, 0)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x1 * width, y1 * height, (x2 - x1) * width, (y2 - y1) * height);
        }
        break;
    }
    
    // Draw label
    if (set.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      
      const labelX = set.center ? set.center.x * width : width / 2;
      const labelY = set.center ? set.center.y * height - 40 : height / 2;
      
      ctx.fillText(set.label, labelX - ctx.measureText(set.label).width / 2, labelY);
      ctx.shadowBlur = 0;
    }
    
    ctx.restore();
  };
  
  // Animation loop for continuous spaces
  useEffect(() => {
    if (spaceType !== 'continuous') return;
    
    const animate = () => {
      setAnimationTime((prev: number) => prev + 0.016);
    };
    
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, [spaceType]);
  
  // Handle mouse interactions for 3D view
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setCamera(prev => ({
      ...prev,
      isDragging: true,
      lastMouseX: e.clientX,
      lastMouseY: e.clientY
    }));
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!camera.isDragging) return;
    
    const deltaX = e.clientX - camera.lastMouseX;
    const deltaY = e.clientY - camera.lastMouseY;
    
    setCamera(prev => ({
      ...prev,
      rotationY: prev.rotationY + deltaX * 0.01,
      rotationX: prev.rotationX + deltaY * 0.01,
      lastMouseX: e.clientX,
      lastMouseY: e.clientY
    }));
  };
  
  const handleMouseUp = () => {
    setCamera(prev => ({ ...prev, isDragging: false }));
  };
  
  // @ts-expect-error - Unused function kept for potential future use
  const _handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (spaceType !== 'continuous') return;
    e.preventDefault();
    
    const zoomSpeed = 0.001;
    const newZoom = camera.zoom * (1 - e.deltaY * zoomSpeed);
    
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, newZoom))
    }));
  };
  
  // Draw continuous space
  useEffect(() => {
    if (spaceType !== 'continuous') return;
    
    const canvas = continuousCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw the 3D product space
    drawContinuousSpace(ctx, width, height);
  }, [spaceType, camera, xContinuousSpace, yContinuousSpace, drawContinuousSpace]);

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = spaceType === 'discrete' ? canvasRef.current : continuousCanvasRef.current;
    if (!canvas) return;
    
    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const zoomSpeed = 0.001;
      const newZoom = camera.zoom * (1 - e.deltaY * zoomSpeed);
      
      setCamera(prev => ({
        ...prev,
        zoom: Math.max(0.1, Math.min(5, newZoom))
      }));
    };
    
    // Add event listener with passive: false to allow preventDefault
    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, [spaceType, camera.zoom]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (spaceType === 'discrete') {
      // For 3D discrete view, find closest point to click
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      // Project all grid points and find closest to click
      let closestPoint = null;
      let minDistance = Infinity;
      
      for (let i = 0; i < xSize; i++) {
        for (let j = 0; j < ySize; j++) {
          const x = (i - (xSize - 1) / 2) / (xSize - 1) * 2;
          const y = (j - (ySize - 1) / 2) / (ySize - 1) * 2;
          const projected = project3D(x, y, 0, canvas.width, canvas.height);
          
          const distance = Math.sqrt(
            Math.pow(projected.x - clickX, 2) + 
            Math.pow(projected.y - clickY, 2)
          );
          
          if (distance < minDistance && distance < 20) { // 20px threshold
            minDistance = distance;
            closestPoint = { x: i + 1, y: j + 1 };
          }
        }
      }
      
      if (closestPoint) {
        setSelectedPoint(closestPoint);
      }
    } else {
      // Original 2D handling for continuous spaces
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const cellWidth = canvas.width / xSize;
      const cellHeight = canvas.height / ySize;
      
      const gridX = Math.floor(x / cellWidth) + 1;
      const gridY = ySize - Math.floor(y / cellHeight);
      
      if (gridX >= 1 && gridX <= xSize && gridY >= 1 && gridY <= ySize) {
        setSelectedPoint({ x: gridX, y: gridY });
      }
    }
  };

  const productBasis = generateProductBasis();

  // Select options
  const spaceTypeOptions: SelectOption<SpaceType>[] = [
    { value: 'discrete', label: 'Discrete' },
    { value: 'continuous', label: 'Continuous' }
  ];

  const topologyOptions: SelectOption<TopologyType>[] = [
    { value: 'discrete', label: 'Discrete' },
    { value: 'trivial', label: 'Trivial' },
    { value: 'standard', label: 'Standard' },
    { value: 'cofinite', label: 'Cofinite' },
    { value: 'sierpinski', label: 'Sierpinski' }
  ];

  const productTypeOptions: SelectOption<ProductType>[] = [
    { value: 'product', label: 'Product Topology' },
    { value: 'box', label: 'Box Topology' }
  ];

  const continuousSpaceOptions: SelectOption<ContinuousSpaceType>[] = [
    { value: 'disc', label: 'Unit Disc D²' },
    { value: 'interval', label: 'Unit Interval [0,1]' },
    { value: 'circle', label: 'Circle S¹' }
  ];

  const customSelectStyles = retroSelectStyles<{ value: string; label: string }>();

  return (
    <div className={styles.explorer}>
      <div className={styles.instructions}>
        <h3>Product Topology Explorer</h3>
        <p>Visualize product topologies on X × Y. See how basis elements are formed from open sets in component spaces and explore the difference between box and product topologies.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlRow}>
          <div className={styles.controlGroup}>
            <label>Space Type:</label>
            <Select
              value={spaceTypeOptions.find(o => o.value === spaceType)}
              onChange={(option) => option && setSpaceType(option.value as SpaceType)}
              options={spaceTypeOptions}
              styles={customSelectStyles}
              isSearchable={false}
            />
          </div>

          {spaceType === 'discrete' ? (
            <>
              <div className={styles.controlGroup}>
                <label>X Topology:</label>
                <Select
                  value={topologyOptions.find(o => o.value === xTopology)}
                  onChange={(option) => option && setXTopology(option.value as TopologyType)}
                  options={topologyOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>

              <div className={styles.controlGroup}>
                <label>Y Topology:</label>
                <Select
                  value={topologyOptions.find(o => o.value === yTopology)}
                  onChange={(option) => option && setYTopology(option.value as TopologyType)}
                  options={topologyOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>

              <div className={styles.controlGroup}>
                <label>Product Type:</label>
                <Select
                  value={productTypeOptions.find(o => o.value === productType)}
                  onChange={(option) => option && setProductType(option.value as ProductType)}
                  options={productTypeOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.controlGroup}>
                <label>First Space (X):</label>
                <Select
                  value={continuousSpaceOptions.find(o => o.value === xContinuousSpace)}
                  onChange={(option) => option && setXContinuousSpace(option.value as ContinuousSpaceType)}
                  options={continuousSpaceOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>

              <div className={styles.controlGroup}>
                <label>Second Space (Y):</label>
                <Select
                  value={continuousSpaceOptions.find(o => o.value === yContinuousSpace)}
                  onChange={(option) => option && setYContinuousSpace(option.value as ContinuousSpaceType)}
                  options={continuousSpaceOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>

              <div className={styles.controlGroup}>
                <label>Product Type:</label>
                <Select
                  value={productTypeOptions.find(o => o.value === productType)}
                  onChange={(option) => option && setProductType(option.value as ProductType)}
                  options={productTypeOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showBasis}
              onChange={(e) => setShowBasis(e.target.checked)}
            />
            Show Basis Elements
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Show Grid
          </label>
        </div>
      </div>

      <div className={styles.visualization}>
        <div className={styles.canvasSection}>
          <h4>{spaceType === 'discrete' ? 'Product Space X × Y' : 'Unit Disc D² with Open Sets'}</h4>
          {spaceType === 'discrete' ? (
            <>
              <canvas
                ref={canvasRef}
                width={600}
                height={500}
                className={styles.canvas}
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDragStart={(e) => e.preventDefault()}
                draggable={false}
                style={{ 
                  background: '#0a0a0a',
                  cursor: camera.isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              />
              <p className={styles.canvasHint}>Drag to rotate • Scroll to zoom • Click to select point</p>
            </>
          ) : (
            <>
              <canvas
                ref={continuousCanvasRef}
                width={600}
                height={500}
                className={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDragStart={(e) => e.preventDefault()}
                draggable={false}
                style={{ 
                  background: '#0a0a0a',
                  cursor: camera.isDragging ? 'grabbing' : 'grab',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none'
                }}
              />
              <p className={styles.canvasHint}>Drag to rotate • Scroll to zoom</p>
            </>
          )}
          {selectedPoint && (
            <p className={styles.selectedPoint}>
              {spaceType === 'discrete' 
                ? `Selected point: (${selectedPoint.x}, ${selectedPoint.y})`
                : `Point: (${((selectedPoint.x - 200) / 200).toFixed(2)}, ${((200 - selectedPoint.y) / 200).toFixed(2)})`
              }
            </p>
          )}
        </div>

        <div className={styles.basisList}>
          <h4>{spaceType === 'discrete' ? 'Basis Elements (U × V)' : 'Open Set Properties'}</h4>
          <div className={styles.basisScroll}>
            {spaceType === 'discrete' ? (
              <>
                {productBasis.slice(0, 20).map((set, index) => (
                  <div
                    key={index}
                    className={`${styles.basisElement} ${
                      highlightedSet?.label === set.label ? styles.highlighted : ''
                    }`}
                    onMouseEnter={() => setHighlightedSet(set)}
                    onMouseLeave={() => setHighlightedSet(null)}
                  >
                    {set.label}
                  </div>
                ))}
                {productBasis.length > 20 && (
                  <p className={styles.moreElements}>
                    ... and {productBasis.length - 20} more basis elements
                  </p>
                )}
              </>
            ) : (
              <div className={styles.continuousInfo}>
                <p><strong>Unit Disc D²:</strong></p>
                <ul>
                  <li>Open balls B(p, ε) form a basis</li>
                  <li>Product topology inherited from ℝ²</li>
                  <li>Compact as a closed bounded subset</li>
                  <li>Homeomorphic to [0,1]²</li>
                </ul>
                <p className={styles.openSetTypes}>
                  <strong>Visualized Open Sets:</strong><br/>
                  • <span style={{ color: '#ff0080' }}>Pink</span>: Open balls<br/>
                  • <span style={{ color: '#00ffff' }}>Cyan</span>: Rectangles<br/>
                  • <span style={{ color: '#39ff14' }}>Green</span>: Strips
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.explanation}>
        <h4>Product vs Box Topology:</h4>
        <div className={styles.comparisonGrid}>
          <div className={styles.topologyType}>
            <h5>Product Topology</h5>
            <ul>
              <li>Basis: U × V where U open in X, V open in Y</li>
              <li>For infinite products: only finitely many non-full factors</li>
              <li>Coarser (fewer open sets)</li>
              <li>Preserves compactness (Tychonoff's theorem)</li>
            </ul>
          </div>
          <div className={styles.topologyType}>
            <h5>Box Topology</h5>
            <ul>
              <li>Basis: ∏Uᵢ where each Uᵢ open</li>
              <li>All factors can be proper subsets</li>
              <li>Finer (more open sets)</li>
              <li>Does not preserve compactness</li>
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Click on the grid to see which basis elements contain that point</li>
          <li>Hover over basis elements in the list to highlight them on the grid</li>
          <li>Product topology basis: rectangles formed by open sets from each space</li>
          <li>For finite products, box and product topologies coincide</li>
          <li>Try discrete × discrete to see the full product structure</li>
        </ul>
      </div>
    </div>
  );
};

export default ProductTopologyExplorer;