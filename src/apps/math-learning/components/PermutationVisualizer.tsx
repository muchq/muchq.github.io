import { useState, useRef } from 'react'
import { PermutationBuilder } from '@/utils/permutation-builder'
import styles from './PermutationVisualizer.module.css'

const PermutationVisualizer = () => {
  const [permutation, setPermutation] = useState(() => new PermutationBuilder(4))
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  // selectedPosition is used for tap-to-select (accessibility/touch)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [isTouchDevice] = useState(() => 'ontouchstart' in window)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent, position: number) => {
    setDraggingFrom(position)
    e.dataTransfer.effectAllowed = 'move'
    // Set drag image or data if needed
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
    if (draggingFrom === null || draggingFrom === targetPosition) {
      setDraggingFrom(null)
      setDragOverPosition(null)
      return
    }

    // Swap logic
    const mapping = permutation.getMappingArray()
    const valFrom = mapping[draggingFrom]
    const valTo = mapping[targetPosition]

    const newPerm = permutation.clone()
    // Set mapping for the two positions involved in the swap
    // draggingFrom is the index (0-based) of the source position
    // targetPosition is the index (0-based) of the target position
    // We want the value at draggingFrom to move to targetPosition, and vice-versa?
    // "Swap" usually means exchange values.
    // So new mapping at draggingFrom index gets valTo
    // new mapping at targetPosition index gets valFrom
    newPerm.setMapping(draggingFrom + 1, valTo)
    newPerm.setMapping(targetPosition + 1, valFrom)

    setPermutation(newPerm)
    
    setDraggingFrom(null)
    setDragOverPosition(null)
  }

  const handleDragEnd = () => {
    setDraggingFrom(null)
    setDragOverPosition(null)
  }

  const handleElementClick = (clickedPosition: number, e?: React.MouseEvent) => {
    if (!isTouchDevice) return
    
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (selectedPosition === null) {
      // First tap: select a position
      setSelectedPosition(clickedPosition)
    } else if (selectedPosition === clickedPosition) {
      // Tapped same position: deselect
      setSelectedPosition(null)
    } else {
      // Second tap: swap
      const mapping = permutation.getMappingArray()
      const valFrom = mapping[selectedPosition]
      const valTo = mapping[clickedPosition]

      const newPerm = permutation.clone()
      newPerm.setMapping(selectedPosition + 1, valTo)
      newPerm.setMapping(clickedPosition + 1, valFrom)
      setPermutation(newPerm)
      
      setSelectedPosition(null)
    }
  }

  const resetPermutation = () => {
    setIsAnimating(true)
    const newPerm = new PermutationBuilder(4)
    setPermutation(newPerm)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const applyRandomPermutation = () => {
    setIsAnimating(true)
    const newPerm = new PermutationBuilder(4)
    newPerm.randomize()
    setPermutation(newPerm)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const mappingArray = permutation.getMappingArray()

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

      <div className={styles.permutationDisplay} style={{ textAlign: 'center' }}>
        <h3>Two-Line Notation (Definition)</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>
          Top row is the input (domain), bottom row is the output (image).
        </p>

        <div className={styles.positions} style={{ flexDirection: 'column', gap: '10px' }}>
           {/* Top Row: Domain (1, 2, 3, 4) */}
           <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
            {[0, 1, 2, 3].map(position => (
              <div
                key={`domain-${position}`}
                className={styles.position}
                style={{
                  borderColor: 'transparent',
                  background: 'transparent',
                  height: '40px',
                  width: '80px',
                  marginBottom: '-10px',
                  color: '#7f8c8d',
                  fontWeight: 'bold'
                 }}
              >
                {position + 1}
                <div style={{
                  position: 'absolute',
                  bottom: '-15px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '2px',
                  height: '10px',
                  background: '#bdc3c7'
                }} />
              </div>
            ))}
          </div>

          {/* Bottom Row: Image (Draggable Values) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
            {[0, 1, 2, 3].map(position => {
              const value = mappingArray[position]
              
              return (
                <div
                  key={position}
                  className={`${styles.position} ${dragOverPosition === position ? styles.dragOver : ''}`}
                  onDragOver={(e) => handleDragOver(e, position)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, position)}
                >
                  <div
                    className={`${styles.element} ${isAnimating ? styles.animating : ''} ${
                      draggingFrom === position ? styles.dragging : ''
                    } ${
                      selectedPosition === position ? styles.selected : ''
                    }`}
                    draggable={!isTouchDevice}
                    onDragStart={(e) => !isTouchDevice && handleDragStart(e, position)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => handleElementClick(position, e)}
                    onTouchStart={(e) => {
                      e.stopPropagation()
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleElementClick(position)
                    }}
                    style={{
                      backgroundColor: `hsl(${(value - 1) * 90}, 70%, 60%)`,
                      cursor: 'grab'
                    }}
                  >
                    {value}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className={styles.visualContainer} ref={containerRef} style={{ marginTop: '40px' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Cycle Graph (Structure)</h3>

        {/* Graph Nodes (Fixed 1, 2, 3, 4) */}
        <div className={styles.positions}>
          {[0, 1, 2, 3].map(position => (
            <div
              key={`graph-node-${position}`}
              className={styles.position}
              style={{ border: 'none', background: 'transparent' }}
            >
              <div
                className={styles.element}
                style={{
                   backgroundColor: '#ecf0f1',
                   color: '#2c3e50',
                   border: `2px solid hsl(${position * 90}, 70%, 60%)`,
                   cursor: 'default',
                   boxShadow: 'none'
                }}
              >
                {position + 1}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.arrows}>
          {(() => {
            // Calculate arrow paths
            // Arrows go from i to sigma(i)
            // i is the position (0..3), sigma(i) is mappingArray[i] (1..4)
            // So arrow from i to mappingArray[i] - 1
            const arrows: Array<{from: number, to: number, idx: number}> = []
            mappingArray.forEach((targetValue, sourceIdx) => {
              const from = sourceIdx
              const to = targetValue - 1
              if (from !== to) {
                arrows.push({from, to, idx: sourceIdx})
              }
            })
            
            // Group arrows by their span to detect overlaps
            const arrowGroups = new Map<string, typeof arrows>()
            arrows.forEach(arrow => {
              const key = `${Math.min(arrow.from, arrow.to)}-${Math.max(arrow.from, arrow.to)}`
              if (!arrowGroups.has(key)) {
                arrowGroups.set(key, [])
              }
              arrowGroups.get(key)!.push(arrow)
            })
            
            return arrows.map(arrow => {
              const { from, to, idx } = arrow
              const spacing = 120 // Assumed spacing from CSS
              const startX = from * spacing + 40
              const endX = to * spacing + 40
              const width = Math.abs(endX - startX)
              const leftPos = Math.min(startX, endX)
              
              // Get the group this arrow belongs to
              const key = `${Math.min(from, to)}-${Math.max(from, to)}`
              const group = arrowGroups.get(key) || []
              const groupIndex = group.findIndex(a => a.idx === idx)
              const groupSize = group.length
              
              // Calculate vertical offset based on position in group
              const baseHeight = Math.min(width * 0.3, 35)
              const heightOffset = groupSize > 1 ? (groupIndex - (groupSize - 1) / 2) * 15 : 0
              const curveHeight = baseHeight + Math.abs(heightOffset)
              const svgHeight = curveHeight + 20
              
              return (
                <svg
                  key={`arrow-${idx}`}
                  className={styles.arrow}
                  style={{
                    left: `${leftPos}px`,
                    width: `${width + 10}px`,
                    top: `${90 - Math.max(0, heightOffset)}px`,
                    height: `${svgHeight}px`,
                    zIndex: groupSize - groupIndex
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
                    d={`M ${startX < endX ? 5 : width + 5} 5 Q ${width/2 + 5} ${curveHeight}, ${startX < endX ? width + 5 : 5} 5`}
                    stroke={`hsl(${idx * 90}, 70%, 60%)`}
                    strokeWidth="2"
                    fill="none"
                    markerEnd={`url(#arrowhead-${idx})`}
                    opacity="0.8"
                  />
                </svg>
              )
            })
          })()}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
         <span className={styles.label}>Current Cycle Notation:</span>
         <span className={styles.cycle} style={{ marginLeft: '10px' }}>{permutation.getCycleNotation()}</span>
      </div>

      <div className={styles.instructions}>
        <p>🎯 Drag numbers in the bottom row to swap them and define the permutation.</p>
        <p>📝 The top row is the input, the bottom row is the output.</p>
        {isTouchDevice && selectedPosition !== null && (
          <p className={styles.hint}>✨ Now tap another number to swap</p>
        )}
      </div>
    </div>
  )
}

export default PermutationVisualizer