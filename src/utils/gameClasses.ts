import type { Player as IPlayer, GameState as IGameState, GameConfig, Camera } from '@/types/game'
import { ShapeType } from '@/types/game'

// Game Configuration
export const GAME_CONFIG: GameConfig = {
  moveSpeed: 0.20,
  worldBoundary: 50,
  rotateSpeed: 0.05,
  zoomSpeed: 0.2,
  bounceHeight: 1.0,
  bounceSpeed: 5.6,
  sphereRadius: 1.0,
  groundLevel: -2.0
}

// Player Implementation
export class Player implements IPlayer {
  id: string
  position: [number, number, number]
  color: [number, number, number]
  shape: ShapeType
  lastBounceTime: number

  constructor(id: string, position: [number, number, number] = [0, 0, 0], color: [number, number, number] = [1.0, 0.5, 0.2], shape: ShapeType = ShapeType.SPHERE) {
    this.id = id
    this.position = [...position]
    this.color = [...color]
    this.shape = shape
    this.lastBounceTime = 0
  }

  updatePosition(newPosition: [number, number, number]): void {
    this.position = [...newPosition]
  }

  getBouncingY(time: number): number {
    const cycle = (time * 0.001 * GAME_CONFIG.bounceSpeed) % (2 * Math.PI)
    const normalizedTime = cycle / (2 * Math.PI)
    const bounceY = 4 * GAME_CONFIG.bounceHeight * normalizedTime * (1 - normalizedTime)
    return (GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius) + bounceY
  }
}

// Game State Management
export class GameState implements IGameState {
  players: Map<string, Player>
  localPlayerId: string | null
  camera: Camera

  constructor() {
    this.players = new Map()
    this.localPlayerId = null
    this.camera = {
      angle: 0,
      distance: 7,
      height: 4
    }
  }

  addPlayer(id: string, position: [number, number, number], color: [number, number, number], shape: ShapeType = ShapeType.SPHERE): Player {
    const player = new Player(id, position, color, shape)
    this.players.set(id, player)
    return player
  }

  removePlayer(id: string): void {
    this.players.delete(id)
  }

  updatePlayer(id: string, position: [number, number, number]): void {
    const player = this.players.get(id)
    if (player) {
      player.updatePosition(position)
    }
  }

  getLocalPlayer(): Player | undefined {
    if (!this.localPlayerId) return undefined
    return this.players.get(this.localPlayerId)
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values())
  }
}