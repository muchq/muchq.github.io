/* eslint-disable no-console */
import type {
  BaseNetworkMessage,
  GameNetworkPlugin,
  MessageHandlerMap,
  NetworkContext
} from '@/types/network'
import type { GameState, Player } from '@/types/game'
import { ShapeType } from '@/types/game'
import { generateRandomColor, generateRandomSpawnPosition } from '@/utils/gameUtils'
import { GAME_CONFIG } from '@/utils/gameClasses'

// Thoughts-specific message types
interface ThoughtsMessage extends BaseNetworkMessage {
  type: 'welcome' | 'player_join' | 'player_leave' | 'position_update' | 'shape_update' | 'game_state'
  playerId?: string
  position?: [number, number, number]
  color?: [number, number, number]
  shape?: ShapeType
  players?: Array<{
    playerId: string
    position: [number, number, number]
    color: [number, number, number]
    shape: ShapeType
  }>
}

// Thoughts game state
interface ThoughtsGameState {
  localPlayerId: string | null
  players: Map<string, Player>
  pendingPlayerData?: {
    position: [number, number, number]
    color: [number, number, number]
    shape: ShapeType
  }
  lastSentPosition: [number, number, number] | null
  lastPositionSent: number
}

export class ThoughtsNetworkPlugin implements GameNetworkPlugin {
  gameType = 'thoughts'
  private positionUpdateThrottle = 50 // ms
  private onPlayerIdReceived?: (playerId: string) => void
  private gameStateRef: GameState | null = null

  constructor(gameStateRef?: GameState, onPlayerIdReceived?: (playerId: string) => void) {
    if (gameStateRef) {
      this.gameStateRef = gameStateRef
    }
    if (onPlayerIdReceived) {
      this.onPlayerIdReceived = onPlayerIdReceived
    }
  }

  getMessageHandlers(): MessageHandlerMap {
    return {
      'welcome': (msg, ctx) => this.handleWelcome(msg as ThoughtsMessage, ctx),
      'player_join': (msg, ctx) => this.handlePlayerJoin(msg as ThoughtsMessage, ctx),
      'player_leave': (msg, ctx) => this.handlePlayerLeave(msg as ThoughtsMessage, ctx),
      'position_update': (msg, ctx) => this.handlePositionUpdate(msg as ThoughtsMessage, ctx),
      'shape_update': (msg, ctx) => this.handleShapeUpdate(msg as ThoughtsMessage, ctx),
      'game_state': (msg, ctx) => this.handleGameState(msg as ThoughtsMessage, ctx)
    }
  }

  validateMessage(message: BaseNetworkMessage): boolean {
    const validTypes = ['welcome', 'player_join', 'player_leave', 'position_update', 'shape_update', 'game_state']
    return validTypes.includes(message.type)
  }

  getInitialState(): ThoughtsGameState {
    const randomSpawnPosition = generateRandomSpawnPosition(GAME_CONFIG.worldBoundary)
    const randomColor = generateRandomColor()

    return {
      localPlayerId: null,
      players: new Map(),
      pendingPlayerData: {
        position: randomSpawnPosition,
        color: randomColor,
        shape: ShapeType.SPHERE
      },
      lastSentPosition: null,
      lastPositionSent: 0
    }
  }

  onConnect(_context: NetworkContext): void {
    console.log('🎮 Thoughts game connected')
    // Connection established, waiting for welcome message from server
  }

  onDisconnect(context: NetworkContext): void {
    console.log('🎮 Thoughts game disconnected')
    const state = context.getGameState<ThoughtsGameState>()
    
    // Send leave message if we have a player ID
    if (state.localPlayerId) {
      context.send({
        type: 'player_leave',
        timestamp: Date.now()
      })
    }
  }

  // Message handlers
  private handleWelcome(message: ThoughtsMessage, context: NetworkContext): void {
    if (!message.playerId) {
      console.error('Welcome message missing playerId')
      return
    }

    const state = context.getGameState<ThoughtsGameState>()
    
    // Update state with server-assigned ID
    context.updateGameState<ThoughtsGameState>(s => ({
      ...s,
      localPlayerId: message.playerId!
    }))

    console.log(`🎉 Received player ID from server: ${message.playerId}`)
    
    // Call callback if provided
    if (this.onPlayerIdReceived) {
      this.onPlayerIdReceived(message.playerId)
    }

    // Add local player with pending data
    if (state.pendingPlayerData && this.gameStateRef) {
      this.gameStateRef.localPlayerId = message.playerId
      this.gameStateRef.addPlayer(
        message.playerId,
        state.pendingPlayerData.position,
        state.pendingPlayerData.color,
        state.pendingPlayerData.shape
      )
      
      console.log(`Spawning player ${message.playerId} at position [${state.pendingPlayerData.position.map(x => x.toFixed(2)).join(', ')}]`)

      // Send player_join message
      context.send({
        type: 'player_join',
        position: state.pendingPlayerData.position,
        color: state.pendingPlayerData.color,
        shape: state.pendingPlayerData.shape,
        timestamp: Date.now()
      })
      
      // Clear pending data
      context.updateGameState<ThoughtsGameState>(s => ({
        ...s,
        pendingPlayerData: undefined
      }))
    }
  }

