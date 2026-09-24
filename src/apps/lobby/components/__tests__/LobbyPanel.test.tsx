import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LobbyPanel from '../LobbyPanel'
import type { UseLobby } from '@/hooks/useLobby'
import type { HubRoom } from '@/utils/hubStream'
import { fakeVoiceMesh } from '@/test/fakeVoice'

// The panel over a fake hook: what it offers in the plaza and in a room,
// who reads as free or at which table, and which button sends what.

const room = (over: Partial<HubRoom> = {}): HubRoom => ({
  roomId: 'R1',
  players: [
    { playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
    { playerId: 'bob', connected: true, gamesPlayed: 3, gamesWon: 1, totalScore: 0, table: { game: 'castle', gameId: 'G1' } },
    { playerId: 'carol', connected: false, gamesPlayed: 0, gamesWon: 0, totalScore: 0 }
  ],
  games: [
    { gameId: 'G1', game: 'castle', status: 'waiting', playerCount: 1 },
    { gameId: 'G2', game: 'golf', status: 'playing', playerCount: 2 },
    { gameId: 'G3', game: 'golf', status: 'waiting', playerCount: 4 },
    { gameId: 'G4', game: 'golf', status: 'waiting', playerCount: 1 }
  ],
  ...over
})

const lobby = (over: Partial<UseLobby> = {}): UseLobby =>
  ({
    playerId: 'alice',
    connected: true,
    lost: null,
    room: null,
    chat: { messages: [], replayUpTo: 0, rejection: null },
    notice: '',
    roomCode: '',
    setRoomCode: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    sendChat: vi.fn(),
    reconnect: vi.fn(),
    world: {} as UseLobby['world'],
    voice: fakeVoiceMesh() as unknown as UseLobby['voice'],
    castle: { createTable: vi.fn(), joinTable: vi.fn() } as unknown as UseLobby['castle'],
    golf: { createTable: vi.fn(), joinTable: vi.fn() } as unknown as UseLobby['golf'],
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
    expect(players.getByText('free · 0/0 won')).toBeTruthy()
    expect(players.getByText('at castle G1 · 1/3 won')).toBeTruthy()
    expect(players.getByText('away · 0/0 won')).toBeTruthy()
    expect(screen.getByText(/Shed every card first/)).toBeTruthy()
    expect(screen.getByText(/Lowest hand wins/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Join castle G1' }))
    expect(hook.castle.joinTable).toHaveBeenCalledWith('G1')
    expect(screen.getByRole('button', { name: 'In play golf G2' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Full golf G3' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Join golf G4' }))
    expect(hook.golf.joinTable).toHaveBeenCalledWith('G4')

    const openCastle = screen.getByRole('button', { name: 'Open a castle table' })
    const openGolf = screen.getByRole('button', { name: 'Open a golf table' })
    // The same offer for either game: whichever the room plays, the
    // button for it looks the same.
    expect(openGolf.className).toBe(openCastle.className)
    fireEvent.click(openCastle)
    expect(hook.castle.createTable).toHaveBeenCalled()
    fireEvent.click(openGolf)
    expect(hook.golf.createTable).toHaveBeenCalled()
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
    expect(screen.getByRole('button', { name: 'Join golf G4' })).toHaveProperty('disabled', true)
  })

  // The command menu is keyboard-only; the panel is where it is told.
  describe('voice', () => {
    const inRoom = (view: Parameters<typeof fakeVoiceMesh>[0], over: Partial<UseLobby> = {}) => {
      const hook = lobby({ room: room(), voice: fakeVoiceMesh(view) as unknown as UseLobby['voice'], ...over })
      render(<LobbyPanel lobby={hook} />)
      return { hook, voice: within(screen.getByRole('region', { name: 'Voice' })) }
    }

    it('out of voice, offers to join, once the hub is there to join through', () => {
      const { hook, voice } = inRoom({})
      fireEvent.click(voice.getByRole('button', { name: 'Join voice' }))
      expect(hook.voice.join).toHaveBeenCalledTimes(1)
      cleanup()
      expect(inRoom({}, { connected: false }).voice.getByRole('button', { name: 'Join voice' })).toBeDisabled()
    })

    it('in voice: who else is in it, mute, and leave', () => {
      const { hook, voice } = inRoom({ status: 'on', members: ['bob', 'carol'] })
      expect(voice.getByRole('status')).toHaveTextContent('In voice: you, bob, carol')
      fireEvent.click(voice.getByRole('button', { name: 'Mute' }))
      expect(hook.voice.setMuted).toHaveBeenCalledWith(true)
      fireEvent.click(voice.getByRole('button', { name: 'Leave voice' }))
      expect(hook.voice.leave).toHaveBeenCalledTimes(1)
      cleanup()
      fireEvent.click(inRoom({ status: 'on', muted: true }).voice.getByRole('button', { name: 'Unmute' }))
    })

    it('without a microphone, says it is only listening and offers no mute', () => {
      const { voice } = inRoom({ status: 'on', listenOnly: true })
      expect(voice.getByText(/listening only/i)).toBeInTheDocument()
      expect(voice.queryByRole('button', { name: 'Mute' })).toBeNull()
    })

    it('joining keeps focus on the one button, now Leave, and says so politely', () => {
      const off = lobby({ room: room(), voice: fakeVoiceMesh() as unknown as UseLobby['voice'] })
      const { rerender } = render(<LobbyPanel lobby={off} />)
      const button = screen.getByRole('button', { name: 'Join voice' })
      button.focus()
      rerender(<LobbyPanel lobby={{ ...off, voice: fakeVoiceMesh({ status: 'joining' }) as unknown as UseLobby['voice'] }} />)
      expect(document.activeElement).toBe(button)
      expect(button).toHaveAccessibleName('Leave voice')
      expect(screen.getByRole('status')).toHaveTextContent('Joining voice…')
    })

    it('while joining, says so and can still back out', () => {
      const { hook, voice } = inRoom({ status: 'joining' })
      expect(voice.getByText(/joining/i)).toBeInTheDocument()
      fireEvent.click(voice.getByRole('button', { name: 'Leave voice' }))
      expect(hook.voice.leave).toHaveBeenCalledTimes(1)
    })
  })

  it('tells where the commands are, in the plaza and in a room', () => {
    render(<LobbyPanel lobby={lobby()} />)
    expect(screen.getByText('Press Esc, or triple-tap the world, for commands')).toBeTruthy()
    cleanup()
    render(<LobbyPanel lobby={lobby({ room: room() })} />)
    expect(screen.getByText('Press Esc, or triple-tap the world, for commands')).toBeTruthy()
  })
})
