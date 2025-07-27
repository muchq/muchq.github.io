import { describe, it, expect } from 'vitest'
import { Player, GameState, GAME_CONFIG } from '../gameClasses'
import { ShapeType } from '@/types/game'

describe('gameClasses', () => {
  describe('Player', () => {
    it('creates player with default values', () => {
      const player = new Player('test-id')
      
      expect(player.id).toBe('test-id')
      expect(player.position).toEqual([0, 0, 0])
      expect(player.shape).toBe(ShapeType.SPHERE)
      expect(player.lastBounceTime).toBe(0)
    })

    it('creates player with custom values', () => {
      const position: [number, number, number] = [10, 5, -3]
      const color: [number, number, number] = [0.8, 0.2, 0.5]
      const player = new Player('custom-id', position, color, ShapeType.CUBE)
      
      expect(player.id).toBe('custom-id')
      expect(player.position).toEqual(position)
      expect(player.color).toEqual(color)
      expect(player.shape).toBe(ShapeType.CUBE)
    })

    it('updates position correctly', () => {
      const player = new Player('test-id')
      const newPosition: [number, number, number] = [5, 0, 10]
      
      player.updatePosition(newPosition)
      
      expect(player.position).toEqual(newPosition)
    })

    it('calculates bouncing Y position', () => {
      const player = new Player('test-id')
      const time = 1000 // 1 second
      
      const bouncingY = player.getBouncingY(time)
      
      expect(bouncingY).toBeGreaterThanOrEqual(GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius)
      expect(bouncingY).toBeLessThanOrEqual(GAME_CONFIG.groundLevel + GAME_CONFIG.sphereRadius + GAME_CONFIG.bounceHeight)
    })
  })

  describe('GameState', () => {
    it('initializes with empty state', () => {
      const gameState = new GameState()
      
      expect(gameState.players.size).toBe(0)
      expect(gameState.localPlayerId).toBeNull()
      expect(gameState.camera.angle).toBe(0)
      expect(gameState.camera.distance).toBe(7)
      expect(gameState.camera.height).toBe(4)
    })

    it('adds and retrieves players', () => {
      const gameState = new GameState()
      const position: [number, number, number] = [1, 2, 3]
      const color: [number, number, number] = [0.5, 0.6, 0.7]
      
      const player = gameState.addPlayer('test-id', position, color, ShapeType.PYRAMID)
      
      expect(gameState.players.size).toBe(1)
      expect(player.id).toBe('test-id')
      expect(player.position).toEqual(position)
      expect(player.color).toEqual(color)
      expect(player.shape).toBe(ShapeType.PYRAMID)
    })

    it('removes players', () => {
      const gameState = new GameState()
      gameState.addPlayer('test-id', [0, 0, 0], [1, 1, 1])
      
      expect(gameState.players.size).toBe(1)
      
      gameState.removePlayer('test-id')
      
      expect(gameState.players.size).toBe(0)
    })

    it('updates player positions', () => {
      const gameState = new GameState()
      gameState.addPlayer('test-id', [0, 0, 0], [1, 1, 1])
      
      const newPosition: [number, number, number] = [10, 20, 30]
      gameState.updatePlayer('test-id', newPosition)
      
      const player = gameState.players.get('test-id')
      expect(player?.position).toEqual(newPosition)
    })

    it('manages local player', () => {
      const gameState = new GameState()
      gameState.localPlayerId = 'local-player'
      gameState.addPlayer('local-player', [0, 0, 0], [1, 1, 1])
      gameState.addPlayer('other-player', [5, 5, 5], [0.5, 0.5, 0.5])
      
      const localPlayer = gameState.getLocalPlayer()
      const allPlayers = gameState.getAllPlayers()
      
      expect(localPlayer?.id).toBe('local-player')
      expect(allPlayers).toHaveLength(2)
    })
  })
})