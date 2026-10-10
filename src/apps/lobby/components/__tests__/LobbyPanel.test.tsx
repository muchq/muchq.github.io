import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LobbyPanel from '../LobbyPanel'
import type { UseLobby } from '@/hooks/useLobby'
import type { HubRoom } from '@/utils/hubStream'
import { fakeVoiceMesh } from '@/test/fakeVoice'
import type { ChessGameSummary, ChessHistory, ChessPairing, ChessRoundRobin } from '@/apps/chess/wire'
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
    chess: { createTable: vi.fn(), joinTable: vi.fn(), watchTable: vi.fn(), history: null, loadHistory: vi.fn(), roundRobins: [], loadRoundRobins: vi.fn() } as unknown as UseLobby['chess'],
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

const chess = (history: ChessHistory | null, roundRobins: ChessRoundRobin[] | null = []) =>
  ({
    createTable: vi.fn(),
    joinTable: vi.fn(),
    watchTable: vi.fn(),
    history,
    loadHistory: vi.fn(),
    reviewArchived: vi.fn(),
    publish: vi.fn(),
    roundRobins,
    loadRoundRobins: vi.fn(),
    createRoundRobin: vi.fn(),
    playRoundRobin: vi.fn(),
    forfeit: vi.fn(),
    withdraw: vi.fn()
  }) as unknown as UseLobby['chess']

const pairing = (over: Partial<ChessPairing> = {}): ChessPairing => ({ round: 1, white: 'alice', black: 'bob', forfeit: false, voided: false, ...over })

const roundRobin = (over: Partial<ChessRoundRobin> = {}): ChessRoundRobin => ({
  roundRobinId: 'E1',
  creator: 'alice',
  entrants: ['alice', 'bob', 'carol'],
  terms: { setupId: 'standard', setupName: 'Standard starting position', initialSeconds: 300, incrementSeconds: 3 },
  pairings: [
    pairing({ round: 1, white: 'bob', black: 'carol', result: 'white' }),
    pairing({ round: 2, white: 'carol', black: 'alice', gameId: 'K7' }),
    pairing({ round: 3, white: 'alice', black: 'bob' })
  ],
  withdrawn: [],
  standings: [
    { playerId: 'bob', points: 1, sonnebornBerger: 0, place: 1, withdrawn: false },
    { playerId: 'alice', points: 0, sonnebornBerger: 0, place: 2, withdrawn: false },
    { playerId: 'carol', points: 0, sonnebornBerger: 0, place: 2, withdrawn: false }
  ],
  ...over
})

