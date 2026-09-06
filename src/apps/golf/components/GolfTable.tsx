import { useEffect, useRef, useState } from 'react'
import type { GolfTableActions, GolfTableEnded } from '@/hooks/useGolfTable'
import type { Card, GameState, Player } from '@/types/golf'
import PermalinkDisplay from './PermalinkDisplay'
import styles from './GolfTable.module.css'

// The table from the viewer's chair, over useGolfTable. The buttons offer
// what the phase allows, and nothing while the socket is down (a move it
// cannot carry is not a move); the hub refuses in band, and the lobby's
// notice says why.

export interface GolfTableProps {
  playerId: string
  connected: boolean
  view: GameState
  table: GolfTableActions & { ended: GolfTableEnded | null; peekCountdown: number | null }
  shareUrl?: string | null
}

const isRed = (card: Card) => card.suit === '♥' || card.suit === '♦'

const GolfTable = ({ playerId, connected, view, table, shareUrl = null }: GolfTableProps) => {
  const { ended, peekCountdown } = table
  const [showScores, setShowScores] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  const me = view.players.find(player => player.id === playerId)
  const isMyTurn = view.players[view.currentPlayerIndex]?.id === playerId
  const acting = isMyTurn && connected
  const inPlay = view.gamePhase === 'playing' || view.gamePhase === 'knocked'

  const isWinner = (player: Player | undefined) => {
    if (player === undefined || ended === null) return false
    if (ended.winners.length > 0) return ended.winners.includes(player.id)
    return player.id === ended.winner
  }

  useEffect(() => {
    if (view.gamePhase === 'ended') {
      const hideTimer = setTimeout(() => setShowScores(false), 0)
      const showTimer = setTimeout(() => setShowScores(true), 3000)
      return () => {
        clearTimeout(hideTimer)
        clearTimeout(showTimer)
      }
    }
  }, [view.gamePhase])

  // Final round: from the knock until the game ends. Non-knockers get a
  // full-screen alert (auto-dismissed so it can't block their last turn)
  // plus a persistent red theme; the knocker just gets a calm banner.
  const knockerId = view.knockedPlayerId
  const isFinalRound = view.gamePhase === 'knocked'
  const isKnocker = knockerId !== null && knockerId === playerId
  const [knockAlertDismissed, setKnockAlertDismissed] = useState(false)
  const showKnockAlert = isFinalRound && !isKnocker && !knockAlertDismissed
  const knockAlertRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = isFinalRound
      ? setTimeout(() => setKnockAlertDismissed(true), 5000)
      : setTimeout(() => setKnockAlertDismissed(false), 0)
    return () => clearTimeout(timer)
  }, [isFinalRound])

  // Focus the alert while it's up so keyboard users can dismiss it —
  // tapping is not the only input this game gets.
  useEffect(() => {
    if (showKnockAlert) knockAlertRef.current?.focus()
  }, [showKnockAlert])

  const renderCard = (card: Card | null, index: number, isRevealed: boolean, isMine: boolean) => {
    const canInteract = isMine && connected && (isMyTurn || (me !== undefined && !me.hasPeeked && view.gamePhase === 'playing'))

    return (
      <div
        key={index}
        className={`${styles.card} ${isRevealed ? styles.revealed : ''} ${canInteract ? styles.interactive : ''}`}
        onClick={() => canInteract && table.tapCard(index)}
        onTouchEnd={e => {
          e.preventDefault()
          if (canInteract) table.tapCard(index)
        }}
      >
        {isRevealed && card ? (
          <div className={styles.cardFace}>
            <div className={`${styles.cardCorner} ${styles.topLeft} ${isRed(card) ? styles.red : ''}`}>
              <span className={styles.cornerRank}>{card.rank}</span>
              <span className={styles.cornerSuit}>{card.suit}</span>
            </div>
            <span className={`${styles.cardCenter} ${isRed(card) ? styles.red : ''}`}>{card.suit}</span>
            <div className={`${styles.cardCorner} ${styles.bottomRight} ${isRed(card) ? styles.red : ''}`}>
              <span className={styles.cornerRank}>{card.rank}</span>
              <span className={styles.cornerSuit}>{card.suit}</span>
            </div>
          </div>
        ) : (
          <div className={styles.cardBack} />
        )}
      </div>
    )
  }

  // The discard offers only while it shows a card, so one gate serves.
  const canDraw = acting && !view.drawnCard

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <div className={styles.gameHeaderTop}>
          <div className={styles.gameHeaderInfo}>
            <h2>Room: {view.id}</h2>
            <div className={styles.playerList}>
              {view.players.map((player, index) => {
                const isActivePlayer = index === view.currentPlayerIndex && inPlay
                return (
                  <div key={player.id} className={`${styles.playerInfo} ${isActivePlayer ? styles.active : ''}`}>
                    <span>{player.id}</span>
                    {isActivePlayer && player.id !== playerId && <span className={styles.turnLabel}>their turn</span>}
                    {isActivePlayer && player.id === playerId && <span className={styles.turnLabel}>your turn</span>}
                    {view.gamePhase === 'ended' && <span className={styles.score}>Score: {player.score}</span>}
                  </div>
                )
              })}
            </div>
          </div>
          {shareUrl && (
            <div className={view.gamePhase === 'waiting' ? styles.gameHeaderShareWaiting : styles.gameHeaderShare}>
              <PermalinkDisplay label="Share Game" url={shareUrl} />
            </div>
          )}
          <button onClick={() => setShowLeaveConfirm(true)} className={styles.leaveGameLink}>
            ✕
          </button>
        </div>
        {showLeaveConfirm && (
          <div className={styles.leaveConfirm}>
            <span>Leave this game?</span>
            <button
              onClick={() => {
                setShowLeaveConfirm(false)
                table.leaveTable()
              }}
              className={styles.leaveConfirmYes}
              disabled={!connected}
            >
              Leave
            </button>
            <button onClick={() => setShowLeaveConfirm(false)} className={styles.leaveConfirmNo}>
              Stay
            </button>
          </div>
        )}
      </div>

      {view.gamePhase === 'waiting' && (
        <div className={styles.waitingRoom}>
          <h3 className={styles.waitingPulse}>Waiting for players...</h3>
          <p>{view.players.length}/4 players</p>
          {view.players.length >= 2 && (
            <button onClick={table.startTable} className={`${styles.primaryButton} ${styles.startGameButton}`} disabled={!connected}>
              Start Game
            </button>
          )}
          <button onClick={table.leaveTable} className={styles.textLink} disabled={!connected}>
            Leave Game
          </button>
        </div>
      )}

      {view.gamePhase === 'ended' && !showScores && (
        <div className={styles.gameEndOverlay} onClick={() => setShowScores(true)}>
          <div className={styles.celebrationStage}>
            <div className={styles.celebrationEmoji}>{isWinner(me) ? '🏆' : '😤'}</div>
            <h2 className={styles.celebrationTitle}>
              {isWinner(me) ? 'You won!' : ended === null ? 'Game over' : `${ended.winner} wins!`}
            </h2>
            <p className={styles.celebrationTap}>Tap to see scores</p>
          </div>
        </div>
      )}

      {view.gamePhase === 'ended' && showScores && (
        <div className={styles.gameEndOverlay}>
          <div className={styles.gameEndContent}>
            <button onClick={table.createTable} className={styles.playAgainButton} disabled={!connected}>
              Play Again
            </button>

            <div className={styles.finalScores}>
              <h3 className={styles.scoresTitle}>Final Scores</h3>
              {[...view.players]
                .sort((a, b) => a.score - b.score)
                .map((player, index) => (
                  <div key={player.id} className={`${styles.scoreRow} ${isWinner(player) ? styles.winnerRow : ''}`}>
                    <span className={styles.rank}>{isWinner(player) ? '👑' : `#${index + 1}`}</span>
                    <span className={styles.playerName}>{player.id}</span>
                    <span className={styles.finalScore}>{player.score} pts</span>
                  </div>
                ))}
            </div>

            <div className={styles.gameEndLinks}>
              <button onClick={table.leaveTable} className={styles.textLink}>
                Back to Room
              </button>
            </div>
          </div>
        </div>
      )}

      {view.gamePhase !== 'waiting' && me !== undefined && (
        <div className={styles.gameArea}>
          {isFinalRound && (
            <div className={`${styles.finalRoundBanner} ${!isKnocker ? styles.finalRoundBannerUrgent : ''}`}>
              {isKnocker ? 'You knocked — final round!' : `🚨 Final round — ${knockerId} knocked! 🚨`}
            </div>
          )}

          <div className={styles.turnIndicator}>
            {!isMyTurn ? (
              <span className={styles.waitingText}>Waiting for {view.players[view.currentPlayerIndex]?.id}...</span>
            ) : !me.hasPeeked && view.gamePhase === 'playing' ? (
              <span>Tap {2 - me.revealedCards.length} cards to peek</span>
            ) : !view.drawnCard ? (
              <span>{isFinalRound ? 'Your last turn — tap a pile to draw' : 'Your turn — tap a pile to draw'}</span>
            ) : (
              <span>Tap a card to swap, or discard</span>
            )}
          </div>

          <div className={styles.tableArea}>
            <div className={styles.piles}>
              <div className={styles.pile}>
                <h3>Deck</h3>
                <div
                  className={`${styles.card} ${canDraw ? styles.clickable : ''} ${view.drawnCard ? styles.pileDepleted : ''}`}
                  onClick={() => canDraw && table.drawCard()}
                  onTouchEnd={e => {
                    e.preventDefault()
                    if (canDraw) table.drawCard()
                  }}
                >
                  <div className={styles.cardBack} />
                  <span className={styles.cardCount}>{view.drawPile}</span>
                </div>
              </div>

              <div className={styles.pile}>
                <h3>Discard</h3>
                {view.discardPile.length > 0 ? (
                  <div
                    className={`${canDraw ? styles.clickable : ''} ${view.drawnCard ? styles.pileDepleted : ''}`}
                    onClick={() => canDraw && table.takeFromDiscard()}
                    onTouchEnd={e => {
                      e.preventDefault()
                      if (canDraw) table.takeFromDiscard()
                    }}
                  >
                    {renderCard(view.discardPile[view.discardPile.length - 1], -1, true, false)}
                  </div>
                ) : (
                  <div className={styles.emptyPile}>Empty</div>
                )}
              </div>

              {/* Held card — inline with piles to avoid layout shift */}
              <div className={`${styles.pile} ${styles.heldCardPile} ${view.drawnCard && isMyTurn ? '' : styles.heldCardEmpty}`}>
                <h3>Held</h3>
                {view.drawnCard && isMyTurn ? renderCard(view.drawnCard, -2, true, false) : <div className={styles.emptyPile} />}
              </div>
            </div>
          </div>

          <div className={styles.playerArea}>
            <h3>Your Cards</h3>
            <div className={`${styles.cardGrid} ${!isMyTurn && me.hasPeeked && inPlay ? styles.cardGridDimmed : ''}`}>
              {me.cards.map((card, index) => renderCard(card, index, me.revealedCards.includes(index), true))}
            </div>

            <div className={styles.actions} style={!isMyTurn ? { visibility: 'hidden' } : undefined}>
              {view.drawnCard ? (
                <button onClick={table.discardDrawn} className={styles.actionButton} disabled={!connected}>
                  Discard
                </button>
              ) : null}

              {view.gamePhase === 'playing' && !view.drawnCard && (
                <button onClick={table.knock} className={styles.knockButton} disabled={!connected}>
                  Knock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isFinalRound && !isKnocker && <div className={styles.finalRoundBackdrop} aria-hidden="true" />}

      {showKnockAlert && (
        <div
          className={styles.knockAlertOverlay}
          role="alert"
          ref={knockAlertRef}
          tabIndex={-1}
          onClick={() => setKnockAlertDismissed(true)}
          onKeyDown={e => {
            if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setKnockAlertDismissed(true)
            }
          }}
        >
          <div className={styles.knockAlertContent}>
            <div className={styles.knockAlertEmoji}>✊</div>
            <h2 className={styles.knockAlertTitle}>{knockerId} knocked!</h2>
            <p className={styles.knockAlertSubtitle}>This is your last turn — make it count!</p>
            <p className={styles.knockAlertTap}>Tap to continue</p>
          </div>
        </div>
      )}

      {peekCountdown !== null && (
        <div className={styles.peekCountdown}>
          <div className={styles.countdownNumber}>{peekCountdown}</div>
          <div className={styles.countdownText}>All players have peeked!</div>
        </div>
      )}
    </div>
  )
}

export default GolfTable