  private handlePlayerJoin(message: ThoughtsMessage, context: NetworkContext): void {
    if (!message.playerId || !message.position || !message.color) {
      console.error('Player join message missing required fields')
      return
    }
    
    const state = context.getGameState<ThoughtsGameState>()
    
    if (message.playerId !== state.localPlayerId && this.gameStateRef) {
      this.gameStateRef.addPlayer(
        message.playerId,
        message.position,
        message.color,
        message.shape || ShapeType.SPHERE
      )
      console.log(`👋 Player ${message.playerId} joined at [${message.position.join(', ')}]`)
    }
  }

  private handlePlayerLeave(message: ThoughtsMessage, context: NetworkContext): void {
    if (!message.playerId) {
      console.error('Player leave message missing playerId')
      return
    }
    
    const state = context.getGameState<ThoughtsGameState>()
    
    if (message.playerId !== state.localPlayerId && this.gameStateRef) {
      const player = this.gameStateRef.players.get(message.playerId)
      if (player) {
        console.log(`👋 Player ${message.playerId} left the game`)
        this.gameStateRef.removePlayer(message.playerId)
        console.log(`📊 ${this.gameStateRef.players.size} players remaining`)
      }
    }
  }

  private handlePositionUpdate(message: ThoughtsMessage, context: NetworkContext): void {
    if (!message.playerId || !message.position) {
      console.error('Position update message missing required fields')
      return
    }
    
    const state = context.getGameState<ThoughtsGameState>()
    
    if (message.playerId !== state.localPlayerId && this.gameStateRef) {
      this.gameStateRef.updatePlayer(message.playerId, message.position)
    }
  }

  private handleShapeUpdate(message: ThoughtsMessage, context: NetworkContext): void {
    if (!message.playerId || message.shape === undefined) {
      console.error('Shape update message missing required fields')
      return
    }
    
    const state = context.getGameState<ThoughtsGameState>()
    
    if (message.playerId !== state.localPlayerId && this.gameStateRef) {
      const player = this.gameStateRef.players.get(message.playerId)
      if (player) {
        player.shape = message.shape
        const shapeNames = ['Sphere', 'Cube', 'Pyramid']
        console.log(`🔄 Player ${message.playerId} changed to: ${shapeNames[message.shape]}`)
      }
    }
  }

  private handleGameState(message: ThoughtsMessage, context: NetworkContext): void {
    console.log('🎮 Received game state update:', message)
    
    const state = context.getGameState<ThoughtsGameState>()

    // Process the players array from the game_state message
    if (message.players && Array.isArray(message.players) && this.gameStateRef) {
      message.players.forEach(player => {
        // Skip adding the local player
        if (player.playerId !== state.localPlayerId) {
          this.gameStateRef!.addPlayer(
            player.playerId,
            player.position,
            player.color,
            player.shape || ShapeType.SPHERE
          )
          console.log(`🎮 Added player ${player.playerId} from game state at [${player.position.join(', ')}]`)
        }
      })
    }
  }

  // Helper methods for the game to use
  sendPositionUpdate(position: [number, number, number], context: NetworkContext): void {
    const state = context.getGameState<ThoughtsGameState>()
    const now = Date.now()

    // Throttle position updates
    if (now - state.lastPositionSent < this.positionUpdateThrottle) {
      return
    }

    // Check if position actually changed significantly
    if (state.lastSentPosition) {
      const dx = position[0] - state.lastSentPosition[0]
      const dz = position[2] - state.lastSentPosition[2]
      const distance = Math.sqrt(dx * dx + dz * dz)

      // Only send if moved more than 0.1 units
      if (distance < 0.1) {
        return
      }
    }

    context.send({
      type: 'position_update',
      position: position,
      timestamp: now
    })

    // Update state
    context.updateGameState<ThoughtsGameState>(s => ({
      ...s,
      lastSentPosition: [...position],
      lastPositionSent: now
    }))

    console.log('📤 Sent position update:', position)
  }

  sendShapeUpdate(shape: ShapeType, context: NetworkContext): void {
    context.send({
      type: 'shape_update',
      shape: shape,
      timestamp: Date.now()
    })
    console.log('📤 Sent shape update:', shape)
  }
}