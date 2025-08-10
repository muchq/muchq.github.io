import { useState } from 'react'
import styles from './SetOperationsVisualizer.module.css'

const SetOperationsVisualizer = () => {
  const [step, setStep] = useState(0)
  
  const steps = [
    { operation: 'Initial Sets', description: 'A = {1, 2, 3, 4}, B = {3, 4, 5, 6}' },
    { operation: 'Union A ∪ B', description: 'Combine all elements: {1, 2, 3, 4, 5, 6}' },
    { operation: 'Intersection A ∩ B', description: 'Common elements: {3, 4}' },
    { operation: 'Difference A - B', description: 'Elements in A but not B: {1, 2}' },
    { operation: 'Symmetric Difference A △ B', description: 'Elements in exactly one set: {1, 2, 5, 6}' },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.stepControls}>
        <button 
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className={styles.stepButton}
        >
          Previous
        </button>
        <span className={styles.stepIndicator}>
          Step {step + 1} of {steps.length}
        </span>
        <button 
          onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
          disabled={step === steps.length - 1}
          className={styles.stepButton}
        >
          Next
        </button>
      </div>
      
      <div className={styles.visualization}>
        <h3>{steps[step].operation}</h3>
        <p>{steps[step].description}</p>
        
        <div className={styles.setDisplay}>
          <div className={`${styles.set} ${step > 0 ? styles.animated : ''}`}>
            <h4>Set A</h4>
            <div className={styles.elements}>
              {[1, 2, 3, 4].map(n => (
                <span 
                  key={n} 
                  className={`${styles.element} ${
                    (step === 1) || 
                    (step === 2 && (n === 3 || n === 4)) ||
                    (step === 3 && (n === 1 || n === 2)) ||
                    (step === 4 && (n === 1 || n === 2))
                    ? styles.highlight : ''
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          
          <div className={styles.operator}>
            {step === 1 && '∪'}
            {step === 2 && '∩'}
            {step === 3 && '-'}
            {step === 4 && '△'}
          </div>
          
          <div className={`${styles.set} ${step > 0 ? styles.animated : ''}`}>
            <h4>Set B</h4>
            <div className={styles.elements}>
              {[3, 4, 5, 6].map(n => (
                <span 
                  key={n} 
                  className={`${styles.element} ${
                    (step === 1) || 
                    (step === 2 && (n === 3 || n === 4)) ||
                    (step === 4 && (n === 5 || n === 6))
                    ? styles.highlight : ''
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SetOperationsVisualizer