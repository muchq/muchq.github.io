/* eslint-disable no-console */
import { NetworkManager } from './networkManager'
import { ThoughtsNetworkPlugin } from '@/plugins/thoughtsNetworkPlugin'
import { GolfNetworkPlugin } from '@/plugins/golfNetworkPlugin'
import type { GameState } from '@/types/game'
import type { GameState as GolfGameState, Room, FinalScore } from '@/types/golf'
import { ConnectionState, BaseNetworkMessage } from '@/types/network'

// Factory function to create a network manager with pre-registered plugins
export function createGameNetworkManager() {
  const manager = new NetworkManager({
    onConnectionStateChange: (state: ConnectionState) => {
      console.log(`Connection state changed: ${state}`)
    },
    onError: (error: Error) => {
      console.error('Network error:', error)
    }
  })

  return manager
}

// Adapter for Thoughts game to maintain backward compatibility
export class ThoughtsNetworkAdapter {
  private manager: NetworkManager
  private plugin: ThoughtsNetworkPlugin

  constructor(
    gameState: GameState,
    onPlayerIdReceived?: (playerId: string) => void
  ) {
    this.manager = new NetworkManager()
    this.plugin = new ThoughtsNetworkPlugin(gameState, onPlayerIdReceived)
    
    // Register the plugin
    this.manager.registerPlugin({
      plugin: this.plugin
    })
  }

  connect(url: string): void {
    this.manager.connect({
      url,
      gameType: 'thoughts',
      reconnect: true,
      reconnectDelay: 5000,
      maxReconnectAttempts: 5
    })
  }

  disconnect(): void {
    this.manager.disconnect()
  }

  get isConnected(): boolean {
    return this.manager.isConnected()
  }

  sendPositionUpdate(position: [number, number, number]): void {
    // Create a temporary context to call plugin method
    const context = {
      send: (msg: BaseNetworkMessage) => this.manager.send(msg),
      broadcast: (msg: BaseNetworkMessage) => this.manager.broadcast(msg),
      getConnectionId: () => '',
      getGameState: <T = unknown>() => this.manager['gameState'] as T,
      updateGameState: <T = unknown>(updater: (state: T) => T) => {
        this.manager['gameState'] = updater(this.manager['gameState'] as T)
      },
      isConnected: () => this.manager.isConnected()
    }
    
    this.plugin.sendPositionUpdate(position, context)
  }

  sendShapeUpdate(shape: number): void {
    const context = {
      send: (msg: BaseNetworkMessage) => this.manager.send(msg),
      broadcast: (msg: BaseNetworkMessage) => this.manager.broadcast(msg),
      getConnectionId: () => '',
      getGameState: <T = unknown>() => this.manager['gameState'] as T,
      updateGameState: <T = unknown>(updater: (state: T) => T) => {
        this.manager['gameState'] = updater(this.manager['gameState'] as T)
      },
      isConnected: () => this.manager.isConnected()
    }
    
    this.plugin.sendShapeUpdate(shape, context)
  }

  // For fake server simulation
  isSimulated = false
  setFakeServer(_fakeServer: unknown): void {
    // Not implemented in new system yet
    console.warn('Fake server not implemented in plugin system yet')
  }
}

// Adapter for Golf game
export class GolfNetworkAdapter {
  private manager: NetworkManager
  private plugin: GolfNetworkPlugin
  private _playerId: string | null = null
  private _gameState: GolfGameState | null = null

  private _roomState: Room | null = null

