import { useState } from 'react'
import styles from './WordchainGame.module.css'

interface WordchainGameProps {
  onSolve: (startWord: string, endWord: string) => Promise<void>
  isLoading: boolean
  result: string[] | null
  error: string | null
}

const WordchainGame = ({ onSolve, isLoading, result, error }: WordchainGameProps) => {
  const [startWord, setStartWord] = useState('')
  const [endWord, setEndWord] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (startWord.trim() && endWord.trim()) {
      await onSolve(startWord.trim().toLowerCase(), endWord.trim().toLowerCase())
    }
  }

  const isValidWord = (word: string) => {
    return word.length >= 3 && word.length <= 9 && /^[a-zA-Z]+$/.test(word)
  }

  const isFormValid = isValidWord(startWord) && isValidWord(endWord) && startWord.length === endWord.length

  return (
    <div className={styles.container}>
      <div className={styles.gameSection}>
        <div className={styles.instructions}>
          <h2>How to Play</h2>
          <p>Find a chain of words where each word differs from the next by exactly one letter.</p>
          <ul>
            <li>Words must be 3-9 letters long</li>
            <li>Both words must be the same length</li>
            <li>Only alphabetic characters allowed</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="startWord">Start Word:</label>
            <input
              id="startWord"
              type="text"
              value={startWord}
              onChange={(e) => setStartWord(e.target.value)}
              placeholder="e.g., cat"
              className={startWord && !isValidWord(startWord) ? styles.invalid : ''}
              disabled={isLoading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="endWord">End Word:</label>
            <input
              id="endWord"
              type="text"
              value={endWord}
              onChange={(e) => setEndWord(e.target.value)}
              placeholder="e.g., dog"
              className={endWord && !isValidWord(endWord) ? styles.invalid : ''}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className={styles.solveButton}
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? 'Solving...' : 'Find Chain'}
          </button>
        </form>

        {startWord && endWord && startWord.length !== endWord.length && (
          <div className={styles.warning}>
            Words must be the same length!
          </div>
        )}
      </div>

      <div className={styles.resultSection}>
        <div className={styles.resultWrapper}>
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner}></div>
              <p>Finding word chain...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorOverlay}>
              <div className={styles.errorContent}>
                <p>Error: {error}</p>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <div className={styles.result}>
              <h3>Word Chain Found!</h3>
              <div className={styles.chain}>
                {result.map((word, index) => (
                  <div key={index} className={styles.chainStep}>
                    <span className={styles.word}>{word}</span>
                    {index < result.length - 1 && (
                      <span className={styles.arrow}>→</span>
                    )}
                  </div>
                ))}
              </div>
              <p className={styles.chainInfo}>
                Chain length: {result.length} words ({result.length - 1} steps)
              </p>
            </div>
          )}

          {result === null && !isLoading && !error && startWord && endWord && (
            <div className={styles.noResult}>
              <h3>No Chain Found</h3>
              <p>No word chain exists between "{startWord}" and "{endWord}"</p>
              <p>Try different words or check spelling.</p>
            </div>
          )}

          {!result && !isLoading && !error && !startWord && !endWord && (
            <div className={styles.placeholder}>
              <p>Enter two words to find a chain between them</p>
              <p className={styles.hint}>Try: "cat" to "dog" or "love" to "hate"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WordchainGame