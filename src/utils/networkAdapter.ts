/* eslint-disable no-console */
// The golf client: the golf_hub smithy event-stream wire, presented
// through the GolfGameAdapter surface useGolfGame consumes.
//
// Wire shape (smithy-cpp ADR-0018 JSON-text mode):
//   - POST /games/v2/session {resumeToken?} -> {playerId, ticket, resumeToken}
//   - new WebSocket(playUrl + "?ticket=...", "smithy.eventstream.v1+json")
//   - frames both ways: {"event": "<member>", "payload": {...}}
//   - game moves ride the golf envelope: {"event":"golf","payload":{"move":{"drawCard":{}}}}
//   - game updates arrive as {"event":"golf","payload":{"update":{"gameState":{...}}}}
//
// Two translations sit between the wire and the UI's model:
//   - GameView -> GameState (ids to indexes, slots to nullable cards).
//     The discard renders as a one-card pile (the hub sends top + count;
//     only the top is drawn), room game summaries carry placeholder seat
//     players where the hub sends a playerCount, and gameHistory is
//     empty — the wire doesn't carry it, so "Recent Games" is blank.
//   - The UI's take-then-place discard flow is emulated locally: the
//     discard top is public, so "taking" it reveals nothing; the hub's
//     takeFromDiscard{cardIndex} is sent when the player places it.

import type { Card, GameState as GolfGameState, Player, Room, FinalScore } from '@/types/golf'
import type { GolfAdapterCallbacks, GolfGameAdapter } from '@/types/golfAdapter'
import type { ChatMessage } from '@/types/golfChat'
import {
  JOINED_ROOM,
  JOINED_GAME,
  NEW_GAME,
  GAME_STARTED,
  turnMessage,
  knockedMessage,
  gameOverMessage
} from './golfNotifications'
import { safeLocalStorage } from './safeLocalStorage'
import { HUB_RESUME_TOKEN_KEY, HUB_SUBPROTOCOL, hubPlayUrl, hubSessionUrl, mintHubSession } from './hubSession'

export type { GolfAdapterCallbacks } from '@/types/golfAdapter'

export function golfPlayUrl(): string {
  return hubPlayUrl()
}

export function golfSessionUrl(): string {
  return hubSessionUrl(golfPlayUrl())
}

// 2s x 10 sits well inside the hub's 5-minute reconnect grace.
const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 10

// --- wire shapes (mirrors model/games.smithy + model/golf_hub.smithy) ---

type GamePhase = GolfGameState['gamePhase']

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
  phase: GamePhase
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
  // Which game the table plays: a room hosts golf and castle tables on
  // one stream (MoonBase#77), and this client lists only its own.
  game?: 'golf' | 'castle'
  status: GamePhase
  playerCount: number
}

interface V2RoomState {
  roomId: string
  players: V2PlayerInfo[]
  games: V2GameSummary[]
}

interface V2SessionReady {
  playerId: string
  resumed: boolean
  roomId?: string
}

