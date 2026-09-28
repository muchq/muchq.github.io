import type { CSSProperties } from 'react'
import type { Card } from '../wire'
import { face, isRed } from '../rules'
import styles from './CastleTable.module.css'

// A playing card as every table draws it — castle's and rummy's — in
// castle's stylesheet, which is the house style for cards on felt.

interface CardFaceProps {
  card: Card
  // Present only for a card the viewer can act on: those are buttons,
  // the rest are pictures. A toggle (selection) reports its state.
  onClick?: () => void
  toggle?: boolean
  label?: string
  className?: string
  style?: CSSProperties
}

// A card's face: the index in the top-left and, turned round, the
// bottom-right, the way a real card carries it — so a card mostly under
// its neighbour still says what it is — and its suit in the middle.
const CardFaceMarks = ({ card }: { card: Card }) => (
  <>
    <span className={styles.index}>
      <span className={styles.rank}>{card.rank}</span>
      <span>{card.suit}</span>
    </span>
    <span className={styles.pip}>{card.suit}</span>
    <span className={`${styles.index} ${styles.indexBottom}`}>
      <span className={styles.rank}>{card.rank}</span>
      <span>{card.suit}</span>
    </span>
  </>
)

export const CardFace = ({ card, onClick, toggle, label, className = '', style }: CardFaceProps) => {
  const classes = `${styles.card} ${isRed(card) ? styles.red : ''} ${toggle ? styles.selected : ''} ${className}`
  if (onClick === undefined) {
    return (
      <span className={classes} style={style} role="img" aria-label={label ?? face(card)}>
        <CardFaceMarks card={card} />
      </span>
    )
  }
  return (
    <button type="button" className={classes} style={style} onClick={onClick} aria-pressed={toggle} aria-label={label ?? face(card)}>
      <CardFaceMarks card={card} />
    </button>
  )
}

interface CardBackProps {
  onClick?: () => void
  label: string
}

export const CardBack = ({ onClick, label }: CardBackProps) =>
  onClick === undefined ? (
    <span className={`${styles.card} ${styles.back}`} role="img" aria-label={label} />
  ) : (
    <button type="button" className={`${styles.card} ${styles.back}`} onClick={onClick} aria-label={label} />
  )

