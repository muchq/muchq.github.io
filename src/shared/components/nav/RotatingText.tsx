import { useEffect, useState } from 'react'
import styles from './RotatingText.module.css'

interface RotatingTextProps {
  items: string[]
}

const RotatingText = ({ items }: RotatingTextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Start by fading in the first item after a short delay
    const initialTimeout = setTimeout(() => {
      setIsVisible(true)
    }, 4000)

    // Then set up the rotation interval: fade out, swap text, fade back in
    const timeouts: number[] = []
    const interval = setInterval(() => {
      setIsVisible(false)
      timeouts.push(window.setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length)
        setIsVisible(true)
      }, 10000))
    }, 28000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
      timeouts.forEach(clearTimeout)
    }
  }, [items.length])

  return (
    <div className={`${styles.text} ${isVisible ? styles.visible : ''}`}>
      {items[currentIndex]}
    </div>
  )
}

export default RotatingText