  constructor(callbacks?: {
    onRoomJoined?: (playerId: string, roomState: Room) => void
    onGameJoined?: (playerId: string, gameState: GolfGameState) => void
    onGameStateUpdate?: (gameState: GolfGameState) => void
    onRoomStateUpdate?: (roomState: Room) => void
    onNotification?: (message: string) => void
    onConnectionChange?: (connected: boolean) => void
    onGameEnded?: (winner: string, finalScores: FinalScore[]) => void
    onNewGameStarted?: (gameId: string, previousGameId?: string) => void
  }) {
    // Create manager with connection state callback
    this.manager = new NetworkManager({
      onConnectionStateChange: (state: ConnectionState) => {
        if (callbacks?.onConnectionChange) {
          callbacks.onConnectionChange(state === ConnectionState.CONNECTED)
        }
      }
    })

    // Create plugin with game callbacks
    this.plugin = new GolfNetworkPlugin({
      onRoomJoined: (playerId, roomState) => {
        this._playerId = playerId
        this._roomState = roomState
        callbacks?.onRoomJoined?.(playerId, roomState)
      },
      onGameJoined: (playerId, gameState) => {
        this._playerId = playerId
        this._gameState = gameState
        callbacks?.onGameJoined?.(playerId, gameState)
      },
      onGameStateUpdate: (gameState) => {
        this._gameState = gameState
        callbacks?.onGameStateUpdate?.(gameState)
      },
      onRoomStateUpdate: (roomState) => {
        this._roomState = roomState
        callbacks?.onRoomStateUpdate?.(roomState)
      },
      onNotification: callbacks?.onNotification,
      onGameEnded: callbacks?.onGameEnded,
      onNewGameStarted: callbacks?.onNewGameStarted
    })

    // Register the plugin
    this.manager.registerPlugin({
      plugin: this.plugin
    })
  }

  connect(url: string): void {
    this.manager.connect({
      url,
      gameType: 'golf',
      reconnect: true, // Enable reconnection with JWT session restore
      reconnectDelay: 2000, // Try to reconnect after 2 seconds
      maxReconnectAttempts: 10 // Try up to 10 times (covers the 5-minute grace period)
    })
  }

  disconnect(): void {
    this.manager.disconnect()
  }

  get isConnected(): boolean {
    return this.manager.isConnected()
  }

  get playerId(): string | null {
    return this._playerId
  }

  get gameState(): GolfGameState | null {
    return this._gameState
  }

  get roomState(): Room | null {
    return this._roomState
  }

  // Create context helper
  private getContext() {
    return {
      send: (msg: BaseNetworkMessage) => this.manager.send(msg),
      broadcast: (msg: BaseNetworkMessage) => this.manager.broadcast(msg),
      getConnectionId: () => '',
      getGameState: <T = unknown>() => this.manager['gameState'] as T,
      updateGameState: <T = unknown>(updater: (state: T) => T) => {
        this.manager['gameState'] = updater(this.manager['gameState'] as T)
      },
      isConnected: () => this.manager.isConnected()
    }
  }

  // Delegate game actions to plugin
  createRoom(): void {
    this.plugin.createRoom(this.getContext())
  }

  createGame(roomId: string): void {
    this.plugin.createGame(roomId, this.getContext())
  }

  joinRoom(roomId: string): void {
    this.plugin.joinRoom(roomId, this.getContext())
  }

  joinGame(roomId: string, gameId: string): void {
    this.plugin.joinGame(roomId, gameId, this.getContext())
  }

  startGame(): void {
    this.plugin.startGame(this.getContext())
  }

  peekCard(cardIndex: number): void {
    this.plugin.peekCard(cardIndex, this.getContext())
  }

  drawCard(): void {
    this.plugin.drawCard(this.getContext())
  }

  takeFromDiscard(): void {
    this.plugin.takeFromDiscard(this.getContext())
  }

  swapCard(cardIndex: number): void {
    this.plugin.swapCard(cardIndex, this.getContext())
  }

  discardDrawn(): void {
    this.plugin.discardDrawn(this.getContext())
  }

  knock(): void {
    this.plugin.knock(this.getContext())
  }

  hideCards(): void {
    this.plugin.hideCards(this.getContext())
  }

  startNewGame(): void {
    this.plugin.startNewGame(this.getContext())
  }

  leaveGame(): void {
    this.plugin.leaveGame(this.getContext())
  }

  isMyTurn(): boolean {
    return this.plugin.isMyTurn(this.getContext())
  }

  getCurrentPlayer() {
    return this.plugin.getCurrentPlayer(this.getContext())
  }
}