import styles from './GolfGame.module.css'
import { useGolfGame } from '@/hooks/useGolfGame'
import { useState, useEffect } from 'react'

interface Card {
  rank: string
  suit: string
}

interface FinalScore {
  playerName: string
  score: number
}


interface GolfGameProps {
  onGameIdChange: (id: string | null) => void
  onPlayerIdChange: (id: string | null) => void
  onConnectionChange: (connected: boolean) => void
}

const GolfGame = ({ onGameIdChange, onPlayerIdChange, onConnectionChange }: GolfGameProps) => {
  const {
    gameState,
    roomCode,
    selectedCardIndex,
    isInLobby,
    notification,
    currentPlayer,
    isMyTurn,
    peekCountdown,
    winner,
    finalScores,
    createGame,
    joinGame,
    startGame,
    drawCard,
    takeFromDiscard,
    swapCard,
    discardDrawn,
    knock,
    handleCardClick,
    setRoomCode
  } = useGolfGame({ onGameIdChange, onPlayerIdChange, onConnectionChange })

  const renderCard = (card: Card | null, index: number, isRevealed: boolean, isPlayer: boolean) => {
    const isSelected = selectedCardIndex === index
    
    return (
      <div
        key={index}
        className={`${styles.card} ${isSelected ? styles.selected : ''} ${isRevealed ? styles.revealed : ''}`}
        onClick={() => isPlayer && handleCardClick(index)}
      >
        {isRevealed && card ? (
          <>
            <span className={`${styles.cardRank} ${(card.suit === '♥' || card.suit === '♦') ? styles.red : ''}`}>
              {card.rank}
            </span>
            <span className={`${styles.cardSuit} ${(card.suit === '♥' || card.suit === '♦') ? styles.red : ''}`}>
              {card.suit}
            </span>
          </>
        ) : (
          <span className={styles.cardBack}>?</span>
        )}
      </div>
    )
  }

  if (isInLobby) {
    return (
      <div className={styles.lobby}>
        <h1 className={styles.title}>Golf Card Game</h1>
        <div className={styles.lobbyContent}>
          <div className={styles.lobbyActions}>
            <button onClick={createGame} className={styles.primaryButton}>
              Create New Game
            </button>
            
            <div className={styles.divider}>OR</div>
            
            <div className={styles.joinSection}>
              <input
                type="text"
                placeholder="Room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className={styles.input}
                maxLength={6}
              />
              <button onClick={joinGame} className={styles.secondaryButton}>
                Join Game
              </button>
            </div>
          </div>
        </div>
        
        {notification && (
          <div className={styles.notification}>
            {notification}
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

  if (!gameState) {
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <h2>Room: {gameState.id}</h2>
        <div className={styles.playerList}>
          {gameState.players.map((player, index) => (
            <div
              key={player.id}
              className={`${styles.playerInfo} ${index === gameState.currentPlayerIndex ? styles.active : ''}`}
            >
              <span>{player.name}</span>
              {gameState.gamePhase === 'ended' && (
                <span className={styles.score}>Score: {player.score}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {gameState.gamePhase === 'waiting' && (
        <div className={styles.waitingRoom}>
          <h3>Waiting for players...</h3>
          <p>{gameState.players.length}/4 players</p>
          {gameState.players.length >= 2 && (
            <button onClick={startGame} className={styles.primaryButton}>
              Start Game
            </button>
          )}
        </div>
      )}

      {gameState.gamePhase === 'ended' && (
        <div className={styles.gameEndOverlay}>
          <div className={styles.gameEndContent}>
            <h3>🏆 Game Over!</h3>
            {winner && <div className={styles.winner}>Winner: {winner}</div>}
            <div className={styles.finalScores}>
              {gameState.players
                .sort((a, b) => a.score - b.score)
                .map((player, index) => (
                  <div key={player.id} className={styles.scoreRow}>
                    <span className={styles.rank}>#{index + 1}</span>
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.finalScore}>{player.score}</span>
                  </div>
                ))}
            </div>
            <div className={styles.gameEndInfo}>
              <small>Lower scores win • Pairs cancel out</small>
            </div>
          </div>
        </div>
      )}

      {gameState.gamePhase !== 'waiting' && currentPlayer && (
        <div className={styles.gameArea}>
          <div className={styles.tableArea}>
            <div className={styles.piles}>
              <div className={styles.pile}>
                <h3>Draw Pile</h3>
                <div className={styles.card}>
                  <span className={styles.cardBack}>?</span>
                  <span className={styles.cardCount}>{gameState.drawPile}</span>
                </div>
              </div>
              
              <div className={styles.pile}>
                <h3>Discard Pile</h3>
                {gameState.discardPile.length > 0 ? (
                  renderCard(gameState.discardPile[gameState.discardPile.length - 1], -1, true, false)
                ) : (
                  <div className={styles.emptyPile}>Empty</div>
                )}
              </div>

              {gameState.drawnCard && (
                <div className={styles.pile}>
                  <h3>Drawn Card</h3>
                  {renderCard(gameState.drawnCard, -2, true, false)}
                </div>
              )}
            </div>
          </div>

          <div className={styles.playerArea}>
            <h3>Your Cards</h3>
            <div className={styles.cardGrid}>
              {currentPlayer.cards.map((card, index) => 
                renderCard(card, index, currentPlayer.revealedCards.includes(index), true)
              )}
            </div>
            
            {isMyTurn && (
              <div className={styles.actions}>
                {!gameState.drawnCard ? (
                  <>
                    <button onClick={drawCard} className={styles.actionButton}>
                      Draw Card
                    </button>
                    {gameState.discardPile.length > 0 && (
                      <button onClick={takeFromDiscard} className={styles.actionButton}>
                        Take from Discard
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={swapCard} className={styles.actionButton}>
                      Swap Card
                    </button>
                    <button onClick={discardDrawn} className={styles.actionButton}>
                      Discard
                    </button>
                  </>
                )}
                
                {gameState.gamePhase === 'playing' && !gameState.drawnCard && (
                  <button onClick={knock} className={styles.knockButton}>
                    Knock
                  </button>
                )}
              </div>
            )}

            {currentPlayer.revealedCards.length < 2 && gameState.gamePhase === 'playing' && !currentPlayer.hasPeeked && (
              <div className={styles.peekHint}>
                Click on {2 - currentPlayer.revealedCards.length} cards to peek at them
              </div>
            )}
          </div>
        </div>
      )}

      {notification && (
        <div className={styles.notification}>
          {notification}
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

export default GolfGame