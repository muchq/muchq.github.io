import { describe, it, expect, vi } from 'vitest'
import { HubWorldLink } from '../hubWorldLink'
import type { HubStream } from '../hubStream'
import { GameState } from '../gameClasses'
import { ShapeType } from '@/types/game'

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
})
