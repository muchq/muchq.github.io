import { useEffect, useRef, useState } from 'react'

// The peek phase's close: once every seat has peeked, three seconds
// count down on screen, and this client then asks the hub to hide the
// cards. Every seat runs the same clock; the hub takes the first.

const PEEK_SECONDS = 3

export const usePeekCountdown = (allPeeked: boolean, hideCards: () => void): number | null => {
  const [countdown, setCountdown] = useState<number | null>(null)
  const hideCardsRef = useRef(hideCards)
  hideCardsRef.current = hideCards

  useEffect(() => {
    if (!allPeeked) return
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setCountdown(Math.max(0, PEEK_SECONDS - elapsed))
      // The zero shows for a second before the cards go.
      if (elapsed >= PEEK_SECONDS + 1) {
        clearInterval(interval)
        setCountdown(null)
        hideCardsRef.current()
      }
    }, 100)
    return () => {
      clearInterval(interval)
      setCountdown(null)
    }
  }, [allPeeked])

  return countdown
}
