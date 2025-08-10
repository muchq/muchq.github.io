import { GameState, Player } from './gameState'

interface PlayerData {
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  score?: number
  goldCollected?: number
}

interface NetworkMessage {
  type: 'welcome' | 'player_update' | 'player_joined' | 'player_left' | 'game_state' | 'collection_event'
  playerId?: string
  data?: PlayerData
  timestamp: number
}

export class NetworkManager {
  private gameState: GameState
  private ws: WebSocket | null = null
  public isConnected: boolean = false
  public isSimulated: boolean = false
  public onPlayerIdReceived?: (playerId: string) => void
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 1000

  constructor(gameState: GameState) {
    this.gameState = gameState
    
    if (import.meta.env.VITE_AURUM_SIPHON_SIMULATED !== 'false') {
      this.isSimulated = true
      this.simulateConnection()
    }
  }

  private simulateConnection() {
    setTimeout(() => {
      const playerId = `player_${Math.random().toString(36).substr(2, 9)}`
      
      const welcomeMessage: NetworkMessage = {
        type: 'welcome',
        playerId,
        timestamp: Date.now()
      }
      
      this.handleMessage(welcomeMessage)
      this.isConnected = true
      
      if (this.onPlayerIdReceived) {
        this.onPlayerIdReceived(playerId)
      }
    }, 100)
  }

  connect(url?: string) {
    if (this.isSimulated) {
      return
    }

    const wsUrl = url || import.meta.env.VITE_AURUM_SIPHON_WEBSOCKET_URL || 'ws://localhost:8080/aurum-siphon-ws'
    
    try {
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        // Connected to Aurum Siphon server
        this.isConnected = true
        this.reconnectAttempts = 0
      }
      
      this.ws.onmessage = (event) => {
        try {
          const message: NetworkMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Failed to parse message:', error)
        }
      }
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      this.ws.onclose = () => {
        // Disconnected from server
        this.isConnected = false
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      this.isConnected = false
    }
  }

  private handleMessage(message: NetworkMessage) {
    switch (message.type) {
      case 'welcome':
        if (message.playerId) {
          const player: Player = {
            id: message.playerId,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            score: 0,
            goldCollected: 0,
            isLocal: true
          }
          this.gameState.addPlayer(player)
          
          if (this.onPlayerIdReceived) {
            this.onPlayerIdReceived(message.playerId)
          }
        }
        break
        
      case 'player_joined':
        if (message.data && message.playerId) {
          const player: Player = {
            id: message.playerId,
            position: message.data.position || { x: 0, y: 0, z: 0 },
            rotation: message.data.rotation || { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            score: 0,
            goldCollected: 0,
            isLocal: false
          }
          this.gameState.addPlayer(player)
        }
        break
        
      case 'player_left':
        if (message.playerId) {
          this.gameState.removePlayer(message.playerId)
        }
        break
        
      case 'player_update':
        if (message.playerId && message.data) {
          this.gameState.updatePlayer(message.playerId, message.data)
        }
        break
        
      case 'game_state':
        if (message.data) {
          Object.assign(this.gameState, message.data)
        }
        break
        
      case 'collection_event':
        break
    }
  }

  sendMessage(data: PlayerData) {
    if (!this.isConnected || this.isSimulated) return
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: NetworkMessage = {
        type: 'player_update',
        playerId: this.gameState.localPlayerId || undefined,
        data,
        timestamp: Date.now()
      }
      
      this.ws.send(JSON.stringify(message))
    }
  }

  sendPlayerUpdate(position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number }) {
    this.sendMessage({
      position,
      rotation,
      score: this.gameState.score,
      goldCollected: this.gameState.goldCollected
    })
  }

  private attemptReconnect() {
    if (this.isSimulated) return
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      // Attempting to reconnect
      
      setTimeout(() => {
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }
}