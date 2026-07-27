import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GameState, Player, Room } from '@/types/golf'
import type { ChatMessage } from '@/types/golfChat'
import { mergeChatMessages } from '@/types/golfChat'
import { GolfNetworkAdapter } from '@/utils/networkAdapter'
import { GolfV2NetworkAdapter } from '@/utils/golfV2Adapter'
import { isGolfV2Enabled } from '@/utils/golfV2'
import type { GolfGameAdapter } from '@/types/golfAdapter'
import type { ParsedPermalinkParams } from '@/utils/golfPermalinks'
import { generateRoomPermalink, generateGamePermalink } from '@/utils/golfPermalinks'

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
  winners: string[] | null
  finalScores: Array<{ playerName: string; score: number }> | null

  // Room chat (MoonBase#1226): the room's merged history+live view,
  // capped at 100 by the shared merge. Available only when the active
  // adapter's wire carries chat (v2); v1 renders no chat UI.
  chatMessages: ChatMessage[]
  chatUnreadCount: number
  chatAvailable: boolean
  sendChat: (text: string) => void
  markChatSeen: () => void
  
  // New game notifications
  newGameNotifications: Array<{
    gameId: string
    timestamp: number
    dismissed: boolean
  }>
  
  // Permalink state
  permalinkJoinAttempt: {
    isAttempting: boolean
    roomId: string | null
    gameId: string | null
    error: string | null
    gameJoinAttempted: boolean
  }
  
  // Permalink URLs
  currentRoomPermalink: string | null
  currentGamePermalink: string | null
  
  // Navigation helpers
  navigateToRoom: (roomId: string) => void
  navigateToGame: (roomId: string, gameId: string) => void
  copyRoomLink: () => Promise<void>
  copyGameLink: () => Promise<void>
  dismissNewGameNotification: (gameId: string) => void
  joinNewGame: (gameId: string) => void
  
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
  swapCard: (index?: number) => void
  discardDrawn: () => void
  knock: () => void
  handleCardClick: (index: number) => void
  setRoomCode: (code: string) => void
  clearGameState: () => void
  leaveGame: () => void
  leaveRoom: () => void

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
  const [winners, setWinners] = useState<string[] | null>(null)
  const [finalScores, setFinalScores] = useState<Array<{ playerName: string; score: number }> | null>(null)
  const [permalinkJoinAttempt, setPermalinkJoinAttempt] = useState({
    isAttempting: false,
    roomId: null as string | null,
    gameId: null as string | null,
    error: null as string | null,
    gameJoinAttempted: false
  })
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLastSeenId, setChatLastSeenId] = useState(0)
  const [chatAvailable, setChatAvailable] = useState(false)
  // The room the chat state belongs to: entering a different room drops
  // the old room's messages before its history lands.
  const chatRoomRef = useRef<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isManualNavigation, setIsManualNavigation] = useState(false)
  const [, setIsCreatingNewGame] = useState(false)
  const [newGameNotifications, setNewGameNotifications] = useState<Array<{
    gameId: string
    timestamp: number
    dismissed: boolean
  }>>([])
  const isCreatingNewGameRef = useRef(false)
  const networkAdapterRef = useRef<GolfGameAdapter | null>(null)
  const permalinkTimeoutRef = useRef<number | null>(null)
  const notificationTimeoutRef = useRef<number | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  const navigate = useNavigate()

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
    if (!roomState?.id) {
      showNotification('Must be in a room to create a new game')
      return
    }
    setIsCreatingNewGame(true)
    isCreatingNewGameRef.current = true
    networkAdapterRef.current.startNewGame()
  }, [showNotification, roomState?.id])

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

  const swapCard = useCallback((index?: number) => {
    const swapIndex = index ?? selectedCardIndex
    if (swapIndex === null) {
      showNotification('Select a card to swap first')
      return
    }
    if (!networkAdapterRef.current) {
      showNotification('Not connected to server')
      return
    }
    networkAdapterRef.current.swapCard(swapIndex)
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
      swapCard(index)
    }
  }, [gameState, playerId, peekCard, peekCountdown, swapCard])

  const clearGameState = useCallback(() => {
    setGameState(null)
    setWinner(null)
    setWinners(null)
    setFinalScores(null)
    setSelectedCardIndex(null)
  }, [])

  const leaveGame = useCallback(() => {
    networkAdapterRef.current?.leaveGame()
    setGameState(null)
    setWinner(null)
    setWinners(null)
    setFinalScores(null)
    setSelectedCardIndex(null)
  }, [])

  const leaveRoom = useCallback(() => {
    if (roomState?.id) {
      networkAdapterRef.current?.leaveRoom(roomState.id)
    }
    // Chat belongs to the room: leaving clears messages and unread state.
    chatRoomRef.current = null
    setChatMessages([])
    setChatLastSeenId(0)
    setRoomState(null)
    setGameState(null)
    setIsInRoom(false)
    setIsInLobby(true)
    setWinner(null)
    setWinners(null)
    setFinalScores(null)
    setSelectedCardIndex(null)
    setNewGameNotifications([])
    navigate('/golf', { replace: true })
  }, [roomState?.id, navigate])

  // Navigation helper functions
  const navigateToRoom = useCallback((roomId: string) => {
    const roomUrl = generateRoomPermalink(roomId)
    navigate(roomUrl, { replace: false })
  }, [navigate])

  const navigateToGame = useCallback((roomId: string, gameId: string) => {
    const gameUrl = generateGamePermalink(roomId, gameId)
    navigate(gameUrl, { replace: false })
  }, [navigate])

  // Permalink URL generation
  const currentRoomPermalink = roomState?.id ? 
    `${window.location.origin}${generateRoomPermalink(roomState.id)}` : null
  
  const currentGamePermalink = (roomState?.id && gameState?.id) ? 
    `${window.location.origin}${generateGamePermalink(roomState.id, gameState.id)}` : null

  // Copy link functions
  const copyRoomLink = useCallback(async () => {
    if (!currentRoomPermalink) {
      throw new Error('No room permalink available')
    }
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentRoomPermalink)
    } else {
      // Fallback method
      const textArea = document.createElement('textarea')
      textArea.value = currentRoomPermalink
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (!successful) {
        throw new Error('Failed to copy room link')
      }
    }
    
    showNotification('Room link copied to clipboard!')
  }, [currentRoomPermalink, showNotification])

  const copyGameLink = useCallback(async () => {
    if (!currentGamePermalink) {
      throw new Error('No game permalink available')
    }
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentGamePermalink)
    } else {
      // Fallback method
      const textArea = document.createElement('textarea')
      textArea.value = currentGamePermalink
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (!successful) {
        throw new Error('Failed to copy game link')
      }
    }
    
    showNotification('Game link copied to clipboard!')
  }, [currentGamePermalink, showNotification])

  // New game notification handlers
  const dismissNewGameNotification = useCallback((gameId: string) => {
    setNewGameNotifications(prev => 
      prev.map(notification => 
        notification.gameId === gameId 
          ? { ...notification, dismissed: true }
          : notification
      )
    )
  }, [])

  const joinNewGame = useCallback((gameId: string) => {
    if (!roomState?.id) {
      showNotification('Must be in a room to join a game')
      return
    }

    // Dismiss the notification
    dismissNewGameNotification(gameId)

    // Clear current game state before joining the new one
    setGameState(null)
    setWinner(null)
    setWinners(null)
    setFinalScores(null)
    setSelectedCardIndex(null)

    // Join the game
    joinGame(gameId)
  }, [roomState?.id, dismissNewGameNotification, joinGame, showNotification])

  const sendChat = useCallback((text: string) => {
    const adapter = networkAdapterRef.current
    // Trim here so what the byte counter measured is what ships; the
    // server validates again and rejects what a stale client sends.
    const trimmed = text.trim()
    if (!adapter?.sendChat || !trimmed) return
    adapter.sendChat(trimmed)
  }, [])

  const markChatSeen = useCallback(() => {
    const latest = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].messageId : 0
    setChatLastSeenId(prev => Math.max(prev, latest))
  }, [chatMessages])

  // Computed values
  const chatUnreadCount = chatMessages.filter(m => m.messageId > chatLastSeenId).length
  const currentPlayer = gameState?.players.find(p => p.id === playerId)
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId

  // Initialize network adapter and connect on mount
  useEffect(() => {
    // Create network adapter with callbacks; ?golf=v2 opts this browser
    // into the smithy hub (MoonBase#1187 phase 3), ?golf=v1 opts out.
    const AdapterClass = isGolfV2Enabled() ? GolfV2NetworkAdapter : GolfNetworkAdapter
    const adapter = new AdapterClass({
      onReconnecting: () => {
        setIsReconnecting(true)
        // Safety: clear after 2s in case server has no state to restore
        reconnectTimeoutRef.current = window.setTimeout(() => {
          setIsReconnecting(false)
        }, 2000)
      },
      onRoomJoined: (newPlayerId, newRoomState) => {
        // A different room means different chat: drop the old room's
        // messages before the new room's history event lands. A resume
        // into the same room keeps them — its replay merges by id.
        if (chatRoomRef.current !== newRoomState.id) {
          chatRoomRef.current = newRoomState.id
          setChatMessages([])
          setChatLastSeenId(0)
        }
        setIsReconnecting(false)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
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
          // Update URL for manual joins (not permalink joins)
          setIsManualNavigation(true)
          navigateToRoom(newRoomState.id)
          // Reset flag after navigation
          setTimeout(() => setIsManualNavigation(false), 200)
        }
      },
      onRoomStateUpdate: (newRoomState) => {
        setRoomState(newRoomState)
        // Check if any games ended and clear game state if current game is gone
        if (gameState && !newRoomState.games[gameState.id]) {
          setGameState(null)
          setWinner(null)
          setWinners(null)
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
        
        // Show different message for permalink vs manual joins vs new game creation
        if (permalinkJoinAttempt.isAttempting) {
          showNotification(`Joined game ${newGameState.id} via permalink!`)
        } else if (isCreatingNewGameRef.current) {
          showNotification(`Created and joined new game ${newGameState.id}!`)
          // Update URL for new game creation
          // Use the network adapter's roomState to get the current room ID
          const currentRoomState = networkAdapterRef.current?.roomState
          if (currentRoomState?.id) {
            setIsManualNavigation(true)
            navigateToGame(currentRoomState.id, newGameState.id)
            // Reset flag after navigation
            setTimeout(() => setIsManualNavigation(false), 200)
          }
          setIsCreatingNewGame(false)
          isCreatingNewGameRef.current = false
        } else {
          showNotification('Joined game successfully!')
          // Update URL for manual joins (not permalink joins)
          // We need the room ID, which should be available from roomState
          if (roomState?.id) {
            setIsManualNavigation(true)
            navigateToGame(roomState.id, newGameState.id)
            // Reset flag after navigation
            setTimeout(() => setIsManualNavigation(false), 200)
          }
        }
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
      onChatMessage: (message) => {
        setChatMessages(prev => mergeChatMessages(prev, [message]))
      },
      onChatHistory: (messages) => {
        setChatMessages(prev => mergeChatMessages(prev, messages))
      },
      onGameError: (errorMessage) => {
        if (permalinkJoinAttempt.isAttempting &&
            (errorMessage.includes('not found') || errorMessage.includes('does not exist'))) {
          if (permalinkTimeoutRef.current) {
            clearTimeout(permalinkTimeoutRef.current)
            permalinkTimeoutRef.current = null
          }
          setPermalinkJoinAttempt({
            isAttempting: false,
            roomId: null,
            gameId: null,
            error: 'This room no longer exists.',
            gameJoinAttempted: false
          })
        }
      },
      onConnectionChange: (connected) => {
        setIsConnected(connected)
        onConnectionChange?.(connected)
      },
      onGameEnded: (winnerName, scores, winnerNames) => {
        setWinner(winnerName)
        setWinners(winnerNames ?? null)
        setFinalScores(scores)
      },
      onNewGameStarted: (gameId, _previousGameId) => {
        // If we were creating a new game, automatically join it
        // Use ref to get current state since this callback is created once
        const currentRoomState = networkAdapterRef.current?.roomState
        if (isCreatingNewGameRef.current && currentRoomState?.id && gameId) {
          // Auto-joining newly created game
          // Join the new game automatically
          adapter.joinGame(currentRoomState.id, gameId)
        } else if (gameId) {
          // Add notification for other players about the new game
          setNewGameNotifications(prev => {
            // Check if we already have a notification for this game
            const existingNotification = prev.find(n => n.gameId === gameId)
            if (existingNotification) {
              return prev
            }
            
            // Add new notification
            return [...prev, {
              gameId,
              timestamp: Date.now(),
              dismissed: false
            }]
          })
          
          showNotification(`New game ${gameId} started! Click to join.`)
        }
      }
    })

    networkAdapterRef.current = adapter
    // Through the shared interface: the v1 class doesn't declare the
    // optional capability at all.
    setChatAvailable(typeof networkAdapterRef.current.sendChat === 'function')

    // Connect to server (the v2 adapter resolves its own endpoints)
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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGameIdChange, onPlayerIdChange, onPlayerNameChange, onConnectionChange, showNotification])
  // gameState, roomState, isCreatingNewGame intentionally omitted from dependencies to prevent network adapter recreation

  // Handle permalink-based automatic joining
  useEffect(() => {
    // Only attempt permalink joining if we have valid params and are connected
    // Skip while reconnection state restore is in progress to avoid racing
    if (!permalinkParams || !permalinkParams.isValid || !isConnected || isReconnecting || !networkAdapterRef.current) {
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
        // Only attempt if we haven't already tried to join this game
        if (!permalinkJoinAttempt.gameJoinAttempted) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- state machine transition before network call
          setPermalinkJoinAttempt({
            isAttempting: true,
            roomId: permalinkParams.roomId,
            gameId: permalinkParams.gameId,
            error: null,
            gameJoinAttempted: true
          })
          networkAdapterRef.current.joinGame(permalinkParams.roomId, permalinkParams.gameId)
        }
      }
      return
    }

    // Start the joining process
    setPermalinkJoinAttempt({
      isAttempting: true,
      roomId: permalinkParams.roomId,
      gameId: permalinkParams.gameId,
      error: null,
      gameJoinAttempted: false
    })

    // Set a timeout for the join attempt
    permalinkTimeoutRef.current = window.setTimeout(() => {
      setPermalinkJoinAttempt({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: 'Join attempt timed out. Please try again.',
        gameJoinAttempted: false
      })
      showNotification('Join attempt timed out. Please try again.')
    }, 10000) // 10 second timeout

    if (permalinkParams.roomId) {
      // Join the room first
      networkAdapterRef.current.joinRoom(permalinkParams.roomId)
    }
  }, [permalinkParams, isConnected, isReconnecting, roomState?.id, gameState?.id, permalinkJoinAttempt.isAttempting, permalinkJoinAttempt.gameJoinAttempted, showNotification])

  // Handle successful room join for permalink flow
  useEffect(() => {
    if (!permalinkJoinAttempt.isAttempting || !permalinkJoinAttempt.roomId || !roomState) {
      return
    }

    // If we successfully joined the target room
    if (roomState.id === permalinkJoinAttempt.roomId) {
      // If we also need to join a specific game
      if (permalinkJoinAttempt.gameId && networkAdapterRef.current && !permalinkJoinAttempt.gameJoinAttempted) {
        // Check if the game exists in the room
        if (roomState.games[permalinkJoinAttempt.gameId]) {
          // Mark that we're attempting to join the game to prevent duplicate calls
          // eslint-disable-next-line react-hooks/set-state-in-effect -- state machine transition before network call
          setPermalinkJoinAttempt(prev => ({
            ...prev,
            gameJoinAttempted: true
          }))
          networkAdapterRef.current.joinGame(permalinkJoinAttempt.roomId, permalinkJoinAttempt.gameId)
        } else {
          // Game doesn't exist, clear attempt with error
          setPermalinkJoinAttempt({
            isAttempting: false,
            roomId: null,
            gameId: null,
            error: `Game ${permalinkJoinAttempt.gameId} not found in room`,
            gameJoinAttempted: false
          })
          showNotification(`Game ${permalinkJoinAttempt.gameId} not found in room`)
        }
      } else if (!permalinkJoinAttempt.gameId) {
        // Only needed to join room, clear attempt and timeout
        if (permalinkTimeoutRef.current) {
          clearTimeout(permalinkTimeoutRef.current)
          permalinkTimeoutRef.current = null
        }
        setPermalinkJoinAttempt({
          isAttempting: false,
          roomId: null,
          gameId: null,
          error: null,
          gameJoinAttempted: false
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- state machine transition on external event
      setPermalinkJoinAttempt({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: null,
        gameJoinAttempted: false
      })
    }
  }, [gameState, permalinkJoinAttempt])

  // Handle URL synchronization for state changes (back/forward navigation support)
  useEffect(() => {
    // Only update URL if we're not currently attempting a permalink join or manual navigation
    // This prevents navigation loops
    if (permalinkJoinAttempt.isAttempting || isManualNavigation) {
      return
    }

    // Compare path AND query: permalinks carry ?golf=v2 while the beta is
    // active, and a pathname-only comparison would re-navigate every run.
    // If we have both room and game state, ensure URL reflects game
    if (roomState && gameState && roomState.id && gameState.id) {
      const expectedUrl = generateGamePermalink(roomState.id, gameState.id)
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== expectedUrl) {
        navigate(expectedUrl, { replace: true })
      }
    }
    // If we only have room state, ensure URL reflects room
    else if (roomState && roomState.id && !gameState) {
      const expectedUrl = generateRoomPermalink(roomState.id)
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== expectedUrl && !currentPath.includes('/game/')) {
        navigate(expectedUrl, { replace: true })
      }
    }
  }, [roomState, gameState, permalinkJoinAttempt.isAttempting, isManualNavigation, navigate])

  // Handle peek countdown when all players have peeked
  useEffect(() => {
    if (gameState?.gamePhase === 'peeking' && gameState?.allPlayersPeeked) {
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
    }

    // Cleanup: clear countdown and interval when phase changes or on unmount
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      setPeekCountdown(null)
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
    winners,
    finalScores,

    // Room chat
    chatMessages,
    chatUnreadCount,
    chatAvailable,
    sendChat,
    markChatSeen,

    // New game notifications
    newGameNotifications,
    
    // Permalink state
    permalinkJoinAttempt,
    
    // Permalink URLs
    currentRoomPermalink,
    currentGamePermalink,
  
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
    leaveGame,
    leaveRoom,

    // Navigation helpers
    navigateToRoom,
    navigateToGame,
    copyRoomLink,
    copyGameLink,
    dismissNewGameNotification,
    joinNewGame,

    // Computed
    currentPlayer,
    isMyTurn
  }
}
