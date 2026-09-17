import { describe, it, expect, vi } from 'vitest'
import { HubWorldLink } from '../hubWorldLink'
import type { HubStream } from '../hubStream'
import { GameState } from '../gameClasses'
import { ShapeType } from '@/types/game'
import { PLANE_GEOMETRY, SPHERE_RADIUS, sphereGeometry } from '../surface'
import { splat } from '@/test/fakeTape'

// The link joins only when the hook says the session stands in a world,
// and never on a renderer remount under an id the drop retired.

const setup = () => {
  const lobby = vi.fn()
  const stream = { lobby } as unknown as HubStream
  const link = new HubWorldLink(() => stream, vi.fn())
  const world = () => {
    const gameState = new GameState()
    gameState.localPlayerId = 'tmp'
    gameState.addPlayer('tmp', [1, 0, 1], [1, 1, 1], ShapeType.SPHERE)
    return gameState
  }
  return { link, lobby, world }
}

describe('HubWorldLink', () => {
  it('joins once the hook says so, in either order with the renderer', () => {
    const a = setup()
    a.link.attach(a.world())
    a.link.sessionReady('alice')
    expect(a.lobby).not.toHaveBeenCalled()
    a.link.join()
    expect(a.lobby).toHaveBeenCalledTimes(1)
    expect(a.link.isConnected).toBe(true)

    const b = setup()
    b.link.sessionReady('alice')
    b.link.join()
    expect(b.lobby).not.toHaveBeenCalled()
    b.link.attach(b.world())
    expect(b.lobby).toHaveBeenCalledTimes(1)
  })

  it('after a drop, a remount joins nothing until the next session and the hook agree', () => {
    const { link, lobby, world } = setup()
    link.sessionReady('alice')
    link.join()
    link.attach(world())
    expect(lobby).toHaveBeenCalledTimes(1)
    link.dropped()
    expect(link.isConnected).toBe(false)
    link.attach(world())
    expect(lobby).toHaveBeenCalledTimes(1)
    link.sessionReady('alice')
    expect(lobby).toHaveBeenCalledTimes(1)
    link.join()
    expect(lobby).toHaveBeenCalledTimes(2)
  })
  // The room's surface reaches the link before its world is joined, and
  // a spawn the renderer picked on a plane is no point of a sphere: the
  // hub would refuse the join, so the link lands it on the wall first.
  it('spawns on the room surface the hub named', () => {
    const { link, lobby, world } = setup()
    link.roomGeometry(sphereGeometry(SPHERE_RADIUS))
    link.attach(world())
    link.sessionReady('alice')
    link.join()
    const [action, payload] = lobby.mock.calls[0] as [string, { position: number[] }]
    expect(action).toBe('join')
    expect(Math.hypot(...payload.position)).toBeCloseTo(SPHERE_RADIUS, 9)
  })

  it('leaves a plane spawn where the renderer put it', () => {
    const { link, lobby, world } = setup()
    link.roomGeometry(PLANE_GEOMETRY)
    link.attach(world())
    link.sessionReady('alice')
    link.join()
    expect(lobby.mock.calls[0][1]).toMatchObject({ position: [1, 0, 1] })
  })

  it('asks for a reshape only while it is in the world, and reports every one it hears', () => {
    const { link, lobby, world } = setup()
    const heard: unknown[] = []
    link.onGeometryChange = geometry => heard.push(geometry)
    link.sendSetGeometry(sphereGeometry(SPHERE_RADIUS))
    expect(lobby).not.toHaveBeenCalled()
    link.attach(world())
    link.sessionReady('alice')
    link.join()
    link.sendSetGeometry(sphereGeometry(SPHERE_RADIUS))
    expect(lobby).toHaveBeenLastCalledWith('setGeometry', { geometry: sphereGeometry(SPHERE_RADIUS) })
    // The hub's own word, whoever asked for it, and the room's before that.
    link.roomGeometry(PLANE_GEOMETRY)
    link.apply({ geometryChanged: { geometry: sphereGeometry(SPHERE_RADIUS), players: [] } })
    expect(heard).toEqual([PLANE_GEOMETRY, sphereGeometry(SPHERE_RADIUS)])
  })

  // The glass belongs to the world that was standing: a drop, a leave,
  // or a step into another world starts it empty, and the next world's
  // snapshot fills it.
  it('wipes the glass on the way out of a world, and on the way into the next', () => {
    const { link, world } = setup()
    const gameState = world()
    link.attach(gameState)
    link.sessionReady('alice')
    link.join()
    link.apply({ tape: splat({ seq: 1 }) })
    expect(gameState.tape.splats).toHaveLength(1)
    link.dropped()
    expect(gameState.tape.splats).toEqual([])

    link.attach(gameState)
    link.sessionReady('alice')
    link.join()
    link.apply({ tape: splat({ seq: 2 }) })
    link.join()
    expect(gameState.tape.splats).toEqual([])

    link.apply({ tape: splat({ seq: 3 }) })
    expect(gameState.tape.splats).toHaveLength(1)
    link.disconnect()
    expect(gameState.tape.splats).toEqual([])
  })
})
