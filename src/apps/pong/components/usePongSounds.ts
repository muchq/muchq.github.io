import { useCallback, useEffect, useRef } from 'react'
import type { PongSound } from '../sounds'

const NAMES: readonly PongSound[] = ['boo', 'ping', 'woo', 'mah']

type Bank = Record<PongSound, HTMLAudioElement>

// smallcat's sound files, made on first use. iOS plays a sound outside a
// gesture only once a gesture has started it, so `unlock`, called from
// the first gesture, starts each one muted and stops it again.
export const usePongSounds = (): { play: (sound: PongSound) => void; unlock: () => void } => {
  const bank = useRef<Bank | null>(null)
  const unlocked = useRef(false)
  const sounds = useCallback((): Bank => {
    bank.current ??= Object.fromEntries(NAMES.map(name => [name, new Audio(`/audio/smallcat/${name}.wav`)])) as Bank
    return bank.current
  }, [])
  const unlock = useCallback(() => {
    if (unlocked.current) return
    unlocked.current = true
    for (const sound of Object.values(sounds())) {
      sound.muted = true
      sound
        .play()
        .then(() => {
          sound.pause()
          sound.currentTime = 0
        })
        .catch(() => {})
        .finally(() => {
          sound.muted = false
        })
    }
  }, [sounds])
  const play = useCallback(
    (name: PongSound) => {
      const sound = sounds()[name]
      sound.currentTime = 0
      sound.play().catch(() => {})
    },
    [sounds]
  )
  useEffect(
    () => () => {
      for (const sound of Object.values(bank.current ?? {})) sound.pause()
    },
    []
  )
  return { play, unlock }
}
