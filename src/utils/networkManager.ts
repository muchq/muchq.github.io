/* eslint-disable no-console */
import type {
  BaseNetworkMessage,
  GameNetworkPlugin,
  NetworkConfig,
  NetworkContext,
  NetworkEvents,
  PluginRegistration
} from '@/types/network'
import { ConnectionState } from '@/types/network'

export class NetworkManager {
  private plugins: Map<string, GameNetworkPlugin> = new Map()
  private activePlugin: GameNetworkPlugin | null = null
  private ws: WebSocket | null = null
  private config: NetworkConfig | null = null
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED
  private gameState: unknown = null
  private events: NetworkEvents = {}
  private reconnectAttempts = 0
  private reconnectTimeout: number | null = null

  constructor(events?: NetworkEvents) {
    if (events) {
      this.events = events
    }
  }

  // Register a game plugin
  registerPlugin({ plugin, override = false }: PluginRegistration): void {
    if (this.plugins.has(plugin.gameType) && !override) {
      throw new Error(`Plugin for game type "${plugin.gameType}" already registered`)
    }
    this.plugins.set(plugin.gameType, plugin)
    console.log(`🔌 Registered plugin for game: ${plugin.gameType}`)
  }

  // Connect to server with specific game type
  connect(config: NetworkConfig): void {
    this.config = config
    
    // Find and activate the plugin for this game type
    const plugin = this.plugins.get(config.gameType)
    if (!plugin) {
      throw new Error(`No plugin registered for game type: ${config.gameType}`)
    }
    
    this.activePlugin = plugin
    
    // Initialize game state if plugin provides initial state
    if (plugin.getInitialState) {
      this.gameState = plugin.getInitialState()
    } else {
      this.gameState = {}
    }
    
    this.establishConnection()
  }

  private establishConnection(): void {
    if (!this.config) return
    
    this.setConnectionState(ConnectionState.CONNECTING)
    
    try {
      this.ws = new WebSocket(this.config.url)
      
      this.ws.onopen = () => {
        console.log(`🔌 Connected to ${this.config!.url} for game: ${this.config!.gameType}`)
        this.reconnectAttempts = 0
        this.setConnectionState(ConnectionState.CONNECTED)
        
        // Call plugin's onConnect hook
        if (this.activePlugin?.onConnect) {
          this.activePlugin.onConnect(this.createContext())
        }
      }
      
      this.ws.onmessage = (event) => {
        try {
          // First try to parse as a single message
          try {
            const message = JSON.parse(event.data) as BaseNetworkMessage
            this.handleMessage(message)
            return
          } catch (firstError) {
            // If that fails, try handling as newline-delimited JSON
            const lines = event.data.split('\n')
            const messages: BaseNetworkMessage[] = []
            let currentJson = ''
            
            for (const line of lines) {
              currentJson += line
              try {
                const message = JSON.parse(currentJson) as BaseNetworkMessage
                messages.push(message)
                currentJson = ''
              } catch {
                // Not a complete JSON yet, add newline back and continue
                currentJson += '\n'
              }
            }
            
            // If we have accumulated JSON that couldn't be parsed, it's an error
            if (currentJson.trim()) {
              throw new Error('Incomplete JSON message', { cause: firstError })
            }
            
            // Process all successfully parsed messages
            if (messages.length === 0) {
              throw firstError // Re-throw the original error
            }
            
            for (const message of messages) {
              this.handleMessage(message)
            }
          }
        } catch (error) {
          console.error('Failed to parse message:', error)
          this.handleError(new Error('Invalid message format'))
        }
      }
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected')
        this.handleDisconnection()
      }
      
      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error:', error)
        this.handleError(new Error('WebSocket connection error'))
      }
    } catch (error) {
      console.error('🔌 Failed to connect:', error)
      this.handleError(error as Error)
    }
  }

  private handleMessage(message: BaseNetworkMessage): void {
    if (!this.activePlugin) {
      console.warn('No active plugin to handle message')
      return
    }
    
    // Log message if debug is enabled
    if (this.config?.debug) {
      console.log('📥 Received:', message)
    }
    
    // Call global message handler if provided
    if (this.events.onMessage) {
      this.events.onMessage(message)
    }
    
    // Validate message with plugin
    if (!this.activePlugin.validateMessage(message)) {
      console.warn('Invalid message for current game:', message)
      return
    }
    
    // Get message handlers from plugin
    const handlers = this.activePlugin.getMessageHandlers()
    const handler = handlers[message.type]
    
    if (handler) {
      handler(message, this.createContext())
    } else {
      console.warn(`No handler for message type: ${message.type}`)
    }
  }

  private handleDisconnection(): void {
    this.setConnectionState(ConnectionState.DISCONNECTED)
    
    // Call plugin's onDisconnect hook
    if (this.activePlugin?.onDisconnect) {
      this.activePlugin.onDisconnect(this.createContext())
    }
    
    // Handle reconnection if enabled
    if (this.config?.reconnect && this.reconnectAttempts < (this.config.maxReconnectAttempts || 5)) {
      this.attemptReconnection()
    }
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++
    const delay = this.config?.reconnectDelay || 5000
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.config?.maxReconnectAttempts || 5} in ${delay}ms`)
    this.setConnectionState(ConnectionState.RECONNECTING)
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.establishConnection()
    }, delay)
  }

  private handleError(error: Error): void {
    this.setConnectionState(ConnectionState.ERROR)
    
    // Call global error handler
    if (this.events.onError) {
      this.events.onError(error)
    }
    
    // Call plugin's onError hook
    if (this.activePlugin?.onError) {
      this.activePlugin.onError(error, this.createContext())
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      if (this.events.onConnectionStateChange) {
        this.events.onConnectionStateChange(state)
      }
    }
  }

  private createContext(): NetworkContext {
    return {
      send: (message: BaseNetworkMessage) => this.send(message),
      broadcast: (message: BaseNetworkMessage) => this.broadcast(message),
      getConnectionId: () => this.ws?.url || '',
      getGameState: <T = unknown>() => this.gameState as T,
      updateGameState: <T = unknown>(updater: (state: T) => T) => {
        this.gameState = updater(this.gameState as T)
      },
      isConnected: () => this.connectionState === ConnectionState.CONNECTED
    }
  }

  // Send a message to the server
  send(message: BaseNetworkMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: not connected')
      return
    }
    
    // Ensure timestamp is set
    if (!message.timestamp) {
      message.timestamp = Date.now()
    }
    
    // Log message if debug is enabled
    if (this.config?.debug) {
      console.log('📤 Sending:', message)
    }
    
    this.ws.send(JSON.stringify(message))
  }

  // Broadcast is same as send for client (server would handle actual broadcast)
  broadcast(message: BaseNetworkMessage): void {
    this.send(message)
  }

  // Disconnect from server
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.activePlugin = null
    this.gameState = null
    this.config = null
    this.reconnectAttempts = 0
    this.setConnectionState(ConnectionState.DISCONNECTED)
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  // Get active game type
  getActiveGameType(): string | null {
    return this.activePlugin?.gameType || null
  }

  // Check if connected
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED
  }

  // Get registered game types
  getRegisteredGameTypes(): string[] {
    return Array.from(this.plugins.keys())
  }
}