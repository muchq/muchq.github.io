import { useState, useCallback } from 'react'
import styles from './SetQuiz.module.css'

interface SetQuizProps {
  module: number
}

interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface QuizState {
  currentQuestion: number
  selectedAnswer: number | null
  showExplanation: boolean
  score: number
  answers: (number | null)[]
  isCompleted: boolean
}

const SetQuiz = ({ module }: SetQuizProps) => {
  const [prevModule, setPrevModule] = useState(module)
  const quizData: { [key: number]: QuizQuestion[] } = {
    1: [ // Basic Set Theory
      {
        id: 1,
        question: "What is the cardinality of the set A = {2, 4, 6, 8}?",
        options: ["3", "4", "5", "8"],
        correctAnswer: 1,
        explanation: "The cardinality of a set is the number of elements it contains. Set A has 4 elements: 2, 4, 6, and 8.",
        difficulty: 'easy'
      },
      {
        id: 2,
        question: "Which of the following represents the empty set?",
        options: ["{}", "∅", "{ }", "Both A and B"],
        correctAnswer: 3,
        explanation: "The empty set can be represented as {} or ∅. Both notations represent a set with no elements.",
        difficulty: 'easy'
      },
      {
        id: 3,
        question: "If A = {1, 2, 3} and B = {2, 3, 4}, what is A ∪ B?",
        options: ["{1, 2, 3, 4}", "{2, 3}", "{1, 4}", "{1, 2, 3, 2, 3, 4}"],
        correctAnswer: 0,
        explanation: "The union A ∪ B contains all elements that are in either A or B (or both). So A ∪ B = {1, 2, 3, 4}.",
        difficulty: 'medium'
      },
      {
        id: 4,
        question: "If A = {1, 2, 3, 4} and B = {3, 4, 5, 6}, what is A ∩ B?",
        options: ["{1, 2, 5, 6}", "{3, 4}", "{1, 2, 3, 4, 5, 6}", "∅"],
        correctAnswer: 1,
        explanation: "The intersection A ∩ B contains only elements that are in both A and B. Both sets contain 3 and 4, so A ∩ B = {3, 4}.",
        difficulty: 'medium'
      },
      {
        id: 5,
        question: "What is the power set of {a, b}?",
        options: [
          "{{a}, {b}}", 
          "{∅, {a}, {b}, {a, b}}", 
          "{{a, b}}", 
          "{a, b, ∅}"
        ],
        correctAnswer: 1,
        explanation: "The power set contains all possible subsets: the empty set ∅, single element sets {a} and {b}, and the original set {a, b}.",
        difficulty: 'hard'
      }
    ],
    2: [ // Relations and Functions
      {
        id: 1,
        question: "A relation R on set A is reflexive if:",
        options: [
          "For all a ∈ A, (a,a) ∈ R",
          "For all a,b ∈ A, if (a,b) ∈ R then (b,a) ∈ R",
          "For all a,b,c ∈ A, if (a,b) ∈ R and (b,c) ∈ R then (a,c) ∈ R",
          "All elements are related to each other"
        ],
        correctAnswer: 0,
        explanation: "A relation is reflexive if every element is related to itself, meaning (a,a) ∈ R for all a in the set.",
        difficulty: 'easy'
      },
      {
        id: 2,
        question: "A function f: A → B is injective (one-to-one) if:",
        options: [
          "Every element in B is mapped to by some element in A",
          "No two different elements in A map to the same element in B",
          "f is both surjective and injective",
          "A and B have the same cardinality"
        ],
        correctAnswer: 1,
        explanation: "A function is injective if different inputs always produce different outputs. No two elements in the domain map to the same element in the codomain.",
        difficulty: 'medium'
      },
      {
        id: 3,
        question: "Which matrix represents a symmetric relation on {1,2,3}?",
        options: [
          "[[1,1,0],[0,1,1],[1,0,1]]",
          "[[1,0,1],[0,1,0],[1,0,1]]",
          "[[1,1,1],[1,1,1],[1,1,1]]",
          "[[0,1,0],[1,0,1],[0,1,0]]"
        ],
        correctAnswer: 1,
        explanation: "A symmetric relation requires that if (i,j) is in the relation, then (j,i) is also in the relation. The matrix must equal its transpose.",
        difficulty: 'hard'
      },
      {
        id: 4,
        question: "If f: ℕ → ℕ is defined by f(n) = 2n, then f is:",
        options: ["Bijective", "Injective but not surjective", "Surjective but not injective", "Neither injective nor surjective"],
        correctAnswer: 1,
        explanation: "f(n) = 2n is injective because different inputs give different outputs. However, it's not surjective because odd numbers in ℕ are never mapped to.",
        difficulty: 'medium'
      },
      {
        id: 5,
        question: "An equivalence relation must be:",
        options: [
          "Reflexive, symmetric, and transitive",
          "Reflexive, antisymmetric, and transitive",
          "Symmetric and transitive only",
          "Reflexive and symmetric only"
        ],
        correctAnswer: 0,
        explanation: "An equivalence relation must satisfy all three properties: reflexive (every element relates to itself), symmetric (if a~b then b~a), and transitive (if a~b and b~c then a~c).",
        difficulty: 'medium'
      }
    ],
    3: [ // Advanced Topics
      {
        id: 1,
        question: "What is the cardinality of the set of real numbers ℝ?",
        options: ["ℵ₀", "𝔠", "ℵ₁", "Finite"],
        correctAnswer: 1,
        explanation: "The real numbers have cardinality 𝔠 (continuum), which is uncountably infinite and larger than ℵ₀.",
        difficulty: 'medium'
      },
      {
        id: 2,
        question: "Cantor's diagonal argument proves that:",
        options: [
          "All infinite sets have the same size",
          "The real numbers are countable",
          "The power set of a set has strictly larger cardinality than the set itself",
          "The rational numbers are uncountable"
        ],
        correctAnswer: 2,
        explanation: "Cantor's diagonal argument shows that for any set A, the power set P(A) has strictly larger cardinality than A, proving there are different sizes of infinity.",
        difficulty: 'hard'
      },
      {
        id: 3,
        question: "Which statement about the Continuum Hypothesis is correct?",
        options: [
          "It has been proven true",
          "It has been proven false", 
          "It is independent of ZFC set theory",
          "It states that all sets are countable"
        ],
        correctAnswer: 2,
        explanation: "The Continuum Hypothesis is independent of ZFC set theory, meaning it can neither be proven nor disproven within the standard axioms of set theory.",
        difficulty: 'hard'
      },
      {
        id: 4,
        question: "A partial order is a relation that is:",
        options: [
          "Reflexive, symmetric, and transitive",
          "Reflexive, antisymmetric, and transitive",
          "Symmetric and transitive",
          "Reflexive and symmetric"
        ],
        correctAnswer: 1,
        explanation: "A partial order must be reflexive (a ≤ a), antisymmetric (if a ≤ b and b ≤ a then a = b), and transitive (if a ≤ b and b ≤ c then a ≤ c).",
        difficulty: 'medium'
      },
      {
        id: 5,
        question: "The axiom of choice is equivalent to:",
        options: [
          "The well-ordering principle",
          "Zorn's lemma",
          "The principle that every vector space has a basis",
          "All of the above"
        ],
        correctAnswer: 3,
        explanation: "The axiom of choice, well-ordering principle, and Zorn's lemma are all equivalent statements in ZF set theory, and they imply that every vector space has a basis.",
        difficulty: 'hard'
      }
    ]
  }

  const questions = quizData[module] || []

  const [quizState, setQuizState] = useState<QuizState>(() => ({
    currentQuestion: 0,
    selectedAnswer: null,
    showExplanation: false,
    score: 0,
    answers: new Array(questions.length).fill(null),
    isCompleted: false
  }))

  const resetQuiz = useCallback(() => {
    setQuizState({
      currentQuestion: 0,
      selectedAnswer: null,
      showExplanation: false,
      score: 0,
      answers: new Array(questions.length).fill(null),
      isCompleted: false
    })
  }, [questions.length])

  if (module !== prevModule) {
    setPrevModule(module)
    setQuizState({
      currentQuestion: 0,
      selectedAnswer: null,
      showExplanation: false,
      score: 0,
      answers: new Array(questions.length).fill(null),
      isCompleted: false
    })
  }

  const handleAnswerSelect = (answerIndex: number) => {
    setQuizState(prev => ({
      ...prev,
      selectedAnswer: answerIndex
    }))
  }

  const handleSubmitAnswer = () => {
    if (quizState.selectedAnswer === null) return

    const isCorrect = quizState.selectedAnswer === questions[quizState.currentQuestion].correctAnswer
    const newAnswers = [...quizState.answers]
    newAnswers[quizState.currentQuestion] = quizState.selectedAnswer

    setQuizState(prev => ({
      ...prev,
      showExplanation: true,
      score: prev.score + (isCorrect ? 1 : 0),
      answers: newAnswers
    }))
  }

  const handleNextQuestion = () => {
    if (quizState.currentQuestion < questions.length - 1) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion + 1,
        selectedAnswer: prev.answers[prev.currentQuestion + 1],
        showExplanation: false
      }))
    } else {
      setQuizState(prev => ({
        ...prev,
        isCompleted: true
      }))
    }
  }

  const handlePreviousQuestion = () => {
    if (quizState.currentQuestion > 0) {
      setQuizState(prev => ({
        ...prev,
        currentQuestion: prev.currentQuestion - 1,
        selectedAnswer: prev.answers[prev.currentQuestion - 1],
        showExplanation: false
      }))
    }
  }

  const getScoreMessage = () => {
    const percentage = (quizState.score / questions.length) * 100
    if (percentage >= 90) return "Excellent work! You've mastered this module! 🎉"
    if (percentage >= 75) return "Great job! You have a solid understanding! 👏"
    if (percentage >= 60) return "Good effort! Review the topics and try again! 📚"
    return "Keep studying! Set theory takes practice! 💪"
  }

  const getScoreColor = () => {
    const percentage = (quizState.score / questions.length) * 100
    if (percentage >= 75) return styles.excellent
    if (percentage >= 60) return styles.good
    return styles.needsWork
  }

  if (questions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noQuestions}>
          <h3>No quiz available for Module {module}</h3>
          <p>Please select a valid module (1, 2, or 3)</p>
        </div>
      </div>
    )
  }

  const currentQ = questions[quizState.currentQuestion]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Set Theory Quiz - Module {module}</h2>
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${((quizState.currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span className={styles.progressText}>
            Question {quizState.currentQuestion + 1} of {questions.length}
          </span>
        </div>
      </div>

      {quizState.isCompleted ? (
        <div className={styles.results}>
          <div className={`${styles.scoreCard} ${getScoreColor()}`}>
            <h3>Quiz Complete!</h3>
            <div className={styles.finalScore}>
              {quizState.score} / {questions.length}
              <span className={styles.percentage}>
                ({Math.round((quizState.score / questions.length) * 100)}%)
              </span>
            </div>
            <p className={styles.scoreMessage}>{getScoreMessage()}</p>
            <button onClick={resetQuiz} className={styles.retryButton}>
              Try Again
            </button>
          </div>

          <div className={styles.reviewSection}>
            <h4>Review Your Answers</h4>
            <div className={styles.reviewList}>
              {questions.map((q, index) => {
                const userAnswer = quizState.answers[index]
                const isCorrect = userAnswer === q.correctAnswer
                return (
                  <div key={q.id} className={`${styles.reviewItem} ${isCorrect ? styles.correct : styles.incorrect}`}>
                    <div className={styles.reviewQuestion}>
                      <span className={styles.questionNumber}>Q{index + 1}:</span>
                      <span>{q.question}</span>
                    </div>
                    <div className={styles.reviewAnswer}>
                      Your answer: <strong>{q.options[userAnswer!]}</strong>
                      {!isCorrect && (
                        <div className={styles.correctAnswer}>
                          Correct: <strong>{q.options[q.correctAnswer]}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.question}>
          <div className={styles.questionHeader}>
            <div className={styles.questionNumber}>Question {quizState.currentQuestion + 1}</div>
            <div className={`${styles.difficulty} ${styles[currentQ.difficulty]}`}>
              {currentQ.difficulty}
            </div>
          </div>

          <div className={styles.questionText}>
            {currentQ.question}
          </div>

          <div className={styles.options}>
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                className={`${styles.option} ${
                  quizState.selectedAnswer === index ? styles.selected : ''
                } ${
                  quizState.showExplanation && index === currentQ.correctAnswer ? styles.correct : ''
                } ${
                  quizState.showExplanation && quizState.selectedAnswer === index && index !== currentQ.correctAnswer ? styles.incorrect : ''
                }`}
                onClick={() => handleAnswerSelect(index)}
                disabled={quizState.showExplanation}
              >
                <span className={styles.optionLetter}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={styles.optionText}>{option}</span>
              </button>
            ))}
          </div>

          {quizState.showExplanation && (
            <div className={styles.explanation}>
              <h4>Explanation</h4>
              <p>{currentQ.explanation}</p>
            </div>
          )}

          <div className={styles.controls}>
            <button
              onClick={handlePreviousQuestion}
              disabled={quizState.currentQuestion === 0}
              className={styles.navButton}
            >
              ← Previous
            </button>

            {!quizState.showExplanation ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={quizState.selectedAnswer === null}
                className={styles.submitButton}
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className={styles.nextButton}
              >
                {quizState.currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SetQuiz