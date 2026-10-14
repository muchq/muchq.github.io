import type { Ref } from 'react'
import styles from './felt.module.css'

// A card table's two ways on once a game is over: Play again, held while
// the next table opens or the socket is down, and Back to the room, which
// is always open. Without onPlayAgain only Back is offered.

interface GameEndingProps {
  onPlayAgain?: () => void
  onBack: () => void
  opening: boolean
  connected: boolean
  playAgainRef?: Ref<HTMLButtonElement>
}

export default function GameEnding({ onPlayAgain, onBack, opening, connected, playAgainRef }: GameEndingProps) {
  return (
    <>
      {onPlayAgain !== undefined && (
        <button ref={playAgainRef} type="button" className={styles.primary} onClick={onPlayAgain} disabled={!connected || opening}>
          {opening ? 'Opening…' : 'Play again'}
        </button>
      )}
      <button type="button" className={styles.secondary} onClick={onBack}>
        Back to the room
      </button>
    </>
  )
}
