import { useState, useEffect } from 'react'
import styles from './PermutationQuiz.module.css'

interface Question {
  id: string
  type: 'composition' | 'inverse' | 'order' | 'cycle'
  question: string
  answer: string
  hint: string
  explanation: string
}

const questions: Record<number, Question[]> = {
    1: [
      {
        id: '1-1',
        type: 'composition',
        question: 'In S₃, let σ = (1 2 3) → (2 3 1) and τ = (1 2 3) → (1 3 2). What is στ?',
        answer: '3 1 2',
        hint: 'Remember: στ means apply τ first, then σ',
        explanation: 'τ sends 1→1, 2→3, 3→2. Then σ sends 1→2, 3→1, 2→3. So στ: 1→1→2, 2→3→1, 3→2→3'
      },
      {
        id: '1-2',
        type: 'inverse',
        question: 'What is the inverse of σ = (1 2 3 4) → (3 1 4 2)?',
        answer: '2 4 1 3',
        hint: 'The inverse undoes the permutation. If σ(1)=3, then σ⁻¹(3)=1',
        explanation: 'To find the inverse, swap the rows and sort by the top row: (3 1 4 2) → (1 2 3 4) becomes (1 2 3 4) → (2 4 1 3)'
      }
    ],
    2: [
      {
        id: '2-1',
        type: 'cycle',
        question: 'Convert (1 3 5)(2 4) to two-line notation for S₅',
        answer: '3 4 5 2 1',
        hint: '(1 3 5) means 1→3→5→1, and (2 4) means 2→4→2',
        explanation: 'Following the cycles: 1→3, 2→4, 3→5, 4→2, 5→1'
      },
      {
        id: '2-2',
        type: 'order',
        question: 'What is the order of (1 2 3)(4 5)?',
        answer: '6',
        hint: 'The order is the LCM of the cycle lengths',
        explanation: 'Cycle lengths are 3 and 2. LCM(3,2) = 6'
      }
    ],
    3: [
      {
        id: '3-1',
        type: 'order',
        question: 'Find the order of (1 2 3 4 5 6)',
        answer: '6',
        hint: 'A k-cycle has order k',
        explanation: 'A 6-cycle has order 6. After applying it 6 times, every element returns to its original position.'
      },
      {
        id: '3-2',
        type: 'composition',
        question: 'In cycle notation, compute (1 2)(2 3)',
        answer: '(1 2 3)',
        hint: 'Apply from right to left: first (2 3), then (1 2)',
        explanation: '(2 3): 1→1, 2→3, 3→2. Then (1 2): 1→2, 3→3, 2→1. Result: 1→2→3→1'
      }
    ]
}

const PermutationQuiz = ({ chapter }: { chapter: number }) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [score, setScore] = useState(0)
  const [attempted, setAttempted] = useState(0)

  const getRandomQuestion = () => {
    const chapterQuestions = questions[chapter] || questions[1]
    const randomIndex = Math.floor(Math.random() * chapterQuestions.length)
    return chapterQuestions[randomIndex]
  }

  useEffect(() => {
    const chapterQuestions = questions[chapter] || questions[1]
    const randomIndex = Math.floor(Math.random() * chapterQuestions.length)
    setCurrentQuestion(chapterQuestions[randomIndex])
    setShowFeedback(false)
    setUserAnswer('')
    setShowHint(false)
  }, [chapter])

  const checkAnswer = () => {
    if (!currentQuestion) return
    
    const normalizedUser = userAnswer.replace(/[(),\s]+/g, ' ').trim()
    const normalizedAnswer = currentQuestion.answer.replace(/[(),\s]+/g, ' ').trim()
    
    const correct = normalizedUser === normalizedAnswer
    setIsCorrect(correct)
    setShowFeedback(true)
    setAttempted(attempted + 1)
    if (correct) {
      setScore(score + 1)
    }
  }

  const nextQuestion = () => {
    setCurrentQuestion(getRandomQuestion())
    setShowFeedback(false)
    setUserAnswer('')
    setShowHint(false)
  }

  if (!currentQuestion) return null

  return (
    <div className={styles.quiz}>
      <div className={styles.header}>
        <h3>Practice Problem</h3>
        <div className={styles.score}>
          Score: {score}/{attempted}
        </div>
      </div>

      <div className={styles.question}>
        <p>{currentQuestion.question}</p>
      </div>

      <div className={styles.answerSection}>
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          className={styles.input}
          placeholder="Enter your answer..."
          disabled={showFeedback}
          onKeyPress={(e) => e.key === 'Enter' && !showFeedback && checkAnswer()}
        />
        
        <div className={styles.buttons}>
          {!showFeedback ? (
            <>
              <button onClick={checkAnswer} className={styles.submitButton}>
                Check Answer
              </button>
              <button onClick={() => setShowHint(!showHint)} className={styles.hintButton}>
                {showHint ? 'Hide' : 'Show'} Hint
              </button>
            </>
          ) : (
            <button onClick={nextQuestion} className={styles.nextButton}>
              Next Question
            </button>
          )}
        </div>
      </div>

      {showHint && !showFeedback && (
        <div className={styles.hint}>
          💡 {currentQuestion.hint}
        </div>
      )}

      {showFeedback && (
        <div className={`${styles.feedback} ${isCorrect ? styles.correct : styles.incorrect}`}>
          <h4>{isCorrect ? '✅ Correct!' : '❌ Not quite right'}</h4>
          {!isCorrect && (
            <p>The correct answer is: <strong>{currentQuestion.answer}</strong></p>
          )}
          <p className={styles.explanation}>{currentQuestion.explanation}</p>
        </div>
      )}
    </div>
  )
}

export default PermutationQuiz