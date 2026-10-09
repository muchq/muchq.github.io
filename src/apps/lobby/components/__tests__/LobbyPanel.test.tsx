import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LobbyPanel from '../LobbyPanel'
import type { UseLobby } from '@/hooks/useLobby'
import type { HubRoom } from '@/utils/hubStream'
import { fakeVoiceMesh } from '@/test/fakeVoice'
import type { ChessGameSummary, ChessHistory } from '@/apps/chess/wire'
import { hubChessFeedUrl, hubPlayUrl } from '@/utils/hubSession'

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
    { gameId: 'G4', game: 'golf', status: 'waiting', playerCount: 1 },
    { gameId: 'M1', game: 'rummy', status: 'waiting', playerCount: 2 }
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
    rummy: { createTable: vi.fn(), joinTable: vi.fn() } as unknown as UseLobby['rummy'],
    chess: { createTable: vi.fn(), joinTable: vi.fn(), watchTable: vi.fn(), history: null } as unknown as UseLobby['chess'],
    ...over
  }) as UseLobby

const game = (over: Partial<ChessGameSummary> = {}): ChessGameSummary => ({
  archiveId: 9,
  gameId: 'K1',
  ordinal: 2,
  white: 'alice',
  black: 'stockfish@1600',
  result: { ending: 'checkmate', winner: 'alice', winnerColor: 'white' },
  setupId: 'standard',
  setupName: 'Standard starting position',
  plies: 41,
  endedAtMs: 1_800_000_000_000,
  published: false,
  ...over
})

