import React, { useState, useEffect, useRef } from 'react'
import Select from 'react-select'
import { retroSelectStyles } from '../styles/ReactSelectStyles'
import styles from '../styles/ModuleStyles.module.css'

type ExampleSpace = 'interval' | 'circle' | 'torus' | 'cantor' | 'projective' | 'stone-cech'

type SpaceOption = {
  value: ExampleSpace
  label: string
}

interface SpaceInfo {
  name: string
  description: string
  properties: string[]
  applications: string[]
}

const spaceData: Record<ExampleSpace, SpaceInfo> = {
  'interval': {
    name: 'Unit Interval [0,1]',
    description: 'The closed interval from 0 to 1 is the simplest example of a compact Hausdorff space.',
    properties: [
      'Compact by Heine-Borel theorem',
      'Hausdorff as a metric space',
      'Connected',
      'Path-connected',
      'Simply connected'
    ],
    applications: [
      'Building block for product spaces',
      'Continuous functions on [0,1] form important function spaces',
      'Used in homotopy theory (paths are maps from [0,1])'
    ]
  },
  'circle': {
    name: 'Circle S¹',
    description: 'The unit circle is a fundamental example of a compact manifold.',
    properties: [
      'Compact 1-manifold',
      'Hausdorff',
      'Connected but not simply connected',
      'Fundamental group π₁(S¹) = ℤ',
      'Quotient space: [0,1]/{0,1}'
    ],
    applications: [
      'Fourier analysis',
      'Rotational symmetry in physics',
      'Complex analysis (unit circle in ℂ)',
      'Periodic phenomena'
    ]
  },
  'torus': {
    name: 'Torus T² = S¹ × S¹',
    description: 'The product of two circles forms a torus, demonstrating that products of compact Hausdorff spaces are compact Hausdorff.',
    properties: [
      'Product of compact spaces is compact',
      'Product of Hausdorff spaces is Hausdorff',
      'Connected 2-manifold',
      'Fundamental group π₁(T²) = ℤ × ℤ',
      'Can be embedded in ℝ⁴ without self-intersection'
    ],
    applications: [
      'Dynamical systems (invariant tori)',
      'String theory compactifications',
      'Crystallography (Brillouin zones)',
      'Topology of configuration spaces'
    ]
  },
  'cantor': {
    name: 'Cantor Set',
    description: 'A remarkable fractal that is compact, totally disconnected, and uncountable.',
    properties: [
      'Compact (closed subset of [0,1])',
      'Hausdorff',
      'Totally disconnected',
      'Perfect (no isolated points)',
      'Uncountable with measure zero'
    ],
    applications: [
      'Counterexamples in analysis',
      'Fractal geometry',
      'Dynamical systems (Cantor attractors)',
      'Model for p-adic integers'
    ]
  },
  'projective': {
    name: 'Real Projective Plane ℝP²',
    description: 'The space of lines through the origin in ℝ³, obtained by identifying antipodal points on S².',
    properties: [
      'Compact (quotient of compact S²)',
      'Hausdorff',
      'Non-orientable surface',
      'Cannot be embedded in ℝ³',
      'Fundamental group π₁(ℝP²) = ℤ/2ℤ'
    ],
    applications: [
      'Projective geometry',
      'Computer graphics (homogeneous coordinates)',
      'Quantum mechanics (state spaces)',
      'Algebraic topology'
    ]
  },
  'stone-cech': {
    name: 'Stone-Čech Compactification βℕ',
    description: 'The maximal compactification of the natural numbers, containing all ultrafilters on ℕ.',
    properties: [
      'Compact Hausdorff',
      'Contains ℕ as dense subset',
      'Extremely disconnected',
      'Universal property for continuous functions',
      'Cannot be explicitly constructed'
    ],
    applications: [
      'Functional analysis',
      'Model theory',
      'Ramsey theory',
      'Ultrafilter methods in combinatorics'
    ]
  }
}

const spaceOptions: SpaceOption[] = [
  { value: 'interval', label: 'Unit Interval [0,1]' },
  { value: 'circle', label: 'Circle S¹' },
  { value: 'torus', label: 'Torus T²' },
  { value: 'cantor', label: 'Cantor Set' },
  { value: 'projective', label: 'Projective Plane ℝP²' },
  { value: 'stone-cech', label: 'Stone-Čech βℕ' }
]

