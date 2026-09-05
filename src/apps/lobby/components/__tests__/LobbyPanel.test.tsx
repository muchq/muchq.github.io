import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LobbyPanel from '../LobbyPanel'
import type { UseLobby } from '@/hooks/useLobby'
import type { HubRoom } from '@/utils/hubStream'

// The panel over a fake hook: what it offers in the plaza and in a room,
// who reads as free or at which table, and which button sends what.

const room = (over: Partial<HubRoom> = {}): HubRoom => ({
  roomId: 'R1',
  players: [
    { playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
    { playerId: 'bob', connected: true, gamesPlayed: 1, gamesWon: 0, totalScore: 0, table: { game: 'castle', gameId: 'G1' } },
    { playerId: 'carol', connected: false, gamesPlayed: 0, gamesWon: 0, totalScore: 0 }
  ],
  games: [
    { gameId: 'G1', game: 'castle', status: 'waiting', playerCount: 1 },
    { gameId: 'G2', game: 'golf', status: 'playing', playerCount: 2 },
    { gameId: 'G3', game: 'golf', status: 'waiting', playerCount: 4 }
  ],
  ...over
})

const lobby = (over: Partial<UseLobby> = {}): UseLobby =>
  ({
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
    world: {} as UseLobby['world'],
    castle: { createTable: vi.fn(), joinTable: vi.fn() } as unknown as UseLobby['castle'],
    createGolfTable: vi.fn(),
    openGolfTable: vi.fn(),
    ...over
  }) as UseLobby

describe('LobbyPanel', () => {
  beforeEach(() => cleanup())

  it('in the plaza, offers a room to create or join by code', () => {
    const hook = lobby()
    render(<LobbyPanel lobby={hook} />)
    fireEvent.click(screen.getByRole('button', { name: 'Create a room' }))
    expect(hook.createRoom).toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Room code'), { target: { value: 'R9' } })
    expect(hook.setRoomCode).toHaveBeenCalledWith('R9')
    fireEvent.keyDown(screen.getByLabelText('Room code'), { key: 'Enter' })
    expect(hook.joinRoom).toHaveBeenCalledTimes(1)
  })

  it('in a room, reads presence off each member and offers only open tables', () => {
    const hook = lobby({ room: room() })
    render(<LobbyPanel lobby={hook} />)
    const players = within(screen.getByRole('region', { name: 'Players' }))
    expect(players.getByText('free')).toBeTruthy()
    expect(players.getByText('at castle G1')).toBeTruthy()
    expect(players.getByText('away')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Join castle G1' }))
    expect(hook.castle.joinTable).toHaveBeenCalledWith('G1')
    expect(screen.getByRole('button', { name: 'In play golf G2' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Full golf G3' })).toHaveProperty('disabled', true)

    fireEvent.click(screen.getByRole('button', { name: 'Open a castle table' }))
    expect(hook.castle.createTable).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open a golf table' }))
    expect(hook.createGolfTable).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Leave room' }))
    expect(hook.leaveRoom).toHaveBeenCalled()
  })

  it('a member already at a table is offered no other', () => {
    const seated = room()
    seated.players[0] = { ...seated.players[0], table: { game: 'castle', gameId: 'G1' } }
    render(<LobbyPanel lobby={lobby({ room: seated })} />)
    expect(screen.getByRole('button', { name: 'Open a castle table' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Open a golf table' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Join castle G1' })).toHaveProperty('disabled', true)
  })
})
