import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { GolfNetworkPlugin } from '../golfNetworkPlugin'
import type { NetworkContext } from '@/types/network'

// gameEnded handling: winner is the display string ("alice & bob" on shared
// wins) and winners is the typed list (MoonBase#1187 phase 0). Legacy servers
// omit winners entirely.
describe('GolfNetworkPlugin - gameEnded', () => {
  let plugin: GolfNetworkPlugin
  let mockContext: NetworkContext
  let onGameEnded: Mock<
    (winner: string, finalScores: { playerName: string; score: number }[], winners?: string[]) => void
  >
  let onNotification: Mock<(message: string) => void>

  const finalScores = [
    { playerName: 'alice', score: 5 },
    { playerName: 'bob', score: 5 },
    { playerName: 'carol', score: 12 }
  ]

  beforeEach(() => {
    onGameEnded = vi.fn()
    onNotification = vi.fn()

    mockContext = {
      send: vi.fn(),
      broadcast: vi.fn(),
      getConnectionId: vi.fn(() => 'test-connection'),
      getGameState: vi.fn(() => ({
        playerId: null,
        gameState: null,
        roomState: null,
        gameContext: null,
        isInLobby: true
      })) as NetworkContext['getGameState'],
      updateGameState: vi.fn(),
      isConnected: vi.fn(() => true)
    }

    plugin = new GolfNetworkPlugin({ onGameEnded, onNotification })
  })

  const deliverGameEnded = (message: Record<string, unknown>) => {
    const handler = plugin.getMessageHandlers()['gameEnded']
    handler({ type: 'gameEnded', timestamp: Date.now(), ...message }, mockContext)
  }

  it('passes the winners list through on a shared win', () => {
    deliverGameEnded({
      winner: 'alice & bob',
      winners: ['alice', 'bob'],
      finalScores
    })

    expect(onGameEnded).toHaveBeenCalledWith('alice & bob', finalScores, ['alice', 'bob'])
    expect(onNotification).toHaveBeenCalledWith('Game over! Winner: alice & bob')
  })

  it('passes a single-element winners list through on a solo win', () => {
    deliverGameEnded({
      winner: 'alice',
      winners: ['alice'],
      finalScores
    })

    expect(onGameEnded).toHaveBeenCalledWith('alice', finalScores, ['alice'])
  })

  it('passes undefined winners for a legacy server that omits the field', () => {
    deliverGameEnded({
      winner: 'alice',
      finalScores
    })

    expect(onGameEnded).toHaveBeenCalledWith('alice', finalScores, undefined)
  })

  it('does not invoke the callback without finalScores', () => {
    deliverGameEnded({
      winner: 'alice',
      winners: ['alice']
    })

    expect(onGameEnded).not.toHaveBeenCalled()
  })

  it('falls back to Unknown when the winner is missing', () => {
    deliverGameEnded({ finalScores })

    expect(onGameEnded).toHaveBeenCalledWith('Unknown', finalScores, undefined)
    expect(onNotification).toHaveBeenCalledWith('Game over! Winner: Unknown')
  })
})
