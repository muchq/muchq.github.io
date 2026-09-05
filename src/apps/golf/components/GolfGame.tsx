import { useState } from 'react'
import styles from './GolfGame.module.css'
import { useGolfGame } from '@/hooks/useGolfGame'
import GolfTable from './GolfTable'
import PermalinkDisplay from './PermalinkDisplay'
import RoomChat from './RoomChat'
import NewGameNotification from './NewGameNotification'
import type { ParsedPermalinkParams } from '../../../utils/golfPermalinks'

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
    backToLobby,
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

          <div className={styles.gameEndLinks}>
            <button onClick={backToLobby} className={styles.textLink}>
              Lobby: world & chat
            </button>
            <button onClick={leaveRoom} className={styles.textLink}>
              Leave Room
            </button>
          </div>
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

  // The table over this page's hook: its actions under the table's
  // names, and the page's own additions to the scorecard.
  const table = {
    ended: winner === null ? null : { winner, winners: winners ?? [] },
    peekCountdown,
    createTable: startNewGame,
    startTable: startGame,
    leaveTable: leaveGame,
    drawCard,
    takeFromDiscard,
    discardDrawn,
    knock,
    tapCard: handleCardClick
  }

  return (
    <>
    {roomChat}
    <GolfTable
      playerId={playerId}
      connected={isConnected}
      view={gameState}
      table={table}
      shareUrl={currentGamePermalink}
      links={
        <button onClick={backToLobby} className={styles.textLink}>
          Lobby: world & chat
        </button>
      }
    >
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
    </GolfTable>

    {notification && (
      <div className={styles.notification}>
        {notification}
      </div>
    )}
    </>
  )
}

export default GolfGame
