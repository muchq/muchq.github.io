// The world as the renderer reads it, kept in step with the hub's lobby
// updates (thoughts.smithy): the one place a snapshot, an arrival, a
// move, a shape change, or a departure touches the GameState. The
// lobby's room stream (HubWorldLink) drives it.

import type { GameState, GameStatePlayer } from '@/types/game'
import { ShapeType } from '@/types/game'
import type { LobbyUpdate } from './hubStream'
import type { TapeSplat } from './tapeSplats'
import type { Geometry } from './surface'

export interface WorldSpawn {
  position: [number, number, number]
  color: [number, number, number]
  shape: ShapeType
}

export class WorldSync {
  // `onGeometry` is how the renderer hears what shape the world is: on
  // the snapshot a join answers, and again whenever a member reshapes
  // the room. It fires after the positions it came with have landed.
  constructor(
    private readonly gameState: GameState,
    private readonly onGeometry?: (geometry: Geometry) => void
  ) {}

  // The local player under the server's id: the renderer spawned them
  // under a temporary one before the wire answered.
  rekeyLocal(playerId: string): void {
    const localPlayer = this.gameState.getLocalPlayer()
    const oldLocalPlayerId = this.gameState.localPlayerId
    this.gameState.localPlayerId = playerId
    if (localPlayer && oldLocalPlayerId && oldLocalPlayerId !== playerId) {
      this.gameState.players.delete(oldLocalPlayerId)
      this.gameState.addPlayer(playerId, localPlayer.position, localPlayer.color, localPlayer.shape)
    }
  }

  // What a join sends: where the local player stands, as what.
  localSpawn(): WorldSpawn | null {
    const localPlayer = this.gameState.getLocalPlayer()
    if (!localPlayer) return null
    return { position: localPlayer.position, color: localPlayer.color, shape: localPlayer.shape }
  }

  apply(update: LobbyUpdate): void {
    if ('worldState' in update) {
      this.replaceWorld(update.worldState.players)
      this.replaceTape(update.worldState.tape)
      if (update.worldState.geometry) this.onGeometry?.(update.worldState.geometry)
    } else if ('tape' in update) {
      // One deja event, landing now: the hub picked the wall and the
      // point from its seq, so every client in the room draws it on the
      // same square inch.
      this.gameState.tape.add(update.tape)
    } else if ('geometryChanged' in update) {
      // The room changed shape under everyone: the hub placed every
      // player, the local one included, so its list replaces what we
      // hold rather than skipping ourselves the way a move does.
      for (const player of update.geometryChanged.players) {
        this.gameState.updatePlayer(player.playerId, player.position)
      }
      // A room that becomes a glasshouse gets its walls filled for the
      // people already standing in it, not only for whoever joins next.
      this.replaceTape(update.geometryChanged.tape)
      this.onGeometry?.(update.geometryChanged.geometry)
    } else if ('playerJoined' in update) {
      this.addRemotePlayer(update.playerJoined.player)
    } else if ('playerLeft' in update) {
      this.removeRemotePlayer(update.playerLeft.playerId)
    } else if ('playerMoved' in update) {
      if (update.playerMoved.playerId !== this.gameState.localPlayerId) {
        this.gameState.updatePlayer(update.playerMoved.playerId, update.playerMoved.position)
      }
    } else if ('shapeChanged' in update) {
      this.changeShape(update.shapeChanged.playerId, update.shapeChanged.shape)
    }
  }

  // Off the wire, nobody else is here: the peers we remember would
  // otherwise stand frozen until a snapshot that may never come.
  forgetRemotePlayers(): void {
    for (const id of [...this.gameState.players.keys()]) {
      if (id !== this.gameState.localPlayerId) this.gameState.removePlayer(id)
    }
  }

  // The glass belongs to the world that was standing: off the wire, or
  // on the way into another world, it starts empty rather than showing
  // the last room's tape until a snapshot replaces it.
  forgetTape(): void {
    this.gameState.tape.clear()
  }

  // A snapshot and a reshape both replace the world entire, the glass
  // with the players: a reshape onto a surface with no glass carries no
  // tape, and the wall it had goes with it rather than hanging there
  // over a room that has none.
  private replaceTape(tape?: TapeSplat[]): void {
    this.gameState.tape.clear()
    if (tape) this.gameState.tape.seed(tape)
  }

  // The snapshot is authoritative: everyone it lists is here, and everyone
  // else we remembered has gone — their playerLeft went out while this
  // client was off the wire, or in another world.
  private replaceWorld(players: GameStatePlayer[]): void {
    const listed = new Set(players.map(player => player.playerId))
    for (const id of [...this.gameState.players.keys()]) {
      if (id !== this.gameState.localPlayerId && !listed.has(id)) {
        this.gameState.removePlayer(id)
      }
    }
    for (const player of players) this.addRemotePlayer(player)
  }

  private addRemotePlayer(player: GameStatePlayer): void {
    // The hub never lists the joiner; the guard pins that a copy of
    // ourselves could not replace us if it did.
    if (player.playerId === this.gameState.localPlayerId) return
    this.gameState.addPlayer(player.playerId, player.position, player.color, player.shape ?? ShapeType.SPHERE)
  }

  private removeRemotePlayer(playerId: string): void {
    if (playerId === this.gameState.localPlayerId) return
    if (this.gameState.players.get(playerId)) this.gameState.removePlayer(playerId)
  }

  private changeShape(playerId: string, shape: number): void {
    if (playerId === this.gameState.localPlayerId) return
    const player = this.gameState.players.get(playerId)
    if (player) player.shape = shape as ShapeType
  }
}

// Moves go out at most every `intervalMs` and only once the player has
// moved `minDistance`: the render loop asks every frame.
export class PositionThrottle {
  private last: [number, number, number] | null = null
  private lastAt = 0

  constructor(
    private readonly intervalMs = 50,
    private readonly minDistance = 0.1
  ) {}

  admit(position: [number, number, number]): boolean {
    const now = Date.now()
    if (now - this.lastAt < this.intervalMs) return false
    if (this.last) {
      // All three axes: on a sphere most of a step can be in y.
      const moved = Math.hypot(
        position[0] - this.last[0],
        position[1] - this.last[1],
        position[2] - this.last[2]
      )
      if (moved < this.minDistance) return false
    }
    this.last = [...position]
    this.lastAt = now
    return true
  }

  reset(): void {
    this.last = null
    this.lastAt = 0
  }
}

// What the world renderer (useThoughtsGame) drives: a link to the world
// that says whether moves are welcome, ships them, and can be dropped.
// HubWorldLink is the one production uses, on the lobby's room stream.
export interface WorldLink {
  readonly isConnected: boolean
  onGeometryChange?: (geometry: Geometry) => void
  sendPositionUpdate(position: [number, number, number]): void
  sendShapeUpdate(shape: ShapeType): void
  // Asks the hub to reshape the room for everyone in it; the answer
  // comes back through onGeometryChange, the same as a stranger's.
  sendSetGeometry(geometry: Geometry): void
  sendLeave(): void
  disconnect(): void
}
