// The games hub's room stream, game-agnostic: the session mint, the
// smithy event-stream socket with its reconnect loop, the room and chat
// commands and events, and one envelope per game (golf, castle) whose
// contents are the game client's business.
//
// Wire shape (smithy-cpp ADR-0018 JSON-text mode):
//   - POST /games/v2/session {resumeToken?} -> {playerId, ticket, resumeToken}
//   - new WebSocket(playUrl + "?ticket=...", "smithy.eventstream.v1+json")
//   - frames both ways: {"event": "<member>", "payload": {...}}
//   - room commands are bare: {"event":"joinRoom","payload":{"roomId":"..."}}
//   - game moves ride their envelope: {"event":"castle","payload":{"move":{"ready":{}}}}
//   - game updates arrive the same way: {"event":"castle","payload":{"update":{...}}}
//   - a refusal that ends the stream: {"exception":"<shape>","payload":{"message":"..."}}
//
// Golf's client (networkAdapter.ts) predates this and carries its own
// copy of the socket layer; castle is the first game on this one.

import type { ChatMessage } from '@/types/golfChat'
import { safeLocalStorage } from './safeLocalStorage'
import { HUB_SUBPROTOCOL, mintHubSession } from './hubSession'

// One stream serves every game in a room (MoonBase#1490): castle rides
// golf's path, so the golf override names the hub for both.
export function hubPlayUrl(): string {
  return import.meta.env.VITE_GOLF_WEBSOCKET_URL || 'wss://api.muchq.com/games/v2/golf/play'
}

// 2s x 10 sits well inside the hub's 5-minute reconnect grace.
const RECONNECT_DELAY_MS = 2000
const MAX_RECONNECT_ATTEMPTS = 10

// --- wire shapes (mirrors model/games.smithy + model/golf.smithy) ---

export interface HubRoomPlayer {
  playerId: string
  connected: boolean
  gamesPlayed: number
  gamesWon: number
  totalScore: number
}

export type HubGameName = 'golf' | 'castle'

export interface HubGameSummary {
  gameId: string
  game: HubGameName
  status: string
  playerCount: number
}

export interface HubRoom {
  roomId: string
  players: HubRoomPlayer[]
  games: HubGameSummary[]
}

export interface HubSessionReady {
  playerId: string
  resumed: boolean
  roomId?: string
}

// Inbound frames as a discriminated union: the switch narrows each case,
// and a new event is a compile-time hole instead of a silent cast. A
// game envelope's update is opaque here; the game client reads it.
type HubFrame =
  | { event: 'sessionReady'; payload: HubSessionReady }
  | { event: 'roomState'; payload: HubRoom }
  | { event: 'roomLeft'; payload: { roomId: string } }
  | { event: 'roomChat'; payload: ChatMessage }
  | { event: 'roomChatHistory'; payload: { messages: ChatMessage[] } }
  | { event: 'commandRejected'; payload: { reason: string } }
  | { event: 'golf'; payload: { update: Record<string, unknown> } }
  | { event: 'castle'; payload: { update: Record<string, unknown> } }
  | { event?: undefined; exception: string; payload: { message?: string } }

type HubCommand = 'createRoom' | 'joinRoom' | 'leaveRoom' | 'getRoomState' | 'chat' | HubGameName

export interface HubStreamCallbacks {
  onConnection?: (connected: boolean) => void
  onSessionReady?: (ready: HubSessionReady) => void
  // Every roomState the hub sends; the hub sends them only to members,
  // so a new roomId always means this player joined (or resumed into)
  // that room.
  onRoom?: (room: HubRoom) => void
  onRoomLeft?: (roomId: string) => void
  onChat?: (message: ChatMessage) => void
  onChatHistory?: (messages: ChatMessage[]) => void
  // An in-band refusal; the stream stays up.
  onRejected?: (reason: string) => void
  // A game envelope's update, exactly one member present.
  onGame?: (game: HubGameName, update: Record<string, unknown>) => void
  // The reconnect loop gave up, or the hub refused the stream outright.
  onLost?: (reason: string) => void
}

export interface HubStreamOptions {
  playUrl: string
  // Each app keeps its own token: one identity per app, so a castle tab
  // and a golf tab never fight over one seat.
  resumeTokenKey: string
  callbacks?: HubStreamCallbacks
}

