import { useState, useRef, useCallback, useEffect } from 'react'
import type { GameState, Player, Room } from '@/types/golf'
import { GolfNetworkAdapter } from '@/utils/networkAdapter'

interface UseGolfGameProps {
  onGameIdChange?: (id: string | null) => void
  onPlayerIdChange?: (id: string | null) => void
  onPlayerNameChange?: (name: string | null) => void
  onConnectionChange?: (connected: boolean) => void
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
  onConnectionChange
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
  const networkAdapterRef = useRef<GolfNetworkAdapter | null>(null)
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
        showNotification('Joined room successfully!')
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
        showNotification('Joined game successfully!')
      },
      onGameStateUpdate: (newGameState) => {
        setGameState(newGameState)
      },
      onNotification: (message) => {
        showNotification(message)
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameIdChange, onPlayerIdChange, onPlayerNameChange, onConnectionChange, showNotification])
  // gameState intentionally omitted from dependencies to prevent network adapter recreation

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
