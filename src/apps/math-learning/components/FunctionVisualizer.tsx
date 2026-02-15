import { useState, useRef } from 'react'
import styles from './FunctionVisualizer.module.css'

interface FunctionMapping {
  from: number
  to: number | null
}

const PropertyBadge = ({ property, value, label }: { property: string, value: boolean, label: string }) => (
  <div className={`${styles.propertyBadge} ${value ? styles.satisfied : styles.notSatisfied}`}>
    <span className={styles.propertyLabel}>{property}</span>
    <span className={`${styles.propertyValue} ${value ? styles.true : styles.false}`}>
      {value ? '✓' : '✗'}
    </span>
    <div className={styles.tooltip}>{label}</div>
  </div>
)

const FunctionVisualizer = () => {
  const [domainSize, setDomainSize] = useState(4)
  const [codomainSize, setCodomainSize] = useState(4)
  const [mappings, setMappings] = useState<FunctionMapping[]>(() => {
    const initialMappings: FunctionMapping[] = []
    for (let i = 1; i <= 4; i++) {
      initialMappings.push({ from: i, to: null })
    }
    return initialMappings
  })
  const [draggedElement, setDraggedElement] = useState<number | null>(null)
  
  const svgRef = useRef<SVGSVGElement>(null)

  const updateDomainSize = (size: number) => {
    setDomainSize(size)
    const newMappings: FunctionMapping[] = []
    for (let i = 1; i <= size; i++) {
      // Try to preserve existing mappings if possible
      const existing = mappings.find(m => m.from === i)
      newMappings.push({ from: i, to: existing ? existing.to : null })
    }
    setMappings(newMappings)
  }

  const updateCodomainSize = (size: number) => {
    setCodomainSize(size)
    // Clear mappings that are out of bounds
    const newMappings = mappings.map(m => {
      if (m.to && m.to > size) {
        return { ...m, to: null }
      }
      return m
    })
    setMappings(newMappings)
  }

  // Derived properties
  const definedMappings = mappings.filter(m => m.to !== null)

  // Is it a function? Every domain element must map to exactly one codomain element
  const isFunction = definedMappings.length === domainSize

  // Is it injective? No two domain elements map to the same codomain element
  const usedTargets = definedMappings.map(m => m.to)
  const isInjective = isFunction && new Set(usedTargets).size === usedTargets.length

  // Is it surjective? Every codomain element is mapped to by at least one domain element
  const targetSet = new Set(usedTargets)
  const isSurjective = isFunction && targetSet.size === codomainSize &&
                      Array.from({length: codomainSize}, (_, i) => i + 1).every(i => targetSet.has(i))

  // Is it bijective? Both injective and surjective
  const isBijective = isInjective && isSurjective

  const properties = { isInjective, isSurjective, isBijective, isFunction }

  const handleDragStart = (domainElement: number) => {
    setDraggedElement(domainElement)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (codomainElement: number) => {
    if (draggedElement !== null) {
      const newMappings = mappings.map(m =>
        m.from === draggedElement ? { ...m, to: codomainElement } : m
      )
      setMappings(newMappings)
      setDraggedElement(null)
    }
  }

  const clearMapping = (domainElement: number) => {
    const newMappings = mappings.map(m =>
      m.from === domainElement ? { ...m, to: null } : m
    )
    setMappings(newMappings)
  }

  const clearAllMappings = () => {
    const newMappings = mappings.map(m => ({ ...m, to: null }))
    setMappings(newMappings)
  }

  const loadExample = (type: 'identity' | 'constant' | 'bijection' | 'injection') => {
    const newMappings = [...mappings]
    
    switch (type) {
      case 'identity':
        for (let i = 0; i < Math.min(domainSize, codomainSize); i++) {
          newMappings[i] = { from: i + 1, to: i + 1 }
        }
        break
      case 'constant':
        for (let i = 0; i < domainSize; i++) {
          newMappings[i] = { from: i + 1, to: 1 }
        }
        break
      case 'bijection':
        if (domainSize === codomainSize) {
          const shuffled = Array.from({length: codomainSize}, (_, i) => i + 1)
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          for (let i = 0; i < domainSize; i++) {
            newMappings[i] = { from: i + 1, to: shuffled[i] }
          }
        }
        break
      case 'injection':
        for (let i = 0; i < Math.min(domainSize, codomainSize); i++) {
          newMappings[i] = { from: i + 1, to: i + 1 }
        }
        break
    }
    
    setMappings(newMappings)
  }

  const getDomainElementStyle = (element: number) => {
    const mapping = mappings.find(m => m.from === element)
    if (!mapping?.to) return styles.domainElement
    
    const usedCount = mappings.filter(m => m.to === mapping.to).length
    if (usedCount > 1) return `${styles.domainElement} ${styles.notInjective}`
    
    return `${styles.domainElement} ${styles.mapped}`
  }

  const getCodomainElementStyle = (element: number) => {
    const isMappedTo = mappings.some(m => m.to === element)
    return `${styles.codomainElement} ${isMappedTo ? styles.targeted : styles.untargeted}`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Function Visualizer</h2>
        <p>Drag from domain elements to codomain elements to create mappings</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.sizeControls}>
          <div className={styles.inputGroup}>
            <label>Domain size:</label>
            <select value={domainSize} onChange={(e) => updateDomainSize(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div className={styles.inputGroup}>
            <label>Codomain size:</label>
            <select value={codomainSize} onChange={(e) => updateCodomainSize(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.examples}>
          <span>Examples:</span>
          <button onClick={() => loadExample('identity')} className={styles.exampleButton}>
            Identity
          </button>
          <button onClick={() => loadExample('constant')} className={styles.exampleButton}>
            Constant
          </button>
          <button onClick={() => loadExample('bijection')} className={styles.exampleButton} disabled={domainSize !== codomainSize}>
            Bijection
          </button>
          <button onClick={() => loadExample('injection')} className={styles.exampleButton}>
            Injection
          </button>
          <button onClick={clearAllMappings} className={styles.clearButton}>
            Clear All
          </button>
        </div>
      </div>

      <div className={styles.visualizer}>
        <div className={styles.setsContainer}>
          <div className={styles.domainSet}>
            <h3>Domain</h3>
            <div className={styles.elements}>
              {Array.from({length: domainSize}, (_, i) => i + 1).map(element => (
                <div
                  key={element}
                  className={getDomainElementStyle(element)}
                  draggable
                  onDragStart={() => handleDragStart(element)}
                  onDoubleClick={() => clearMapping(element)}
                >
                  {element}
                  <div className={styles.elementTooltip}>
                    Drag to codomain or double-click to clear
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.arrowsContainer}>
            <svg ref={svgRef} className={styles.arrowsSvg} viewBox="0 0 200 300">
              {mappings.filter(m => m.to !== null).map((mapping, index) => {
                const fromY = 50 + (mapping.from - 1) * (200 / domainSize)
                const toY = 50 + (mapping.to! - 1) * (200 / codomainSize)
                const usedCount = mappings.filter(m => m.to === mapping.to).length
                
                return (
                  <g key={index}>
                    <line
                      x1="20"
                      y1={fromY}
                      x2="180"
                      y2={toY}
                      stroke={usedCount > 1 ? "#ff6b6b" : "#667eea"}
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      className={styles.mappingLine}
                    />
                  </g>
                )
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                  refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#667eea" />
                </marker>
              </defs>
            </svg>
          </div>

          <div className={styles.codomainSet}>
            <h3>Codomain</h3>
            <div className={styles.elements}>
              {Array.from({length: codomainSize}, (_, i) => i + 1).map(element => (
                <div
                  key={element}
                  className={getCodomainElementStyle(element)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(element)}
                >
                  {element}
                  <div className={styles.elementTooltip}>
                    Drop domain elements here
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.analysis}>
        <div className={styles.properties}>
          <h3>Function Properties</h3>
          <div className={styles.propertiesGrid}>
            <PropertyBadge
              property="Function"
              value={properties.isFunction}
              label="Every domain element maps to exactly one codomain element"
            />
            <PropertyBadge
              property="Injective"
              value={properties.isInjective}
              label="One-to-one: No two domain elements map to the same codomain element"
            />
            <PropertyBadge
              property="Surjective"
              value={properties.isSurjective}
              label="Onto: Every codomain element is mapped to by at least one domain element"
            />
            <PropertyBadge
              property="Bijective"
              value={properties.isBijective}
              label="Both injective and surjective: Perfect one-to-one correspondence"
            />
          </div>
        </div>

        <div className={styles.summary}>
          <h4>Function Analysis</h4>
          <div className={styles.summaryContent}>
            {!properties.isFunction && (
              <div className={styles.issue}>
                ⚠️ Not a function: Some domain elements are unmapped or multiply mapped
              </div>
            )}
            {properties.isFunction && !properties.isInjective && (
              <div className={styles.issue}>
                ⚠️ Not injective: Multiple domain elements map to the same codomain element
              </div>
            )}
            {properties.isFunction && !properties.isSurjective && (
              <div className={styles.issue}>
                ⚠️ Not surjective: Some codomain elements are not mapped to
              </div>
            )}
            {properties.isBijective && (
              <div className={styles.success}>
                ✨ Perfect bijection! This function has an inverse.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FunctionVisualizer