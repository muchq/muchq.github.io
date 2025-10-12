import { useState, useRef, useCallback, useEffect } from 'react'
import type { GameState, Player, Room } from '@/types/golf'
import { GolfNetworkAdapter } from '@/utils/networkAdapter'
import type { ParsedPermalinkParams } from '@/utils/golfPermalinks'

interface UseGolfGameProps {
  onGameIdChange?: (id: string | null) => void
  onPlayerIdChange?: (id: string | null) => void
  onPlayerNameChange?: (name: string | null) => void
  onConnectionChange?: (connected: boolean) => void
  permalinkParams?: ParsedPermalinkParams
}

interface UseGolfGameReturn {
  // State
  gameState: GameState | null
  roomState: Room | null
  playerId: string
  roomCode: string
  selectedCardIndex: number | null
  isInLobby: boolean
  isInRoom: boolean
  notification: string
  isConnected: boolean
  peekCountdown: number | null
  winner: string | null
  finalScores: Array<{ playerName: string; score: number }> | null
  
  // Permalink state
  permalinkJoinAttempt: {
    isAttempting: boolean
    roomId: string | null
    gameId: string | null
    error: string | null
  }
  
  // Actions
  createRoom: () => void
  createGame: (roomId?: string) => void
  joinRoom: () => void
  joinGame: (gameId?: string) => void
  startGame: () => void
  startNewGame: () => void
  peekCard: (index: number) => void
  drawCard: () => void
  takeFromDiscard: () => void
  swapCard: () => void
  discardDrawn: () => void
  knock: () => void
  handleCardClick: (index: number) => void
  setRoomCode: (code: string) => void
  clearGameState: () => void

  // Computed
  currentPlayer: Player | undefined
  isMyTurn: boolean
}

