import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PositionThrottle, WorldSync } from '../worldSync'
import { GameState } from '../gameClasses'
import { ShapeType } from '@/types/game'
import { PLANE_GEOMETRY, sphereGeometry } from '../surface'
import { splat } from '@/test/fakeTape'

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
  // A reshape is the one update that moves the local player: the hub
  // placed everyone on the new surface, so its list is the truth for the
  // whole room and the renderer is told what shape to draw.
  it('takes every placement a reshape carries, the local player included', () => {
    const heard: unknown[] = []
    const reshaping = new WorldSync(gameState, geometry => heard.push(geometry))
    reshaping.rekeyLocal('alice')
    reshaping.apply({
      worldState: {
        geometry: PLANE_GEOMETRY,
        players: [{ playerId: 'bob', position: [1, 0, 1], color: [0, 1, 0], shape: ShapeType.CUBE }],
      },
    })
    expect(heard).toEqual([PLANE_GEOMETRY])

    reshaping.apply({
      geometryChanged: {
        geometry: sphereGeometry(53),
        players: [
          { playerId: 'alice', position: [0, 0, -53], color: [0.8, 0.2, 0.6], shape: ShapeType.SPHERE },
          { playerId: 'bob', position: [0, 53, 0], color: [0, 1, 0], shape: ShapeType.CUBE },
        ],
      },
    })
    expect(gameState.getLocalPlayer()?.position).toEqual([0, 0, -53])
    expect(gameState.players.get('bob')?.position).toEqual([0, 53, 0])
    expect(heard).toEqual([PLANE_GEOMETRY, sphereGeometry(53)])
  })

  // deja's tape on the glass: the hub places every splat, and this ring
  // is all the client keeps of it. Seeded tape is aged by the hub's own
  // stamp, so a snapshot in one of these is one the hub sent just now
  // rather than a fixture from a few years ago the ring would drop.
  const onGlass = (seq: number) => splat({ seq, ts: Date.now() / 1000 })

  it('seeds the glass from a snapshot and splats what lands live', () => {
    sync.apply({ worldState: { players: [], tape: [onGlass(1), onGlass(2)] } })
    sync.apply({ tape: splat({ seq: 3 }) })
    expect(gameState.tape.splats.map(s => s.splat.seq)).toEqual([1, 2, 3])
    expect(gameState.tape.splats.map(s => s.live)).toEqual([false, false, true])
  })

  it('holds one splat per seq, however the same event reaches it twice', () => {
    sync.apply({ worldState: { players: [], tape: [onGlass(9), onGlass(10)] } })
    sync.apply({ tape: splat({ seq: 9 }) })
    sync.apply({ tape: splat({ seq: 11 }) })
    expect(gameState.tape.splats.map(s => s.splat.seq)).toEqual([9, 10, 11])
    expect(gameState.tape.splats.map(s => s.live)).toEqual([false, false, true])
  })

  // Both carriers are a full replacement, the tape as much as the player
  // list: a reshape onto a surface with no glass carries no tape, and
  // the wall it had goes with it rather than hanging there forever.
  it('replaces the glass on a snapshot and on a reshape, tape or none', () => {
    sync.apply({ tape: splat({ seq: 1 }) })
    sync.apply({ geometryChanged: { geometry: PLANE_GEOMETRY, players: [], tape: [onGlass(2)] } })
    expect(gameState.tape.splats.map(s => s.splat.seq)).toEqual([2])
    sync.apply({ geometryChanged: { geometry: sphereGeometry(53), players: [] } })
    expect(gameState.tape.splats).toEqual([])
    sync.apply({ tape: splat({ seq: 3 }) })
    sync.apply({ worldState: { players: [] } })
    expect(gameState.tape.splats).toEqual([])
  })

  it('wipes the glass when the world is left', () => {
    sync.apply({ tape: splat({ seq: 1 }) })
    sync.forgetTape()
    expect(gameState.tape.splats).toEqual([])
    // Forgetting the peers is not forgetting the wall: a drop does both,
    // and each says so.
    sync.apply({ tape: splat({ seq: 2 }) })
    sync.forgetRemotePlayers()
    expect(gameState.tape.splats.map(s => s.splat.seq)).toEqual([2])
  })

  it('says nothing about a shape when the snapshot names none', () => {
    const heard: unknown[] = []
    const quiet = new WorldSync(gameState, geometry => heard.push(geometry))
    quiet.apply({ worldState: { players: [] } })
    expect(heard).toEqual([])
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
