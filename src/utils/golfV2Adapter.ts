/* eslint-disable no-console */
// The golf v2 client (MoonBase#1187 phase 3): the smithy event-stream
// wire, presented through the exact same adapter surface as the v1
// GolfNetworkAdapter so useGolfGame and the components don't change.
//
// Wire shape (smithy-cpp ADR-0018 JSON-text mode):
//   - POST /games/v2/session {resumeToken?} -> {playerId, ticket, resumeToken}
//   - new WebSocket(playUrl + "?ticket=...", "smithy.eventstream.v1+json")
//   - frames both ways: {"event": "<member>", "payload": {...}}
//   - game moves ride the golf envelope: {"event":"golf","payload":{"move":{"drawCard":{}}}}
//   - game updates arrive as {"event":"golf","payload":{"update":{"gameState":{...}}}}
//
// Two deliberate translations keep the v1 UI untouched:
//   - v2 GameView -> v1 GameState (ids to indexes, slots to nullable
//     cards, discard top+count to a pile array).
//   - v1's take-then-place discard flow is emulated locally: the discard
//     top is public, so "taking" it reveals nothing; the real v2
//     takeFromDiscard{cardIndex} is sent when the player places it.

import type { Card, GameState as GolfGameState, Player, Room, FinalScore } from '@/types/golf'
import { golfV2PlayUrl, golfV2SessionUrl } from './golfV2'

const RESUME_TOKEN_KEY = 'golf_v2_resume_token'
const SUBPROTOCOL = 'smithy.eventstream.v1+json'
const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 10

// --- v2 wire shapes (mirrors model/games.smithy + model/golf_hub.smithy) ---

interface V2CardSlot {
  card?: Card
}

interface V2GamePlayer {
  playerId: string
  cards: V2CardSlot[]
  revealedIndexes: number[]
  hasPeeked: boolean
  score?: number
}

interface V2GameView {
  gameId: string
  phase: 'waiting' | 'playing' | 'peeking' | 'knocked' | 'ended'
  players: V2GamePlayer[]
  currentPlayerId?: string
  drawPileCount: number
  discardCount: number
  discardTop?: Card
  drawnCard?: Card
  knockedPlayerId?: string
  allPlayersPeeked: boolean
}

interface V2PlayerInfo {
  playerId: string
  connected: boolean
  gamesPlayed: number
  gamesWon: number
  totalScore: number
}

interface V2GameSummary {
  gameId: string
  status: string
  playerCount: number
}

interface V2RoomState {
  roomId: string
  players: V2PlayerInfo[]
  games: V2GameSummary[]
}

interface V2Events {
  sessionReady?: { playerId: string; resumed: boolean; roomId?: string }
  roomState?: V2RoomState
  roomLeft?: { roomId: string }
  roomChat?: { playerId: string; text: string }
  commandRejected?: { reason: string }
  golf?: { update: V2GolfUpdate }
}

