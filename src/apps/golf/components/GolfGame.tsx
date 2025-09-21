import { useState } from 'react'
import styles from './GolfGame.module.css'
import { useGolfGame } from '@/hooks/useGolfGame'
import type { ParsedPermalinkParams } from '../../../utils/golfPermalinks'

interface Card {
  rank: string
  suit: string
}

interface Player {
  id: string
  // Add other properties as needed
}


interface GolfGameProps {
  onGameIdChange: (id: string | null) => void
  onPlayerIdChange: (id: string | null) => void
  onPlayerNameChange: (name: string | null) => void
  onConnectionChange: (connected: boolean) => void
  permalinkParams: ParsedPermalinkParams
}

const GolfGame = ({ onGameIdChange, onPlayerIdChange, onPlayerNameChange, onConnectionChange, permalinkParams }: GolfGameProps) => {
  const [showRules, setShowRules] = useState(false)

  // TODO: permalinkParams will be used in task 3 to enhance useGolfGame hook with permalink parsing logic
  // For now, we're just setting up the infrastructure
  // Temporary reference to avoid unused parameter warning
  void permalinkParams

  // Helper function to get display name (now just use the ID directly)
  const getDisplayName = (player: Player | null) => {
    // Since IDs are now whimsical names directly, just use the ID
    return player?.id || ''
  }

  const {
    gameState,
    roomState,
    roomCode,
    selectedCardIndex,
    isInLobby,
    isInRoom,
    notification,
    currentPlayer,
    isMyTurn,
    peekCountdown,
    winner,
    createRoom,
    createGame,
    joinRoom,
    joinGame,
    startGame,
    startNewGame,
    drawCard,
    takeFromDiscard,
    swapCard,
    discardDrawn,
    knock,
    handleCardClick,
    setRoomCode,
    clearGameState
  } = useGolfGame({ onGameIdChange, onPlayerIdChange, onPlayerNameChange, onConnectionChange })

  const renderCard = (card: Card | null, index: number, isRevealed: boolean, isPlayer: boolean) => {
    const isSelected = selectedCardIndex === index
    const canInteract = isPlayer && (isMyTurn || (currentPlayer && !currentPlayer.hasPeeked && gameState?.gamePhase === 'playing'))

    return (
      <div
        key={index}
        className={`${styles.card} ${isSelected ? styles.selected : ''} ${isRevealed ? styles.revealed : ''} ${canInteract ? styles.interactive : ''}`}
        onClick={() => canInteract && handleCardClick(index)}
        onTouchEnd={(e) => {
          e.preventDefault()
          if (canInteract) handleCardClick(index)
        }}
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
            <button onClick={createRoom} className={styles.primaryButton}>
              Create New Room
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
              <button onClick={joinRoom} className={styles.secondaryButton}>
                Join Room
              </button>
            </div>

            <button
              onClick={() => setShowRules(true)}
              className={styles.rulesButton}
            >
              How to Play
            </button>
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

        {showRules && (
          <div className={styles.rulesModal} onClick={() => setShowRules(false)}>
            <div className={styles.rulesContent} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.closeButton}
                onClick={() => setShowRules(false)}
              >
                ×
              </button>
              <h2>How to Play Golf</h2>

              <div className={styles.rulesSection}>
                <h3>Goal</h3>
                <p>Get the lowest score by the end of the game. Lower is better!</p>
              </div>

              <div className={styles.rulesSection}>
                <h3>Setup</h3>
                <ul>
                  <li>Each player gets 6 cards face down in a 2×3 grid</li>
                  <li>Players peek at any 2 of their cards at the start</li>
                  <li>Try to remember your cards!</li>
                </ul>
              </div>

              <div className={styles.rulesSection}>
                <h3>Your Turn</h3>
                <ul>
                  <li>Draw from the deck OR take the top discard card</li>
                  <li>Swap it with one of your cards OR discard it</li>
                  <li>Swapped cards are revealed and stay face up</li>
                </ul>
              </div>

              <div className={styles.rulesSection}>
                <h3>Card Values</h3>
                <ul>
                  <li>Number cards: Face value (2 = 2 points, etc.)</li>
                  <li>Jacks: 0 points</li>
                  <li>Queens & Kings: 10 points</li>
                  <li>Aces: 1 point</li>
                  <li>Pairs in same column cancel out (0 points)!</li>
                </ul>
              </div>

              <div className={styles.rulesSection}>
                <h3>Ending the Game</h3>
                <ul>
                  <li>Any player can "knock" to trigger the last round</li>
                  <li>After a knock, each other player gets one more turn</li>
                  <li>All cards are revealed and scored</li>
                  <li>Lowest total score wins!</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Room lobby state - user is in room but not in a specific game
  if (isInRoom && !gameState && roomState) {
    return (
      <div className={styles.roomLobby}>
        <div className={styles.roomHeader}>
          <h1 className={styles.title}>Room: {roomState.id}</h1>
          <p className={styles.roomInfo}>
            {roomState.players.length} player{roomState.players.length !== 1 ? 's' : ''} in room
          </p>
        </div>

        <div className={styles.roomContent}>
          <div className={styles.playersSection}>
            <h3>Players in Room</h3>
            <div className={styles.roomPlayerList}>
              {roomState.players.map(player => (
                <div key={player.id} className={styles.roomPlayer}>
                  <div className={styles.playerName}>
                    {getDisplayName(player)} {player.isConnected ? '🟢' : '🔴'}
                  </div>
                  <div className={styles.playerStats}>
                    <span>Games: {player.gamesPlayed}</span>
                    <span>Wins: {player.gamesWon}</span>
                    <span>Total Score: {player.totalScore}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.gamesSection}>
            <h3>Games in Room</h3>
            {Object.keys(roomState.games).length > 0 ? (
              <div className={styles.activeGamesList}>
                {Object.entries(roomState.games).map(([gameId, game]) => (
                  <div key={gameId} className={styles.gameCard}>
                    <div className={styles.gameInfo}>
                      <h4>{gameId}</h4>
                      <p>{game.players.length}/4 players</p>
                      <p>Status: {game.gamePhase}</p>
                    </div>
                    <button
                      onClick={() => joinGame(gameId)}
                      className={styles.joinGameButton}
                      disabled={game.players.length >= 4 || game.gamePhase !== 'waiting'}
                    >
                      {game.gamePhase === 'waiting' ? 'Join Game' : 'Game In Progress'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noGames}>No active games in room</p>
            )}
          </div>

          <div className={styles.gameCreationSection}>
            <h3>Start New Game</h3>
            <div className={styles.gameCreationForm}>
              <button onClick={() => createGame()} className={styles.primaryButton}>
                Create & Join Game
              </button>
            </div>
          </div>

          {roomState.gameHistory.length > 0 && (
            <div className={styles.gameHistorySection}>
              <h3>Recent Games</h3>
              <div className={styles.gameHistory}>
                {roomState.gameHistory.slice(-3).reverse().map((result, _index) => (
                  <div key={result.gameId} className={styles.historyItem}>
                    <span className={styles.gameId}>{result.gameId}</span>
                    <span className={styles.winner}>Winner: {result.winner}</span>
                    <span className={styles.completedAt}>
                      {new Date(result.completedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {notification && (
          <div className={styles.notification}>
            {notification}
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
              <span>{getDisplayName(player)}</span>
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
            <div className={styles.celebration}>
              {currentPlayer && getDisplayName(currentPlayer) === winner ? (
                <span className={styles.trophy}>🏆</span>
              ) : (
                <span className={styles.trophy}>😢</span>
              )}
              <h2 className={styles.gameOverTitle}>Game Over!</h2>
            </div>
            {winner && (
              <div className={styles.winnerSection}>
                {currentPlayer && getDisplayName(currentPlayer) === winner ? (
                  <div className={styles.confetti}>🎉 🎊 🎉</div>
                ) : (
                  <div className={styles.confetti}></div>
                )}
                <div className={styles.winner}>
                  {currentPlayer && getDisplayName(currentPlayer) === winner ? (
                    <>
                      <span className={styles.winnerLabel}>Congratulations!</span>
                      <span className={styles.winnerMessage}>You've won with the lowest score!</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.winnerLabel}>Game Over</span>
                      <span className={styles.winnerName}>{winner} wins!</span>
                      <span className={styles.winnerMessage}>Better luck next time!</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className={styles.finalScores}>
              <h3 className={styles.scoresTitle}>Final Scores</h3>
              {gameState.players
                .sort((a, b) => a.score - b.score)
                .map((player, index) => (
                  <div key={player.id} className={`${styles.scoreRow} ${index === 0 ? styles.winnerRow : ''}`}>
                    <span className={styles.rank}>
                      {index === 0 ? '👑' : `#${index + 1}`}
                    </span>
                    <span className={styles.playerName}>{getDisplayName(player)}</span>
                    <span className={styles.finalScore}>{player.score} pts</span>
                  </div>
                ))}
            </div>
            <div className={styles.gameEndInfo}>
              <small>Lower scores win • Pairs cancel out</small>
            </div>
            {roomState && (
              <div className={styles.cumulativeScores}>
                <h3 className={styles.cumulativeTitle}>Room Totals</h3>
                {roomState.players
                  .sort((a, b) => (a.gamesPlayed > 0 ? a.totalScore / a.gamesPlayed : 0) - (b.gamesPlayed > 0 ? b.totalScore / b.gamesPlayed : 0))
                  .map((player, index) => (
                    <div key={player.id} className={`${styles.cumulativeRow} ${index === 0 && player.gamesPlayed > 0 ? styles.bestAverage : ''}`}>
                      <span className={styles.playerName}>{getDisplayName(player)}</span>
                      <span className={styles.playerGames}>{player.gamesPlayed} games</span>
                      <span className={styles.playerWins}>{player.gamesWon} wins</span>
                      <span className={styles.playerTotal}>{player.totalScore} total</span>
                      <span className={styles.playerAverage}>
                        {player.gamesPlayed > 0 ? (player.totalScore / player.gamesPlayed).toFixed(1) : 'N/A'} avg
                      </span>
                    </div>
                  ))}
              </div>
            )}

            <div className={styles.gameEndActions}>
              <button
                onClick={startNewGame}
                className={styles.primaryButton}
              >
                Start New Game
              </button>
              <button
                onClick={clearGameState}
                className={styles.secondaryButton}
              >
                Back to Room
              </button>
              <button
                onClick={() => window.location.reload()}
                className={styles.tertiaryButton}
              >
                Leave Room
              </button>
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
                <div
                  className={`${styles.card} ${isMyTurn && !gameState.drawnCard ? styles.clickable : ''}`}
                  onClick={() => isMyTurn && !gameState.drawnCard && drawCard()}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    if (isMyTurn && !gameState.drawnCard) drawCard()
                  }}
                >
                  <span className={styles.cardBack}>?</span>
                  <span className={styles.cardCount}>{gameState.drawPile}</span>
                </div>
              </div>

              <div className={styles.pile}>
                <h3>Discard Pile</h3>
                {gameState.discardPile.length > 0 ? (
                  <div
                    className={`${isMyTurn && !gameState.drawnCard && gameState.discardPile.length > 0 ? styles.clickable : ''}`}
                    onClick={() => isMyTurn && !gameState.drawnCard && gameState.discardPile.length > 0 && takeFromDiscard()}
                    onTouchEnd={(e) => {
                      e.preventDefault()
                      if (isMyTurn && !gameState.drawnCard && gameState.discardPile.length > 0) takeFromDiscard()
                    }}
                  >
                    {renderCard(gameState.discardPile[gameState.discardPile.length - 1], -1, true, false)}
                  </div>
                ) : (
                  <div className={styles.emptyPile}>Empty</div>
                )}
              </div>

              {gameState.drawnCard && isMyTurn && (
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
