import { useCallback, useEffect, useRef, useState } from 'react'
import { goSoundEvents, playGoSounds } from './sounds'
import type { GoView } from './wire'

// Plays what each new view says happened, unless the viewer muted the
// table; the mute is kept for the next visit.

const MUTED_KEY = 'go.muted'

const readMuted = (): boolean => {
  try {
    return localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

export function useGoSounds(view: GoView): { muted: boolean; toggleMuted: () => void } {
  const [muted, setMuted] = useState(readMuted)
  const prev = useRef<GoView | undefined>(undefined)
  useEffect(() => {
    const events = goSoundEvents(prev.current, view)
    prev.current = view
    if (!muted && events.length > 0) playGoSounds(events)
  }, [view, muted])
  const toggleMuted = useCallback(() => {
    try {
      localStorage.setItem(MUTED_KEY, muted ? '0' : '1')
    } catch {
      // Unsaved, it still holds for this visit.
    }
    setMuted(!muted)
  }, [muted])
  return { muted, toggleMuted }
}
