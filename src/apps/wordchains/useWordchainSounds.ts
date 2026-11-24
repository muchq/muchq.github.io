import { useCallback, useEffect, useRef, useState } from 'react'
import { safeLocalStorage } from '@/utils/safeLocalStorage'
import { cuesFor, type Cue } from './sounds'
import { playCue } from './synth'
import type { WordchainView } from './wire'

export const SOUND_KEY = 'wordchains.sound'

// Sound effects on or off, per device; on until turned off.
export function useSoundSetting(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => safeLocalStorage.get(SOUND_KEY) !== 'off')
  const set = useCallback((next: boolean) => {
    safeLocalStorage.set(SOUND_KEY, next ? 'on' : 'off')
    setOn(next)
  }, [])
  return [on, set]
}

export interface WordchainSoundsProps {
  view: WordchainView
  // The hub's refusals of the viewer's words and take-backs, counted.
  refusals: number
  playerId: string
  on: boolean
  play?: (cue: Cue) => void
}

// Plays each change in the race once, as it arrives.
export function useWordchainSounds({ view, refusals, playerId, on, play = playCue }: WordchainSoundsProps): void {
  const seen = useRef({ view, refusals })
  useEffect(() => {
    const prev = seen.current
    seen.current = { view, refusals }
    if (!on) return
    if (refusals > prev.refusals) play({ kind: 'refused' })
    if (view !== prev.view) for (const cue of cuesFor(prev.view, view, playerId)) play(cue)
  }, [on, play, playerId, refusals, view])
}