const chess = (history: ChessHistory | null) =>
  ({
    createTable: vi.fn(),
    joinTable: vi.fn(),
    watchTable: vi.fn(),
    history,
    loadHistory: vi.fn(),
    reviewArchived: vi.fn(),
    publish: vi.fn()
  }) as unknown as UseLobby['chess']

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

  it('a rummy table between deals reads as that, not as its wire status', () => {
    render(<LobbyPanel lobby={lobby({ room: room({ games: [{ gameId: 'M2', game: 'rummy', status: 'choosing', playerCount: 3 }] }) })} />)
    expect(screen.getByText('rummy M2 · 3/4 · between deals')).toBeTruthy()
  })

  it('in a room, reads presence off each member and offers only open tables', () => {
    const hook = lobby({ room: room() })
    render(<LobbyPanel lobby={hook} />)
    const players = within(screen.getByRole('region', { name: 'Players' }))
    expect(players.getByText('free · 0/0 won')).toBeTruthy()
    expect(players.getByText('at castle G1 · 1/3 won')).toBeTruthy()
    expect(players.getByText('away · 0/0 won')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Join castle G1' }))
    expect(hook.castle.joinTable).toHaveBeenCalledWith('G1')
    expect(screen.getByRole('button', { name: 'In play golf G2' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Full golf G3' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Join golf G4' }))
    expect(hook.golf.joinTable).toHaveBeenCalledWith('G4')
    fireEvent.click(screen.getByRole('button', { name: 'Join rummy M1' }))
    expect(hook.rummy.joinTable).toHaveBeenCalledWith('M1')
    expect(hook.castle.joinTable).toHaveBeenCalledTimes(1)
    expect(hook.golf.joinTable).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Leave room' }))
    expect(hook.leaveRoom).toHaveBeenCalled()
  })

  // Chess seats two, where every other game seats four.
  it('a chess table reads its own seats and is full at two', () => {
    const hook = lobby({
      room: room({
        games: [
          { gameId: 'K1', game: 'chess', status: 'waiting', playerCount: 1 },
          { gameId: 'K2', game: 'chess', status: 'waiting', playerCount: 2 }
        ]
      })
    })
    render(<LobbyPanel lobby={hook} />)
    expect(screen.getByText('chess K1 · 1/2 · waiting')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Full chess K2' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Join chess K1' }))
    expect(hook.chess.joinTable).toHaveBeenCalledWith('K1')
  })

  // A challenge (MoonBase#1633) lists its terms, and joining accepts them.
  it('lists a challenge’s terms, and offers to accept it', () => {
    const hook = lobby({
      room: room({ games: [{ gameId: 'K1', game: 'chess', status: 'waiting', playerCount: 1, terms: 'Standard starting position · 3+2' }] })
    })
    render(<LobbyPanel lobby={hook} />)
    expect(screen.getByText('chess K1 · 1/2 · waiting · Standard starting position · 3+2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Accept chess K1' }))
    expect(hook.chess.joinTable).toHaveBeenCalledWith('K1')
  })

  // Any chess table can be watched by a member at none (MoonBase#1633);
  // no other game's can.
  it('offers to watch every chess table, and only chess tables', () => {
    const hook = lobby({
      room: room({
        games: [
          { gameId: 'K1', game: 'chess', status: 'playing', playerCount: 2 },
          { gameId: 'K2', game: 'chess', status: 'waiting', playerCount: 1 },
          { gameId: 'G2', game: 'golf', status: 'playing', playerCount: 2 }
        ]
      })
    })
    render(<LobbyPanel lobby={hook} />)
    expect(screen.getAllByRole('button', { name: /^Watch / }).map(button => button.getAttribute('aria-label'))).toEqual([
      'Watch chess K1',
      'Watch chess K2'
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Watch chess K1' }))
    expect(hook.chess.watchTable).toHaveBeenCalledWith('K1')
  })

  it('a member at a table cannot watch another', () => {
    const hook = lobby({
      playerId: 'bob',
      room: room({ games: [...room().games, { gameId: 'K1', game: 'chess', status: 'playing', playerCount: 2 }] })
    })
    render(<LobbyPanel lobby={hook} />)
    expect(screen.getByRole('button', { name: 'Watch chess K1' })).toHaveProperty('disabled', true)
  })

  // One picker and one button however many games there are: the games
  // grouped by family, and the chosen one described under it.
  it('opens a table of whichever game is picked, and says what that game is', () => {
    const hook = lobby({ room: room() })
    render(<LobbyPanel lobby={hook} />)
    const picker = screen.getByRole('combobox', { name: 'Game' })
    expect(within(picker).getAllByRole('group').map(group => group.getAttribute('label'))).toEqual(['Cards', 'Board'])
    expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual(['Castle', 'Golf', 'Rummy', 'Chess'])
    expect(screen.getAllByRole('button', { name: /^Open a .* table$/ })).toHaveLength(1)

    expect(screen.getByText(/Shed every card first/)).toBeTruthy()
    expect(screen.getByText('2–4 players')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open a castle table' }))
    expect(hook.castle.createTable).toHaveBeenCalledTimes(1)

    for (const [game, blurb] of [
      ['golf', /Lowest hand wins/],
      ['rummy', /First to empty their hand wins/],
      ['chess', /Standard chess and endgame practice positions/]
    ] as const) {
      fireEvent.change(picker, { target: { value: game } })
      expect(screen.getByText(blurb)).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: `Open a ${game} table` }))
      expect(hook[game].createTable).toHaveBeenCalledTimes(1)
    }
    expect(screen.getByText('2 players')).toBeTruthy()
    fireEvent.change(picker, { target: { value: 'rummy' } })
    expect(screen.getByText('2–4 players · 7-card, 10-card or gin, chosen at the table')).toBeTruthy()
    expect(hook.castle.createTable).toHaveBeenCalledTimes(1)
  })

  it('a member already at a table is offered no other', () => {
    const seated = room()
    seated.players[0] = { ...seated.players[0], table: { game: 'castle', gameId: 'G1' } }
    render(<LobbyPanel lobby={lobby({ room: seated })} />)
    expect(screen.getByRole('button', { name: 'Open a castle table' })).toHaveProperty('disabled', true)
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
  // The room's finished chess games (MoonBase#1637): asked for, listed
  // newest first with a review each, and the room's publishing.
  describe('chess games', () => {
    it('asks the hub for them on request', () => {
      const hook = lobby({ room: room(), chess: chess(null) })
      render(<LobbyPanel lobby={hook} />)
      fireEvent.click(screen.getByRole('button', { name: 'Show finished games' }))
      expect(hook.chess.loadHistory).toHaveBeenCalledTimes(1)
    })

    it('lists each game with its sides and result, and reviews one', () => {
      const hook = lobby({
        room: room(),
        chess: chess({ published: false, games: [game(), game({ archiveId: 8, ordinal: 1, result: { ending: 'stalemate' } })] })
      })
      render(<LobbyPanel lobby={hook} />)
      const section = within(screen.getByRole('region', { name: 'Chess games' }))
      expect(section.getByText('alice vs Stockfish 1600 · 1-0 checkmate · 21 moves')).toBeTruthy()
      expect(section.getByText('alice vs Stockfish 1600 · ½-½ stalemate · 21 moves')).toBeTruthy()
      fireEvent.click(section.getByRole('button', { name: 'Review K1 game 2' }))
      expect(hook.chess.reviewArchived).toHaveBeenCalledWith(9)
      fireEvent.click(section.getByRole('button', { name: 'Refresh finished games' }))
      expect(hook.chess.loadHistory).toHaveBeenCalledTimes(1)
    })

    it('says when there are none', () => {
      render(<LobbyPanel lobby={lobby({ room: room(), chess: chess({ published: false, games: [] }) })} />)
      expect(screen.getByText('No finished games yet')).toBeTruthy()
    })

    // What publishing means is said before the click that does it.
    it('says where published games go and that they stay, before and after publishing', () => {
      const hook = lobby({ room: room(), chess: chess({ published: false, games: [] }) })
      const { rerender } = render(<LobbyPanel lobby={hook} />)
      const toggle = screen.getByRole('checkbox', { name: 'Publish this room’s chess games' })
      expect(toggle).not.toBeChecked()
      expect(screen.getByRole('link', { name: 'public chess feed' })).toHaveAttribute('href', hubChessFeedUrl(hubPlayUrl()))
      expect(screen.getByText(/stay there for 30 days, even after this is turned off/)).toBeTruthy()
      fireEvent.click(toggle)
      expect(hook.chess.publish).toHaveBeenCalledWith(true)

      const published = lobby({ room: room(), chess: chess({ published: true, games: [] }) })
      rerender(<LobbyPanel lobby={published} />)
      expect(screen.getByRole('checkbox', { name: 'Publish this room’s chess games' })).toBeChecked()
      expect(screen.getByText(/stay there for 30 days, even after this is turned off/)).toBeTruthy()
      fireEvent.click(screen.getByRole('checkbox', { name: 'Publish this room’s chess games' }))
      expect(published.chess.publish).toHaveBeenCalledWith(false)
    })
  })
})
