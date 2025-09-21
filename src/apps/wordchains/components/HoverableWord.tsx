import { useState } from 'react'
import styles from './HoverableWord.module.css'
import WordDefinitionModal from './WordDefinitionModal'

interface HoverableWordProps {
  word: string
  className?: string
}

const HoverableWord = ({ word, className }: HoverableWordProps) => {
  const [showModal, setShowModal] = useState(false)

  const handleClick = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  return (
    <>
      <span
        className={`${className} ${styles.hoverableWord}`}
        onClick={handleClick}
        title={`Click to see definition of "${word}"`}
      >
        {word}
      </span>
      {showModal && (
        <WordDefinitionModal
          word={word}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}

export default HoverableWord