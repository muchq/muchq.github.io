/* eslint-disable no-console */
// The thoughts client: the games hub's Think event-stream wire, behind the
// NetworkManager surface useThoughtsGame drives. The contract is MoonBase's
// domains/games/apis/games_hub/model/thoughts.smithy; this file is the
// client's reading of it.
//
// Wire shape (smithy-cpp ADR-0018 JSON-text mode):
//   - POST /games/v2/session {} -> {playerId, ticket, resumeToken}
//   - new WebSocket(playUrl + "?ticket=...", "smithy.eventstream.v1+json")
//   - frames both ways: {"event": "<member>", "payload": {...}}, and one
//     terminal {"exception": "<shape>", "payload": {"message"}} when the
//     hub refuses the dial (a spent ticket, a second live socket)
//   - up: join {position, color, shape}, move {position}, shape {shape}, leave {}
//   - down: sessionReady, worldState, playerJoined, playerMoved,
//     shapeChanged, playerLeft, commandRejected
//
// Every dial mints a fresh identity: thoughts is presence, the hub keeps
// nothing past the socket, and a fresh id per tab is what keeps two tabs
// from contending for one seat. The resume token the mint returns is
// unused here. A closed socket is a player gone on the hub's side, so the
// manual reconnect mints again and joins afresh — the world hears a new
// arrival, not a return.

import type { GameState, GameStatePlayer } from '@/types/game'
import { ShapeType } from '@/types/game'
import { HUB_SUBPROTOCOL, mintHubSession } from './hubSession'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed'

export function thoughtsPlayUrl(): string {
  return import.meta.env.VITE_THOUGHTS_WEBSOCKET_URL || 'wss://api.muchq.com/games/v2/thoughts/play'
}

// Inbound frames as a discriminated union: the switch narrows each case,
// and a new event is a compile-time hole instead of a silent cast.
export type ThoughtsFrame =
  | { event: 'sessionReady'; payload: { playerId: string; resumed: boolean } }
  | { event: 'worldState'; payload: { players: GameStatePlayer[] } }
  | { event: 'playerJoined'; payload: { player: GameStatePlayer } }
  | { event: 'playerMoved'; payload: { playerId: string; position: [number, number, number] } }
  | { event: 'shapeChanged'; payload: { playerId: string; shape: ShapeType } }
  | { event: 'playerLeft'; payload: { playerId: string } }
  | { event: 'commandRejected'; payload: { reason: string } }
  | { exception: string; payload: { message?: string } }

type ThoughtsCommand = 'join' | 'move' | 'shape' | 'leave'

const OFFLINE_ERROR = 'Connection failed - Playing offline'
const RECONNECT_DELAY_MS = 100

export class NetworkManager {
  // True from the join going out until the socket closes: the hub refuses
  // a move or shape before a join, so the render loop's sends gate on
  // this, not on the socket being open.
  isConnected = false
  connectionStatus: ConnectionStatus = 'disconnected'
  connectionError: string | null = null
  lastSentPosition: [number, number, number] | null = null
  positionUpdateThrottle = 50 // Send updates max every 50ms (20fps)
  lastPositionSent = 0
  onPlayerIdReceived?: (playerId: string) => void
  onConnectionStateChange?: (status: ConnectionStatus, error?: string) => void

  private ws: WebSocket | null = null
  private websocketUrl: string | null = null
  private reconnectTimeout: number | null = null
  // Each dial gets a generation; a socket from an earlier one (retired by
  // reconnect or disconnect, or a mint that resolved late) must not touch
  // the state.
  private dialGeneration = 0

