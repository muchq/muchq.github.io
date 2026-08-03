import type { GameState, Room, FinalScore, Player } from './golf'
import type { ChatMessage } from './golfChat'

// The one adapter contract useGolfGame depends on. Both the v1
// GolfNetworkAdapter and the v2 GolfV2NetworkAdapter implement this, so
// the "?golf=v2 swaps the wire, not the UI" premise is a compile-time
// fact rather than two surfaces trusted to stay identical.
//
// Room chat (MoonBase#1226) is a v2-only capability: the v1 wire never
// carried it, so sendChat and the chat callbacks are optional. The UI
// reveals chat only after the wire actually delivers it (the join
// replay or a live message) — an adapter declaring sendChat is not
// proof the connected server has chat.

export interface GolfAdapterCallbacks {
  onRoomJoined?: (playerId: string, roomState: Room) => void
  // The server confirmed a leaveRoom. Optional and v2-only today: the
  // v1 wire has no leave acknowledgement. The permalink flow chains on
  // this to join a share link's room after leaving a resumed one
  // (muchq.github.io#260) — an adapter without it simply cannot detour.
  onRoomLeft?: (roomId: string) => void
  onGameJoined?: (playerId: string, gameState: GameState) => void
  onGameStateUpdate?: (gameState: GameState) => void
  onRoomStateUpdate?: (roomState: Room) => void
  onNotification?: (message: string) => void
  onConnectionChange?: (connected: boolean) => void
  onGameEnded?: (winner: string, finalScores: FinalScore[], winners?: string[]) => void
  onNewGameStarted?: (gameId: string, previousGameId?: string) => void
  onReconnecting?: () => void
  onGameError?: (message: string) => void
  // One live message, exactly as the server committed it. May overlap
  // onChatHistory — consumers merge by messageId, never by arrival.
  onChatMessage?: (message: ChatMessage) => void
  // The room's retained history (ascending, at most 100), sent once per
  // join or resume. Replaces nothing by itself: merge, don't assign.
  onChatHistory?: (messages: ChatMessage[]) => void
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

  // Absent on adapters whose wire has no chat (v1). The server trims,
  // validates, and authorizes; this only ships the text.
  sendChat?(text: string): void
}