// alice free, everyone in the room, no tables in the way.
const roundRobinRoom = (over: Partial<HubRoom> = {}): HubRoom =>
  room({
    players: [
      { playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
      { playerId: 'bob', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
      { playerId: 'carol', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
      { playerId: 'dave', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 }
    ],
    games: [],
    ...over
  })

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
  // The room's round robins (MoonBase#1647): asked for on arriving, each
  // with its standings and pairings; a player's own pairings to play or
  // join; the moderator's forfeits and withdrawals; and a new one.
  describe('round robins', () => {
    const section = () => within(screen.getByRole('region', { name: 'Round robins' }))

    it('asks the hub for them on arriving in a room, once', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, null) })
      const { rerender } = render(<LobbyPanel lobby={hook} />)
      rerender(<LobbyPanel lobby={hook} />)
      expect(hook.chess.loadRoundRobins).toHaveBeenCalledTimes(1)
      expect(section().getByText('Loading round robins…')).toBeTruthy()
    })

    it('says when there are none', () => {
      render(<LobbyPanel lobby={lobby({ room: roundRobinRoom(), chess: chess(null, []) })} />)
      expect(section().getByText('No round robins yet')).toBeTruthy()
    })

    it('shows each one’s terms, standings and pairings', () => {
      const withdrawn = roundRobin({ withdrawn: ['carol'] })
      withdrawn.standings[2].withdrawn = true
      render(<LobbyPanel lobby={lobby({ room: roundRobinRoom(), chess: chess(null, [withdrawn]) })} />)
      expect(section().getByText('By alice · 5+3 · Standard starting position')).toBeTruthy()
      const standings = section().getByRole('list', { name: 'Standings' })
      expect(within(standings).getAllByRole('listitem').map(item => item.textContent)).toEqual([
        '1. bob · 1 (SB 0)',
        '2. alice · 0 (SB 0)',
        '2. carol · 0 (SB 0) · withdrew'
      ])
      const pairings = section().getByRole('list', { name: 'Pairings' })
      expect(within(pairings).getAllByRole('listitem').map(item => item.textContent)).toEqual([
        'Round 1: bob – carol · 1-0',
        'Round 2: carol – alice · at table K7',
        'Round 3: alice – bob · to play'
      ])
    })

    // A pairing at no table is opened; one at a table, joined.
    it('offers the player each of their pairings still to play', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, [roundRobin()]) })
      render(<LobbyPanel lobby={hook} />)
      fireEvent.click(section().getByRole('button', { name: 'Play your pairing with bob' }))
      expect(hook.chess.playRoundRobin).toHaveBeenCalledWith('E1', 'bob')
      fireEvent.click(section().getByRole('button', { name: 'Join your pairing with carol at K7' }))
      expect(hook.chess.joinTable).toHaveBeenCalledWith('K7')
    })

    it('offers no pairing to a player at a table, or offline', () => {
      const seated = roundRobinRoom({
        players: [{ playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0, table: { game: 'golf', gameId: 'G2' } }]
      })
      render(<LobbyPanel lobby={lobby({ room: seated, chess: chess(null, [roundRobin()]) })} />)
      expect((section().getByRole('button', { name: 'Play your pairing with bob' }) as HTMLButtonElement).disabled).toBe(true)
      cleanup()
      render(<LobbyPanel lobby={lobby({ connected: false, room: roundRobinRoom(), chess: chess(null, [roundRobin()]) })} />)
      expect((section().getByRole('button', { name: 'Play your pairing with bob' }) as HTMLButtonElement).disabled).toBe(true)
    })

    // A forfeit is for a pairing still to play at no table.
    it('gives the creator forfeits and withdrawals', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, [roundRobin()]) })
      render(<LobbyPanel lobby={hook} />)
      expect(section().queryByRole('button', { name: /^Forfeit carol – alice/ })).toBeNull()
      fireEvent.click(section().getByRole('button', { name: 'Forfeit alice – bob to bob' }))
      expect(hook.chess.forfeit).toHaveBeenCalledWith('E1', 'bob', 'alice')
      fireEvent.click(section().getByRole('button', { name: 'Withdraw carol' }))
      expect(hook.chess.withdraw).toHaveBeenCalledWith('E1', 'carol')
    })

    // While the creator is away, an entrant moderates what isn't theirs.
    it('hands moderation to the entrants while the creator is away', () => {
      const away = roundRobinRoom({
        players: [
          { playerId: 'bob', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
          { playerId: 'carol', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 }
        ]
      })
      const held = roundRobin({ pairings: [pairing({ round: 1, white: 'bob', black: 'carol' }), pairing({ round: 2, white: 'carol', black: 'alice' })] })
      render(<LobbyPanel lobby={lobby({ playerId: 'bob', room: away, chess: chess(null, [held]) })} />)
      expect(section().getByRole('button', { name: 'Forfeit carol – alice to carol' })).toBeTruthy()
      expect(section().queryByRole('button', { name: /^Forfeit bob – carol/ })).toBeNull()
      expect(section().getByRole('button', { name: 'Withdraw alice' })).toBeTruthy()
      expect(section().queryByRole('button', { name: 'Withdraw bob' })).toBeNull()
      cleanup()
      render(<LobbyPanel lobby={lobby({ playerId: 'bob', room: roundRobinRoom(), chess: chess(null, [held]) })} />)
      expect(section().queryByRole('button', { name: /^Forfeit/ })).toBeNull()
      expect(section().queryByRole('button', { name: /^Withdraw/ })).toBeNull()
    })

    // 3 to 8 of the room's members, in the room's order, on a picked clock.
    it('starts one among the members picked, on the clock picked', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, []) })
      render(<LobbyPanel lobby={hook} />)
      const start = section().getByRole('button', { name: 'Start round robin' }) as HTMLButtonElement
      expect(start.disabled).toBe(false)
      fireEvent.click(section().getByRole('checkbox', { name: 'dave' }))
      fireEvent.change(section().getByRole('combobox', { name: 'Round robin clock' }), { target: { value: '5+3' } })
      fireEvent.click(start)
      expect(hook.chess.createRoundRobin).toHaveBeenCalledWith(['alice', 'bob', 'carol'], { initialSeconds: 300, incrementSeconds: 3 })
      fireEvent.click(section().getByRole('checkbox', { name: 'carol' }))
      expect(start.disabled).toBe(true)
      expect(section().getByText('Pick 3 to 8 players')).toBeTruthy()
    })
  })

  // The room's finished chess games (MoonBase#1637): asked for on
  // arriving, listed newest first with a review each, and the room's
  // publishing, whose state only that answer carries.
  describe('chess games', () => {
    it('asks the hub for them on arriving in a room, once', () => {
      const hook = lobby({ room: room(), chess: chess(null) })
      const { rerender } = render(<LobbyPanel lobby={hook} />)
      rerender(<LobbyPanel lobby={hook} />)
      expect(hook.chess.loadHistory).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Loading finished games…')).toBeTruthy()
      expect(within(screen.getByRole('region', { name: 'Chess games' })).queryByRole('checkbox')).toBeNull()
    })

    // A published game has a page of its own; a private one does not.
    it('links each published game to its public page', () => {
      const hook = lobby({
        room: room(),
        chess: chess({ published: true, games: [game({ published: true }), game({ archiveId: 8, ordinal: 1 })] })
      })
      render(<LobbyPanel lobby={hook} />)
      const links = within(screen.getByRole('region', { name: 'Chess games' })).getAllByRole('link', { name: /public page/ })
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAttribute('href', '/games/chess/9')
      expect(links[0]).toHaveAttribute('target', '_blank')
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

    // What publishing means is said before the click that does it: from
    // now on, what goes public, where, and for how long.
    it('says what publishing makes public and for how long, before and after publishing', () => {
      const hook = lobby({ room: room(), chess: chess({ published: false, games: [] }) })
      const { rerender } = render(<LobbyPanel lobby={hook} />)
      const toggle = screen.getByRole('checkbox', { name: 'Publish chess games played here from now on' })
      expect(toggle).not.toBeChecked()
      expect(screen.getByText(/public page with both players’ ids and every move/)).toBeTruthy()
      expect(screen.getByText(/indexed on 1d4/)).toBeTruthy()
      expect(screen.getByText(/stays public for 30 days, even if this is turned off/)).toBeTruthy()
      expect(screen.getByText(/Games that already ended stay private/)).toBeTruthy()
      expect(screen.getByRole('link', { name: 'public chess feed' })).toHaveAttribute('href', hubChessFeedUrl(hubPlayUrl()))
      fireEvent.click(toggle)
      expect(hook.chess.publish).toHaveBeenCalledWith(true)

      const published = lobby({ room: room(), chess: chess({ published: true, games: [] }) })
      rerender(<LobbyPanel lobby={published} />)
      const on = screen.getByRole('checkbox', { name: 'Publish chess games played here from now on' })
      expect(on).toBeChecked()
      fireEvent.click(on)
      expect(published.chess.publish).toHaveBeenCalledWith(false)
    })
  })
})
