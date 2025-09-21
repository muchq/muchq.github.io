import { useState } from 'react'
import styles from './WordchainsPage.module.css'
import WordchainGame from '../components/WordchainGame'
import WordchainsNavigation from '../components/WordchainsNavigation'

const WordchainsPage = () => {
  const [result, setResult] = useState<string[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSolve = async (startWord: string, endWord: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    // Scroll to result section on mobile
    if (window.innerWidth <= 768) {
      const resultSection = document.querySelector('.resultSection')
      if (resultSection) {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    // Use environment variable for API URL, defaulting to production URL
    const apiUrl = import.meta.env.VITE_MITHRIL_API_URL || 'https://api.muchq.com/v1/wordchain'

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: startWord,
          end: endWord
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResult(data.path)

      // Auto-scroll to result after successful solve on mobile
      setTimeout(() => {
        if (window.innerWidth <= 768) {
          const resultElement = document.querySelector('.result, .noResult')
          if (resultElement) {
            resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to solve word chain')
      console.error('Wordchain solve error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <WordchainsNavigation />
      <header className={styles.header}>
        <h1>Wordchains</h1>
        <p>Find the shortest path between two words</p>
      </header>

      <div className={styles.content}>
        <WordchainGame
          onSolve={handleSolve}
          isLoading={isLoading}
          result={result}
          error={error}
        />
      </div>
    </div>
  )
}

export default WordchainsPage