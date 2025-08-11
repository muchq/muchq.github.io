import { GameState } from './gameState'

interface LevelConfig {
  level: number
  name: string
  goldTarget: number
  timeLimit?: number
  windSpeed: number
  particleSpawnRate: number
  goldChanceMultiplier: number
  description: string
}

export class LevelManager {
  public currentLevel: number = 1
  private gameState: GameState
  private levelStartTime: number = Date.now()
  private levelConfigs: LevelConfig[] = [
    {
      level: 1,
      name: 'Solar Wind Introduction',
      goldTarget: 10000000,  // 10 million mg = 10 kg
      windSpeed: 1,
      particleSpawnRate: 5,
      goldChanceMultiplier: 1,
      description: 'Learn to navigate and collect gold particles from the solar wind'
    },
    {
      level: 2,
      name: 'Increased Activity',
      goldTarget: 100000000,  // 100 kg
      windSpeed: 1.5,
      particleSpawnRate: 8,
      goldChanceMultiplier: 1.2,
      description: 'Solar activity increases - more particles but faster speeds'
    },
    {
      level: 3,
      name: 'Solar Storm',
      goldTarget: 500000000,  // 500 kg
      windSpeed: 2,
      particleSpawnRate: 12,
      goldChanceMultiplier: 1.5,
      description: 'Navigate through a solar storm with high particle density'
    },
    {
      level: 4,
      name: 'Precious Metals Rush',
      goldTarget: 2000000000,  // 2 tons
      windSpeed: 2.5,
      particleSpawnRate: 15,
      goldChanceMultiplier: 2,
      description: 'Rare opportunity - increased precious metal concentration'
    },
    {
      level: 5,
      name: 'Coronal Mass Ejection',
      goldTarget: 10000000000,  // 10 tons
      timeLimit: 180,
      windSpeed: 3,
      particleSpawnRate: 20,
      goldChanceMultiplier: 2.5,
      description: 'Survive and collect during a massive coronal mass ejection'
    },
    {
      level: 6,
      name: 'Deep Space Mining',
      goldTarget: 50000000000,  // 50 tons
      windSpeed: 2,
      particleSpawnRate: 25,
      goldChanceMultiplier: 3,
      description: 'Advanced mining operation at Lagrange Point L1'
    },
    {
      level: 7,
      name: 'Magnetic Anomaly',
      goldTarget: 200000000000,  // 200 tons
      windSpeed: 2.5,
      particleSpawnRate: 30,
      goldChanceMultiplier: 3.5,
      description: 'Strange magnetic fields affect particle behavior'
    },
    {
      level: 8,
      name: 'Solar Maximum',
      goldTarget: 1000000000000,  // 1000 tons
      timeLimit: 240,
      windSpeed: 3.5,
      particleSpawnRate: 35,
      goldChanceMultiplier: 4,
      description: 'Peak solar cycle - maximum particle output'
    },
    {
      level: 9,
      name: 'Heliopause Approach',
      goldTarget: 5000000000000,  // 5000 tons
      windSpeed: 4,
      particleSpawnRate: 40,
      goldChanceMultiplier: 4.5,
      description: 'Venture closer to the sun for richer deposits'
    },
    {
      level: 10,
      name: 'Master Collector',
      goldTarget: 50000000000000,  // 50,000 tons
      timeLimit: 300,
      windSpeed: 5,
      particleSpawnRate: 50,
      goldChanceMultiplier: 5,
      description: 'Ultimate challenge - become a master of the Aurum Siphon'
    }
  ]

  constructor(gameState: GameState) {
    this.gameState = gameState
  }

  getCurrentLevelConfig(): LevelConfig {
    return this.levelConfigs[Math.min(this.currentLevel - 1, this.levelConfigs.length - 1)]
  }

  checkLevelComplete(): boolean {
    const config = this.getCurrentLevelConfig()
    
    if (this.gameState.goldCollected >= config.goldTarget) {
      return true
    }
    
    if (config.timeLimit) {
      const elapsed = (Date.now() - this.levelStartTime) / 1000
      if (elapsed >= config.timeLimit) {
        return this.gameState.goldCollected >= config.goldTarget
      }
    }
    
    return false
  }

  nextLevel() {
    if (this.currentLevel < this.levelConfigs.length) {
      this.currentLevel++
    } else {
      this.currentLevel = 1
      this.gameState.score += 10000
    }
    
    this.levelStartTime = Date.now()
    this.gameState.reset()
  }

  resetToLevel(level: number) {
    this.currentLevel = Math.max(1, Math.min(level, this.levelConfigs.length))
    this.levelStartTime = Date.now()
    this.gameState.reset()
  }

  getTimeRemaining(): number | null {
    const config = this.getCurrentLevelConfig()
    if (!config.timeLimit) return null
    
    const elapsed = (Date.now() - this.levelStartTime) / 1000
    return Math.max(0, config.timeLimit - elapsed)
  }

  getLevelProgress(): number {
    const config = this.getCurrentLevelConfig()
    return Math.min(1, this.gameState.goldCollected / config.goldTarget)
  }

  getTotalLevels(): number {
    return this.levelConfigs.length
  }
}