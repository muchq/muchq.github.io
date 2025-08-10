import { useState, useEffect } from 'react'
import styles from './RelationMatrixCalculator.module.css'

interface RelationProperties {
  reflexive: boolean
  symmetric: boolean
  transitive: boolean
  antisymmetric: boolean
}

const RelationMatrixCalculator = () => {
  const [matrix, setMatrix] = useState<boolean[][]>(
    Array(4).fill(null).map(() => Array(4).fill(false))
  )
  const [properties, setProperties] = useState<RelationProperties>({
    reflexive: false,
    symmetric: false,
    transitive: false,
    antisymmetric: false
  })

  const toggleCell = (row: number, col: number) => {
    const newMatrix = matrix.map((r, i) => 
      i === row ? r.map((c, j) => j === col ? !c : c) : [...r]
    )
    setMatrix(newMatrix)
  }

  const checkProperties = (matrix: boolean[][]) => {
    // Check reflexive: all diagonal elements must be true
    const reflexive = matrix.every((row, i) => row[i])
    
    // Check symmetric: matrix[i][j] === matrix[j][i] for all i,j
    const symmetric = matrix.every((row, i) =>
      row.every((cell, j) => cell === matrix[j][i])
    )
    
    // Check antisymmetric: if matrix[i][j] and matrix[j][i] are both true, then i === j
    const antisymmetric = matrix.every((row, i) =>
      row.every((cell, j) => !(cell && matrix[j][i]) || i === j)
    )
    
    // Check transitive: if matrix[i][j] and matrix[j][k] are true, then matrix[i][k] must be true
    const transitive = matrix.every((_, i) =>
      matrix.every((_, j) =>
        matrix.every((_, k) =>
          !(matrix[i][j] && matrix[j][k]) || matrix[i][k]
        )
      )
    )
    
    return { reflexive, symmetric, transitive, antisymmetric }
  }

  useEffect(() => {
    setProperties(checkProperties(matrix))
  }, [matrix])

  const presets = [
    {
      name: 'Identity',
      matrix: [[true, false, false, false], [false, true, false, false], [false, false, true, false], [false, false, false, true]]
    },
    {
      name: 'Total Order',
      matrix: [[true, true, true, true], [false, true, true, true], [false, false, true, true], [false, false, false, true]]
    },
    {
      name: 'Equivalence',
      matrix: [[true, true, false, false], [true, true, false, false], [false, false, true, true], [false, false, true, true]]
    },
    {
      name: 'Empty',
      matrix: [[false, false, false, false], [false, false, false, false], [false, false, false, false], [false, false, false, false]]
    }
  ]

  const loadPreset = (presetMatrix: boolean[][]) => {
    setMatrix(presetMatrix.map(row => [...row]))
  }

  const clearMatrix = () => {
    setMatrix(Array(4).fill(null).map(() => Array(4).fill(false)))
  }

  const PropertyIndicator = ({ property, value, description }: { property: string, value: boolean, description: string }) => (
    <div className={`${styles.property} ${value ? styles.satisfied : styles.notSatisfied}`}>
      <div className={styles.propertyHeader}>
        <span className={styles.propertyName}>{property}</span>
        <span className={`${styles.checkmark} ${value ? styles.true : styles.false}`}>
          {value ? '✓' : '✗'}
        </span>
      </div>
      <p className={styles.description}>{description}</p>
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Relation Matrix Calculator</h2>
        <p>Click cells to build a relation and analyze its properties</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.presets}>
          <span>Quick Load:</span>
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => loadPreset(preset.matrix)}
              className={styles.presetButton}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <button onClick={clearMatrix} className={styles.clearButton}>
          Clear All
        </button>
      </div>

      <div className={styles.matrixSection}>
        <div className={styles.matrixContainer}>
          <div className={styles.labels}>
            <div className={styles.topLabels}>
              <span></span>
              {[1, 2, 3, 4].map(i => (
                <span key={i} className={styles.label}>{i}</span>
              ))}
            </div>
          </div>
          <div className={styles.matrixWithSideLabels}>
            <div className={styles.sideLabels}>
              {[1, 2, 3, 4].map(i => (
                <span key={i} className={styles.label}>{i}</span>
              ))}
            </div>
            <div className={styles.matrix}>
              {matrix.map((row, i) => (
                <div key={i} className={styles.row}>
                  {row.map((cell, j) => (
                    <button
                      key={j}
                      className={`${styles.cell} ${cell ? styles.active : styles.inactive} ${i === j ? styles.diagonal : ''}`}
                      onClick={() => toggleCell(i, j)}
                    >
                      {cell ? '1' : '0'}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.properties}>
        <h3>Relation Properties</h3>
        <div className={styles.propertiesGrid}>
          <PropertyIndicator
            property="Reflexive"
            value={properties.reflexive}
            description="Every element is related to itself (diagonal all 1s)"
          />
          <PropertyIndicator
            property="Symmetric"
            value={properties.symmetric}
            description="If a~b then b~a (matrix equals its transpose)"
          />
          <PropertyIndicator
            property="Transitive"
            value={properties.transitive}
            description="If a~b and b~c then a~c (closure property)"
          />
          <PropertyIndicator
            property="Antisymmetric"
            value={properties.antisymmetric}
            description="If a~b and b~a then a=b (at most one direction except diagonal)"
          />
        </div>
      </div>

      <div className={styles.relationInfo}>
        <div className={styles.specialRelations}>
          <h4>Special Relation Types</h4>
          {properties.reflexive && properties.symmetric && properties.transitive && (
            <div className={styles.specialType}>✨ Equivalence Relation</div>
          )}
          {properties.reflexive && properties.antisymmetric && properties.transitive && (
            <div className={styles.specialType}>📊 Partial Order</div>
          )}
          {properties.reflexive && properties.antisymmetric && properties.transitive && 
           matrix.every((row, i) => matrix.every((_, j) => i !== j ? (row[j] || matrix[j][i]) : true)) && (
            <div className={styles.specialType}>🔢 Total Order</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RelationMatrixCalculator