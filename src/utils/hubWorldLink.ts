// The lobby's way into the world: the same renderer (useThoughtsGame)
// the thoughts page drives, over the room stream the lobby already holds
// (MoonBase#1490 phase 4). The hub decides which world — the session's
// room's, or the plaza's — so a join names no room; the lobby hook says
// when the session is ready, when it has settled in a world, and when
// the socket dropped, and hands this link every lobby update.
//
// The stream is the hook's, not this link's: a "disconnect" here leaves
// the world and detaches from the renderer, never closes the socket.

import type { GameState, ShapeType } from '@/types/game'
import type { HubStream, LobbyUpdate } from './hubStream'
import type { ConnectionStatus, WorldLink } from './worldSync'
import { PositionThrottle, WorldSync } from './worldSync'
import { PLANE_GEOMETRY, surfaceFor, type Geometry } from './surface'

export class HubWorldLink implements WorldLink {
  // True from the join going out until a leave or a drop: the hub refuses
  // a move before a join, so the render loop's sends gate on this.
  isConnected = false
  onPlayerIdReceived?: (playerId: string) => void
  onConnectionStateChange?: (status: ConnectionStatus, error?: string) => void

  onGeometryChange?: (geometry: Geometry) => void
  private sync: WorldSync | null = null
  // The room's surface as the hub last named it, so a join spawns on it
  // rather than wherever the renderer's plane happened to put us.
  private geometry: Geometry = PLANE_GEOMETRY
  private playerId: string | null = null
  // The hook has this session in a world: the join goes out now, or as
  // soon as the renderer attaches.
  private due = false
  private readonly throttle = new PositionThrottle()

  constructor(
    private readonly stream: () => HubStream | null,
    private readonly redial: () => void
  ) {}

  // The renderer mounted with its GameState, the local player already
  // spawned in it.
  attach(gameState: GameState): this {
    this.sync = new WorldSync(gameState, geometry => {
      this.geometry = geometry
      this.onGeometryChange?.(geometry)
    })
    if (this.due) this.enter()
    return this
  }

  // --- from the lobby hook, off the stream ---

  // The room's shape, from its roomState: it arrives before the world
  // is joined, which is when the spawn has to be legal.
  roomGeometry(geometry: Geometry): void {
    this.geometry = geometry
    this.onGeometryChange?.(geometry)
  }

  sessionReady(playerId: string): void {
    this.playerId = playerId
    this.onPlayerIdReceived?.(playerId)
  }

  // The session settled in a world — its room's, or the plaza's — and
  // the hub has left whichever it stood in before.
  join(): void {
    this.isConnected = false
    this.due = true
    this.sync?.forgetTape()
    this.enter()
  }

  apply(update: LobbyUpdate): void {
    this.sync?.apply(update)
  }

  // The socket dropped: nobody else is here, and the next session is a
  // new one — its sessionReady names the id, its hook the world.
  dropped(): void {
    this.isConnected = false
    this.due = false
    this.playerId = null
    this.sync?.forgetRemotePlayers()
    this.sync?.forgetTape()
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

  sendSetGeometry(geometry: Geometry): void {
    if (this.isConnected) this.stream()?.lobby('setGeometry', { geometry })
  }

  sendLeave(): void {
    if (!this.isConnected) return
    this.stream()?.lobby('leave', {})
    this.isConnected = false
  }

  disconnect(): void {
    this.sendLeave()
    this.sync?.forgetTape()
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
    const settled = surfaceFor(this.geometry).settle(spawn.position)
    this.stream()?.lobby('join', { ...spawn, position: settled })
    this.throttle.reset()
    this.isConnected = true
    this.onConnectionStateChange?.('connected')
  }
}
