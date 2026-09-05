import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PositionThrottle, WorldSync } from '../worldSync'
import { GameState } from '../gameClasses'
import { ShapeType } from '@/types/game'

// The GameState under the hub's lobby updates, the one place both ways
// onto the wire (the thoughts page, the lobby) touch it.

describe('WorldSync', () => {
  let gameState: GameState
  let sync: WorldSync

  beforeEach(() => {
    gameState = new GameState()
    gameState.localPlayerId = 'local-temp'
    gameState.addPlayer('local-temp', [10, 0, -5], [0.8, 0.2, 0.6], ShapeType.SPHERE)
    sync = new WorldSync(gameState)
  })

  it('re-keys the local player under the server id, and again under the same id harmlessly', () => {
    sync.rekeyLocal('alice')
    expect(gameState.localPlayerId).toBe('alice')
    expect(gameState.players.has('local-temp')).toBe(false)
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])
    sync.rekeyLocal('alice')
    expect(gameState.players.size).toBe(1)
    expect(sync.localSpawn()).toEqual({ position: [10, 0, -5], color: [0.8, 0.2, 0.6], shape: 0 })
  })

  it('a snapshot replaces the world: listed players stand, the rest are gone, the local player stays', () => {
    sync.rekeyLocal('alice')
    sync.apply({ playerJoined: { player: { playerId: 'stale', position: [1, 0, 1], color: [1, 1, 1], shape: 0 } } })
    sync.apply({
      worldState: {
        players: [
          { playerId: 'bob', position: [20, 0, 15], color: [0.3, 0.9, 0.4], shape: 1 },
          // The hub never lists the joiner; if it did, a copy must not
          // replace the local player.
          { playerId: 'alice', position: [0, 0, 0], color: [0, 0, 0], shape: 2 }
        ]
      }
    })
    expect([...gameState.players.keys()].sort()).toEqual(['alice', 'bob'])
    expect(gameState.players.get('bob')?.shape).toBe(ShapeType.CUBE)
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])
  })

  it('applies moves, shapes, and departures to everyone but the local player', () => {
    sync.rekeyLocal('alice')
    sync.apply({ playerJoined: { player: { playerId: 'bob', position: [-3, 0, 4], color: [1, 1, 1], shape: 0 } } })
    sync.apply({ playerMoved: { playerId: 'bob', position: [-2, 0, 4] } })
    sync.apply({ playerMoved: { playerId: 'alice', position: [0, 0, 0] } })
    expect(gameState.players.get('bob')?.position).toEqual([-2, 0, 4])
    expect(gameState.getLocalPlayer()?.position).toEqual([10, 0, -5])
    sync.apply({ shapeChanged: { playerId: 'bob', shape: 2 } })
    sync.apply({ shapeChanged: { playerId: 'alice', shape: 2 } })
    expect(gameState.players.get('bob')?.shape).toBe(ShapeType.PYRAMID)
    expect(gameState.getLocalPlayer()?.shape).toBe(ShapeType.SPHERE)
    sync.apply({ playerLeft: { playerId: 'alice' } })
    sync.apply({ playerLeft: { playerId: 'nobody' } })
    sync.apply({ playerLeft: { playerId: 'bob' } })
    expect([...gameState.players.keys()]).toEqual(['alice'])
  })

  it('forgets everyone else off the wire', () => {
    sync.rekeyLocal('alice')
    sync.apply({ playerJoined: { player: { playerId: 'bob', position: [-3, 0, 4], color: [1, 1, 1], shape: 0 } } })
    sync.forgetRemotePlayers()
    expect([...gameState.players.keys()]).toEqual(['alice'])
  })
})

describe('PositionThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => vi.useRealTimers())

  it('admits the first move, then one per interval, and only past the distance', () => {
    const throttle = new PositionThrottle(50, 0.1)
    expect(throttle.admit([0, 0, 0])).toBe(true)
    expect(throttle.admit([5, 0, 5])).toBe(false) // inside the interval
    vi.setSystemTime(1_000_060)
    expect(throttle.admit([0.05, 0, 0])).toBe(false) // too close
    expect(throttle.admit([1, 0, 0])).toBe(true)
    throttle.reset()
    expect(throttle.admit([1, 0, 0])).toBe(true) // a fresh world, a fresh first move
  })
})
