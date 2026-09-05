/* eslint-disable no-console */
// The thoughts client: the games hub's one stream (/games/v2/play), behind
// the NetworkManager surface useThoughtsGame drives. The contract is
// MoonBase's domains/games/apis/games_hub/model/thoughts.smithy (the world)
// and games.smithy (the stream); this file is the client's reading of it.
//
// Wire shape (smithy-cpp ADR-0018 JSON-text mode):
//   - POST /games/v2/session {} -> {playerId, ticket, resumeToken}
//   - new WebSocket(playUrl + "?ticket=...", "smithy.eventstream.v1+json")
//   - frames both ways: {"event": "<member>", "payload": {...}}, and one
//     terminal {"exception": "<shape>", "payload": {"message"}} when the
//     hub refuses the dial (a spent ticket, a second live socket)
//   - up, in the lobby envelope: {"event":"lobby","payload":{"action":
//     {"join":{position,color,shape}}}} — likewise move {position},
//     shape {shape}, leave {}
//   - down: sessionReady and commandRejected bare; the world in the same
//     envelope: {"event":"lobby","payload":{"update":{"worldState":{...}}}}
//     — likewise playerJoined, playerMoved, shapeChanged, playerLeft
//
// This page is unroomed, so its world is the plaza's (MoonBase#1490).
// Every dial mints a fresh identity: thoughts is presence, the hub keeps
// nothing past the socket, and a fresh id per tab is what keeps two tabs
// from contending for one seat. The resume token the mint returns is
// unused here. A closed socket leaves the world on the hub's side, so the
// manual reconnect mints again and joins afresh — the world hears a new
// arrival, not a return. The same holds in reverse: a closed socket drops
// the remembered peers, since nobody else is here off the wire.

import type { GameState } from '@/types/game'
import type { ShapeType } from '@/types/game'
import { HUB_SUBPROTOCOL, hubPlayUrl, mintHubSession } from './hubSession'
import type { LobbyActionName, LobbyUpdate } from './hubStream'
import { PositionThrottle, WorldSync } from './worldSync'
import type { ConnectionStatus, WorldLink } from './worldSync'

export function thoughtsPlayUrl(): string {
  return hubPlayUrl()
}

export type { LobbyUpdate }

// Inbound frames as a discriminated union: the switch narrows each case,
// and a new event is a compile-time hole instead of a silent cast.
export type ThoughtsFrame =
  | { event: 'sessionReady'; payload: { playerId: string; resumed: boolean } }
  | { event: 'lobby'; payload: { update: LobbyUpdate } }
  | { event: 'commandRejected'; payload: { reason: string } }
  | { exception: string; payload: { message?: string } }


const OFFLINE_ERROR = 'Connection failed - Playing offline'
const RECONNECT_DELAY_MS = 100

export class NetworkManager implements WorldLink {
  // True from the join going out until the socket closes: the hub refuses
  // a move or shape before a join, so the render loop's sends gate on
  // this, not on the socket being open.
  isConnected = false
  connectionStatus: ConnectionStatus = 'disconnected'
  connectionError: string | null = null
  onPlayerIdReceived?: (playerId: string) => void
  onConnectionStateChange?: (status: ConnectionStatus, error?: string) => void

  private readonly sync: WorldSync
  private readonly throttle = new PositionThrottle()
  private ws: WebSocket | null = null
  private websocketUrl: string | null = null
  private reconnectTimeout: number | null = null
  // Each dial gets a generation; a socket from an earlier one (retired by
  // reconnect or disconnect, or a mint that resolved late) must not touch
  // the state.
  private dialGeneration = 0

  constructor(gameState: GameState) {
    this.sync = new WorldSync(gameState)
  }

  connect(url: string): void {
    this.websocketUrl = url
    // One live dial at a time: a connect over a live socket retires it,
    // or the old session would stay joined under an id nobody can leave.
    this.retire()
    this.setStatus('connecting')
    void this.dial(url, this.dialGeneration)
  }

  private async dial(url: string, generation: number): Promise<void> {
    let ws: WebSocket
    try {
      const session = await mintHubSession(url)
      if (generation !== this.dialGeneration) return // superseded while minting
      ws = new WebSocket(`${url}?ticket=${encodeURIComponent(session.ticket)}`, HUB_SUBPROTOCOL)
    } catch (error) {
      console.error('🔌 Failed to connect to WebSocket:', error)
      console.log('🎮 Running in single-player mode')
      if (generation !== this.dialGeneration) return
      this.setStatus('failed', OFFLINE_ERROR)
      return
    }
    this.ws = ws

    ws.onopen = () => {
      if (generation !== this.dialGeneration) return
      console.log('🔌 WebSocket connected to', url)
      // Not connected yet: the join waits for sessionReady.
    }

    ws.onmessage = event => {
      if (generation !== this.dialGeneration) return
      try {
        // The one boundary cast: frames are validated by shape of use,
        // not a runtime schema — unknown events fall through the switch.
        this.handleFrame(JSON.parse(event.data as string) as ThoughtsFrame)
      } catch (error) {
        console.error('🔌 bad frame', error)
      }
    }

    ws.onclose = () => {
      if (generation !== this.dialGeneration) return
      console.log('🔌 WebSocket disconnected')
      this.isConnected = false
      this.sync.forgetRemotePlayers()
      // A refusal (exception frame, or the browser's error event) has
      // already said why; the close that follows it must not overwrite
      // that with a plain "offline".
      if (this.connectionStatus !== 'failed') this.setStatus('disconnected')
    }

    ws.onerror = error => {
      if (generation !== this.dialGeneration) return
      console.error('🔌 WebSocket error:', error)
      console.log('🎮 Running in single-player mode')
      this.isConnected = false
      this.setStatus('failed', OFFLINE_ERROR)
    }
  }

  private setStatus(status: ConnectionStatus, error: string | null = null): void {
    this.connectionStatus = status
    this.connectionError = error
    this.onConnectionStateChange?.(status, error ?? undefined)
  }

  // Cancels any pending dial and closes any socket, silently: the retired
  // generation's callbacks no longer speak for the manager.
  private retire(): void {
    this.dialGeneration++
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.ws?.close()
    this.ws = null
    this.isConnected = false
    this.sync.forgetRemotePlayers()
  }

  private sendPlayerJoin(): void {
    const spawn = this.sync.localSpawn()
    if (!spawn) return
    this.sendCommand('join', spawn)
    console.log('📤 Sent player join')
  }

  sendPositionUpdate(position: [number, number, number]): void {
    if (!this.isConnected || !this.throttle.admit(position)) return
    this.sendCommand('move', { position })
  }

  sendShapeUpdate(shape: ShapeType): void {
    if (!this.isConnected) return
    this.sendCommand('shape', { shape })
  }

  sendLeave(): void {
    if (!this.isConnected) return
    this.sendCommand('leave', {})
  }

  private sendCommand(action: LobbyActionName, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event: 'lobby', payload: { action: { [action]: payload } } }))
    }
  }

  private handleFrame(frame: ThoughtsFrame): void {
    if ('exception' in frame) {
      // The hub refused the dial and will close; the reason is the one
      // it gave, and the close must not downgrade it to "offline".
      console.error(`🚫 Refused by the hub: ${frame.exception}`, frame.payload.message)
      this.isConnected = false
      this.setStatus('failed', frame.payload.message ?? frame.exception)
      return
    }
    switch (frame.event) {
      case 'sessionReady':
        this.handleSessionReady(frame.payload.playerId)
        return
      case 'lobby':
        this.sync.apply(frame.payload.update)
        return
      case 'commandRejected':
        console.warn('🚫 Command rejected:', frame.payload.reason)
        return
      default:
        console.warn('Unknown event:', frame)
    }
  }

  private handleSessionReady(playerId: string): void {
    this.sync.rekeyLocal(playerId)
    this.onPlayerIdReceived?.(playerId)

    // Enter the world; from here the render loop's moves are welcome.
    this.sendPlayerJoin()
    this.throttle.reset()
    this.isConnected = true
    this.setStatus('connected')
  }

  disconnect(): void {
    this.retire()
    this.setStatus('disconnected')
  }

  reconnect(): void {
    console.log('🔄 Attempting to reconnect...')
    this.retire()
    this.connectionError = null
    if (this.websocketUrl) {
      const url = this.websocketUrl
      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectTimeout = null
        this.connect(url)
      }, RECONNECT_DELAY_MS)
    }
  }
}
