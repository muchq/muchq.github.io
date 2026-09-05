// The golf client: the golf envelope on the hub's one stream
// (hubStream.ts, which owns the mint, the socket, the reconnect loop,
// and the room and chat frames), presented through the GolfGameAdapter
// surface useGolfGame consumes.
//
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
import {
  JOINED_ROOM,
  JOINED_GAME,
  NEW_GAME,
  GAME_STARTED,
  turnMessage,
  knockedMessage,
  gameOverMessage
} from './golfNotifications'
import { HUB_RESUME_TOKEN_KEY } from './hubSession'
import { HubStream, hubPlayUrl } from './hubStream'
import type { HubRoom, HubSessionReady } from './hubStream'

export type { GolfAdapterCallbacks } from '@/types/golfAdapter'

// --- wire shapes (mirrors model/golf.smithy; the room's are hubStream's) ---

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

// A room hosts golf and castle tables on one stream (MoonBase#77); this
// client lists only its own.
function mapRoomState(room: HubRoom): Room {
  const games: Record<string, GolfGameState> = {}
  for (const summary of room.games) {
    if ((summary.game ?? 'golf') !== 'golf') continue
    games[summary.gameId] = {
      id: summary.gameId,
      players: stubSeats(summary.playerCount),
      currentPlayerIndex: 0,
      drawPile: 0,
      discardPile: [],
      gamePhase: summary.status as GamePhase,
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
  private readonly stream: HubStream
  private _gameState: GolfGameState | null = null
  private _roomState: Room | null = null

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
    this.stream = new HubStream({
      playUrl: hubPlayUrl(),
      resumeTokenKey: HUB_RESUME_TOKEN_KEY,
      callbacks: {
        onConnection: up => this.callbacks.onConnectionChange?.(up),
        onSessionReady: ready => this.handleSessionReady(ready),
        onRoom: room => this.handleRoomState(room),
        onRoomLeft: roomId => {
          this.announcedRoomId = null
          this._roomState = null
          this.callbacks.onRoomLeft?.(roomId)
        },
        // Typed chat state, not a toast (MoonBase#1226): the UI owns
        // presentation, and a transient notification would drop the
        // message the server just committed durably.
        onChat: message => this.callbacks.onChatMessage?.(message),
        onChatHistory: messages => this.callbacks.onChatHistory?.(messages),
        onRejected: reason => {
          this.callbacks.onGameError?.(reason)
          this.callbacks.onNotification?.(reason)
        },
        // The room's other game's announcements reach every member, and
        // are not golf's to read.
        onGame: (game, update) => {
          if (game === 'golf') this.handleUpdate(update as V2GolfUpdate)
        },
        // The reconnect loop gave up, or the hub refused the stream
        // outright; either way the game is unreachable from here.
        onLost: reason => this.callbacks.onGameError?.(reason)
      }
    })
  }

  connect(): void {
    this.stream.connect()
  }

  disconnect(): void {
    this.stream.disconnect()
  }

  get isConnected(): boolean {
    return this.stream.isConnected
  }

  get playerId(): string | null {
    return this.stream.playerId
  }

  get gameState(): GolfGameState | null {
    return this._gameState
  }

  get roomState(): Room | null {
    return this._roomState
  }

  private sendMove(move: V2MoveName, payload: unknown = {}): void {
    this.stream.move('golf', move, payload)
  }

  // --- inbound events ---

  private handleSessionReady(ready: HubSessionReady): void {
    if (ready.resumed && ready.roomId) {
      this.callbacks.onReconnecting?.()
    }
  }

  private handleRoomState(room: HubRoom): void {
    const mapped = mapRoomState(room)
    this._roomState = mapped
    if (this.announcedRoomId !== room.roomId) {
      this.announcedRoomId = room.roomId
      this.callbacks.onRoomJoined?.(this.playerId ?? '', mapped)
      this.callbacks.onNotification?.(JOINED_ROOM)
    } else {
      this.callbacks.onRoomStateUpdate?.(mapped)
    }
  }

  private handleUpdate(update: V2GolfUpdate): void {
    if (update.gameJoined) {
      const state = this.acceptView(update.gameJoined.view)
      this.callbacks.onGameJoined?.(this.playerId ?? '', state)
      this.callbacks.onNotification?.(JOINED_GAME)
      return
    }
    if (update.gameState) {
      const state = this.acceptView(update.gameState.view)
      this.callbacks.onGameStateUpdate?.(state)
      return
    }
    if (update.gameCreated) {
      if (update.gameCreated.createdBy === this.playerId) {
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
      this.pendingDiscardTake = false
      return
    }
    console.warn('golf: unknown update', update)
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
    this.stream.createRoom()
  }

  joinRoom(roomId: string): void {
    this.stream.joinRoom(roomId)
  }

  leaveRoom(_roomId: string): void {
    this.announcedRoomId = null
    this.stream.leaveRoom()
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
    this.stream.chat(text)
  }

  isMyTurn(): boolean {
    const me = this.playerId
    if (!this._gameState || !me) return false
    return this._gameState.players[this._gameState.currentPlayerIndex]?.id === me
  }

  getCurrentPlayer(): Player | null {
    const me = this.playerId
    if (!this._gameState || !me) return null
    return this._gameState.players.find(p => p.id === me) ?? null
  }
}
