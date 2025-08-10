import { useState, useRef } from 'react'
import { PermutationBuilder } from '@/utils/permutation-builder'
import styles from './PermutationVisualizer.module.css'

const PermutationVisualizer = () => {
  const [permutation, setPermutation] = useState(() => new PermutationBuilder(4))
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [isTouchDevice] = useState(() => 'ontouchstart' in window)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent, position: number) => {
    setDraggingFrom(position)
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
    if (draggingFrom === null) return

    const newPerm = permutation.clone()
    // Convert positions to 1-indexed for the permutation class
    newPerm.setMapping(draggingFrom + 1, targetPosition + 1)
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
    
    // Prevent any default behavior that might cause navigation
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
      // Second tap: create mapping
      const newPerm = permutation.clone()
      newPerm.setMapping(selectedPosition + 1, clickedPosition + 1)
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
            {permutation.getMappingArray().map((value, idx) => (
              <span key={idx} className={styles.number}>
                {value}
              </span>
            ))}
          </div>
        </div>

        {permutation.isBijection() ? (
          <div className={styles.cycleNotation}>
            <span className={styles.label}>Cycle notation:</span>
            <span className={styles.cycle}>{permutation.getCycleNotation()}</span>
          </div>
        ) : (
          <div className={styles.validationFeedback}>
            {(() => {
              const errors = permutation.getBijectionErrors()
              const messages: string[] = []
              
              if (errors.unmappedSources.length > 0) {
                messages.push(`Unmapped: ${errors.unmappedSources.join(', ')}`)
              }
              
              if (errors.duplicateTargets.size > 0) {
                const duplicates = Array.from(errors.duplicateTargets.entries())
                  .map(([target, sources]) => `${sources.join(', ')} → ${target}`)
                messages.push(`Multiple mappings to same target: ${duplicates.join('; ')}`)
              }
              
              if (messages.length === 0) {
                messages.push('Complete the mapping to form a bijection')
              }
              
              return (
                <div className={styles.errorMessage}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <span>{messages.join(' | ')}</span>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <div className={styles.visualContainer} ref={containerRef}>
        <div className={styles.positions}>
          {[0, 1, 2, 3].map(position => {
            const mappingValue = permutation.getMappingArray()[position]
            const hasNonIdentityMapping = mappingValue !== position + 1
            
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
                    backgroundColor: `hsl(${position * 90}, 70%, 60%)`
                  }}
                >
                  {position + 1}
                  {hasNonIdentityMapping && (
                    <button
                      className={styles.clearMapping}
                      onClick={(e) => {
                        e.stopPropagation()
                        const newPerm = permutation.clone()
                        newPerm.setMapping(position + 1, position + 1)
                        setPermutation(newPerm)
                      }}
                      aria-label={`Clear mapping for ${position + 1}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.arrows}>
          {permutation.getMappingArray().map((targetValue, sourceIdx) => {
            // sourceIdx is the position we're mapping FROM (0-indexed)
            // targetValue is what it maps TO (1-indexed)
            const from = sourceIdx
            const to = targetValue - 1  // Convert to 0-indexed for position
            if (from === to) return null  // Don't show arrow if it maps to itself
            
            // 80px box width + 40px gap = 120px between centers
            const spacing = 120
            const startX = from * spacing + 40  // Center of the "from" box
            const endX = to * spacing + 40  // Center of the "to" box
            const width = Math.abs(endX - startX)
            const leftPos = Math.min(startX, endX)
            
            return (
              <svg
                key={`arrow-${sourceIdx}`}
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
                    id={`arrowhead-${sourceIdx}`}
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3, 0 6"
                      fill={`hsl(${sourceIdx * 90}, 70%, 60%)`}
                    />
                  </marker>
                </defs>
                <path
                  d={`M ${startX < endX ? 5 : width + 5} 5 Q ${width/2 + 5} ${Math.min(width * 0.3, 30)}, ${startX < endX ? width + 5 : 5} 5`}
                  stroke={`hsl(${sourceIdx * 90}, 70%, 60%)`}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={`url(#arrowhead-${sourceIdx})`}
                />
              </svg>
            )
          })}
        </div>
      </div>

      <div className={styles.instructions}>
        <p>🎯 {isTouchDevice ? 'Tap two numbers to create a mapping' : 'Drag a number onto another to create a mapping'}</p>
        <p>📝 Create a complete bijection to see the cycle notation</p>
        {isTouchDevice && selectedPosition !== null && (
          <p className={styles.hint}>✨ Now tap where {selectedPosition + 1} should map to</p>
        )}
      </div>
    </div>
  )
}

export default PermutationVisualizer