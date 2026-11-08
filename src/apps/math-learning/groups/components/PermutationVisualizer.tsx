import { useState } from 'react'
import { asPermutation, collisions, formatCycles, identityPerm } from '../engine/permutations'
import { shuffle } from '../problems/rng'
import styles from './PermutationVisualizer.module.css'

const N = 4
const POSITIONS = identityPerm(N)

/**
 * Build a map {1, 2, 3, 4} → {1, 2, 3, 4} by dragging (or, on a touch
 * screen, tapping two numbers). Until the map is a bijection it says where
 * it collides; once it is, it shows the permutation's cycles.
 */
const PermutationVisualizer = () => {
  // images[i] is where i + 1 goes, minus one: a map, not yet necessarily a Perm.
  const [images, setImages] = useState<readonly number[]>(POSITIONS)
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [isTouchDevice] = useState(() => 'ontouchstart' in window)

  const send = (from: number, to: number) => setImages(prev => prev.map((image, i) => (i === from ? to : image)))

  const handleDragStart = (e: React.DragEvent, position: number) => {
    setDraggingFrom(position)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, position: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPosition(position)
  }

  const handleDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    if (draggingFrom === null) return
    send(draggingFrom, targetPosition)
    setDraggingFrom(null)
    setDragOverPosition(null)
  }

  const handleDragEnd = () => {
    setDraggingFrom(null)
    setDragOverPosition(null)
  }

  const handleElementClick = (clickedPosition: number, e?: React.MouseEvent) => {
    if (!isTouchDevice) return
    // Keep the tap from doing anything else, like following a link.
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (selectedPosition === null) {
      setSelectedPosition(clickedPosition)
    } else if (selectedPosition === clickedPosition) {
      setSelectedPosition(null)
    } else {
      send(selectedPosition, clickedPosition)
      setSelectedPosition(null)
    }
  }

  const animateTo = (next: readonly number[]) => {
    setIsAnimating(true)
    setImages(next)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const permutation = asPermutation(images)

  // Arrows for the moved points; arrows spanning the same pair of positions are fanned out.
  const arrows = images.map((to, from) => ({ from, to })).filter(({ from, to }) => from !== to)
  const spanKey = ({ from, to }: { from: number; to: number }) => `${Math.min(from, to)}-${Math.max(from, to)}`
  const spans = new Map<string, number[]>()
  arrows.forEach(a => spans.set(spanKey(a), [...(spans.get(spanKey(a)) ?? []), a.from]))

  return (
    <div className={styles.visualizer}>
      <div className={styles.controls}>
        <button onClick={() => animateTo(POSITIONS)} className={styles.button}>
          Reset
        </button>
        <button onClick={() => animateTo(shuffle(Math.random, POSITIONS))} className={styles.button}>
          Random
        </button>
      </div>

      <div className={styles.permutationDisplay}>
        <div className={styles.twoLineNotation}>
          <div className={styles.row}>
            <span className={styles.label}>Original:</span>
            {POSITIONS.map(i => (
              <span key={i} className={styles.number}>
                {i + 1}
              </span>
            ))}
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Maps to:</span>
            {images.map((image, i) => (
              <span key={i} className={styles.number}>
                {image + 1}
              </span>
            ))}
          </div>
        </div>

        {permutation ? (
          <div className={styles.cycleNotation}>
            <span className={styles.label}>Cycle notation:</span>
            <span className={styles.cycle}>{formatCycles(permutation)}</span>
          </div>
        ) : (
          <div className={styles.validationFeedback}>
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              <span>
                Multiple mappings to same target:{' '}
                {collisions(images)
                  .map(({ target, sources }) => `${sources.join(', ')} → ${target}`)
                  .join('; ')}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.visualContainer}>
        <div className={styles.positions}>
          {POSITIONS.map(position => (
            <div
              key={position}
              className={`${styles.position} ${dragOverPosition === position ? styles.dragOver : ''}`}
              onDragOver={e => handleDragOver(e, position)}
              onDragLeave={() => setDragOverPosition(null)}
              onDrop={e => handleDrop(e, position)}
            >
              <div
                className={`${styles.element} ${isAnimating ? styles.animating : ''} ${
                  draggingFrom === position ? styles.dragging : ''
                } ${selectedPosition === position ? styles.selected : ''}`}
                draggable={!isTouchDevice}
                onDragStart={e => !isTouchDevice && handleDragStart(e, position)}
                onDragEnd={handleDragEnd}
                onClick={e => handleElementClick(position, e)}
                onTouchStart={e => {
                  e.stopPropagation()
                }}
                onTouchEnd={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleElementClick(position)
                }}
                style={{ backgroundColor: `hsl(${position * 90}, 70%, 60%)` }}
              >
                {position + 1}
                {images[position] !== position && (
                  <button
                    className={styles.clearMapping}
                    onClick={e => {
                      e.stopPropagation()
                      send(position, position)
                    }}
                    aria-label={`Clear mapping for ${position + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.arrows}>
          {arrows.map(arrow => {
            const { from, to } = arrow
            const spacing = 120
            const startX = from * spacing + 40
            const endX = to * spacing + 40
            const width = Math.abs(endX - startX)
            const leftPos = Math.min(startX, endX)

            const group = spans.get(spanKey(arrow)) ?? []
            const groupIndex = group.indexOf(from)
            const groupSize = group.length

            const baseHeight = Math.min(width * 0.3, 35)
            const heightOffset = groupSize > 1 ? (groupIndex - (groupSize - 1) / 2) * 15 : 0
            const curveHeight = baseHeight + Math.abs(heightOffset)
            const svgHeight = curveHeight + 20

            return (
              <svg
                key={`arrow-${from}`}
                className={styles.arrow}
                style={{
                  left: `${leftPos}px`,
                  width: `${width + 10}px`,
                  top: `${90 - Math.max(0, heightOffset)}px`,
                  height: `${svgHeight}px`,
                  zIndex: groupSize - groupIndex,
                }}
              >
                <defs>
                  <marker id={`arrowhead-${from}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill={`hsl(${from * 90}, 70%, 60%)`} />
                  </marker>
                </defs>
                <path
                  d={`M ${startX < endX ? 5 : width + 5} 5 Q ${width / 2 + 5} ${curveHeight}, ${startX < endX ? width + 5 : 5} 5`}
                  stroke={`hsl(${from * 90}, 70%, 60%)`}
                  strokeWidth="2"
                  fill="none"
                  markerEnd={`url(#arrowhead-${from})`}
                  opacity="0.8"
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