  constructor(private readonly gameState: GameState) {}

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
  }

  private sendPlayerJoin(): void {
    const localPlayer = this.gameState.getLocalPlayer()
    if (!localPlayer) return

    this.sendCommand('join', {
      position: localPlayer.position,
      color: localPlayer.color,
      shape: localPlayer.shape
    })
    console.log('📤 Sent player join')
  }

  sendPositionUpdate(position: [number, number, number]): void {
    if (!this.isConnected) return
    const now = Date.now()

    // Throttle position updates
    if (now - this.lastPositionSent < this.positionUpdateThrottle) {
      return
    }

    // Check if position actually changed significantly
    if (this.lastSentPosition) {
      const dx = position[0] - this.lastSentPosition[0]
      const dz = position[2] - this.lastSentPosition[2]
      const distance = Math.sqrt(dx * dx + dz * dz)

      // Only send if moved more than 0.1 units
      if (distance < 0.1) {
        return
      }
    }

    this.sendCommand('move', { position })
    this.lastSentPosition = [...position]
    this.lastPositionSent = now
  }

  sendShapeUpdate(shape: ShapeType): void {
    if (!this.isConnected) return
    this.sendCommand('shape', { shape })
  }

  sendLeave(): void {
    if (!this.isConnected) return
    this.sendCommand('leave', {})
  }

  private sendCommand(event: ThoughtsCommand, payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload }))
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
      case 'worldState':
        this.handleWorldState(frame.payload.players)
        return
      case 'playerJoined':
        this.addRemotePlayer(frame.payload.player)
        return
      case 'playerLeft':
        this.handlePlayerLeft(frame.payload.playerId)
        return
      case 'playerMoved':
        if (frame.payload.playerId !== this.gameState.localPlayerId) {
          this.gameState.updatePlayer(frame.payload.playerId, frame.payload.position)
        }
        return
      case 'shapeChanged':
        this.handleShapeChanged(frame.payload.playerId, frame.payload.shape)
        return
      case 'commandRejected':
        console.warn('🚫 Command rejected:', frame.payload.reason)
        return
      default:
        console.warn('Unknown event:', frame)
    }
  }

  private handleSessionReady(playerId: string): void {
    const localPlayer = this.gameState.getLocalPlayer()
    const oldLocalPlayerId = this.gameState.localPlayerId

    // Re-key the local player under the server's id.
    this.gameState.localPlayerId = playerId
    console.log(`🎉 Received player ID from server: ${playerId} (replacing ${oldLocalPlayerId})`)
    if (localPlayer && oldLocalPlayerId) {
      this.gameState.players.delete(oldLocalPlayerId)
      this.gameState.addPlayer(playerId, localPlayer.position, localPlayer.color, localPlayer.shape)
    }

    this.onPlayerIdReceived?.(playerId)

    // Enter the world; from here the render loop's moves are welcome.
    this.sendPlayerJoin()
    this.isConnected = true
    this.setStatus('connected')
  }

  // The snapshot is authoritative: everyone it lists is here, and everyone
  // else we remembered has gone — their playerLeft went out while this
  // client was off the wire.
  private handleWorldState(players: GameStatePlayer[]): void {
    const listed = new Set(players.map(player => player.playerId))
    for (const id of [...this.gameState.players.keys()]) {
      if (id !== this.gameState.localPlayerId && !listed.has(id)) {
        this.gameState.removePlayer(id)
      }
    }
    for (const player of players) this.addRemotePlayer(player)
    console.log(`🎮 World state: ${players.length} players`)
  }

  private addRemotePlayer(player: GameStatePlayer): void {
    // The hub never lists the joiner; the guard pins that a copy of
    // ourselves could not replace us if it did.
    if (player.playerId === this.gameState.localPlayerId) return
    this.gameState.addPlayer(player.playerId, player.position, player.color, player.shape ?? ShapeType.SPHERE)
    console.log(`👋 Player ${player.playerId} joined at [${player.position.join(', ')}]`)
  }

  private handlePlayerLeft(playerId: string): void {
    if (playerId === this.gameState.localPlayerId) return
    if (this.gameState.players.get(playerId)) {
      console.log(`👋 Player ${playerId} left the game`)
      this.gameState.removePlayer(playerId)
      console.log(`📊 ${this.gameState.players.size} players remaining`)
    }
  }

  private handleShapeChanged(playerId: string, shape: ShapeType): void {
    if (playerId === this.gameState.localPlayerId) return
    const player = this.gameState.players.get(playerId)
    if (player) {
      player.shape = shape
      const shapeNames = ['Sphere', 'Cube', 'Pyramid']
      console.log(`🔄 Player ${playerId} changed to: ${shapeNames[shape]}`)
    }
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