const CompactHausdorffExplorer: React.FC = () => {
  const [selectedSpace, setSelectedSpace] = useState<ExampleSpace>('interval')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectStyles = retroSelectStyles<SpaceOption>()

  useEffect(() => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Define all drawing functions inside useEffect
    const drawArrow = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) => {
    const headlen = 10
    const angle = Math.atan2(y2 - y1, x2 - x1)
    
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(x2, y2)
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  }

  const drawInterval = (ctx: CanvasRenderingContext2D) => {
    // Draw [0,1] interval
    ctx.beginPath()
    ctx.moveTo(100, 200)
    ctx.lineTo(500, 200)
    ctx.stroke()

    // Draw endpoints
    ctx.beginPath()
    ctx.arc(100, 200, 5, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(500, 200, 5, 0, 2 * Math.PI)
    ctx.fill()

    // Labels
    ctx.font = '14px monospace'
    ctx.fillText('0', 95, 180)
    ctx.fillText('1', 495, 180)
    ctx.fillText('[0, 1]', 280, 160)

    // Show some open covers
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)'
    ctx.lineWidth = 20
    ctx.beginPath()
    ctx.moveTo(90, 200)
    ctx.lineTo(250, 200)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(200, 200)
    ctx.lineTo(380, 200)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(330, 200)
    ctx.lineTo(510, 200)
    ctx.stroke()

    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 1
    ctx.font = '12px monospace'
    ctx.fillText('Finite subcover exists', 220, 250)
  }

  const drawCircle = (ctx: CanvasRenderingContext2D) => {
    const centerX = 300
    const centerY = 200
    const radius = 100

    // Draw circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()

    // Draw some points
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.font = '14px monospace'
    ctx.fillText('S¹', centerX - 10, centerY)
    ctx.fillText('Compact + Hausdorff', centerX - 70, centerY + 150)

    // Show quotient representation
    ctx.font = '12px monospace'
    ctx.fillText('[0, 1] / {0, 1}', centerX - 40, centerY - 130)
  }

  const drawTorus = (ctx: CanvasRenderingContext2D) => {
    // Draw torus as a rectangle with identified edges
    ctx.strokeStyle = '#00ff00'
    ctx.strokeRect(200, 100, 200, 200)

    // Draw arrows showing identification
    ctx.beginPath()
    ctx.moveTo(200, 100)
    ctx.lineTo(200, 300)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(400, 100)
    ctx.lineTo(400, 300)
    ctx.stroke()

    // Draw identification arrows
    drawArrow(ctx, 190, 200, 190, 150)
    drawArrow(ctx, 410, 200, 410, 250)
    
    ctx.beginPath()
    ctx.moveTo(200, 100)
    ctx.lineTo(400, 100)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(200, 300)
    ctx.lineTo(400, 300)
    ctx.stroke()

    drawArrow(ctx, 300, 90, 250, 90)
    drawArrow(ctx, 300, 310, 350, 310)

    ctx.font = '14px monospace'
    ctx.fillText('T² = S¹ × S¹', 250, 50)
    ctx.font = '12px monospace'
    ctx.fillText('Identify opposite edges', 220, 340)
  }

  const drawCantorSet = (ctx: CanvasRenderingContext2D) => {
    const drawCantorIteration = (x: number, y: number, width: number, level: number) => {
      if (level === 0 || width < 2) {
        ctx.fillRect(x, y, width, 10)
        return
      }
      
      const newWidth = width / 3
      drawCantorIteration(x, y + 20, newWidth, level - 1)
      drawCantorIteration(x + 2 * newWidth, y + 20, newWidth, level - 1)
    }

    ctx.fillStyle = '#00ff00'
    drawCantorIteration(100, 100, 400, 5)

    ctx.font = '14px monospace'
    ctx.fillText('Cantor Set Construction', 200, 80)
    ctx.font = '12px monospace'
    ctx.fillText('Totally disconnected', 220, 280)
    ctx.fillText('Perfect (no isolated points)', 200, 300)
    ctx.fillText('Uncountable', 250, 320)
  }

  const drawProjectivePlane = (ctx: CanvasRenderingContext2D) => {
    // Draw a circle with antipodal points identified
    const centerX = 300
    const centerY = 200
    const radius = 100

    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()

    // Draw some antipodal pairs
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)'
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 4
      const x1 = centerX + radius * Math.cos(angle)
      const y1 = centerY + radius * Math.sin(angle)
      const x2 = centerX - radius * Math.cos(angle)
      const y2 = centerY - radius * Math.sin(angle)
      
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      
      ctx.fillStyle = '#00ff00'
      ctx.beginPath()
      ctx.arc(x1, y1, 4, 0, 2 * Math.PI)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x2, y2, 4, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.strokeStyle = '#00ff00'
    ctx.font = '14px monospace'
    ctx.fillText('ℝP²', centerX - 10, centerY)
    ctx.font = '12px monospace'
    ctx.fillText('Antipodal points identified', centerX - 80, centerY + 140)
    ctx.fillText('Non-orientable surface', centerX - 70, centerY + 160)
  }

  const drawStoneCech = (ctx: CanvasRenderingContext2D) => {
    // Draw ℕ as discrete points
    ctx.fillStyle = '#00ff00'
    for (let i = 0; i < 10; i++) {
      ctx.beginPath()
      ctx.arc(100 + i * 40, 200, 3, 0, 2 * Math.PI)
      ctx.fill()
      ctx.font = '10px monospace'
      ctx.fillText(`${i + 1}`, 95 + i * 40, 190)
    }

    // Draw cloud representing βℕ
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)'
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'
    ctx.beginPath()
    ctx.ellipse(300, 200, 250, 120, 0, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // Draw some "ultrafilter" points
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'
    for (let i = 0; i < 20; i++) {
      const angle = (i * Math.PI * 2) / 20
      const r = 80 + Math.random() * 140
      const x = 300 + r * Math.cos(angle) * 1.8
      const y = 200 + r * Math.sin(angle) * 0.7
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.fillStyle = '#00ff00'
    ctx.font = '14px monospace'
    ctx.fillText('βℕ - Stone-Čech Compactification', 150, 60)
    ctx.font = '12px monospace'
    ctx.fillText('ℕ ⊂ βℕ', 250, 350)
    ctx.fillText('Contains all ultrafilters', 200, 370)
  }

    // Clear canvas
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, 600, 400)

    // Draw visualization based on selected space
    ctx.strokeStyle = '#00ff00'
    ctx.fillStyle = '#00ff00'
    ctx.lineWidth = 2

    switch (selectedSpace) {
      case 'interval':
        drawInterval(ctx)
        break
      case 'circle':
        drawCircle(ctx)
        break
      case 'torus':
        drawTorus(ctx)
        break
      case 'cantor':
        drawCantorSet(ctx)
        break
      case 'projective':
        drawProjectivePlane(ctx)
        break
      case 'stone-cech':
        drawStoneCech(ctx)
        break
    }
  }, [selectedSpace])

  const currentSpace = spaceData[selectedSpace]

  return (
    <div className={styles.moduleContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Compact Hausdorff Spaces</h1>
        <p className={styles.subtitle}>
          Exploring the perfect balance: compact + Hausdorff = normal + more
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <h2>Select a Space</h2>
          <Select
            value={spaceOptions.find(opt => opt.value === selectedSpace)}
            onChange={(option) => option && setSelectedSpace(option.value)}
            options={spaceOptions}
            styles={selectStyles}
            isSearchable={false}
          />
        </div>

        <div className={styles.section}>
          <h2>Visualization</h2>
          <div className={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className={styles.canvas}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h2>{currentSpace.name}</h2>
          <p className={styles.description}>{currentSpace.description}</p>
          
          <h3>Properties</h3>
          <ul className={styles.propertyList}>
            {currentSpace.properties.map((prop, idx) => (
              <li key={idx}>{prop}</li>
            ))}
          </ul>

          <h3>Applications</h3>
          <ul className={styles.applicationList}>
            {currentSpace.applications.map((app, idx) => (
              <li key={idx}>{app}</li>
            ))}
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Key Theorem</h2>
          <div className={styles.theorem}>
            <p>
              <strong>Tychonoff's Theorem:</strong> The product of any collection of compact 
              topological spaces is compact in the product topology.
            </p>
            <p className={styles.note}>
              Note: This is equivalent to the Axiom of Choice!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompactHausdorffExplorer