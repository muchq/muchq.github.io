/* eslint-disable no-console */
import type {
  BaseNetworkMessage,
  GameNetworkPlugin,
  MessageHandlerMap,
  NetworkContext
} from '@/types/network'
import type { Player, GameState as GolfGameState, Room, FinalScore } from '@/types/golf'

// Golf-specific message types
interface GolfMessage extends BaseNetworkMessage {
  type: 'createRoom' | 'joinRoom' | 'createGame' | 'joinGame' | 'roomJoined' | 'roomStateUpdate' | 'gameState' | 'error' | 
        'gameStarted' | 'turnChanged' | 'playerKnocked' | 'gameEnded' | 'newGameStarted' |
        'startGame' | 'peekCard' | 'drawCard' | 'takeFromDiscard' | 
        'swapCard' | 'discardDrawn' | 'knock' | 'hideCards' | 'startNewGame'
  // Request fields
  roomId?: string
  gameId?: string
  cardIndex?: number
  // Response fields
  playerId?: string
  gameState?: GolfGameState
  roomState?: Room
  message?: string
  winner?: string
  finalScores?: FinalScore[]
  previousGameId?: string
}

// Golf plugin state
interface GolfPluginState {
  playerId: string | null
  gameState: GolfGameState | null
  roomState: Room | null
  gameContext: { roomId: string; gameId: string } | null
  isInLobby: boolean
}

export class GolfNetworkPlugin implements GameNetworkPlugin {
  gameType = 'golf'
  private onRoomJoined?: (playerId: string, roomState: Room) => void
  private onGameJoined?: (playerId: string, gameState: GolfGameState) => void
  private onGameStateUpdate?: (gameState: GolfGameState) => void
  private onRoomStateUpdate?: (roomState: Room) => void
  private onNotification?: (message: string) => void
  private onGameEnded?: (winner: string, finalScores: FinalScore[]) => void
  private onNewGameStarted?: (gameId: string, previousGameId?: string) => void

  constructor(callbacks?: {
    onRoomJoined?: (playerId: string, roomState: Room) => void
    onGameJoined?: (playerId: string, gameState: GolfGameState) => void
    onGameStateUpdate?: (gameState: GolfGameState) => void
    onRoomStateUpdate?: (roomState: Room) => void
    onNotification?: (message: string) => void
    onGameEnded?: (winner: string, finalScores: FinalScore[]) => void
    onNewGameStarted?: (gameId: string, previousGameId?: string) => void
  }) {
    if (callbacks) {
      this.onRoomJoined = callbacks.onRoomJoined
      this.onGameJoined = callbacks.onGameJoined
      this.onGameStateUpdate = callbacks.onGameStateUpdate
      this.onRoomStateUpdate = callbacks.onRoomStateUpdate
      this.onNotification = callbacks.onNotification
      this.onGameEnded = callbacks.onGameEnded
      this.onNewGameStarted = callbacks.onNewGameStarted
    }
  }

  getMessageHandlers(): MessageHandlerMap {
    return {
      'roomJoined': (msg, ctx) => this.handleRoomJoined(msg as GolfMessage, ctx),
      'roomStateUpdate': (msg, ctx) => this.handleRoomStateUpdate(msg as GolfMessage, ctx),
      'gameJoined': (msg, ctx) => this.handleGameJoined(msg as GolfMessage, ctx),
      'gameState': (msg, ctx) => this.handleGameState(msg as GolfMessage, ctx),
      'error': (msg, ctx) => this.handleError(msg as GolfMessage, ctx),
      'gameStarted': (msg, ctx) => this.handleGameStarted(msg as GolfMessage, ctx),
      'turnChanged': (msg, ctx) => this.handleTurnChanged(msg as GolfMessage, ctx),
      'playerKnocked': (msg, ctx) => this.handlePlayerKnocked(msg as GolfMessage, ctx),
      'gameEnded': (msg, ctx) => this.handleGameEnded(msg as GolfMessage, ctx),
      'newGameStarted': (msg, ctx) => this.handleNewGameStarted(msg as GolfMessage, ctx)
    }
  }

  validateMessage(message: BaseNetworkMessage): boolean {
    const validTypes = [
      'roomJoined', 'roomStateUpdate', 'gameJoined', 'gameState', 'error', 
      'gameStarted', 'turnChanged', 'playerKnocked', 'gameEnded', 'newGameStarted'
    ]
    return validTypes.includes(message.type)
  }

  getInitialState(): GolfPluginState {
    return {
      playerId: null,
      gameState: null,
      roomState: null,
      gameContext: null,
      isInLobby: true
    }
  }

  onConnect(_context: NetworkContext): void {
    console.log('🎮 Golf game connected')
  }

  onDisconnect(context: NetworkContext): void {
    console.log('🎮 Golf game disconnected')
    // Reset state on disconnect
    context.updateGameState<GolfPluginState>(s => ({
      ...s,
      playerId: null,
      gameState: null,
      roomState: null,
      gameContext: null,
      isInLobby: true
    }))
  }

  // Message handlers
  private handleRoomJoined(message: GolfMessage, context: NetworkContext): void {
    if (!message.playerId || !message.roomState) {
      console.error('Room joined message missing required fields')
      return
    }

    context.updateGameState<GolfPluginState>(s => ({
      ...s,
      playerId: message.playerId!,
      roomState: message.roomState!,
      isInLobby: false
    }))

    console.log(`🎉 Joined room ${message.roomState.id} as player ${message.playerId}`)
    
    if (this.onRoomJoined) {
      this.onRoomJoined(message.playerId, message.roomState)
    }
    
    this.notify('Joined room successfully!', context)
  }

  private handleRoomStateUpdate(message: GolfMessage, context: NetworkContext): void {
    if (!message.roomState) {
      console.error('Room state update message missing roomState field')
      return
    }

    context.updateGameState<GolfPluginState>(s => ({
      ...s,
      roomState: message.roomState!
    }))

    if (this.onRoomStateUpdate) {
      this.onRoomStateUpdate(message.roomState)
    }
  }

  private handleGameJoined(message: GolfMessage, context: NetworkContext): void {
    if (!message.playerId || !message.gameState) {
      console.error('Game joined message missing required fields')
      return
    }

    context.updateGameState<GolfPluginState>(s => ({
      ...s,
      playerId: message.playerId!,
      gameState: message.gameState!,
      isInLobby: false
    }))

    console.log(`🎉 Joined game ${message.gameState.id} as player ${message.playerId}`)
    
    if (this.onGameJoined) {
      this.onGameJoined(message.playerId, message.gameState)
    }
    
    this.notify('Joined game successfully!', context)
  }

  private handleGameState(message: GolfMessage, context: NetworkContext): void {
    if (!message.gameState) {
      console.error('Game state message missing gameState field')
      return
    }

    context.updateGameState<GolfPluginState>(s => ({
      ...s,
      gameState: message.gameState!
    }))

    if (this.onGameStateUpdate) {
      this.onGameStateUpdate(message.gameState)
    }
  }

  private handleError(message: GolfMessage, context: NetworkContext): void {
    const errorMessage = message.message || 'Unknown error occurred'
    console.error('🚫 Game error:', errorMessage)
    this.notify(errorMessage, context)
  }

  private handleGameStarted(_message: GolfMessage, context: NetworkContext): void {
    console.log('🎮 Game started!')
    this.notify('Game started! Each player can peek at 2 cards.', context)
  }

  private handleTurnChanged(message: GolfMessage, context: NetworkContext): void {
    const playerName = (message as GolfMessage & { playerName?: string }).playerName || 'Unknown'
    console.log(`🔄 Turn changed to ${playerName}`)
    this.notify(`It's ${playerName}'s turn`, context)
  }

  private handlePlayerKnocked(message: GolfMessage, context: NetworkContext): void {
    const playerName = (message as GolfMessage & { playerName?: string }).playerName || 'Unknown'
    console.log(`🔔 ${playerName} has knocked!`)
    this.notify(`${playerName} has knocked! Last round!`, context)
  }

  private handleGameEnded(message: GolfMessage, context: NetworkContext): void {
    const winner = message.winner || 'Unknown'
    console.log(`🏆 Game ended! Winner: ${winner}`)
    this.notify(`Game over! Winner: ${winner}`, context)
    
    // Log final scores if provided
    if (message.finalScores) {
      console.log('Final scores:', message.finalScores)
    }
    
    // Call the onGameEnded callback if provided
    if (this.onGameEnded && message.finalScores) {
      this.onGameEnded(winner, message.finalScores)
    }
  }

  private handleNewGameStarted(message: GolfMessage, context: NetworkContext): void {
    const gameId = message.gameId
    const previousGameId = message.previousGameId
    
    console.log(`🆕 New game started in room! Game ID: ${gameId}${previousGameId ? `, Previous: ${previousGameId}` : ''}`)
    this.notify('New game started!', context)
    
    if (this.onNewGameStarted && gameId) {
      this.onNewGameStarted(gameId, previousGameId)
    }
  }

  // Helper method to send notifications
  private notify(message: string, _context: NetworkContext): void {
    if (this.onNotification) {
      this.onNotification(message)
    }
  }

  // Public methods for the game to use
  createRoom(context: NetworkContext): void {
    context.send({
      type: 'createRoom',
      timestamp: Date.now()
    })
    console.log('📤 Sent create room request')
  }

  createGame(roomId: string, context: NetworkContext): void {
    context.send({
      type: 'createGame',
      roomId: roomId,
      timestamp: Date.now()
    })
    console.log(`📤 Sent create game request for room ${roomId}`)
  }

  joinGame(roomId: string, gameId: string, context: NetworkContext): void {
    context.send({
      type: 'joinGame',
      roomId: roomId,
      gameId: gameId,
      timestamp: Date.now()
    })
    console.log(`📤 Sent join game request for room ${roomId}, game ${gameId}`)
  }

  startGame(context: NetworkContext): void {
    context.send({
      type: 'startGame',
      timestamp: Date.now()
    })
    console.log('📤 Sent start game request')
  }

  peekCard(cardIndex: number, context: NetworkContext): void {
    context.send({
      type: 'peekCard',
      cardIndex: cardIndex,
      timestamp: Date.now()
    })
    console.log(`📤 Sent peek card request for index ${cardIndex}`)
  }

  drawCard(context: NetworkContext): void {
    context.send({
      type: 'drawCard',
      timestamp: Date.now()
    })
    console.log('📤 Sent draw card request')
  }

  takeFromDiscard(context: NetworkContext): void {
    context.send({
      type: 'takeFromDiscard',
      timestamp: Date.now()
    })
    console.log('📤 Sent take from discard request')
  }

  swapCard(cardIndex: number, context: NetworkContext): void {
    context.send({
      type: 'swapCard',
      cardIndex: cardIndex,
      timestamp: Date.now()
    })
    console.log(`📤 Sent swap card request for index ${cardIndex}`)
  }

  discardDrawn(context: NetworkContext): void {
    context.send({
      type: 'discardDrawn',
      timestamp: Date.now()
    })
    console.log('📤 Sent discard drawn card request')
  }

  knock(context: NetworkContext): void {
    context.send({
      type: 'knock',
      timestamp: Date.now()
    })
    console.log('📤 Sent knock request')
  }

  hideCards(context: NetworkContext): void {
    context.send({
      type: 'hideCards',
      timestamp: Date.now()
    })
    console.log('📤 Sent hideCards request')
  }

  joinRoom(roomId: string, context: NetworkContext): void {
    context.send({
      type: 'joinRoom',
      roomId: roomId,
      timestamp: Date.now()
    })
    console.log(`📤 Sent join room request for room ${roomId}`)
  }

  startNewGame(context: NetworkContext): void {
    context.send({
      type: 'startNewGame',
      timestamp: Date.now()
    })
    console.log('📤 Sent start new game request')
  }

  // Helper to check if it's the player's turn
  isMyTurn(context: NetworkContext): boolean {
    const state = context.getGameState<GolfPluginState>()
    if (!state.gameState || !state.playerId) return false
    
    const currentPlayer = state.gameState.players[state.gameState.currentPlayerIndex]
    return currentPlayer?.id === state.playerId
  }

  // Get current player info
  getCurrentPlayer(context: NetworkContext): Player | null {
    const state = context.getGameState<GolfPluginState>()
    if (!state.gameState || !state.playerId) return null
    
    return state.gameState.players.find(p => p.id === state.playerId) || null
  }
}