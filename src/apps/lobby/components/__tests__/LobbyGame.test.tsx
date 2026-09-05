import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UseLobby } from '@/hooks/useLobby'
import type { CastleView } from '@/apps/castle/wire'

// The panel's folding: open beside the world, away while a table is up,
// back when the table goes, and always a toggle away.

const state = {
  playerId: 'alice',
  connected: true,
  lost: null,
  room: null,
  chat: { messages: [], available: false, replayUpTo: 0, rejection: null },
  notice: '',
  roomCode: '',
  setRoomCode: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  sendChat: vi.fn(),
  reconnect: vi.fn(),
  world: {},
  castle: { view: null as CastleView | null, ended: null, selected: [] },
  createGolfTable: vi.fn(),
  openGolfTable: vi.fn()
} as unknown as UseLobby

vi.mock('@/hooks/useLobby', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useLobby')>()),
  useLobby: () => state
}))
vi.mock('@/apps/thoughts/components/ThoughtsGame', () => ({ default: () => <div>world</div> }))
vi.mock('@/apps/castle/components/CastleTable', () => ({ default: () => <div>table</div> }))

import LobbyGame from '../LobbyGame'

const view = { gameId: 'G1', phase: 'waiting', players: [], drawPileCount: 0, pileCount: 0, run: [], finished: [] } as unknown as CastleView

describe('LobbyGame', () => {
  beforeEach(() => {
    cleanup()
    state.castle.view = null
  })

  it('folds the panel while a table is up and unfolds it when the table goes', () => {
    const { rerender } = render(<LobbyGame />)
    expect(screen.getByRole('complementary', { name: 'lobby' })).toBeTruthy()

    state.castle.view = view
    rerender(<LobbyGame />)
    expect(screen.getByText('table')).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: 'lobby' })).toBeNull()

    state.castle.view = null
    rerender(<LobbyGame />)
    expect(screen.queryByText('table')).toBeNull()
    expect(screen.getByRole('complementary', { name: 'lobby' })).toBeTruthy()

    // Over a table it is still a toggle away.
    state.castle.view = view
    rerender(<LobbyGame />)
    expect(screen.queryByRole('complementary', { name: 'lobby' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Lobby' }))
    expect(screen.getByRole('complementary', { name: 'lobby' })).toBeTruthy()
  })
})