interface V2GolfUpdate {
  gameJoined?: { view: V2GameView }
  gameState?: { view: V2GameView }
  gameCreated?: { gameId: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  playerKnocked?: { playerId: string }
  gameEnded?: { winner: string; winners: string[]; finalScores: { playerId: string; score: number }[] }
  gameLeft?: { gameId: string }
}

// --- v2 -> v1 shape translation ---

function stubPlayer(id: string): Player {
  return {
    id,
    name: id,
    cards: [],
    score: 0,
    revealedCards: [],
    isReady: false,
    hasPeeked: false,
    clientId: '',
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    isConnected: true,
    joinedAt: ''
  }
}

function mapGamePlayer(player: V2GamePlayer): Player {
  return {
    ...stubPlayer(player.playerId),
    cards: player.cards.map(slot => slot.card ?? null),
    score: player.score ?? 0,
    revealedCards: player.revealedIndexes,
    hasPeeked: player.hasPeeked
  }
}

function mapGameView(view: V2GameView): GolfGameState {
  // The v1 shape carries the whole discard pile; v2 sends top + count.
  // Only the top is ever rendered, so backfill with copies of the top.
  const discardPile: Card[] =
    view.discardTop == null ? [] : Array<Card>(view.discardCount).fill(view.discardTop)
  const currentPlayerIndex = view.currentPlayerId
    ? Math.max(0, view.players.findIndex(p => p.playerId === view.currentPlayerId))
    : 0
  return {
    id: view.gameId,
    players: view.players.map(mapGamePlayer),
    currentPlayerIndex,
    drawPile: view.drawPileCount,
    discardPile,
    gamePhase: view.phase,
    knockedPlayerId: view.knockedPlayerId ?? null,
    drawnCard: view.drawnCard ?? null,
    allPlayersPeeked: view.allPlayersPeeked
  }
}

function mapRoomState(room: V2RoomState): Room {
  const games: Record<string, GolfGameState> = {}
  for (const summary of room.games) {
    games[summary.gameId] = {
      id: summary.gameId,
      players: Array.from({ length: summary.playerCount }, (_, i) => stubPlayer(`seat-${i}`)),
      currentPlayerIndex: 0,
      drawPile: 0,
      discardPile: [],
      gamePhase: summary.status as GolfGameState['gamePhase'],
      knockedPlayerId: null,
      drawnCard: null,
      allPlayersPeeked: false
    }
  }
  return {
    id: room.roomId,
    players: room.players.map(info => ({
      ...stubPlayer(info.playerId),
      isConnected: info.connected,
      totalScore: info.totalScore,
      gamesPlayed: info.gamesPlayed,
      gamesWon: info.gamesWon
    })),
    games,
    gameHistory: [],
    createdAt: '',
    lastActivity: ''
  }
}

// --- the adapter ---

export interface GolfAdapterCallbacks {
  onRoomJoined?: (playerId: string, roomState: Room) => void
  onGameJoined?: (playerId: string, gameState: GolfGameState) => void
  onGameStateUpdate?: (gameState: GolfGameState) => void
  onRoomStateUpdate?: (roomState: Room) => void
  onNotification?: (message: string) => void
  onConnectionChange?: (connected: boolean) => void
  onGameEnded?: (winner: string, finalScores: FinalScore[], winners?: string[]) => void
  onNewGameStarted?: (gameId: string, previousGameId?: string) => void
  onReconnecting?: () => void
  onGameError?: (message: string) => void
}

export class GolfV2NetworkAdapter {
  private callbacks: GolfAdapterCallbacks
  private ws: WebSocket | null = null
  private _playerId: string | null = null
  private _gameState: GolfGameState | null = null
  private _roomState: Room | null = null
  private closed = false
  private reconnectAttempts = 0
  private reconnectTimeout: number | null = null
  private sawSessionReady = false

  // The room the UI has been told it joined; the next different
  // roomState fires onRoomJoined, same-room ones fire onRoomStateUpdate.
  private announcedRoomId: string | null = null
  // Our in-flight createGame requests: swallow their room-wide
  // gameCreated echo (the creator is auto-seated and gets gameJoined).
  private pendingOwnCreates = 0
  // v1's take-then-place discard flow, emulated locally.
  private pendingDiscardTake = false
  private lastServerView: V2GameView | null = null

  constructor(callbacks?: GolfAdapterCallbacks) {
    this.callbacks = callbacks ?? {}
  }

  connect(_url?: string): void {
    this.closed = false
    void this.dial()
  }

