// Base network types for multi-game support

// Core message interface - game agnostic
export interface BaseNetworkMessage {
  type: string
  timestamp: number
  [key: string]: unknown
}

// Message handler function type
export type MessageHandler<T extends BaseNetworkMessage = BaseNetworkMessage> = (
  message: T,
  context: NetworkContext
) => void

// Map of message type to handler
export interface MessageHandlerMap {
  [messageType: string]: MessageHandler
}

// Network context passed to plugins
export interface NetworkContext {
  send(message: BaseNetworkMessage): void
  broadcast(message: BaseNetworkMessage): void
  getConnectionId(): string
  getGameState<T = unknown>(): T
  updateGameState<T = unknown>(updater: (state: T) => T): void
  isConnected(): boolean
}

// Game plugin interface
export interface GameNetworkPlugin {
  // Unique identifier for this game type
  gameType: string
  
  // Get all message handlers for this game
  getMessageHandlers(): MessageHandlerMap
  
  // Validate if a message is valid for this game
  validateMessage(message: BaseNetworkMessage): boolean
  
  // Lifecycle hooks
  onConnect?(context: NetworkContext): void
  onDisconnect?(context: NetworkContext): void
  onError?(error: Error, context: NetworkContext): void
  
  // Optional: Get initial game state
  getInitialState?(): unknown
  
  // Optional: Handle state synchronization
  syncState?(context: NetworkContext): void
}

// Configuration for network manager
export interface NetworkConfig {
  url: string
  gameType: string
  reconnect?: boolean
  reconnectDelay?: number
  maxReconnectAttempts?: number
  debug?: boolean
}

// Connection state
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Network manager events
export interface NetworkEvents {
  onConnectionStateChange?: (state: ConnectionState) => void
  onMessage?: (message: BaseNetworkMessage) => void
  onError?: (error: Error) => void
}

// Plugin registration options
export interface PluginRegistration {
  plugin: GameNetworkPlugin
  override?: boolean // Allow overriding existing plugin
}