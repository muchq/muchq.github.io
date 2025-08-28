/* eslint-disable no-console */
import type { NetworkManager as INetworkManager, NetworkMessage, BotPlayer, FakeServer as IFakeServer, GameState } from '@/types/game'
import { generateRandomColor, generateRandomSpawnPosition } from './gameUtils'
import { GAME_CONFIG } from './gameClasses'
import { ShapeType } from '@/types/game'

// Network Communication System
export class NetworkManager implements INetworkManager {
  ws: WebSocket | null
  isConnected: boolean
  isSimulated: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed'
  connectionError: string | null
  lastSentPosition: [number, number, number] | null
  positionUpdateThrottle: number
  lastPositionSent: number
  messageHandlers: Map<string, (message: NetworkMessage) => void>
  gameState: GameState
  fakeServer: IFakeServer | null
  pendingPlayerData?: {
    position: [number, number, number]
    color: [number, number, number]
    shape: ShapeType
  }
  onPlayerIdReceived?: (playerId: string) => void
  onConnectionStateChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'failed', error?: string) => void
  websocketUrl: string | null

  constructor(gameState: GameState) {
    this.ws = null
    this.isConnected = false
    this.isSimulated = false
    this.connectionStatus = 'disconnected'
    this.connectionError = null
    this.lastSentPosition = null
    this.positionUpdateThrottle = 50 // Send updates max every 50ms (20fps)
    this.lastPositionSent = 0
    this.messageHandlers = new Map()
    this.gameState = gameState
    this.fakeServer = null
    this.websocketUrl = null
  }

  connect(url: string): void {
    this.websocketUrl = url
    
    if (this.isSimulated) {
      // Only simulate if explicitly in simulation mode
      console.log('🔌 Simulating WebSocket connection to', url)
      this.isConnected = true
      this.connectionStatus = 'connected'
      this.connectionError = null
      this.onConnectionStateChange?.('connected')
      this.onConnected()
      return
    }

    try {
      this.connectionStatus = 'connecting'
      this.connectionError = null
      this.onConnectionStateChange?.('connecting')
      
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected to', url)
        this.isConnected = true
        this.connectionStatus = 'connected'
        this.connectionError = null
        this.onConnectionStateChange?.('connected')
        this.onConnected()
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data))
      }

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        this.isConnected = false
        this.connectionStatus = 'disconnected'
        this.onConnectionStateChange?.('disconnected')
        this.onDisconnected()
      }

      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error:', error)
        console.log('🎮 Running in single-player mode')
        this.isConnected = false
        this.connectionStatus = 'failed'
        this.connectionError = 'Connection failed - Playing offline'
        this.onConnectionStateChange?.('failed', this.connectionError)
        // Don't try to simulate or create bots - just play single player
      }
    } catch (error) {
      console.error('🔌 Failed to connect to WebSocket:', error)
      console.log('🎮 Running in single-player mode')
      this.isConnected = false
      this.connectionStatus = 'failed'
      this.connectionError = 'Connection failed - Playing offline'
      this.onConnectionStateChange?.('failed', this.connectionError)
      // Don't try to simulate or create bots - just play single player
    }
  }

  private onConnected(): void {
    // Don't send player_join yet - wait for welcome message with server-assigned ID
    
    // Only start fake server if explicitly in simulation mode
    if (this.isSimulated && this.fakeServer) {
      this.fakeServer.start()
      // In simulation mode, keep the existing local player ID
      console.log('🤖 Simulation mode: keeping local player ID')
      // Just send the player_join message directly without changing ID
      setTimeout(() => {
        this.sendPlayerJoin()
      }, 100)
    }
    // If not simulated, wait for real server welcome message
  }

  setFakeServer(fakeServer: IFakeServer): void {
    this.fakeServer = fakeServer
  }

  private onDisconnected(): void {
    // Handle disconnection
  }

  sendPlayerJoin(): void {
    const localPlayer = this.gameState.getLocalPlayer()
    if (!localPlayer) return

    const message: NetworkMessage = {
      type: 'player_join',
      position: localPlayer.position,
      color: localPlayer.color,
      shape: localPlayer.shape,
      timestamp: Date.now()
    }

    this.sendMessage(message)
    console.log('📤 Sent player join:', message)
  }

  sendPositionUpdate(position: [number, number, number]): void {
    const now = Date.now()

    // Throttle position updates
    if (now - this.lastPositionSent < this.positionUpdateThrottle) {
      return
    }

    // Check if position actually changed significantly
    if (this.lastSentPosition) {
      const dx = position[0] - this.lastSentPosition[0]
      const dz = position[2] - this.lastSentPosition[2]
      const distance = Math.sqrt(dx * dx + dz * dz)

      // Only send if moved more than 0.1 units
      if (distance < 0.1) {
        return
      }
    }

    const message: NetworkMessage = {
      type: 'position_update',
      position: position,
      timestamp: now
    }

    this.sendMessage(message)
    this.lastSentPosition = [...position]
    this.lastPositionSent = now

    console.log('📤 Sent position update:', message)
  }

  sendMessage(message: NetworkMessage): void {
    if (this.isSimulated) {
      // Simulate sending to server (just log for now)
      console.log('📡 [SIMULATED] Sending to server:', message)
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  handleMessage(message: NetworkMessage): void {
    console.log('📥 Received from server:', message)

    switch (message.type) {
      case 'welcome':
        this.handleWelcome(message)
        break
      case 'player_join':
        this.handlePlayerJoin(message)
        break
      case 'player_leave':
        this.handlePlayerLeave(message)
        break
      case 'position_update':
        this.handlePositionUpdate(message)
        break
      case 'shape_update':
        this.handleShapeUpdate(message)
        break
      case 'game_state':
        this.handleGameState(message)
        break
      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  private handleWelcome(message: NetworkMessage): void {
    if (!message.playerId) {
      console.error('Welcome message missing playerId')
      return
    }

    // Get the existing local player
    const existingLocalPlayer = this.gameState.getLocalPlayer()
    const oldLocalPlayerId = this.gameState.localPlayerId
    
    // Update to server-assigned ID
    this.gameState.localPlayerId = message.playerId
    console.log(`🎉 Received player ID from server: ${message.playerId} (replacing ${oldLocalPlayerId})`)
    
    // If we already had a local player, update its ID
    if (existingLocalPlayer && oldLocalPlayerId) {
      // Remove the old player entry
      this.gameState.players.delete(oldLocalPlayerId)
      
      // Re-add with new ID
      this.gameState.addPlayer(
        message.playerId,
        existingLocalPlayer.position,
        existingLocalPlayer.color,
        existingLocalPlayer.shape
      )
      
      console.log(`Updated local player ID from ${oldLocalPlayerId} to ${message.playerId}`)
    } else if (this.pendingPlayerData) {
      // Fallback: create player if somehow it doesn't exist
      this.gameState.addPlayer(
        message.playerId,
        this.pendingPlayerData.position,
        this.pendingPlayerData.color,
        this.pendingPlayerData.shape
      )
      
      console.log(`Spawning player ${message.playerId} at position [${this.pendingPlayerData.position.map(x => x.toFixed(2)).join(', ')}] with color [${this.pendingPlayerData.color.map(x => x.toFixed(2)).join(', ')}]`)
    }
    
    // Call the callback with new server ID
    if (this.onPlayerIdReceived) {
      this.onPlayerIdReceived(message.playerId)
    }

    // Send the player_join message
    this.sendPlayerJoin()
    
    // Clear pending data
    this.pendingPlayerData = undefined
  }

  private handlePlayerJoin(message: NetworkMessage): void {
    if (!message.playerId) {
      console.error('Player join message missing playerId')
      return
    }
    
    if (message.playerId !== this.gameState.localPlayerId) {
      this.gameState.addPlayer(
        message.playerId,
        message.position!,
        message.color!,
        message.shape || ShapeType.SPHERE
      )
      console.log(`👋 Player ${message.playerId} joined at [${message.position!.join(', ')}]`)
    }
  }

  private handlePlayerLeave(message: NetworkMessage): void {
    if (!message.playerId) {
      console.error('Player leave message missing playerId')
      return
    }
    
    if (message.playerId !== this.gameState.localPlayerId) {
      const player = this.gameState.players.get(message.playerId)
      if (player) {
        console.log(`👋 Player ${message.playerId} left the game`)
        this.gameState.removePlayer(message.playerId)
        console.log(`📊 ${this.gameState.players.size} players remaining`)
      }
    }
  }

  private handlePositionUpdate(message: NetworkMessage): void {
    if (!message.playerId) {
      console.error('Position update message missing playerId')
      return
    }
    
    if (message.playerId !== this.gameState.localPlayerId) {
      this.gameState.updatePlayer(message.playerId, message.position!)
    }
  }

  private handleShapeUpdate(message: NetworkMessage): void {
    if (!message.playerId) {
      console.error('Shape update message missing playerId')
      return
    }
    
    if (message.playerId !== this.gameState.localPlayerId) {
      const player = this.gameState.players.get(message.playerId)
      if (player) {
        player.shape = message.shape!
        const shapeNames = ['Sphere', 'Cube', 'Pyramid']
        console.log(`🔄 Player ${message.playerId} changed to: ${shapeNames[message.shape!]}`)
      }
    }
  }

  private handleGameState(message: NetworkMessage): void {
    // Handle full game state updates
    console.log('🎮 Received game state update:', message)

    // Process the players array from the game_state message
    if (message.players && Array.isArray(message.players)) {
      message.players.forEach(player => {
        // Skip adding the local player (server uses "playerId" field)
        if (player.playerId !== this.gameState.localPlayerId) {
          this.gameState.addPlayer(player.playerId, player.position, player.color, player.shape || ShapeType.SPHERE)
          console.log(`🎮 Added player ${player.playerId} from game state at [${player.position.join(', ')}]`)
        }
      })
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
    }
    this.isConnected = false
    this.connectionStatus = 'disconnected'
    this.onConnectionStateChange?.('disconnected')
  }

  reconnect(): void {
    console.log('🔄 Attempting to reconnect...')
    // Close existing connection if any
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    // Reset connection state
    this.isConnected = false
    this.connectionError = null
    
    // Reconnect after a short delay
    if (this.websocketUrl) {
      setTimeout(() => {
        this.connect(this.websocketUrl!)
      }, 100)
    }
  }
}

// Fake Server Simulation (for testing multiplayer without real server)
export class FakeServer implements IFakeServer {
  players: Map<string, BotPlayer>
  isRunning: boolean
  updateInterval: number | null
  botPlayers: BotPlayer[]
  stateUpdateFrequency: number
  networkManager: NetworkManager

  constructor(networkManager: NetworkManager) {
    this.players = new Map()
    this.isRunning = false
    this.updateInterval = null
    this.botPlayers = []
    this.stateUpdateFrequency = 300 // Send state updates every 300ms for smoother movement
    this.networkManager = networkManager
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true

    // Create some bot players for testing
    this.createBotPlayers(2) // Create 2 bot players

    // Start sending periodic state updates
    this.updateInterval = window.setInterval(() => {
      this.sendStateUpdate()
    }, this.stateUpdateFrequency)

    console.log('🤖 Fake server started with bot players')
  }

  stop(): void {
    if (!this.isRunning) return
    this.isRunning = false

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    console.log('🤖 Fake server stopped')
  }

  createBotPlayers(count: number): void {
    for (let i = 0; i < count; i++) {
      const botId = `bot-${i + 1}`
      const botPlayer: BotPlayer = {
        id: botId,
        position: generateRandomSpawnPosition(GAME_CONFIG.worldBoundary),
        color: generateRandomColor(),
        velocity: [0, 0, 0], // Start stationary
        direction: Math.random() * Math.PI * 2, // Random direction
        speed: 0.02 + Math.random() * 0.03, // Adjusted for 300ms updates: 0.02-0.05 units per update
        directionChangeTimer: 0
      }

      this.players.set(botId, botPlayer)
      this.botPlayers.push(botPlayer)

      // Simulate bot joining
      setTimeout(() => {
        this.simulatePlayerJoin(botPlayer)
      }, 1000 + i * 500) // Stagger bot joins
    }
  }

  updateBotPositions(): void {
    this.botPlayers.forEach(bot => {
      // Increment direction change timer
      bot.directionChangeTimer++

      // Change direction less frequently and more smoothly
      if (bot.directionChangeTimer > 10 + Math.random() * 17) { // Change direction every 3-8 seconds
        bot.direction += (Math.random() - 0.5) * 0.3 // Smaller direction changes
        bot.directionChangeTimer = 0
      }

      // Sometimes pause movement for more natural behavior
      const shouldMove = Math.random() > 0.1 // 90% chance to move each update

      if (shouldMove) {
        // Update velocity based on direction (much slower)
        bot.velocity[0] = Math.cos(bot.direction) * bot.speed
        bot.velocity[2] = Math.sin(bot.direction) * bot.speed

        // Update position
        bot.position[0] += bot.velocity[0]
        bot.position[2] += bot.velocity[2]
      }

      // Smoother boundary handling - turn around gradually when approaching edges
      const boundaryBuffer = 10
      if (Math.abs(bot.position[0]) > GAME_CONFIG.worldBoundary - boundaryBuffer) {
        // Turn away from boundary gradually
        const turnDirection = bot.position[0] > 0 ? Math.PI : 0
        bot.direction = bot.direction * 0.8 + turnDirection * 0.2
        bot.directionChangeTimer = 0
      }
      if (Math.abs(bot.position[2]) > GAME_CONFIG.worldBoundary - boundaryBuffer) {
        // Turn away from boundary gradually
        const turnDirection = bot.position[2] > 0 ? -Math.PI/2 : Math.PI/2
        bot.direction = bot.direction * 0.8 + turnDirection * 0.2
        bot.directionChangeTimer = 0
      }
    })
  }

  sendStateUpdate(): void {
    if (!this.isRunning) return

    // Update bot positions
    this.updateBotPositions()

    // Occasionally disconnect and reconnect bots for testing
    if (Math.random() < 0.002) { // 0.2% chance per update (roughly every 2-3 minutes)
      this.simulateRandomDisconnection()
    }

    // Send position updates for each bot
    this.botPlayers.forEach(bot => {
      const message: NetworkMessage = {
        type: 'position_update',
        playerId: bot.id,
        position: [...bot.position],
        timestamp: Date.now()
      }

      // Simulate receiving the message
      setTimeout(() => {
        this.networkManager.handleMessage(message)
      }, 10 + Math.random() * 20) // Simulate 10-30ms network latency
    })
  }

  simulateRandomDisconnection(): void {
    if (this.botPlayers.length === 0) return

    // Pick a random bot to disconnect
    const randomIndex = Math.floor(Math.random() * this.botPlayers.length)
    const botToRemove = this.botPlayers[randomIndex]

    console.log(`🤖 Simulating disconnection of bot ${botToRemove.id}`)
    this.simulatePlayerLeave(botToRemove.id)

    // After a random delay, add a new bot to maintain population
    setTimeout(() => {
      if (this.isRunning && this.botPlayers.length < 3) { // Keep 2-3 bots
        console.log('🤖 Adding replacement bot after disconnection')
        this.createBotPlayers(1)
      }
    }, 3000 + Math.random() * 5000) // Wait 3-8 seconds before adding replacement
  }

  private simulatePlayerJoin(player: BotPlayer): void {
    const message: NetworkMessage = {
      type: 'player_join',
      playerId: player.id,
      position: [...player.position],
      color: [...player.color],
      timestamp: Date.now()
    }

    // Simulate receiving the join message
    setTimeout(() => {
      this.networkManager.handleMessage(message)
    }, 50 + Math.random() * 100) // Simulate 50-150ms network latency
  }

  private simulatePlayerLeave(playerId: string): void {
    const message: NetworkMessage = {
      type: 'player_leave',
      playerId: playerId,
      timestamp: Date.now()
    }

    // Simulate receiving the leave message
    setTimeout(() => {
      this.networkManager.handleMessage(message)
    }, 50 + Math.random() * 100)

    // Remove from fake server
    this.players.delete(playerId)
    this.botPlayers = this.botPlayers.filter(bot => bot.id !== playerId)
  }
}

// Test function for debugging (each tab gets its own instance)
export function createTestDisconnectionFunction(fakeServer: FakeServer): () => void {
  return () => {
    console.log('🧪 Testing bot disconnection...')
    fakeServer.simulateRandomDisconnection()
  }
}