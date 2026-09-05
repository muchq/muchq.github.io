// The world as the renderer reads it, kept in step with the hub's lobby
// updates (thoughts.smithy): the one place a snapshot, an arrival, a
// move, a shape change, or a departure touches the GameState. Both ways
// onto the wire share it — the thoughts page's own socket
// (NetworkManager) and the lobby's room stream (HubWorldLink).

import type { GameState, GameStatePlayer } from '@/types/game'
import { ShapeType } from '@/types/game'
import type { LobbyUpdate } from './hubStream'

export interface WorldSpawn {
  position: [number, number, number]
  color: [number, number, number]
  shape: ShapeType
}

export class WorldSync {
  constructor(private readonly gameState: GameState) {}

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
      const dx = position[0] - this.last[0]
      const dz = position[2] - this.last[2]
      if (Math.sqrt(dx * dx + dz * dz) < this.minDistance) return false
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
