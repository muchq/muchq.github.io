import { useState, useEffect } from 'react'
import styles from './WordDefinitionModal.module.css'

interface WordDefinitionModalProps {
  word: string
  onClose: () => void
}

interface Definition {
  definition: string
  partOfSpeech?: string
  etymology?: string
}

const WordDefinitionModal = ({ word, onClose }: WordDefinitionModalProps) => {
  const [definition, setDefinition] = useState<Definition | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDefinition = async () => {
      try {
        setLoading(true)
        setError(null)

        // Since OED requires API keys and subscription, we'll use a free alternative
        // You could replace this with actual OED API if you have access
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)

        if (!response.ok) {
          throw new Error('Word not found')
        }

        const data = await response.json()
        const entry = data[0]
        const meaning = entry.meanings[0]

        setDefinition({
          definition: meaning.definitions[0].definition,
          partOfSpeech: meaning.partOfSpeech,
          etymology: entry.phonetics?.[0]?.text || undefined
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch definition')
      } finally {
        setLoading(false)
      }
    }

    fetchDefinition()
  }, [word])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const oedUrl = `https://www.oed.com/search/dictionary/?scope=Entries&q=${encodeURIComponent(word)}`

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.word}>{word}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Looking up definition...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p>Could not find definition for "{word}"</p>
              <p className={styles.errorDetail}>{error}</p>
            </div>
          )}

          {definition && !loading && (
            <div className={styles.definition}>
              {definition.partOfSpeech && (
                <p className={styles.partOfSpeech}>{definition.partOfSpeech}</p>
              )}
              {definition.etymology && (
                <p className={styles.etymology}>{definition.etymology}</p>
              )}
              <p className={styles.definitionText}>{definition.definition}</p>
            </div>
          )}

          <div className={styles.footer}>
            <a
              href={oedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.oedLink}
            >
              View on Oxford English Dictionary ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WordDefinitionModal