import { useState, useRef } from 'react'
import styles from './PermutationVisualizer.module.css'

interface Element {
  id: number
  position: number
}

const PermutationVisualizer = () => {
  const [elements, setElements] = useState<Element[]>([
    { id: 1, position: 0 },
    { id: 2, position: 1 },
    { id: 3, position: 2 },
    { id: 4, position: 3 }
  ])
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPosition(position)
  }

  const handleDragLeave = () => {
    setDragOverPosition(null)
  }

  const handleDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    if (draggingId === null) return

    const newElements = [...elements]
    const draggedElement = newElements.find(el => el.id === draggingId)
    const targetElement = newElements.find(el => el.position === targetPosition)

    if (draggedElement && targetElement) {
      const tempPosition = draggedElement.position
      draggedElement.position = targetElement.position
      targetElement.position = tempPosition
      setElements(newElements)
    }

    setDraggingId(null)
    setDragOverPosition(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverPosition(null)
  }

  const resetPermutation = () => {
    setIsAnimating(true)
    setElements([
      { id: 1, position: 0 },
      { id: 2, position: 1 },
      { id: 3, position: 2 },
      { id: 4, position: 3 }
    ])
    setTimeout(() => setIsAnimating(false), 300)
  }

  const applyRandomPermutation = () => {
    setIsAnimating(true)
    const positions = [0, 1, 2, 3]
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }
    
    setElements(elements.map((el, idx) => ({
      ...el,
      position: positions[idx]
    })))
    setTimeout(() => setIsAnimating(false), 300)
  }

  const getCycleNotation = () => {
    const visited = new Set<number>()
    const cycles: number[][] = []
    
    const sortedElements = [...elements].sort((a, b) => a.position - b.position)
    
    for (let i = 0; i < sortedElements.length; i++) {
      if (!visited.has(i)) {
        const cycle: number[] = []
        let current = i
        
        while (!visited.has(current)) {
          visited.add(current)
          cycle.push(current + 1)
          const nextElement = sortedElements[current]
          current = nextElement.id - 1
        }
        
        if (cycle.length > 1) {
          cycles.push(cycle)
        }
      }
    }
    
    if (cycles.length === 0) {
      return 'Identity'
    }
    
    return cycles.map(cycle => `(${cycle.join(' ')})`).join('')
  }

  const sortedElements = [...elements].sort((a, b) => a.position - b.position)

  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <button onClick={resetPermutation} className={styles.button}>
          Reset
        </button>
        <button onClick={applyRandomPermutation} className={styles.button}>
          Random
        </button>
      </div>

      <div className={styles.permutationDisplay}>
        <div className={styles.twoLineNotation}>
          <div className={styles.row}>
            <span className={styles.label}>Original:</span>
            {[1, 2, 3, 4].map(num => (
              <span key={num} className={styles.number}>{num}</span>
            ))}
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Maps to:</span>
            {sortedElements.map(el => (
              <span key={el.position} className={styles.number}>{el.id}</span>
            ))}
          </div>
        </div>

        <div className={styles.cycleNotation}>
          <span className={styles.label}>Cycle notation:</span>
          <span className={styles.cycle}>{getCycleNotation()}</span>
        </div>
      </div>

      <div className={styles.visualContainer} ref={containerRef}>
        <div className={styles.positions}>
          {[0, 1, 2, 3].map(position => (
            <div
              key={position}
              className={`${styles.position} ${dragOverPosition === position ? styles.dragOver : ''}`}
              onDragOver={(e) => handleDragOver(e, position)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, position)}
            >
              {sortedElements.find(el => el.position === position) && (
                <div
                  className={`${styles.element} ${isAnimating ? styles.animating : ''} ${
                    draggingId === sortedElements.find(el => el.position === position)?.id
                      ? styles.dragging
                      : ''
                  }`}
                  draggable
                  onDragStart={(e) =>
                    handleDragStart(e, sortedElements.find(el => el.position === position)!.id)
                  }
                  onDragEnd={handleDragEnd}
                  style={{
                    backgroundColor: `hsl(${(sortedElements.find(el => el.position === position)!.id - 1) * 90}, 70%, 60%)`
                  }}
                >
                  {sortedElements.find(el => el.position === position)?.id}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.arrows}>
          {elements.map(el => {
            const from = el.id - 1
            const to = el.position
            if (from === to) return null
            
            return (
              <svg
                key={el.id}
                className={styles.arrow}
                style={{
                  left: `${from * 80 + 40}px`,
                  width: `${Math.abs(to - from) * 80}px`,
                  top: '100px'
                }}
              >
                <defs>
                  <marker
                    id={`arrowhead-${el.id}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3, 0 6"
                      fill={`hsl(${(el.id - 1) * 90}, 70%, 60%)`}
                    />
                  </marker>
                </defs>
                <path
                  d={`M 5 5 Q ${Math.abs(to - from) * 40} ${Math.abs(to - from) * 20}, ${
                    Math.abs(to - from) * 80 - 5
                  } 5`}
                  stroke={`hsl(${(el.id - 1) * 90}, 70%, 60%)`}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={`url(#arrowhead-${el.id})`}
                  transform={to < from ? 'scale(-1, 1) translate(-' + Math.abs(to - from) * 80 + ', 0)' : ''}
                />
              </svg>
            )
          })}
        </div>
      </div>

      <div className={styles.instructions}>
        <p>🎯 Drag and drop the colored numbers to create different permutations</p>
        <p>📝 Watch how the two-line and cycle notations update in real-time</p>
      </div>
    </div>
  )
}

export default PermutationVisualizer