export const useGolfGame = ({
  onGameIdChange,
  onPlayerIdChange,
  onPlayerNameChange,
  onConnectionChange,
  permalinkParams
}: UseGolfGameProps = {}): UseGolfGameReturn => {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [roomState, setRoomState] = useState<Room | null>(null)
  const [playerId, setPlayerId] = useState<string>('')
  const [roomCode, setRoomCode] = useState<string>('')
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [isInLobby, setIsInLobby] = useState(true)
  const [isInRoom, setIsInRoom] = useState(false)
  const [notification, setNotification] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [peekCountdown, setPeekCountdown] = useState<number | null>(null)
  const [winner, setWinner] = useState<string | null>(null)
  const [finalScores, setFinalScores] = useState<Array<{ playerName: string; score: number }> | null>(null)
  const [permalinkJoinAttempt, setPermalinkJoinAttempt] = useState({
    isAttempting: false,
    roomId: null as string | null,
    gameId: null as string | null,
    error: null as string | null
  })
  const networkAdapterRef = useRef<GolfNetworkAdapter | null>(null)
  const permalinkTimeoutRef = useRef<number | null>(null)
  const notificationTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

  const showNotification = useCallback((message: string) => {
    setNotification(message)
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }
    notificationTimeoutRef.current = window.setTimeout(() => {
      setNotification('')
      notificationTimeoutRef.current = null
    }, 3000)
  }, [])

  // Game actions
  const createRoom = useCallback(() => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.createRoom()
  }, [showNotification])

  const createGame = useCallback((roomId?: string) => {
    const actualRoomId = roomId || roomState?.id
    if (!actualRoomId) {
      showNotification('Must be in a room to create a game')
      return
    }
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.createGame(actualRoomId)
  }, [showNotification, roomState?.id])

  const joinRoom = useCallback(() => {
    if (!roomCode.trim()) {
      showNotification('Please enter a room code')
      return
    }
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    // Join room lobby (no specific game)
    networkAdapterRef.current.joinRoom(roomCode.trim())
  }, [roomCode, showNotification])

  const joinGame = useCallback((gameId?: string) => {
    if (!gameId) {
      showNotification('Please enter a game code')
      return
    }
    if (!roomState?.id) {
      showNotification('Must be in a room first')
      return
    }
    if (!gameId.trim()) {
      showNotification('Please enter a game code')
      return
    }
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.joinGame(roomState.id, gameId)
  }, [roomState?.id, showNotification])

  const startGame = useCallback(() => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.startGame()
  }, [showNotification])

  const startNewGame = useCallback(() => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.startNewGame()
  }, [showNotification])

  const peekCard = useCallback((index: number) => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.peekCard(index)
  }, [showNotification])

  const drawCard = useCallback(() => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.drawCard()
  }, [showNotification])

  const takeFromDiscard = useCallback(() => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.takeFromDiscard()
  }, [showNotification])

  const swapCard = useCallback(() => {
    if (selectedCardIndex === null) {
      showNotification('Select a card to swap first')
      return
    }
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.swapCard(selectedCardIndex)
    setSelectedCardIndex(null)
  }, [selectedCardIndex, showNotification])

  const discardDrawn = useCallback(() => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.discardDrawn()
  }, [showNotification])

  const knock = useCallback(() => {
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.knock()
  }, [showNotification])

  const handleCardClick = useCallback((index: number) => {
    const currentPlayer = gameState?.players.find(p => p.id === playerId)
    const isPlayersTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId

    if (!currentPlayer) return

    // Don't allow interactions during countdown
    if (peekCountdown !== null) return

    if (currentPlayer.revealedCards.length < 2 && !currentPlayer.hasPeeked && !currentPlayer.revealedCards.includes(index)) {
      peekCard(index)
    } else if (isPlayersTurn && gameState?.drawnCard) {
      setSelectedCardIndex(index)
    }
  }, [gameState, playerId, peekCard, peekCountdown])

  const clearGameState = useCallback(() => {
    setGameState(null)
    setWinner(null)
    setFinalScores(null)
    setSelectedCardIndex(null)
  }, [])

  // Computed values
  const currentPlayer = gameState?.players.find(p => p.id === playerId)
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId

  // Initialize network adapter and connect on mount
  useEffect(() => {
    // Create network adapter with callbacks
    const adapter = new GolfNetworkAdapter({
      onRoomJoined: (newPlayerId, newRoomState) => {
        setPlayerId(newPlayerId)
        setRoomState(newRoomState)
        setIsInRoom(true)
        setIsInLobby(false)
        onGameIdChange?.(newRoomState.id)
        onPlayerIdChange?.(newPlayerId)
        const player = newRoomState.players.find(p => p.id === newPlayerId)
        onPlayerNameChange?.(player?.name || null)
        
        // Show different message for permalink vs manual joins
        if (permalinkJoinAttempt.isAttempting) {
          showNotification(`Joined room ${newRoomState.id} via permalink!`)
        } else {
          showNotification('Joined room successfully!')
        }
      },
      onRoomStateUpdate: (newRoomState) => {
        setRoomState(newRoomState)
        // Check if any games ended and clear game state if current game is gone
        if (gameState && !newRoomState.games[gameState.id]) {
          setGameState(null)
          setWinner(null)
          setFinalScores(null)
        }
      },
      onGameJoined: (newPlayerId, newGameState) => {
        setPlayerId(newPlayerId)
        setGameState(newGameState)
        setIsInLobby(false)
        onGameIdChange?.(newGameState.id)
        onPlayerIdChange?.(newPlayerId)
        const player = newGameState.players.find(p => p.id === newPlayerId)
        onPlayerNameChange?.(player?.name || null)
        
        // Show different message for permalink vs manual joins
        if (permalinkJoinAttempt.isAttempting) {
          showNotification(`Joined game ${newGameState.id} via permalink!`)
        } else {
          showNotification('Joined game successfully!')
        }
      },
      onGameStateUpdate: (newGameState) => {
        setGameState(newGameState)
      },
      onNotification: (message) => {
        showNotification(message)
        
        // Handle permalink join errors
        if (permalinkJoinAttempt.isAttempting) {
          // Check for common error messages that indicate join failure
          if (message.includes('not found') || message.includes('does not exist') || 
              message.includes('failed to join') || message.includes('error')) {
            // Clear timeout and set error
            if (permalinkTimeoutRef.current) {
              clearTimeout(permalinkTimeoutRef.current)
              permalinkTimeoutRef.current = null
            }
            setPermalinkJoinAttempt({
              isAttempting: false,
              roomId: null,
              gameId: null,
              error: message
            })
          }
        }
        
        // Parse game end notifications
        if (message.includes('Winner:')) {
          const winnerMatch = message.match(/Winner: (.+)/)
          if (winnerMatch) {
            setWinner(winnerMatch[1])
          }
        }
      },
      onConnectionChange: (connected) => {
        setIsConnected(connected)
        onConnectionChange?.(connected)
      },
      onGameEnded: (winnerName, scores) => {
        setWinner(winnerName)
        setFinalScores(scores)
      }
    })

    networkAdapterRef.current = adapter

    // Connect to server
    const websocketUrl = import.meta.env.VITE_GOLF_WEBSOCKET_URL || 'wss://api.muchq.com/games/v1/golf-ws'
    adapter.connect(websocketUrl)

    // Cleanup on unmount
    return () => {
      adapter.disconnect()
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current)
      }
      if (permalinkTimeoutRef.current) {
        clearTimeout(permalinkTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameIdChange, onPlayerIdChange, onPlayerNameChange, onConnectionChange, showNotification])
  // gameState intentionally omitted from dependencies to prevent network adapter recreation

  // Handle permalink-based automatic joining
  useEffect(() => {
    // Only attempt permalink joining if we have valid params and are connected
    if (!permalinkParams || !permalinkParams.isValid || !isConnected || !networkAdapterRef.current) {
      return
    }

    // Don't attempt if we're already in the process of joining
    if (permalinkJoinAttempt.isAttempting) {
      return
    }

    // Don't attempt if we're already in the target room/game
    if (permalinkParams.roomId && roomState?.id === permalinkParams.roomId) {
      if (permalinkParams.gameId) {
        // Check if we're already in the target game
        if (gameState?.id === permalinkParams.gameId) {
          return
        }
        // We're in the right room but need to join the game
        setPermalinkJoinAttempt({
          isAttempting: true,
          roomId: permalinkParams.roomId,
          gameId: permalinkParams.gameId,
          error: null
        })
        networkAdapterRef.current.joinGame(permalinkParams.roomId, permalinkParams.gameId)
      }
      return
    }

    // Start the joining process
    setPermalinkJoinAttempt({
      isAttempting: true,
      roomId: permalinkParams.roomId,
      gameId: permalinkParams.gameId,
      error: null
    })

    // Set a timeout for the join attempt
    permalinkTimeoutRef.current = window.setTimeout(() => {
      setPermalinkJoinAttempt({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: 'Join attempt timed out. Please try again.'
      })
      showNotification('Join attempt timed out. Please try again.')
    }, 10000) // 10 second timeout

    if (permalinkParams.roomId) {
      // Join the room first
      networkAdapterRef.current.joinRoom(permalinkParams.roomId)
    }
  }, [permalinkParams, isConnected, roomState?.id, gameState?.id, permalinkJoinAttempt.isAttempting, showNotification])

  // Handle successful room join for permalink flow
  useEffect(() => {
    if (!permalinkJoinAttempt.isAttempting || !permalinkJoinAttempt.roomId || !roomState) {
      return
    }

    // If we successfully joined the target room
    if (roomState.id === permalinkJoinAttempt.roomId) {
      // If we also need to join a specific game
      if (permalinkJoinAttempt.gameId && networkAdapterRef.current) {
        // Check if the game exists in the room
        if (roomState.games[permalinkJoinAttempt.gameId]) {
          networkAdapterRef.current.joinGame(permalinkJoinAttempt.roomId, permalinkJoinAttempt.gameId)
        } else {
          // Game doesn't exist, clear attempt with error
          setPermalinkJoinAttempt({
            isAttempting: false,
            roomId: null,
            gameId: null,
            error: `Game ${permalinkJoinAttempt.gameId} not found in room`
          })
          showNotification(`Game ${permalinkJoinAttempt.gameId} not found in room`)
        }
      } else {
        // Only needed to join room, clear attempt and timeout
        if (permalinkTimeoutRef.current) {
          clearTimeout(permalinkTimeoutRef.current)
          permalinkTimeoutRef.current = null
        }
        setPermalinkJoinAttempt({
          isAttempting: false,
          roomId: null,
          gameId: null,
          error: null
        })
      }
    }
  }, [roomState, permalinkJoinAttempt, showNotification])

  // Handle successful game join for permalink flow
  useEffect(() => {
    if (!permalinkJoinAttempt.isAttempting || !permalinkJoinAttempt.gameId || !gameState) {
      return
    }

    // If we successfully joined the target game
    if (gameState.id === permalinkJoinAttempt.gameId) {
      // Clear timeout and attempt
      if (permalinkTimeoutRef.current) {
        clearTimeout(permalinkTimeoutRef.current)
        permalinkTimeoutRef.current = null
      }
      setPermalinkJoinAttempt({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: null
      })
    }
  }, [gameState, permalinkJoinAttempt])

  // Handle peek countdown when all players have peeked
  useEffect(() => {
    if (gameState?.gamePhase === 'peeking' && gameState?.allPlayersPeeked) {
      // Start countdown at 3
      setPeekCountdown(3)

      const startTime = Date.now()
      countdownIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime
        const secondsElapsed = Math.floor(elapsed / 1000)
        const newCount = Math.max(0, 3 - secondsElapsed)

        setPeekCountdown(newCount)

        if (secondsElapsed >= 4) { // After showing 0 for a second
          // Countdown finished
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }

          // Hide the countdown overlay
          setPeekCountdown(null)

          // Send hideCards message
          if (networkAdapterRef.current) {
            networkAdapterRef.current.hideCards()
          }
        }
      }, 100) // Update more frequently for smoother countdown
    } else if (gameState?.gamePhase !== 'peeking') {
      // Clear countdown if we're no longer in peeking phase
      setPeekCountdown(null)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [gameState?.gamePhase, gameState?.allPlayersPeeked])

  return {
    // State
    gameState,
    roomState,
    playerId,
    roomCode,
    selectedCardIndex,
    isInLobby,
    isInRoom,
    notification,
    isConnected,
    peekCountdown,
    winner,
    finalScores,
  
    // Permalink state
    permalinkJoinAttempt,
  
    // Actions
    createRoom,
    createGame,
    joinRoom,
    joinGame,
    startGame,
    startNewGame,
    peekCard,
    drawCard,
    takeFromDiscard,
    swapCard,
    discardDrawn,
    knock,
    handleCardClick,
    setRoomCode,
    clearGameState,

    // Computed
    currentPlayer,
    isMyTurn
  }
}
