import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GameState, Player, Room } from '@/types/golf'
import type { ChatMessage } from '@/types/golfChat'
import { mergeChatMessages } from '@/types/golfChat'
import { GolfNetworkAdapter } from '@/utils/networkAdapter'
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
  // capped at 100 by the shared merge. Seen and unread are presentation
  // state and live in the chat UI — this hook only owns what the wire
  // knows.
  chatMessages: ChatMessage[]
  // True once the current room's wire has actually delivered chat — the
  // join replay (empty counts) or a live message. The adapter class
  // declaring sendChat is not proof the server has chat: a UI deployed
  // ahead of the server (or after a rollback) must render no chat at
  // all rather than a composer whose sends silently vanish.
  chatAvailable: boolean
  // Highest messageId ever delivered via a history replay: consumers
  // that announce live messages use it to keep replays silent.
  chatReplayUpTo: number
  // The newest command rejection off the wire, sequence-numbered so a
  // consumer reacts exactly once per refusal even when reasons repeat.
  // Reasons are uninterpreted here — the chat composer picks out the
  // server's "slow down" (MoonBase#1241) for its draft restore.
  chatRejection: { seq: number; reason: string } | null
  sendChat: (text: string) => void
  
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
  // The network adapter's callbacks are created once, on mount, so any
  // attempt state they consult must ride a ref — the state closure they
  // captured is forever the initial one. That stale closure is why a
  // rejected permalink join used to fall through to the 10s timeout and
  // an identical retry (muchq.github.io#260). Every write goes through
  // the wrapper so ref and state cannot drift.
  const permalinkJoinAttemptRef = useRef(permalinkJoinAttempt)
  const updatePermalinkJoinAttempt = useCallback((next: typeof permalinkJoinAttemptRef.current) => {
    permalinkJoinAttemptRef.current = next
    setPermalinkJoinAttempt(next)
  }, [])
  // The link's target, visible to the once-created callbacks for the
  // same reason: a resume that lands in an old room must not navigate
  // the share link's URL away before the join flow ever runs.
  const permalinkTargetRef = useRef(permalinkParams)
  useEffect(() => {
    permalinkTargetRef.current = permalinkParams
  }, [permalinkParams])
  // One leave-and-rejoin per attempt for the connect-before-resume race
  // (see onGameError); reset when a fresh attempt starts.
  const permalinkLeaveRetriedRef = useRef(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatReplayUpTo, setChatReplayUpTo] = useState(0)
  const [chatAvailable, setChatAvailable] = useState(false)
  const [chatRejection, setChatRejection] = useState<{ seq: number; reason: string } | null>(null)
  // The room the chat state belongs to: entering a different room drops
  // the old room's messages before its history lands.
  const chatRoomRef = useRef<string | null>(null)
  const resetChat = useCallback((roomId: string | null) => {
    chatRoomRef.current = roomId
    setChatMessages([])
    setChatReplayUpTo(0)
    setChatRejection(null)
    // Capability is re-proven per room: the next replay or live message
    // flips it back.
    setChatAvailable(false)
  }, [])
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
    // Chat belongs to the room: leaving clears it.
    resetChat(null)
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
  }, [roomState?.id, navigate, resetChat])

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
    if (!adapter || !trimmed) return
    adapter.sendChat(trimmed)
  }, [])

  // Computed values
  const currentPlayer = gameState?.players.find(p => p.id === playerId)
  const isMyTurn = gameState?.players[gameState.currentPlayerIndex]?.id === playerId

  // Initialize network adapter and connect on mount
  useEffect(() => {
    const adapter = new GolfNetworkAdapter({
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
          resetChat(newRoomState.id)
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
        if (permalinkJoinAttemptRef.current.isAttempting) {
          showNotification(`Joined room ${newRoomState.id} via permalink!`)
        } else {
          showNotification('Joined room successfully!')
          // Update URL for manual joins (not permalink joins) — and not
          // for a resume that landed in a room the current URL's
          // permalink does not name: navigating would rewrite the share
          // link's target to the old room before the join flow ever ran
          // (muchq.github.io#260), silently stranding the visitor there.
          const target = permalinkTargetRef.current
          const detouredResume =
            target != null && target.isValid && target.roomId != null &&
            target.roomId !== newRoomState.id
          if (!detouredResume) {
            setIsManualNavigation(true)
            navigateToRoom(newRoomState.id)
            // Reset flag after navigation
            setTimeout(() => setIsManualNavigation(false), 200)
          }
        }
      },
      onRoomLeft: () => {
        // The adapter has already dropped its own room state; mirror it.
        // Its getter is the guard against a stale ack: if a new room was
        // joined since the leave was sent, it is non-null and stays.
        // Game state goes with the room, exactly as the manual leave
        // clears it — a resume that restored a live game must not flash
        // that game's UI while the detour joins the link's room.
        if ((networkAdapterRef.current?.roomState ?? null) === null) {
          setRoomState(null)
          setIsInRoom(false)
          setGameState(null)
          setWinner(null)
          setWinners(null)
          setFinalScores(null)
          setSelectedCardIndex(null)
        }
        // A permalink attempt that had to leave a resumed detour room
        // continues into its target the moment the hub confirms the
        // leave (muchq.github.io#260); the attempt's own timeout covers
        // the whole leave-then-join.
        const attempt = permalinkJoinAttemptRef.current
        if (attempt.isAttempting && attempt.roomId && !attempt.error) {
          networkAdapterRef.current?.joinRoom(attempt.roomId)
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
        if (permalinkJoinAttemptRef.current.isAttempting) {
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
        // The recovery path's first refusal is a cue the attempt acts
        // on, not news: while it is still working the leave-and-chain,
        // the scary string stays off the screen. Terminal paths cleared
        // isAttempting before this fires, so real failures still toast.
        if (message.includes('already in a room') && permalinkJoinAttemptRef.current.isAttempting) {
          return
        }
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
        setChatAvailable(true)
        setChatMessages(prev => mergeChatMessages(prev, [message]))
      },
      onChatHistory: (messages) => {
        // The replay is the wire's proof that chat exists — an empty
        // room sends an empty one, so availability flips regardless.
        setChatAvailable(true)
        setChatMessages(prev => mergeChatMessages(prev, messages))
        // Same commit as the merge, so consumers never see replayed
        // messages without the watermark that keeps them unannounced.
        setChatReplayUpTo(prev => messages.reduce((max, m) => Math.max(max, m.messageId), prev))
      },
      onGameError: (errorMessage) => {
        // Every rejection also flows to chat state — the composer
        // reacts once per seq, and only to reasons it recognizes.
        setChatRejection(prev => ({ seq: (prev?.seq ?? 0) + 1, reason: errorMessage }))
        const attempt = permalinkJoinAttemptRef.current
        if (!attempt.isAttempting) {
          return
        }
        // The connect-before-resume race: isConnected flips on socket
        // open, before the resume's roomState lands, so the join effect
        // usually sends a bare joinRoom that the hub refuses — the seat
        // is still in its old room server-side. That refusal is the cue,
        // not the verdict: leave (the wire needs no room id; the hub
        // knows the seat's room) and let onRoomLeft chain the join. Once
        // per attempt, so a genuinely missing target cannot loop.
        if (errorMessage.includes('already in a room') && attempt.roomId &&
            !permalinkLeaveRetriedRef.current) {
          permalinkLeaveRetriedRef.current = true
          networkAdapterRef.current?.leaveRoom(networkAdapterRef.current?.roomState?.id ?? '')
          return
        }
        // Any other rejection ends the attempt with its reason — the
        // old not-found string match left everything else to the 10s
        // timeout and an identical retry, the repeated-rejection loop
        // of muchq.github.io#260. The failed target stays in the state
        // so the join effect knows this exact link already failed and
        // does not restart it.
        if (permalinkTimeoutRef.current) {
          clearTimeout(permalinkTimeoutRef.current)
          permalinkTimeoutRef.current = null
        }
        // After a leave was already tried, a repeat of the combined
        // refusal — or "not in a room" from leaving nothing — can only
        // mean the target itself is gone.
        const friendly =
          errorMessage.includes('not found') || errorMessage.includes('does not exist') ||
          (permalinkLeaveRetriedRef.current &&
            (errorMessage.includes('already in a room') || errorMessage.includes('not in a room')))
            ? 'This room no longer exists.'
            : errorMessage
        updatePermalinkJoinAttempt({
          isAttempting: false,
          roomId: attempt.roomId,
          gameId: attempt.gameId,
          error: friendly,
          gameJoinAttempted: false
        })
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

    adapter.connect()

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

    // A finished attempt for this same target stays finished — the
    // rejection or timeout that ended it would only repeat. Restarting
    // here is what looped the hub's refusal every 10 seconds
    // (muchq.github.io#260); a different link arrives as different
    // params and starts fresh.
    if (permalinkJoinAttempt.error &&
        permalinkJoinAttempt.roomId === permalinkParams.roomId &&
        permalinkJoinAttempt.gameId === permalinkParams.gameId) {
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
          updatePermalinkJoinAttempt({
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
    permalinkLeaveRetriedRef.current = false
    updatePermalinkJoinAttempt({
      isAttempting: true,
      roomId: permalinkParams.roomId,
      gameId: permalinkParams.gameId,
      error: null,
      gameJoinAttempted: false
    })

    // Set a timeout for the join attempt — it covers the whole flow,
    // detour leave included. The target rides the failure state so the
    // effect can tell "this link failed" from "no attempt yet".
    permalinkTimeoutRef.current = window.setTimeout(() => {
      updatePermalinkJoinAttempt({
        isAttempting: false,
        roomId: permalinkParams.roomId,
        gameId: permalinkParams.gameId,
        error: 'Join attempt timed out. Please try again.',
        gameJoinAttempted: false
      })
      showNotification('Join attempt timed out. Please try again.')
    }, 10000) // 10 second timeout

    if (permalinkParams.roomId) {
      if (roomState && roomState.id !== permalinkParams.roomId) {
        // The resume landed this seat in a different room than the link
        // names, and the hub refuses joinRoom for a seat already in a
        // room ("room unavailable or already in a room",
        // muchq.github.io#260). Leave first; onRoomLeft chains into
        // joinRoom once the hub confirms. This spends the attempt's one
        // leave — a refusal of the chained join then terminates instead
        // of burning a second leave through the race branch.
        permalinkLeaveRetriedRef.current = true
        networkAdapterRef.current.leaveRoom(roomState.id)
      } else {
        // Join the room first
        networkAdapterRef.current.joinRoom(permalinkParams.roomId)
      }
    }
  }, [permalinkParams, isConnected, isReconnecting, roomState, gameState?.id, permalinkJoinAttempt, showNotification, updatePermalinkJoinAttempt])

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
          // Mark that we're attempting to join the game to prevent
          // duplicate calls. Spread the ref, not this effect's state
          // closure: a rejection can land between the commit that
          // scheduled this effect and its run, and re-spreading the
          // stale closure here would resurrect the attempt it ended.
          updatePermalinkJoinAttempt({
            ...permalinkJoinAttemptRef.current,
            gameJoinAttempted: true
          })
          networkAdapterRef.current.joinGame(permalinkJoinAttempt.roomId, permalinkJoinAttempt.gameId)
        } else {
          // Game doesn't exist, clear attempt and its timeout with an
          // error — target kept so the join effect will not restart
          // this same failed link. Without the clear, this stale timer
          // firing later could overwrite a subsequent different link's
          // attempt mid-detour.
          if (permalinkTimeoutRef.current) {
            clearTimeout(permalinkTimeoutRef.current)
            permalinkTimeoutRef.current = null
          }
          updatePermalinkJoinAttempt({
            isAttempting: false,
            roomId: permalinkJoinAttempt.roomId,
            gameId: permalinkJoinAttempt.gameId,
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
        updatePermalinkJoinAttempt({
          isAttempting: false,
          roomId: null,
          gameId: null,
          error: null,
          gameJoinAttempted: false
        })
      }
    }
  }, [roomState, permalinkJoinAttempt, showNotification, updatePermalinkJoinAttempt])

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
      updatePermalinkJoinAttempt({
        isAttempting: false,
        roomId: null,
        gameId: null,
        error: null,
        gameJoinAttempted: false
      })
    }
  }, [gameState, permalinkJoinAttempt, updatePermalinkJoinAttempt])

  // Handle URL synchronization for state changes (back/forward navigation support)
  useEffect(() => {
    // Only update URL if we're not currently attempting a permalink join or manual navigation
    // This prevents navigation loops
    if (permalinkJoinAttempt.isAttempting || isManualNavigation) {
      return
    }
    // A share link owns the URL while it names a room this seat is not
    // in — unresolved or failed alike. Syncing the resumed room over it
    // would rewrite the link's target (the second of the two navigations
    // that used to strand a visitor in their old room, muchq.github.io#260),
    // and after a failure it would erase the URL a reload could retry.
    if (permalinkParams?.isValid && permalinkParams.roomId &&
        permalinkParams.roomId !== roomState?.id) {
      return
    }

    // The permalink is the whole URL, query included: anything else in
    // the address bar is replaced by the canonical link.
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
  }, [roomState, gameState, permalinkJoinAttempt.isAttempting, permalinkJoinAttempt.error, isManualNavigation, navigate, permalinkParams])

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
    chatAvailable,
    chatReplayUpTo,
    chatRejection,
    sendChat,

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