  disconnect(): void {
    this.closed = true
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.ws?.close()
    this.ws = null
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
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

  // --- session + socket lifecycle ---

  private async dial(): Promise<void> {
    try {
      const stored = this.getResumeToken()
      const response = await fetch(golfV2SessionUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(stored ? { resumeToken: stored } : {})
      })
      if (!response.ok) {
        throw new Error(`session mint failed: ${response.status}`)
      }
      const session = (await response.json()) as {
        playerId: string
        ticket: string
        resumeToken: string
      }
      this._playerId = session.playerId
      this.storeResumeToken(session.resumeToken)

      const url = `${golfV2PlayUrl()}?ticket=${encodeURIComponent(session.ticket)}`
      const ws = new WebSocket(url, SUBPROTOCOL)
      this.ws = ws
      this.sawSessionReady = false

      ws.onopen = () => {
        console.log('🎮 golf v2 connected')
        this.reconnectAttempts = 0
        this.callbacks.onConnectionChange?.(true)
      }
      ws.onmessage = event => {
        try {
          this.handleFrame(JSON.parse(event.data as string) as { event?: string; payload?: unknown })
        } catch (error) {
          console.error('golf v2: bad frame', error)
        }
      }
      ws.onclose = () => {
        this.callbacks.onConnectionChange?.(false)
        if (!this.sawSessionReady) {
          // Refused before admission (spent ticket, seat conflict, bad
          // resume token): drop the token so the next dial mints fresh.
          this.clearResumeToken()
        }
        this.scheduleReconnect()
      }
      ws.onerror = () => {
        // onclose follows; nothing useful in the browser error event.
      }
    } catch (error) {
      console.error('golf v2: dial failed', error)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.callbacks.onGameError?.('Lost connection to the golf server')
      return
    }
    this.reconnectAttempts++
    console.log(`🔄 golf v2 reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
    this.reconnectTimeout = window.setTimeout(() => void this.dial(), RECONNECT_DELAY_MS)
  }

  private sendEvent(event: string, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('golf v2: cannot send, not connected')
      return
    }
    this.ws.send(JSON.stringify({ event, payload }))
  }

  private sendMove(move: string, payload: unknown = {}): void {
    this.sendEvent('golf', { move: { [move]: payload } })
  }

  // --- inbound events ---

  private handleFrame(frame: { event?: string; payload?: unknown }): void {
    if (!frame.event) {
      console.warn('golf v2: frame without event', frame)
      return
    }
    const payload = (frame.payload ?? {}) as V2Events[keyof V2Events]
    switch (frame.event as keyof V2Events) {
      case 'sessionReady':
        this.handleSessionReady(payload as NonNullable<V2Events['sessionReady']>)
        return
      case 'roomState':
        this.handleRoomState(payload as V2RoomState)
        return
      case 'roomLeft':
        this.announcedRoomId = null
        this._roomState = null
        return
      case 'roomChat': {
        const chat = payload as NonNullable<V2Events['roomChat']>
        this.callbacks.onNotification?.(`${chat.playerId}: ${chat.text}`)
        return
      }
      case 'commandRejected': {
        const rejected = payload as NonNullable<V2Events['commandRejected']>
        this.callbacks.onGameError?.(rejected.reason)
        this.callbacks.onNotification?.(rejected.reason)
        return
      }
      case 'golf':
        this.handleUpdate((payload as NonNullable<V2Events['golf']>).update)
        return
      default:
        console.warn(`golf v2: unknown event ${frame.event}`)
    }
  }

  private handleSessionReady(ready: { playerId: string; resumed: boolean; roomId?: string }): void {
    this._playerId = ready.playerId
    this.sawSessionReady = true
    if (ready.resumed && ready.roomId) {
      console.log('♻️ golf v2 session resumed')
      this.callbacks.onReconnecting?.()
    }
  }

  private handleRoomState(room: V2RoomState): void {
    const mapped = mapRoomState(room)
    this._roomState = mapped
    if (this.announcedRoomId !== room.roomId) {
      this.announcedRoomId = room.roomId
      this.callbacks.onRoomJoined?.(this._playerId ?? '', mapped)
      this.callbacks.onNotification?.('Joined room successfully!')
    } else {
      this.callbacks.onRoomStateUpdate?.(mapped)
    }
  }

  private handleUpdate(update: V2GolfUpdate): void {
    if (update.gameJoined) {
      this.acceptView(update.gameJoined.view)
      this.callbacks.onGameJoined?.(this._playerId ?? '', this._gameState!)
      this.callbacks.onNotification?.('Joined game successfully!')
      return
    }
    if (update.gameState) {
      this.acceptView(update.gameState.view)
      this.callbacks.onGameStateUpdate?.(this._gameState!)
      return
    }
    if (update.gameCreated) {
      if (this.pendingOwnCreates > 0) {
        // Our own create: the gameJoined we also receive carries the
        // state, and announcing it would make the hook double-join.
        this.pendingOwnCreates--
        return
      }
      this.callbacks.onNotification?.('New game started!')
      this.callbacks.onNewGameStarted?.(update.gameCreated.gameId)
      return
    }
    if (update.gameStarted) {
      this.callbacks.onNotification?.('Game started! Each player can peek at 2 cards.')
      return
    }
    if (update.turnChanged) {
      this.callbacks.onNotification?.(`It's ${update.turnChanged.playerId}'s turn`)
      return
    }
    if (update.playerKnocked) {
      this.callbacks.onNotification?.(`${update.playerKnocked.playerId} has knocked! Last round!`)
      return
    }
    if (update.gameEnded) {
      const ended = update.gameEnded
      const finalScores: FinalScore[] = ended.finalScores.map(score => ({
        playerName: score.playerId,
        score: score.score
      }))
      this.callbacks.onNotification?.(`Game over! Winner: ${ended.winner}`)
      this.callbacks.onGameEnded?.(ended.winner, finalScores, ended.winners)
      return
    }
    if (update.gameLeft) {
      this._gameState = null
      this.lastServerView = null
      this.pendingDiscardTake = false
      return
    }
    console.warn('golf v2: unknown update', update)
  }

  private acceptView(view: V2GameView): void {
    // Server state is authoritative: any update ends the local
    // take-from-discard emulation.
    this.lastServerView = view
    this.pendingDiscardTake = false
    this._gameState = mapGameView(view)
  }

  // --- actions (the v1 adapter surface) ---

  createRoom(): void {
    this.sendEvent('createRoom', {})
  }

  joinRoom(roomId: string): void {
    this.sendEvent('joinRoom', { roomId })
  }

  leaveRoom(_roomId: string): void {
    this.announcedRoomId = null
    this.sendEvent('leaveRoom', {})
  }

  getRoomState(): void {
    this.sendEvent('getRoomState', {})
  }

  sendChat(text: string): void {
    this.sendEvent('chat', { text })
  }

  createGame(_roomId: string): void {
    this.pendingOwnCreates++
    this.sendMove('createGame')
  }

  joinGame(_roomId: string, gameId: string): void {
    this.sendMove('joinGame', { gameId })
  }

  startGame(): void {
    this.sendMove('startGame')
  }

  startNewGame(): void {
    // v2 folded startNewGame into createGame; the creator is auto-seated.
    this.createGame('')
  }

  leaveGame(): void {
    this.sendMove('leaveGame')
  }

  peekCard(cardIndex: number): void {
    this.sendMove('peekCard', { cardIndex })
  }

  drawCard(): void {
    this.sendMove('drawCard')
  }

  takeFromDiscard(): void {
    // The discard top is public: "picking it up" reveals nothing, so v1's
    // hold step is purely local. The real move goes out on placement.
    const view = this.lastServerView
    if (!view || view.discardTop == null || this._gameState == null) return
    this.pendingDiscardTake = true
    this._gameState = {
      ...this._gameState,
      drawnCard: view.discardTop,
      discardPile: this._gameState.discardPile.slice(0, -1)
    }
    this.callbacks.onGameStateUpdate?.(this._gameState)
  }

  swapCard(cardIndex: number): void {
    if (this.pendingDiscardTake) {
      this.pendingDiscardTake = false
      this.sendMove('takeFromDiscard', { cardIndex })
      return
    }
    this.sendMove('swapCard', { cardIndex })
  }

  discardDrawn(): void {
    if (this.pendingDiscardTake) {
      // Putting the discard top back: nothing ever left the server.
      this.pendingDiscardTake = false
      if (this.lastServerView) {
        this._gameState = mapGameView(this.lastServerView)
        this.callbacks.onGameStateUpdate?.(this._gameState)
      }
      return
    }
    this.sendMove('discardDrawn')
  }

  knock(): void {
    this.sendMove('knock')
  }

  hideCards(): void {
    this.sendMove('hideCards')
  }

  isMyTurn(): boolean {
    if (!this._gameState || !this._playerId) return false
    return this._gameState.players[this._gameState.currentPlayerIndex]?.id === this._playerId
  }

  getCurrentPlayer(): Player | null {
    if (!this._gameState || !this._playerId) return null
    return this._gameState.players.find(p => p.id === this._playerId) ?? null
  }

  // --- resume token storage ---

  private storeResumeToken(token: string): void {
    try {
      localStorage.setItem(RESUME_TOKEN_KEY, token)
    } catch {
      // Private mode: sessions just won't resume.
    }
  }

  private getResumeToken(): string | null {
    try {
      return localStorage.getItem(RESUME_TOKEN_KEY)
    } catch {
      return null
    }
  }

  private clearResumeToken(): void {
    try {
      localStorage.removeItem(RESUME_TOKEN_KEY)
    } catch {
      // Nothing to clear.
    }
  }
}
