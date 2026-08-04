import { useState, useEffect, useCallback } from 'react'
import styles from './GolfGame.module.css'
import { useGolfGame } from '@/hooks/useGolfGame'
import PermalinkDisplay from './PermalinkDisplay'
import RoomChat from './RoomChat'
import NewGameNotification from './NewGameNotification'
import type { ParsedPermalinkParams } from '../../../utils/golfPermalinks'
import { isGolfV2Enabled, setGolfV2Enabled } from '../../../utils/golfV2'

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
  const [showScores, setShowScores] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  // Read once at mount: the active adapter was chosen from the same flag,
  // and flipping it reloads so the choice and the connection can't skew.
  const [v2Beta] = useState(() => isGolfV2Enabled())

  const toggleV2Beta = () => {
    setGolfV2Enabled(!v2Beta)
    // Reload without any golf query param: the param outranks the stored
    // choice on load, so keeping it would immediately undo the toggle.
    const url = new URL(window.location.href)
    url.searchParams.delete('golf')
    window.location.href = url.toString()
  }

  // Helper function to get display name (now just use the ID directly)
  const getDisplayName = (player: Player | null) => {
    // Since IDs are now whimsical names directly, just use the ID
    return player?.id || ''
  }

  const {
    gameState,
    roomState,
    playerId,
    roomCode,
    isInLobby,
    isInRoom,
    notification,
    currentPlayer,
    isMyTurn,
    peekCountdown,
    winner,
    winners,
    currentRoomPermalink,
    currentGamePermalink,
    newGameNotifications,
    createRoom,
    createGame,
    joinRoom,
    joinGame,
    startGame,
    startNewGame,
    drawCard,
    takeFromDiscard,
    discardDrawn,
    knock,
    handleCardClick,
    setRoomCode,
    leaveGame,
    leaveRoom,
    dismissNewGameNotification,
    joinNewGame,
    permalinkJoinAttempt,
    chatMessages,
    chatAvailable,
    chatReplayUpTo,
    chatRejection,
    sendChat,
    isConnected
  } = useGolfGame({ onGameIdChange, onPlayerIdChange, onPlayerNameChange, onConnectionChange, permalinkParams })

  const isGameWinner = (player: Player | null | undefined) => {
    if (!player) return false
    const name = getDisplayName(player)
    if (winners && winners.length > 0) return winners.includes(name)
    return name === winner
  }

  const confirmLeave = useCallback(() => {
    setShowLeaveConfirm(false)
    leaveGame()
  }, [leaveGame])

  useEffect(() => {
    if (gameState?.gamePhase === 'ended') {
      const hideTimer = setTimeout(() => setShowScores(false), 0)
      const showTimer = setTimeout(() => setShowScores(true), 3000)
      return () => {
        clearTimeout(hideTimer)
        clearTimeout(showTimer)
      }
    }
  }, [gameState?.gamePhase])

  // Final round: from the knock until the game ends. Non-knockers get a
  // full-screen alert (auto-dismissed so it can't block their last turn)
  // plus a persistent red theme; the knocker just gets a calm banner.
  const knockerId = gameState?.knockedPlayerId ?? null
  const isFinalRound = gameState?.gamePhase === 'knocked'
  const isKnocker = knockerId !== null && knockerId === playerId
  const [knockAlertDismissed, setKnockAlertDismissed] = useState(false)

  useEffect(() => {
    const timer = isFinalRound
      ? setTimeout(() => setKnockAlertDismissed(true), 5000)
      : setTimeout(() => setKnockAlertDismissed(false), 0)
    return () => clearTimeout(timer)
  }, [isFinalRound])

  const renderCard = (card: Card | null, index: number, isRevealed: boolean, isPlayer: boolean) => {
    const canInteract = isPlayer && (isMyTurn || (currentPlayer && !currentPlayer.hasPeeked && gameState?.gamePhase === 'playing'))

    return (
      <div
        key={index}
        className={`${styles.card} ${isRevealed ? styles.revealed : ''} ${canInteract ? styles.interactive : ''}`}
        onClick={() => canInteract && handleCardClick(index)}
        onTouchEnd={(e) => {
          e.preventDefault()
          if (canInteract) handleCardClick(index)
        }}
      >
        {isRevealed && card ? (
          <div className={styles.cardFace}>
            <div className={`${styles.cardCorner} ${styles.topLeft} ${(card.suit === '♥' || card.suit === '♦') ? styles.red : ''}`}>
              <span className={styles.cornerRank}>{card.rank}</span>
              <span className={styles.cornerSuit}>{card.suit}</span>
            </div>
            <span className={`${styles.cardCenter} ${(card.suit === '♥' || card.suit === '♦') ? styles.red : ''}`}>
              {card.suit}
            </span>
            <div className={`${styles.cardCorner} ${styles.bottomRight} ${(card.suit === '♥' || card.suit === '♦') ? styles.red : ''}`}>
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

  // One element, rendered at the same tree position (first child of the
  // returned fragment) by both in-room branches, so a lobby↔game
  // transition keeps the panel instance — composer draft, drawer state,
  // scroll — instead of remounting it. The panel is position:fixed, so
  // its place in document flow doesn't matter.
  const roomChat = chatAvailable ? (
    <RoomChat
      messages={chatMessages}
      playerId={playerId}
      connected={isConnected}
      replayUpTo={chatReplayUpTo}
      rejection={chatRejection}
      onSend={sendChat}
    />
  ) : null

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
                autoFocus
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

            <label className={styles.betaToggle}>
              <input
                type="checkbox"
                checked={v2Beta}
                onChange={toggleV2Beta}
              />
              New engine beta
            </label>
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
                  <li>Each player gets 4 cards face down in a 2×2 grid</li>
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
      <>
      {roomChat}
      <div className={styles.roomLobby}>
        <div className={styles.roomHeader}>
          <div className={styles.roomHeaderTop}>
            <div className={styles.roomHeaderInfo}>
              <h1 className={styles.title}>Room: {roomState.id}</h1>
              <p className={styles.roomInfo}>
                {roomState.players.length} player{roomState.players.length !== 1 ? 's' : ''} in room
              </p>
            </div>
            {currentRoomPermalink && (
              <div className={styles.roomHeaderShare}>
                <PermalinkDisplay
                  label="Share Room"
                  url={currentRoomPermalink}
                />
              </div>
            )}
          </div>
        </div>

        <div className={styles.roomContent}>

          {/* New Game Notifications */}
          {newGameNotifications.filter(n => !n.dismissed).length > 0 && (
            <div className={styles.newGameNotificationsSection}>
              <h3>🎮 New Games Available</h3>
              <div className={styles.notificationsList}>
                {newGameNotifications
                  .filter(n => !n.dismissed)
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map(notification => (
                    <NewGameNotification
                      key={notification.gameId}
                      gameId={notification.gameId}
                      roomId={roomState.id}
                      onJoin={joinNewGame}
                      onDismiss={dismissNewGameNotification}
                      timestamp={notification.timestamp}
                    />
                  ))}
              </div>
            </div>
          )}

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

          <button onClick={leaveRoom} className={styles.textLink}>
            Leave Room
          </button>
        </div>

        {notification && (
          <div className={styles.notification}>
            {notification}
          </div>
        )}
      </div>
      </>
    )
  }

  if (!gameState) {
    if (permalinkJoinAttempt.error) {
      return (
        <div className={styles.lobby}>
          <h1 className={styles.title}>Golf Card Game</h1>
          <div className={styles.lobbyContent}>
            <div className={styles.lobbyActions}>
              <p className={styles.permalinkError}>{permalinkJoinAttempt.error}</p>
              <button onClick={createRoom} className={styles.primaryButton}>
                Create New Room
              </button>
            </div>
          </div>
        </div>
      )
    }
    return <div className={styles.loading}>Loading...</div>
  }

  return (
    <>
    {roomChat}
    <div className={styles.gameContainer}>
      <div className={styles.gameHeader}>
        <div className={styles.gameHeaderTop}>
          <div className={styles.gameHeaderInfo}>
            <h2>Room: {gameState.id}</h2>
            <div className={styles.playerList}>
              {gameState.players.map((player, index) => {
                const isActivePlayer = index === gameState.currentPlayerIndex && (gameState.gamePhase === 'playing' || gameState.gamePhase === 'knocked')
                return (
                  <div
                    key={player.id}
                    className={`${styles.playerInfo} ${isActivePlayer ? styles.active : ''}`}
                  >
                    <span>{getDisplayName(player)}</span>
                    {isActivePlayer && player.id !== playerId && (
                      <span className={styles.turnLabel}>their turn</span>
                    )}
                    {isActivePlayer && player.id === playerId && (
                      <span className={styles.turnLabel}>your turn</span>
                    )}
                    {gameState.gamePhase === 'ended' && (
                      <span className={styles.score}>Score: {player.score}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {currentGamePermalink && (
            <div className={gameState.gamePhase === 'waiting' ? styles.gameHeaderShareWaiting : styles.gameHeaderShare}>
              <PermalinkDisplay
                label="Share Game"
                url={currentGamePermalink}
              />
            </div>
          )}
          <button onClick={() => setShowLeaveConfirm(true)} className={styles.leaveGameLink}>
            ✕
          </button>
        </div>
        {showLeaveConfirm && (
          <div className={styles.leaveConfirm}>
            <span>Leave this game?</span>
            <button onClick={confirmLeave} className={styles.leaveConfirmYes}>Leave</button>
            <button onClick={() => setShowLeaveConfirm(false)} className={styles.leaveConfirmNo}>Stay</button>
          </div>
        )}
      </div>

      {gameState.gamePhase === 'waiting' && (
        <div className={styles.waitingRoom}>
          <h3 className={styles.waitingPulse}>Waiting for players...</h3>
          <p>{gameState.players.length}/4 players</p>
          {gameState.players.length >= 2 && (
            <button onClick={startGame} className={`${styles.primaryButton} ${styles.startGameButton}`}>
              Start Game
            </button>
          )}
          <button onClick={leaveGame} className={styles.textLink}>
            Leave Game
          </button>
        </div>
      )}

      {gameState.gamePhase === 'ended' && !showScores && (
        <div className={styles.gameEndOverlay} onClick={() => setShowScores(true)}>
          <div className={styles.celebrationStage}>
            <div className={styles.celebrationEmoji}>
              {isGameWinner(currentPlayer) ? '🏆' : '😤'}
            </div>
            <h2 className={styles.celebrationTitle}>
              {isGameWinner(currentPlayer)
                ? 'You won!'
                : `${winner} wins!`}
            </h2>
            <p className={styles.celebrationTap}>Tap to see scores</p>
          </div>
        </div>
      )}

      {gameState.gamePhase === 'ended' && showScores && (
        <div className={styles.gameEndOverlay}>
          <div className={styles.gameEndContent}>
            <button onClick={startNewGame} className={styles.playAgainButton}>
              Play Again
            </button>

            <div className={styles.finalScores}>
              <h3 className={styles.scoresTitle}>Final Scores</h3>
              {gameState.players
                .sort((a, b) => a.score - b.score)
                .map((player, index) => (
                  <div key={player.id} className={`${styles.scoreRow} ${isGameWinner(player) ? styles.winnerRow : ''}`}>
                    <span className={styles.rank}>
                      {isGameWinner(player) ? '👑' : `#${index + 1}`}
                    </span>
                    <span className={styles.playerName}>{getDisplayName(player)}</span>
                    <span className={styles.finalScore}>{player.score} pts</span>
                  </div>
                ))}
            </div>

            {roomState && (
              <details className={styles.roomTotalsDetails}>
                <summary className={styles.roomTotalsSummary}>Room Totals</summary>
                <div className={styles.cumulativeScores}>
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
              </details>
            )}

            {/* New Game Join Options - keep if they exist */}
            {roomState && newGameNotifications.filter(n => !n.dismissed).length > 0 && (
              <div className={styles.newGameJoinSection}>
                <h3 className={styles.newGameJoinTitle}>🎮 Join New Games</h3>
                <div className={styles.newGameJoinList}>
                  {newGameNotifications
                    .filter(n => !n.dismissed)
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 3)
                    .map(notification => (
                      <div key={notification.gameId} className={styles.newGameJoinItem}>
                        <div className={styles.newGameJoinInfo}>
                          <span className={styles.newGameJoinId}>Game: {notification.gameId}</span>
                          <span className={styles.newGameJoinTime}>
                            {new Date(notification.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <button
                          onClick={() => joinNewGame(notification.gameId)}
                          className={styles.newGameJoinButton}
                        >
                          Join Game
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className={styles.gameEndLinks}>
              <button onClick={leaveGame} className={styles.textLink}>
                Back to Room
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState.gamePhase !== 'waiting' && currentPlayer && (
        <div className={styles.gameArea}>
          {isFinalRound && (
            <div className={`${styles.finalRoundBanner} ${!isKnocker ? styles.finalRoundBannerUrgent : ''}`}>
              {isKnocker
                ? 'You knocked — final round!'
                : `🚨 Final round — ${knockerId} knocked! 🚨`}
            </div>
          )}

          {/* Turn indicator */}
          <div className={styles.turnIndicator}>
            {!isMyTurn ? (
              <span className={styles.waitingText}>Waiting for {gameState.players[gameState.currentPlayerIndex]?.id}...</span>
            ) : !currentPlayer.hasPeeked && gameState.gamePhase === 'playing' ? (
              <span>Tap {2 - currentPlayer.revealedCards.length} cards to peek</span>
            ) : !gameState.drawnCard ? (
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
                  className={`${styles.card} ${isMyTurn && !gameState.drawnCard ? styles.clickable : ''} ${gameState.drawnCard ? styles.pileDepleted : ''}`}
                  onClick={() => isMyTurn && !gameState.drawnCard && drawCard()}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    if (isMyTurn && !gameState.drawnCard) drawCard()
                  }}
                >
                  <div className={styles.cardBack} />
                  <span className={styles.cardCount}>{gameState.drawPile}</span>
                </div>
              </div>

              <div className={styles.pile}>
                <h3>Discard</h3>
                {gameState.discardPile.length > 0 ? (
                  <div
                    className={`${isMyTurn && !gameState.drawnCard && gameState.discardPile.length > 0 ? styles.clickable : ''} ${gameState.drawnCard ? styles.pileDepleted : ''}`}
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

              {/* Held card — inline with piles to avoid layout shift */}
              <div className={`${styles.pile} ${styles.heldCardPile} ${gameState.drawnCard && isMyTurn ? '' : styles.heldCardEmpty}`}>
                <h3>Held</h3>
                {gameState.drawnCard && isMyTurn ? (
                  renderCard(gameState.drawnCard, -2, true, false)
                ) : (
                  <div className={styles.emptyPile} />
                )}
              </div>
            </div>
          </div>

          <div className={styles.playerArea}>
            <h3>Your Cards</h3>
            <div className={`${styles.cardGrid} ${!isMyTurn && currentPlayer.hasPeeked && (gameState.gamePhase === 'playing' || gameState.gamePhase === 'knocked') ? styles.cardGridDimmed : ''}`}>
              {currentPlayer.cards.map((card, index) =>
                renderCard(card, index, currentPlayer.revealedCards.includes(index), true)
              )}
            </div>

            <div className={styles.actions} style={!isMyTurn ? { visibility: 'hidden' } : undefined}>
              {gameState.drawnCard ? (
                <>
                  <button onClick={discardDrawn} className={styles.actionButton}>
                    Discard
                  </button>
                </>
              ) : null}

              {gameState.gamePhase === 'playing' && !gameState.drawnCard && (
                <button onClick={knock} className={styles.knockButton}>
                  Knock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isFinalRound && !isKnocker && (
        <div className={styles.finalRoundBackdrop} aria-hidden="true" />
      )}

      {isFinalRound && !isKnocker && !knockAlertDismissed && (
        <div
          className={styles.knockAlertOverlay}
          role="alert"
          onClick={() => setKnockAlertDismissed(true)}
        >
          <div className={styles.knockAlertContent}>
            <div className={styles.knockAlertEmoji}>✊</div>
            <h2 className={styles.knockAlertTitle}>{knockerId} knocked!</h2>
            <p className={styles.knockAlertSubtitle}>This is your last turn — make it count!</p>
            <p className={styles.knockAlertTap}>Tap to continue</p>
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
    </>
  )
}

export default GolfGame
