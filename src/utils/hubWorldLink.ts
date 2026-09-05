// The lobby's way into the world: the same renderer (useThoughtsGame)
// the thoughts page drives, over the room stream the lobby already holds
// (MoonBase#1490 phase 4). The hub decides which world — the session's
// room's, or the plaza's — so a join names no room; the lobby hook tells
// this link when the session is ready and when the room changed, and
// hands it every lobby update off the stream.
//
// The stream is the hook's, not this link's: a "disconnect" here leaves
// the world and detaches from the renderer, never closes the socket.

import type { GameState, ShapeType } from '@/types/game'
import type { HubStream, LobbyUpdate } from './hubStream'
import type { ConnectionStatus, WorldLink } from './networkSystem'
import { PositionThrottle, WorldSync } from './worldSync'

export class HubWorldLink implements WorldLink {
  // True from the join going out until a leave or a drop: the hub refuses
  // a move before a join, so the render loop's sends gate on this.
  isConnected = false
  onPlayerIdReceived?: (playerId: string) => void
  onConnectionStateChange?: (status: ConnectionStatus, error?: string) => void

  private sync: WorldSync | null = null
  private playerId: string | null = null
  private readonly throttle = new PositionThrottle()

  constructor(
    private readonly stream: () => HubStream | null,
    private readonly redial: () => void
  ) {}

  // The renderer mounted with its GameState (the local player already
  // spawned in it); if the session is ready, that is the join.
  attach(gameState: GameState): this {
    this.sync = new WorldSync(gameState)
    this.enter()
    return this
  }

  // --- from the lobby hook, off the stream ---

  sessionReady(playerId: string): void {
    this.playerId = playerId
    this.onPlayerIdReceived?.(playerId)
    this.enter()
  }

  // A room change: the hub has already left the old world; join the new.
  rejoin(): void {
    this.isConnected = false
    this.enter()
  }

  apply(update: LobbyUpdate): void {
    this.sync?.apply(update)
  }

  // The socket dropped: nobody else is here until it is back.
  dropped(): void {
    this.isConnected = false
    this.sync?.forgetRemotePlayers()
    this.onConnectionStateChange?.('disconnected')
  }

  // --- WorldLink, for the renderer ---

  sendPositionUpdate(position: [number, number, number]): void {
    if (!this.isConnected || !this.throttle.admit(position)) return
    this.stream()?.lobby('move', { position })
  }

  sendShapeUpdate(shape: ShapeType): void {
    if (this.isConnected) this.stream()?.lobby('shape', { shape })
  }

  sendLeave(): void {
    if (!this.isConnected) return
    this.stream()?.lobby('leave', {})
    this.isConnected = false
  }

  disconnect(): void {
    this.sendLeave()
    this.sync = null
    this.onConnectionStateChange?.('disconnected')
  }

  reconnect(): void {
    this.redial()
  }

  private enter(): void {
    if (this.sync === null || this.playerId === null) return
    this.sync.rekeyLocal(this.playerId)
    const spawn = this.sync.localSpawn()
    if (!spawn) return
    this.stream()?.lobby('join', spawn)
    this.throttle.reset()
    this.isConnected = true
    this.onConnectionStateChange?.('connected')
  }
}
