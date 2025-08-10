export interface Player {
  id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  score: number
  goldCollected: number
  isLocal: boolean
}

export class GameState {
  public players: Map<string, Player> = new Map()
  public localPlayerId: string | null = null
  public score: number = 0
  public goldCollected: number = 0
  public platinumCollected: number = 0
  public otherMetalsCollected: number = 0
  public currentLevel: number = 1

  addPlayer(player: Player) {
    this.players.set(player.id, player)
    if (player.isLocal) {
      this.localPlayerId = player.id
    }
  }

  removePlayer(playerId: string) {
    this.players.delete(playerId)
  }

  getLocalPlayer(): Player | undefined {
    if (!this.localPlayerId) return undefined
    return this.players.get(this.localPlayerId)
  }

  updatePlayer(playerId: string, updates: Partial<Player>) {
    const player = this.players.get(playerId)
    if (player) {
      Object.assign(player, updates)
    }
  }

  reset() {
    this.score = 0
    this.goldCollected = 0
    this.platinumCollected = 0
    this.otherMetalsCollected = 0
  }
}