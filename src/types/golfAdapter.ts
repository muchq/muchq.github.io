import type { GameState, Room, FinalScore, Player } from './golf'

// The one adapter contract useGolfGame depends on. Both the v1
// GolfNetworkAdapter and the v2 GolfV2NetworkAdapter implement this, so
// the "?golf=v2 swaps the wire, not the UI" premise is a compile-time
// fact rather than two surfaces trusted to stay identical.

export interface GolfAdapterCallbacks {
  onRoomJoined?: (playerId: string, roomState: Room) => void
  onGameJoined?: (playerId: string, gameState: GameState) => void
  onGameStateUpdate?: (gameState: GameState) => void
  onRoomStateUpdate?: (roomState: Room) => void
  onNotification?: (message: string) => void
  onConnectionChange?: (connected: boolean) => void
  onGameEnded?: (winner: string, finalScores: FinalScore[], winners?: string[]) => void
  onNewGameStarted?: (gameId: string, previousGameId?: string) => void
  onReconnecting?: () => void
  onGameError?: (message: string) => void
}

export interface GolfGameAdapter {
  connect(url: string): void
  disconnect(): void
  readonly isConnected: boolean
  readonly playerId: string | null
  readonly gameState: GameState | null
  readonly roomState: Room | null

  createRoom(): void
  joinRoom(roomId: string): void
  leaveRoom(roomId: string): void
  createGame(roomId: string): void
  joinGame(roomId: string, gameId: string): void
  startGame(): void
  startNewGame(): void
  leaveGame(): void
  peekCard(cardIndex: number): void
  drawCard(): void
  takeFromDiscard(): void
  swapCard(cardIndex: number): void
  discardDrawn(): void
  knock(): void
  hideCards(): void
  isMyTurn(): boolean
  getCurrentPlayer(): Player | null
}
