import React, { useState, useEffect, useRef } from 'react';
import Select, { StylesConfig } from 'react-select';
import styles from './TychonoffVisualizer.module.css';

type Space = {
  name: string;
  isCompact: boolean;
  points: number;
  description: string;
};

type TabType = 'visualize' | 'proof';

type SpaceOption = {
  value: Space;
  label: string;
};

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

const TychonoffVisualizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('visualize');
  const [space1, setSpace1] = useState<Space>({
    name: '[0,1]',
    isCompact: true,
    points: 100,
    description: 'Unit interval'
  });
  
  const [space2, setSpace2] = useState<Space>({
    name: '[0,1]',
    isCompact: true,
    points: 100,
    description: 'Unit interval'
  });
  
  const [showProduct, setShowProduct] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const availableSpaces: Space[] = [
    { name: '[0,1]', isCompact: true, points: 100, description: 'Unit interval' },
    { name: 'S¹', isCompact: true, points: 100, description: 'Circle' },
    { name: '{0,1}', isCompact: true, points: 2, description: 'Two-point discrete' },
    { name: '[0,1]∪[2,3]', isCompact: true, points: 200, description: 'Union of intervals' },
    { name: 'ℝ', isCompact: false, points: Infinity, description: 'Real line' },
    { name: '(0,1)', isCompact: false, points: 100, description: 'Open interval' },
    { name: 'ℕ', isCompact: false, points: Infinity, description: 'Natural numbers' },
  ];

  const spaceOptions: SpaceOption[] = availableSpaces.map(space => ({
    value: space,
    label: `${space.name} ${space.isCompact ? '(Compact)' : '(Non-compact)'}`
  }));

  useEffect(() => {
    drawVisualization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space1, space2, showProduct, selectedPoint]);

  const drawVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid for product space
    if (showProduct) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 200; x <= 600; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 50);
        ctx.lineTo(x, 450);
        ctx.stroke();
      }
      for (let y = 50; y <= 450; y += 40) {
        ctx.beginPath();
        ctx.moveTo(200, y);
        ctx.lineTo(600, y);
        ctx.stroke();
      }
    }

    // Draw first space (X-axis)
    ctx.save();
    ctx.translate(200, 480);
    drawSpace(ctx, space1, 400, true);
    ctx.restore();

    // Draw second space (Y-axis)
    ctx.save();
    ctx.translate(170, 450);
    ctx.rotate(-Math.PI / 2);
    drawSpace(ctx, space2, 400, false);
    ctx.restore();

    // Draw product space
    if (showProduct) {
      drawProductSpace(ctx);
    }

    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(space1.name, 380, 510);
    
    ctx.save();
    ctx.translate(140, 250);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(space2.name, 0, 0);
    ctx.restore();

    if (showProduct) {
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`${space1.name} × ${space2.name}`, 350, 30);
      
      // Show compactness result
      const isProductCompact = space1.isCompact && space2.isCompact;
      ctx.fillStyle = isProductCompact ? '#00ff00' : '#ff0000';
      ctx.font = '14px monospace';
      ctx.fillText(
        isProductCompact ? '✓ Product is COMPACT' : '✗ Product is NOT COMPACT',
        320, 530
      );
    }
  };

  const drawSpace = (ctx: CanvasRenderingContext2D, space: Space, width: number, isXAxis: boolean) => {
    ctx.strokeStyle = space.isCompact ? '#00ff00' : '#ff0000';
    ctx.lineWidth = 3;

    switch (space.name) {
      case '[0,1]':
        // Closed interval
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.stroke();
        
        // Draw endpoints
        ctx.fillStyle = space.isCompact ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.arc(width, 0, 4, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case '(0,1)':
        // Open interval
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.stroke();
        
        // Draw open endpoints
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = 'transparent';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width, 0, 4, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case 'S¹':
        // Circle
        if (isXAxis) {
          ctx.beginPath();
          ctx.arc(width / 2, -30, width / 4, 0, 2 * Math.PI);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(width / 2, 0, width / 4, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;

      case '{0,1}':
        // Two points
        ctx.fillStyle = space.isCompact ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(width * 0.3, 0, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width * 0.7, 0, 6, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case '[0,1]∪[2,3]':
        // Union of two intervals
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width * 0.4, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width * 0.6, 0);
        ctx.lineTo(width, 0);
        ctx.stroke();
        
        ctx.fillStyle = space.isCompact ? '#00ff00' : '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.arc(width * 0.4, 0, 4, 0, 2 * Math.PI);
        ctx.arc(width * 0.6, 0, 4, 0, 2 * Math.PI);
        ctx.arc(width, 0, 4, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case 'ℝ':
      case 'ℕ':
        // Unbounded spaces
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(width + 20, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw arrow heads
        ctx.beginPath();
        ctx.moveTo(width + 20, 0);
        ctx.lineTo(width + 10, -5);
        ctx.lineTo(width + 10, 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-10, -5);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fill();
        break;
    }
  };

  const drawProductSpace = (ctx: CanvasRenderingContext2D) => {
    const isCompact = space1.isCompact && space2.isCompact;
    const baseX = 200;
    const baseY = 50;
    const width = 400;
    const height = 400;
    
    // Set colors based on compactness
    ctx.strokeStyle = isCompact ? '#00ff00' : '#ff0000';
    ctx.fillStyle = isCompact ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
    ctx.lineWidth = 2;
    
    // Handle different space combinations
    const drawProductVisualization = () => {
      // Handle discrete spaces
      if (space1.name === '{0,1}' && space2.name === '{0,1}') {
        // Four discrete points
        ctx.fillStyle = isCompact ? '#00ff00' : '#ff0000';
        const points = [
          { x: baseX + width * 0.3, y: baseY + height * 0.3 },
          { x: baseX + width * 0.7, y: baseY + height * 0.3 },
          { x: baseX + width * 0.3, y: baseY + height * 0.7 },
          { x: baseX + width * 0.7, y: baseY + height * 0.7 }
        ];
        points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
          ctx.fill();
        });
        return;
      }
      
      // Handle circles (S¹)
      if (space1.name === 'S¹' && space2.name === 'S¹') {
        // Torus visualization with grid
        ctx.fillRect(baseX, baseY, width, height);
        ctx.strokeRect(baseX, baseY, width, height);
        
        // Draw grid to show torus structure
        ctx.strokeStyle = isCompact ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(baseX + (width * i / 4), baseY);
          ctx.lineTo(baseX + (width * i / 4), baseY + height);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(baseX, baseY + (height * i / 4));
          ctx.lineTo(baseX + width, baseY + (height * i / 4));
          ctx.stroke();
        }
        
        // Draw identification arrows
        ctx.strokeStyle = '#00ffff';
        ctx.setLineDash([5, 3]);
        drawIdentificationArrows(ctx, baseX, baseY, width, height);
        ctx.setLineDash([]);
        return;
      }
      
      // Handle interval combinations
      const isInterval = (name: string) => ['[0,1]', '(0,1)', '[0,1]∪[2,3]'].includes(name);
      const isBounded = (name: string) => !['ℝ', 'ℕ'].includes(name);
      
      if (isInterval(space1.name) && isInterval(space2.name)) {
        // Rectangle for interval products
        ctx.fillRect(baseX, baseY, width, height);
        ctx.strokeRect(baseX, baseY, width, height);
        
        // Draw boundary indicators
        drawBoundaryIndicators(ctx, space1, space2, baseX, baseY, width, height);
        return;
      }
      
      // Handle mixed bounded/unbounded
      if (isBounded(space1.name) || isBounded(space2.name)) {
        if (!isBounded(space1.name)) {
          // Unbounded in X direction
          ctx.fillRect(baseX - 50, baseY, width + 100, height);
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(baseX - 50, baseY, width + 100, height);
          ctx.setLineDash([]);
          
          // Draw arrows for unbounded direction
          drawArrow(ctx, baseX - 50, baseY + height/2, -1, 0);
          drawArrow(ctx, baseX + width + 50, baseY + height/2, 1, 0);
        } else if (!isBounded(space2.name)) {
          // Unbounded in Y direction
          ctx.fillRect(baseX, baseY - 50, width, height + 100);
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(baseX, baseY - 50, width, height + 100);
          ctx.setLineDash([]);
          
          // Draw arrows for unbounded direction
          drawArrow(ctx, baseX + width/2, baseY - 50, 0, -1);
          drawArrow(ctx, baseX + width/2, baseY + height + 50, 0, 1);
        } else {
          // Both bounded - generic rectangle
          ctx.fillRect(baseX, baseY, width, height);
          ctx.strokeRect(baseX, baseY, width, height);
        }
        return;
      }
      
      // Both unbounded (ℝ × ℝ, etc.)
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(baseX - 50, baseY - 50, width + 100, height + 100);
      ctx.setLineDash([]);
      
      // Draw arrows in all directions
      drawArrow(ctx, baseX - 50, baseY + height/2, -1, 0);
      drawArrow(ctx, baseX + width + 50, baseY + height/2, 1, 0);
      drawArrow(ctx, baseX + width/2, baseY - 50, 0, -1);
      drawArrow(ctx, baseX + width/2, baseY + height + 50, 0, 1);
    };
    
    drawProductVisualization();
    
    // Highlight selected point
    if (selectedPoint) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(selectedPoint.x, selectedPoint.y, 10, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Draw projections
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(selectedPoint.x, selectedPoint.y);
      ctx.lineTo(selectedPoint.x, 480);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(selectedPoint.x, selectedPoint.y);
      ctx.lineTo(170, selectedPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };
  
  const drawIdentificationArrows = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    // Top-bottom identification arrows
    ctx.beginPath();
    ctx.moveTo(x + w/2 - 20, y - 10);
    ctx.lineTo(x + w/2 - 20, y - 25);
    ctx.lineTo(x + w/2 + 20, y - 25);
    ctx.lineTo(x + w/2 + 20, y - 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + w/2 - 20, y + h + 10);
    ctx.lineTo(x + w/2 - 20, y + h + 25);
    ctx.lineTo(x + w/2 + 20, y + h + 25);
    ctx.lineTo(x + w/2 + 20, y + h + 10);
    ctx.stroke();
    
    // Left-right identification arrows
    ctx.beginPath();
    ctx.moveTo(x - 10, y + h/2 - 20);
    ctx.lineTo(x - 25, y + h/2 - 20);
    ctx.lineTo(x - 25, y + h/2 + 20);
    ctx.lineTo(x - 10, y + h/2 + 20);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + w + 10, y + h/2 - 20);
    ctx.lineTo(x + w + 25, y + h/2 - 20);
    ctx.lineTo(x + w + 25, y + h/2 + 20);
    ctx.lineTo(x + w + 10, y + h/2 + 20);
    ctx.stroke();
  };
  
  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number) => {
    const arrowSize = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - arrowSize * dy - arrowSize * dx, y + arrowSize * dx - arrowSize * dy);
    ctx.lineTo(x + arrowSize * dy - arrowSize * dx, y - arrowSize * dx - arrowSize * dy);
    ctx.closePath();
    ctx.fill();
  };
  
  const drawBoundaryIndicators = (ctx: CanvasRenderingContext2D, s1: Space, s2: Space, x: number, y: number, w: number, h: number) => {
    const dotRadius = 4;
    
    // Draw corners to show open/closed nature
    const corners = [
      { px: x, py: y },           // top-left
      { px: x + w, py: y },       // top-right
      { px: x, py: y + h },       // bottom-left
      { px: x + w, py: y + h }    // bottom-right
    ];
    
    corners.forEach(corner => {
      const isOpenX = s1.name === '(0,1)';
      const isOpenY = s2.name === '(0,1)';
      
      if (isOpenX || isOpenY) {
        ctx.strokeStyle = '#ff0000';
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(corner.px, corner.py, dotRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(corner.px, corner.py, dotRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x >= 200 && x <= 600 && y >= 50 && y <= 450) {
      setSelectedPoint({ x, y });
    }
  };

  const renderProof = () => (
    <div className={styles.proofSection}>
      <h2>Proof of Tychonoff's Theorem</h2>
      
      <div className={styles.theorem}>
        <h3>Theorem (Tychonoff, 1930)</h3>
        <p className={styles.statement}>
          The product of any collection of compact topological spaces is compact in the product topology.
        </p>
        <p className={styles.formula}>
          If (X<sub>α</sub>, τ<sub>α</sub>) is compact for all α ∈ A, then ∏<sub>α∈A</sub> X<sub>α</sub> with the product topology is compact.
        </p>
      </div>

      <div className={styles.proofOutline}>
        <h3>Proof Outline</h3>
        
        <div className={styles.proofStep}>
          <h4>Step 1: Reformulation via Closed Sets</h4>
          <p>
            Instead of working with open covers directly, we use the <strong>Finite Intersection Property (FIP)</strong>:
          </p>
          <div className={styles.definition}>
            A collection of sets has the FIP if every finite subcollection has non-empty intersection.
          </div>
          <p>
            A space is compact ⟺ Every collection of closed sets with FIP has non-empty intersection.
          </p>
        </div>

        <div className={styles.proofStep}>
          <h4>Step 2: Alexander Subbase Theorem</h4>
          <p>
            Key lemma: A space is compact if every open cover by <em>subbase</em> elements has a finite subcover.
          </p>
          <p>
            For the product topology, the subbase consists of sets of the form:
          </p>
          <div className={styles.formula}>
            π<sub>α</sub><sup>-1</sup>(U) = {"{"}(x<sub>β</sub>)<sub>β∈A</sub> : x<sub>α</sub> ∈ U{"}"}
          </div>
          <p>where U is open in X<sub>α</sub> and π<sub>α</sub> is the projection map.</p>
        </div>

        <div className={styles.proofStep}>
          <h4>Step 3: The Role of Choice</h4>
          <p>
            The proof requires the <strong>Axiom of Choice</strong> (AC), specifically in the form of <strong>Zorn's Lemma</strong>:
          </p>
          <div className={styles.definition}>
            Every partially ordered set in which every chain has an upper bound contains a maximal element.
          </div>
          <p>
            We use this to extend collections with FIP to maximal collections (ultrafilters).
          </p>
        </div>

        <div className={styles.proofStep}>
          <h4>Step 4: Ultrafilter Argument</h4>
          <ol>
            <li>Let ℱ be a collection of closed sets in ∏X<sub>α</sub> with FIP</li>
            <li>Extend ℱ to a maximal collection ℱ* with FIP (using Zorn's Lemma)</li>
            <li>For each α, the projection π<sub>α</sub>(ℱ*) has FIP in X<sub>α</sub></li>
            <li>Since X<sub>α</sub> is compact, ∩π<sub>α</sub>(ℱ*) ≠ ∅</li>
            <li>Choose x<sub>α</sub> ∈ ∩π<sub>α</sub>(ℱ*) for each α (using AC)</li>
            <li>The point x = (x<sub>α</sub>)<sub>α∈A</sub> lies in ∩ℱ</li>
          </ol>
        </div>

        <div className={styles.proofStep}>
          <h4>Step 5: Why Product Topology?</h4>
          <p>
            The theorem is <strong>false</strong> for the box topology! The product topology is the coarsest topology making all projections continuous.
          </p>
          <div className={styles.example}>
            <strong>Counterexample for Box Topology:</strong><br/>
            [0,1]<sup>ℕ</sup> is not compact in the box topology. The open cover<br/>
            {"{"}U<sub>n</sub> = ∏<sub>i</sub> (1/(n+1), 1-1/(n+1)) : n ∈ ℕ{"}"}<br/>
            has no finite subcover.
          </div>
        </div>

        <div className={styles.proofStep}>
          <h4>Key Insights</h4>
          <ul>
            <li>The proof is inherently non-constructive due to AC</li>
            <li>Tychonoff's theorem is actually <em>equivalent</em> to the Axiom of Choice</li>
            <li>For finite products, the proof works without AC</li>
            <li>The theorem shows that compactness is preserved by arbitrary products, making it one of the most powerful results in topology</li>
          </ul>
        </div>
      </div>

      <div className={styles.applications}>
        <h3>Applications</h3>
        <ul>
          <li><strong>Functional Analysis:</strong> Alaoglu's theorem - The unit ball in the dual of a normed space is weak* compact</li>
          <li><strong>Stone-Čech Compactification:</strong> Every Tychonoff space embeds in a compact Hausdorff space</li>
          <li><strong>Probability Theory:</strong> Prokhorov's theorem on tightness of measures</li>
          <li><strong>Logic:</strong> Compactness theorem for propositional logic</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className={styles.visualizer}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'visualize' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('visualize')}
        >
          Interactive Visualization
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'proof' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('proof')}
        >
          Proof of Theorem
        </button>
      </div>

      {activeTab === 'visualize' ? (
        <>
      <div className={styles.controls}>
        <div className={styles.spaceSelector}>
          <div className={styles.selectorGroup}>
            <label>First Space (X):</label>
            <Select<SpaceOption>
              value={spaceOptions.find(opt => opt.value.name === space1.name)}
              onChange={(newValue) => newValue && setSpace1(newValue.value)}
              options={spaceOptions}
              styles={customSelectStyles}
              isSearchable={false}
              className={styles.selectContainer}
              classNamePrefix="retro-select"
            />
          </div>

          <div className={styles.selectorGroup}>
            <label>Second Space (Y):</label>
            <Select<SpaceOption>
              value={spaceOptions.find(opt => opt.value.name === space2.name)}
              onChange={(newValue) => newValue && setSpace2(newValue.value)}
              options={spaceOptions}
              styles={customSelectStyles}
              isSearchable={false}
              className={styles.selectContainer}
              classNamePrefix="retro-select"
            />
          </div>
        </div>

        <button 
          className={styles.visualizeBtn}
          onClick={() => setShowProduct(!showProduct)}
        >
          {showProduct ? 'Hide Product' : 'Show Product Space'}
        </button>
      </div>

      <div className={styles.visualization}>
        <canvas
          ref={canvasRef}
          width={700}
          height={550}
          className={styles.canvas}
          onClick={handleCanvasClick}
        />
      </div>

      <div className={styles.info}>
        <div className={styles.theorem}>
          <h3>Tychonoff's Theorem</h3>
          <p>
            The product of any collection of compact topological spaces is compact 
            in the product topology.
          </p>
          <p className={styles.formula}>
            If X<sub>α</sub> is compact for all α ∈ A, then ∏<sub>α∈A</sub> X<sub>α</sub> is compact
          </p>
        </div>

        <div className={styles.currentProduct}>
          <h4>Current Product:</h4>
          <p>
            {space1.name} × {space2.name} = 
            <span className={space1.isCompact && space2.isCompact ? styles.compact : styles.notCompact}>
              {space1.isCompact && space2.isCompact ? ' COMPACT' : ' NOT COMPACT'}
            </span>
          </p>
          <p className={styles.reason}>
            {!space1.isCompact && `${space1.name} is not compact`}
            {!space1.isCompact && !space2.isCompact && ' and '}
            {!space2.isCompact && `${space2.name} is not compact`}
            {space1.isCompact && space2.isCompact && 'Both spaces are compact, so their product is compact'}
          </p>
        </div>

        <div className={styles.examples}>
          <h4>Important Examples:</h4>
          <ul>
            <li>[0,1]<sup>n</sup> is compact (n-dimensional cube)</li>
            <li>S¹ × S¹ is compact (torus)</li>
            <li>[0,1]<sup>ℕ</sup> is compact (Hilbert cube)</li>
            <li>{"{"}0,1{"}"}<sup>I</sup> is compact for any index set I</li>
            <li>ℝ × [0,1] is NOT compact (ℝ is not compact)</li>
          </ul>
        </div>
      </div>
        </>
      ) : (
        renderProof()
      )}
    </div>
  );
};

export default TychonoffVisualizer;