// The golf update union's JSON encoding: exactly one member present.
interface V2GolfUpdate {
  gameJoined?: { view: V2GameView }
  gameState?: { view: V2GameView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  playerKnocked?: { playerId: string }
  gameEnded?: {
    winner: string
    winners: string[]
    finalScores: { playerId: string; score: number }[]
  }
  gameLeft?: { gameId: string }
}

// Inbound frames as a discriminated union: the switch narrows each case,
// and a new event is a compile-time hole instead of a silent cast.
type V2Frame =
  | { event: 'sessionReady'; payload: V2SessionReady }
  | { event: 'roomState'; payload: V2RoomState }
  | { event: 'roomLeft'; payload: { roomId: string } }
  | { event: 'roomChat'; payload: ChatMessage }
  | { event: 'roomChatHistory'; payload: { messages: ChatMessage[] } }
  | { event: 'commandRejected'; payload: { reason: string } }
  | { event: 'golf'; payload: { update: V2GolfUpdate } }
  // The room's other game (MoonBase#77): its announcements reach every
  // member, and are not golf's to read.
  | { event: 'castle'; payload: { update: unknown } }

type V2CommandEvent = 'createRoom' | 'joinRoom' | 'leaveRoom' | 'getRoomState' | 'chat' | 'golf'
type V2MoveName =
  | 'createGame'
  | 'joinGame'
  | 'startGame'
  | 'leaveGame'
  | 'peekCard'
  | 'drawCard'
  | 'takeFromDiscard'
  | 'swapCard'
  | 'discardDrawn'
  | 'knock'
  | 'hideCards'

// --- wire -> UI model translation ---

// The hub has no separate display names: the whimsical playerId is the
// label, so it fills both id and name.
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

// Placeholder seats carrying only a count — the Room shape wants Player[]
// where the hub sends playerCount, and the lobby reads only the length.
function stubSeats(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => stubPlayer(`seat-${i}`))
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
  // The UI renders only the discard top, and holding the top during the
  // take emulation must not "reveal" a card beneath that this client was
  // never sent — so the pile maps to at most one card.
  const discardPile: Card[] = view.discardTop == null ? [] : [view.discardTop]
  const currentSeat = view.currentPlayerId
    ? view.players.findIndex(p => p.playerId === view.currentPlayerId)
    : -1
  return {
    id: view.gameId,
    players: view.players.map(mapGamePlayer),
    // An absent or unknown current player (e.g. an ended game) shows as
    // seat 0; nothing turn-gated renders in those phases.
    currentPlayerIndex: currentSeat >= 0 ? currentSeat : 0,
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
    if ((summary.game ?? 'golf') !== 'golf') continue
    games[summary.gameId] = {
      id: summary.gameId,
      players: stubSeats(summary.playerCount),
      currentPlayerIndex: 0,
      drawPile: 0,
      discardPile: [],
      gamePhase: summary.status,
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

export class GolfNetworkAdapter implements GolfGameAdapter {
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
  // Sound because the hub only sends roomState to members: a new roomId
  // always means this player joined (or resumed into) that room.
  private announcedRoomId: string | null = null
  // The UI's take-then-place discard flow, emulated locally.
  private pendingDiscardTake = false
  // The last authoritative server view, kept so the discard-take
  // emulation can be reverted without inventing state.
  private lastServerView: V2GameView | null = null

  constructor(callbacks?: GolfAdapterCallbacks) {
    this.callbacks = callbacks ?? {}
  }

  connect(): void {
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
      const session = await mintHubSession(golfPlayUrl(), safeLocalStorage.get(HUB_RESUME_TOKEN_KEY))
      // Disconnected during the mint: no socket, or a torn-down adapter
      // would hold a seat under the live one's playerId.
      if (this.closed) return
      this._playerId = session.playerId
      safeLocalStorage.set(HUB_RESUME_TOKEN_KEY, session.resumeToken)

      const url = `${golfPlayUrl()}?ticket=${encodeURIComponent(session.ticket)}`
      const ws = new WebSocket(url, HUB_SUBPROTOCOL)
      this.ws = ws
      this.sawSessionReady = false

      ws.onopen = () => {
        console.log('🎮 golf v2 connected')
        this.reconnectAttempts = 0
        this.callbacks.onConnectionChange?.(true)
      }
      ws.onmessage = event => {
        try {
          // The one boundary cast: frames are validated by shape of use,
          // not a runtime schema — unknown events fall through the switch.
          this.handleFrame(JSON.parse(event.data as string) as V2Frame)
        } catch (error) {
          console.error('golf v2: bad frame', error)
        }
      }
      ws.onclose = () => {
        this.callbacks.onConnectionChange?.(false)
        if (!this.sawSessionReady) {
          // Refused before admission (spent ticket, seat conflict, bad
          // resume token): drop the token so the next dial mints fresh.
          safeLocalStorage.remove(HUB_RESUME_TOKEN_KEY)
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

  private sendEvent(event: V2CommandEvent, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('golf v2: cannot send, not connected')
      return
    }
    this.ws.send(JSON.stringify({ event, payload }))
  }

  private sendMove(move: V2MoveName, payload: unknown = {}): void {
    this.sendEvent('golf', { move: { [move]: payload } })
  }

  // --- inbound events ---

  private handleFrame(frame: V2Frame): void {
    switch (frame.event) {
      case 'sessionReady':
        this.handleSessionReady(frame.payload)
        return
      case 'roomState':
        this.handleRoomState(frame.payload)
        return
      case 'roomLeft':
        this.announcedRoomId = null
        this._roomState = null
        this.callbacks.onRoomLeft?.(frame.payload.roomId)
        return
      case 'roomChat':
        // Typed chat state, not a toast (MoonBase#1226): the UI owns
        // presentation, and a transient notification would drop the
        // message the server just committed durably.
        this.callbacks.onChatMessage?.(frame.payload)
        return
      case 'roomChatHistory':
        this.callbacks.onChatHistory?.(frame.payload.messages)
        return
      case 'commandRejected':
        this.callbacks.onGameError?.(frame.payload.reason)
        this.callbacks.onNotification?.(frame.payload.reason)
        return
      case 'golf':
        this.handleUpdate(frame.payload.update)
        return
      case 'castle':
        return
      default:
        console.warn('golf v2: unknown event', frame)
    }
  }

  private handleSessionReady(ready: V2SessionReady): void {
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
      this.callbacks.onNotification?.(JOINED_ROOM)
    } else {
      this.callbacks.onRoomStateUpdate?.(mapped)
    }
  }

  private handleUpdate(update: V2GolfUpdate): void {
    if (update.gameJoined) {
      const state = this.acceptView(update.gameJoined.view)
      this.callbacks.onGameJoined?.(this._playerId ?? '', state)
      this.callbacks.onNotification?.(JOINED_GAME)
      return
    }
    if (update.gameState) {
      const state = this.acceptView(update.gameState.view)
      this.callbacks.onGameStateUpdate?.(state)
      return
    }
    if (update.gameCreated) {
      if (update.gameCreated.createdBy === this._playerId) {
        // Our own create: the gameJoined we also receive carries the
        // state, and announcing it would make the hook double-join.
        return
      }
      this.callbacks.onNotification?.(NEW_GAME)
      this.callbacks.onNewGameStarted?.(update.gameCreated.gameId)
      return
    }
    if (update.gameStarted) {
      this.callbacks.onNotification?.(GAME_STARTED)
      return
    }
    if (update.turnChanged) {
      this.callbacks.onNotification?.(turnMessage(update.turnChanged.playerId))
      return
    }
    if (update.playerKnocked) {
      this.callbacks.onNotification?.(knockedMessage(update.playerKnocked.playerId))
      return
    }
    if (update.gameEnded) {
      const ended = update.gameEnded
      const finalScores: FinalScore[] = ended.finalScores.map(score => ({
        playerName: score.playerId,
        score: score.score
      }))
      this.callbacks.onNotification?.(gameOverMessage(ended.winner))
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

  private acceptView(view: V2GameView): GolfGameState {
    // Server state is authoritative: any update ends the local
    // take-from-discard emulation.
    this.lastServerView = view
    this.pendingDiscardTake = false
    this._gameState = mapGameView(view)
    return this._gameState
  }

  // --- actions (the shared GolfGameAdapter surface) ---

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

  createGame(_roomId: string): void {
    this.requestCreateGame()
  }

  startNewGame(): void {
    // The hub has no separate start: creating a game seats the creator.
    this.requestCreateGame()
  }

  private requestCreateGame(): void {
    this.sendMove('createGame')
  }

  joinGame(_roomId: string, gameId: string): void {
    this.sendMove('joinGame', { gameId })
  }

  startGame(): void {
    this.sendMove('startGame')
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
    // The discard top is public: "picking it up" reveals nothing, so the
    // hold step is purely local. The real move goes out on placement.
    const view = this.lastServerView
    if (!view || view.discardTop == null || this._gameState == null) return
    this.pendingDiscardTake = true
    this._gameState = {
      ...this._gameState,
      drawnCard: view.discardTop,
      discardPile: []
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

  sendChat(text: string): void {
    this.sendEvent('chat', { text })
  }

  isMyTurn(): boolean {
    if (!this._gameState || !this._playerId) return false
    return this._gameState.players[this._gameState.currentPlayerIndex]?.id === this._playerId
  }

  getCurrentPlayer(): Player | null {
    if (!this._gameState || !this._playerId) return null
    return this._gameState.players.find(p => p.id === this._playerId) ?? null
  }
}
