import { useState } from 'react'
import styles from './VennDiagramBuilder.module.css'

const VennDiagramBuilder = () => {
  const [setA, setSetA] = useState<string[]>(['1', '2', '3'])
  const [setB, setSetB] = useState<string[]>(['2', '3', '4'])
  const [operation, setOperation] = useState<'union' | 'intersection' | 'difference' | 'symmetric'>('union')
  const [inputA, setInputA] = useState('1,2,3')
  const [inputB, setInputB] = useState('2,3,4')

  const updateSets = () => {
    setSetA(inputA.split(',').map(s => s.trim()).filter(s => s))
    setSetB(inputB.split(',').map(s => s.trim()).filter(s => s))
  }

  const getResult = () => {
    const bSet = new Set(setB)
    
    switch (operation) {
      case 'union':
        return Array.from(new Set([...setA, ...setB]))
      case 'intersection':
        return setA.filter(x => bSet.has(x))
      case 'difference':
        return setA.filter(x => !bSet.has(x))
      case 'symmetric': {
        const union = new Set([...setA, ...setB])
        const intersection = setA.filter(x => bSet.has(x))
        const intersectionSet = new Set(intersection)
        return Array.from(union).filter(x => !intersectionSet.has(x))
      }
      default:
        return []
    }
  }

  const result = getResult()
  const onlyA = setA.filter(x => !setB.includes(x))
  const onlyB = setB.filter(x => !setA.includes(x))
  const both = setA.filter(x => setB.includes(x))

  const isInResult = (element: string) => result.includes(element)

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.inputGroup}>
          <label>Set A:</label>
          <input
            type="text"
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            placeholder="Enter comma-separated values"
            className={styles.input}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Set B:</label>
          <input
            type="text"
            value={inputB}
            onChange={(e) => setInputB(e.target.value)}
            placeholder="Enter comma-separated values"
            className={styles.input}
          />
        </div>
        <button onClick={updateSets} className={styles.updateButton}>
          Update Sets
        </button>
      </div>

      <div className={styles.operationSelector}>
        <button
          className={`${styles.opButton} ${operation === 'union' ? styles.active : ''}`}
          onClick={() => setOperation('union')}
        >
          A ∪ B (Union)
        </button>
        <button
          className={`${styles.opButton} ${operation === 'intersection' ? styles.active : ''}`}
          onClick={() => setOperation('intersection')}
        >
          A ∩ B (Intersection)
        </button>
        <button
          className={`${styles.opButton} ${operation === 'difference' ? styles.active : ''}`}
          onClick={() => setOperation('difference')}
        >
          A - B (Difference)
        </button>
        <button
          className={`${styles.opButton} ${operation === 'symmetric' ? styles.active : ''}`}
          onClick={() => setOperation('symmetric')}
        >
          A △ B (Symmetric)
        </button>
      </div>

      <div className={styles.vennContainer}>
        <svg viewBox="0 0 400 300" className={styles.vennDiagram}>
          <defs>
            <pattern id="stripes" patternUnits="userSpaceOnUse" width="4" height="4">
              <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="#667eea" strokeWidth="1" opacity="0.3"/>
            </pattern>
          </defs>
          
          <circle
            cx="150"
            cy="150"
            r="80"
            fill={operation === 'union' || operation === 'difference' || operation === 'symmetric' ? 'rgba(102, 126, 234, 0.2)' : 'rgba(200, 200, 200, 0.1)'}
            stroke="#667eea"
            strokeWidth="2"
            className={styles.circleA}
          />
          
          <circle
            cx="250"
            cy="150"
            r="80"
            fill={operation === 'union' || operation === 'symmetric' ? 'rgba(118, 75, 162, 0.2)' : 'rgba(200, 200, 200, 0.1)'}
            stroke="#764ba2"
            strokeWidth="2"
            className={styles.circleB}
          />
          
          {operation === 'intersection' && (
            <path
              d="M 200 85 A 80 80 0 0 1 200 215 A 80 80 0 0 1 200 85"
              fill="rgba(102, 126, 234, 0.4)"
              className={styles.intersection}
            />
          )}
          
          {operation === 'symmetric' && (
            <path
              d="M 200 85 A 80 80 0 0 1 200 215 A 80 80 0 0 1 200 85"
              fill="url(#stripes)"
              className={styles.intersection}
            />
          )}
          
          <text x="120" y="150" className={styles.setLabel}>A</text>
          <text x="280" y="150" className={styles.setLabel}>B</text>
          
          {onlyA.slice(0, 3).map((item, i) => (
            <text
              key={`a-${i}`}
              x="130"
              y={140 + i * 20}
              className={`${styles.element} ${isInResult(item) ? styles.highlighted : ''}`}
            >
              {item}
            </text>
          ))}
          
          {both.slice(0, 3).map((item, i) => (
            <text
              key={`both-${i}`}
              x="190"
              y={140 + i * 20}
              className={`${styles.element} ${isInResult(item) ? styles.highlighted : ''}`}
            >
              {item}
            </text>
          ))}
          
          {onlyB.slice(0, 3).map((item, i) => (
            <text
              key={`b-${i}`}
              x="260"
              y={140 + i * 20}
              className={`${styles.element} ${isInResult(item) ? styles.highlighted : ''}`}
            >
              {item}
            </text>
          ))}
        </svg>
      </div>

      <div className={styles.result}>
        <h4>Result: {operation === 'union' ? 'A ∪ B' : operation === 'intersection' ? 'A ∩ B' : operation === 'difference' ? 'A - B' : 'A △ B'}</h4>
        <div className={styles.resultSet}>
          {result.length > 0 ? `{${result.join(', ')}}` : '∅'}
        </div>
      </div>

      <div className={styles.explanation}>
        <p>
          {operation === 'union' && 'The union contains all elements that are in either A or B (or both).'}
          {operation === 'intersection' && 'The intersection contains only elements that are in both A and B.'}
          {operation === 'difference' && 'The difference A - B contains elements that are in A but not in B.'}
          {operation === 'symmetric' && 'The symmetric difference contains elements in either A or B, but not in both.'}
        </p>
      </div>
    </div>
  )
}

export default VennDiagramBuilder