export class HubStream {
  private readonly playUrl: string
  private readonly resumeTokenKey: string
  private readonly callbacks: HubStreamCallbacks
  private ws: WebSocket | null = null
  private _playerId: string | null = null
  private closed = false
  private reconnectAttempts = 0
  private reconnectTimeout: number | null = null
  private sawSessionReady = false

  constructor(options: HubStreamOptions) {
    this.playUrl = options.playUrl
    this.resumeTokenKey = options.resumeTokenKey
    this.callbacks = options.callbacks ?? {}
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

  // --- session + socket lifecycle ---

  private async dial(): Promise<void> {
    try {
      const session = await mintHubSession(this.playUrl, safeLocalStorage.get(this.resumeTokenKey))
      // Disconnected during the mint: no socket, or a torn-down stream
      // would hold a seat under the live one's playerId.
      if (this.closed) return
      this._playerId = session.playerId
      safeLocalStorage.set(this.resumeTokenKey, session.resumeToken)

      const ws = new WebSocket(`${this.playUrl}?ticket=${encodeURIComponent(session.ticket)}`, HUB_SUBPROTOCOL)
      this.ws = ws
      this.sawSessionReady = false

      ws.onopen = () => {
        this.reconnectAttempts = 0
        this.callbacks.onConnection?.(true)
      }
      ws.onmessage = event => {
        try {
          // The one boundary cast: frames are validated by shape of use,
          // not a runtime schema — unknown events fall through the switch.
          this.handleFrame(JSON.parse(event.data as string) as HubFrame)
        } catch (error) {
          console.error('hub: bad frame', error)
        }
      }
      ws.onclose = () => {
        this.callbacks.onConnection?.(false)
        if (!this.sawSessionReady) {
          // Refused before admission (spent ticket, seat conflict, bad
          // resume token): drop the token so the next dial mints fresh.
          safeLocalStorage.remove(this.resumeTokenKey)
        }
        this.scheduleReconnect()
      }
      ws.onerror = () => {
        // onclose follows; nothing useful in the browser error event.
      }
    } catch (error) {
      console.error('hub: dial failed', error)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.callbacks.onLost?.('Lost connection to the games hub')
      return
    }
    this.reconnectAttempts++
    this.reconnectTimeout = window.setTimeout(() => void this.dial(), RECONNECT_DELAY_MS)
  }

  private send(event: HubCommand, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('hub: cannot send, not connected')
      return
    }
    this.ws.send(JSON.stringify({ event, payload }))
  }

  // --- inbound frames ---

  private handleFrame(frame: HubFrame): void {
    if (frame.event === undefined) {
      // A terminal refusal names its shape; the message is for people.
      this.callbacks.onLost?.(frame.payload?.message ?? frame.exception)
      return
    }
    switch (frame.event) {
      case 'sessionReady':
        this._playerId = frame.payload.playerId
        this.sawSessionReady = true
        this.callbacks.onSessionReady?.(frame.payload)
        return
      case 'roomState':
        this.callbacks.onRoom?.(frame.payload)
        return
      case 'roomLeft':
        this.callbacks.onRoomLeft?.(frame.payload.roomId)
        return
      case 'roomChat':
        this.callbacks.onChat?.(frame.payload)
        return
      case 'roomChatHistory':
        this.callbacks.onChatHistory?.(frame.payload.messages)
        return
      case 'commandRejected':
        this.callbacks.onRejected?.(frame.payload.reason)
        return
      case 'golf':
      case 'castle':
        this.callbacks.onGame?.(frame.event, frame.payload.update)
        return
      default:
        console.warn('hub: unknown event', frame)
    }
  }

  // --- room commands ---

  createRoom(): void {
    this.send('createRoom', {})
  }

  joinRoom(roomId: string): void {
    this.send('joinRoom', { roomId })
  }

  leaveRoom(): void {
    this.send('leaveRoom', {})
  }

  getRoomState(): void {
    this.send('getRoomState', {})
  }

  // The server trims, validates, and authorizes; this only ships the text.
  chat(text: string): void {
    this.send('chat', { text })
  }

  // One move in a game's envelope: {"move": {"<name>": payload}}.
  move(game: HubGameName, name: string, payload: unknown = {}): void {
    this.send(game, { move: { [name]: payload } })
  }
}
