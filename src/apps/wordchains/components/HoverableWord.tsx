import { useRef, useState } from 'react'
import styles from './HoverableWord.module.css'
import WordDefinitionModal from './WordDefinitionModal'

interface HoverableWordProps {
  word: string
  // A word with its own look; without one it reads as the text around it.
  className?: string
}

// A word that opens its definition, by tap, click or keyboard; closing
// the definition puts focus back on the word.
const HoverableWord = ({ word, className }: HoverableWordProps) => {
  const [showModal, setShowModal] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  const close = () => {
    setShowModal(false)
    button.current?.focus()
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`${styles.hoverableWord} ${className ?? styles.plain}`}
        onClick={() => setShowModal(true)}
        aria-label={`Define ${word}`}
        title={`See the definition of "${word}"`}
      >
        {word}
      </button>
      {showModal && <WordDefinitionModal word={word} onClose={close} />}
    </>
  )
}

export default HoverableWord
