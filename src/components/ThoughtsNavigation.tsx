import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './ThoughtsNavigation.module.css'

const thoughts = [
  "Hello.",
  "Are you a nice smelling breeze?",
  "You look great today.",
  "What is wood made of?",
  "Let's all drink more water",
  "Read any good books lately?"
]

interface ThoughtsNavigationProps {
  playerId: string | null
}

const ThoughtsNavigation = ({ playerId }: ThoughtsNavigationProps) => {
  const [currentThoughtIndex, setCurrentThoughtIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Start by fading in the first thought after a short delay
    const initialTimeout = setTimeout(() => {
      setIsVisible(true)
    }, 4000)

    // Then set up the rotation interval
    const interval = setInterval(() => {
      // Fade out (takes 5 seconds)
      setIsVisible(false)
      
      // After fade out completes, change thought and fade in
      setTimeout(() => {
        setCurrentThoughtIndex((prevIndex) => (prevIndex + 1) % thoughts.length)
        setIsVisible(true)
      }, 10000) // Wait 5 seconds for fade out to complete
    }, 28000) // Total cycle: 10s visible + 5s fade out + 5s fade in = 20s

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [])

  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link to="/" className={styles.navLogo}>MuchQ</Link>
        <div className={styles.centerContent}>
          {playerId && (
            <div className={styles.playerId}>
              Player: {playerId}
            </div>
          )}
          <div className={`${styles.thought} ${isVisible ? styles.visible : ''}`}>
            {thoughts[currentThoughtIndex]}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default ThoughtsNavigation