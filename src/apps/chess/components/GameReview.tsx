import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import felt from '@/apps/castle/components/CastleTable.module.css'
import type { ChessColor, ChessReview } from '../wire'
import { analysisUrl, describeResult, lastMoveSquares, moveRows, nameOf, pieceImage, pieceName, readBoard, squaresFor } from '../rules'
import tableStyles from './ChessTable.module.css'
import styles from './GameReview.module.css'

// A finished game from the room's history (MoonBase#1637), a position at
// a time: it opens where the game ended, and the buttons, the arrow keys
// and the move list step through it. The hub sent every position, so
// nothing here plays a move. The PGN downloads as the hub wrote it, and
// the position shown opens on lichess for an engine's opinion.

export interface GameReviewProps {
  review: ChessReview
  playerId: string
  onClose: () => void
}

const GameReview = ({ review, playerId, onClose }: GameReviewProps) => {
  const { summary, fens, san, moves, pgn } = review
  const last = fens.length - 1
  const [shown, setShown] = useState({ review, ply: last })
  // A new review opens on its own end.
  if (shown.review !== review) setShown({ review, ply: last })
  const ply = Math.min(shown.ply, last)
  const go = (next: number) => setShown({ review, ply: Math.max(0, Math.min(last, next)) })

  const regionRef = useRef<HTMLElement>(null)
  useEffect(() => {
    regionRef.current?.focus()
  }, [])

  const onKeyDown = (event: KeyboardEvent) => {
    const to = { ArrowLeft: ply - 1, ArrowRight: ply + 1, Home: 0, End: last }[event.key]
    if (to === undefined) return
    event.preventDefault()
    go(to)
  }

  const color: ChessColor = playerId === summary.black ? 'black' : 'white'
  const board = readBoard(fens[ply])
  const marked = ply === 0 ? [] : lastMoveSquares([moves[ply - 1]])
  const rows = moveRows(fens[0], san)
  const half = rows.flatMap(row => [row.white, row.black]).find(entry => entry?.ply === ply)
  const row = rows.find(candidate => candidate.white?.ply === ply || candidate.black?.ply === ply)
  const where = half === undefined || row === undefined ? 'Start' : `After ${row.number}${row.white?.ply === ply ? '.' : '…'} ${half.san}`
  const title = `${nameOf(summary.white)} vs ${nameOf(summary.black)}`

  return (
    <section ref={regionRef} className={styles.review} aria-labelledby="review-title" tabIndex={-1} onKeyDown={onKeyDown}>
      <div className={felt.tableHeader}>
        <h1 id="review-title" className={`${felt.title} ${styles.title}`}>
          {title} <span className={styles.muted}>· {summary.setupName}</span>
        </h1>
        <button type="button" className={felt.link} onClick={onClose} aria-label="Close review">
          Close
        </button>
      </div>
      <p className={felt.hint}>{describeResult(summary.result, playerId)}</p>
      <div className={styles.layout}>
        <div className={styles.boardSlot}>
          <div className={tableStyles.board} role="group" aria-label="board">
            {squaresFor(color).map(square => {
              const piece = board.get(square)
              const light = (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 0
              return (
                <div
                  key={square}
                  role="img"
                  aria-label={piece === undefined ? square : `${square}, ${pieceName(piece)}`}
                  className={`${tableStyles.square} ${light ? tableStyles.light : tableStyles.dark}`}
                  data-last={marked.includes(square) ? 'true' : undefined}
                >
                  {piece !== undefined && <img className={tableStyles.piece} src={pieceImage(piece)} alt="" draggable={false} />}
                </div>
              )
            })}
          </div>
        </div>
        <div className={styles.side}>
          <p className={styles.position} data-testid="review-position" aria-live="polite">
            {where}
          </p>
          <div className={styles.steps}>
            <button type="button" className={felt.secondary} onClick={() => go(0)} disabled={ply === 0} aria-label="Start">
              ⏮
            </button>
            <button type="button" className={felt.secondary} onClick={() => go(ply - 1)} disabled={ply === 0} aria-label="Previous move">
              ◀
            </button>
            <button type="button" className={felt.secondary} onClick={() => go(ply + 1)} disabled={ply === last} aria-label="Next move">
              ▶
            </button>
            <button type="button" className={felt.secondary} onClick={() => go(last)} disabled={ply === last} aria-label="End">
              ⏭
            </button>
          </div>
          <ol className={styles.moves} aria-label="Moves">
            {rows.map(({ number, white, black }) => (
              <li key={number} className={styles.moveRow}>
                <span className={styles.moveNumber}>{number}.</span>
                {[white, black].map((entry, side) =>
                  entry === undefined ? (
                    <span key={side} className={styles.move}>
                      …
                    </span>
                  ) : (
                    <button
                      key={side}
                      type="button"
                      className={styles.move}
                      aria-current={entry.ply === ply ? 'true' : undefined}
                      onClick={() => go(entry.ply)}
                    >
                      {entry.san}
                    </button>
                  )
                )}
              </li>
            ))}
          </ol>
          <div className={styles.links}>
            <a
              className={felt.secondary}
              href={`data:application/x-chess-pgn;charset=utf-8,${encodeURIComponent(pgn)}`}
              download={`muchq-chess-${summary.archiveId}.pgn`}
            >
              Download PGN
            </a>
            <a className={felt.secondary} href={analysisUrl(fens[ply])} target="_blank" rel="noopener noreferrer">
              Analyze on lichess <span className={felt.srOnly}>(opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GameReview
