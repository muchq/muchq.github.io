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
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [isTouchDevice] = useState(() => 'ontouchstart' in window)
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
      // Swap positions to maintain bijection
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

  const handleElementClick = (clickedId: number, clickedPosition: number) => {
    if (!isTouchDevice) return
    
    if (selectedId === null) {
      // First tap: select an element to move
      setSelectedId(clickedId)
    } else if (selectedId === clickedId) {
      // Tapped same element: deselect
      setSelectedId(null)
    } else {
      // Second tap: move the selected element to this position
      const newElements = [...elements]
      const selectedElement = newElements.find(el => el.id === selectedId)
      const elementAtTarget = newElements.find(el => el.position === clickedPosition)
      
      if (selectedElement && elementAtTarget) {
        // Swap positions: selected element goes to clicked position,
        // element at clicked position goes to selected element's old position
        const tempPosition = selectedElement.position
        selectedElement.position = elementAtTarget.position
        elementAtTarget.position = tempPosition
        setElements(newElements)
      }
      
      setSelectedId(null)
    }
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
                  } ${
                    selectedId === sortedElements.find(el => el.position === position)?.id
                      ? styles.selected
                      : ''
                  }`}
                  draggable={!isTouchDevice}
                  onDragStart={(e) =>
                    !isTouchDevice && handleDragStart(e, sortedElements.find(el => el.position === position)!.id)
                  }
                  onDragEnd={handleDragEnd}
                  onClick={() => handleElementClick(sortedElements.find(el => el.position === position)!.id, position)}
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
          {sortedElements.map((_, idx) => {
            // idx is the position in the top row (0, 1, 2, 3) - this is what we're mapping FROM
            // el.id is what's at that position - we want to show where position idx+1 maps to
            const from = idx  // Visual position index
            const to = sortedElements.findIndex(e => e.id === idx + 1)  // Find where element (idx+1) ended up
            if (from === to) return null
            
            // 80px box width + 40px gap = 120px between centers
            const spacing = 120
            const startX = from * spacing + 40  // Center of the "from" box
            const endX = to * spacing + 40  // Center of the "to" box
            const width = Math.abs(endX - startX)
            const leftPos = Math.min(startX, endX)
            
            return (
              <svg
                key={`arrow-${idx}`}
                className={styles.arrow}
                style={{
                  left: `${leftPos}px`,
                  width: `${width + 10}px`,
                  top: '90px',
                  height: '40px'
                }}
              >
                <defs>
                  <marker
                    id={`arrowhead-${idx}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3, 0 6"
                      fill={`hsl(${idx * 90}, 70%, 60%)`}
                    />
                  </marker>
                </defs>
                <path
                  d={`M ${startX < endX ? 5 : width + 5} 5 Q ${width/2 + 5} ${Math.min(width * 0.3, 30)}, ${startX < endX ? width + 5 : 5} 5`}
                  stroke={`hsl(${idx * 90}, 70%, 60%)`}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={`url(#arrowhead-${idx})`}
                />
              </svg>
            )
          })}
        </div>
      </div>

      <div className={styles.instructions}>
        <p>🎯 {isTouchDevice ? 'Tap a number, then tap where it should map to' : 'Drag and drop the colored numbers to create permutations'}</p>
        <p>📝 Watch how the two-line and cycle notations update in real-time</p>
        {isTouchDevice && selectedId !== null && (
          <p className={styles.hint}>✨ Now tap the position where {selectedId} should map to</p>
        )}
      </div>
    </div>
  )
}

export default PermutationVisualizer