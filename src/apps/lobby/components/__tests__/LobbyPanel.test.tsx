import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LobbyPanel from '../LobbyPanel'
import type { UseLobby } from '@/hooks/useLobby'
import type { HubRoom } from '@/utils/hubStream'
import { fakeVoiceMesh } from '@/test/fakeVoice'
import type { ChessGameSummary, ChessHistory, ChessPairing, ChessRoundRobin } from '@/apps/chess/wire'
import type { PongRoundRobin } from '@/apps/pong/wire'
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
    pong: pong(),
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

const pong = (roundRobins: PongRoundRobin[] | null = []) =>
  ({
    createTable: vi.fn(),
    joinTable: vi.fn(),
    watchTable: vi.fn(),
    roundRobins,
    loadRoundRobins: vi.fn(),
    createRoundRobin: vi.fn(),
    playRoundRobin: vi.fn(),
    forfeit: vi.fn(),
    withdraw: vi.fn()
  }) as unknown as UseLobby['pong']

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
    expect(screen.getByText('cards · rummy M2 · 3/4 · between deals')).toBeTruthy()
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

  // Any chess or pong table can be watched by a member at none
  // (MoonBase#1633); no other game's can.
  it('offers to watch every chess and pong table, and no other', () => {
    const hook = lobby({
      room: room({
        games: [
          { gameId: 'K1', game: 'chess', status: 'playing', playerCount: 2 },
          { gameId: 'K2', game: 'chess', status: 'waiting', playerCount: 1 },
          { gameId: 'G2', game: 'golf', status: 'playing', playerCount: 2 },
          { gameId: 'P1', game: 'pong', status: 'playing', playerCount: 2 }
        ]
      })
    })
    render(<LobbyPanel lobby={hook} />)
    expect(screen.getAllByRole('button', { name: /^Watch / }).map(button => button.getAttribute('aria-label'))).toEqual([
      'Watch chess K1',
      'Watch chess K2',
      'Watch pong P1'
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Watch chess K1' }))
    expect(hook.chess.watchTable).toHaveBeenCalledWith('K1')
    fireEvent.click(screen.getByRole('button', { name: 'Watch pong P1' }))
    expect(hook.pong.watchTable).toHaveBeenCalledWith('P1')
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
  // One picker: Cards, whose game is picked beside it, Chess or Pong. What a
  // game is, its table says once open; the lobby only offers.
  it('opens a table of whichever game is picked: cards and the card game, or chess', () => {
    const hook = lobby({ room: room() })
    render(<LobbyPanel lobby={hook} />)
    const picker = screen.getByRole('combobox', { name: 'Game' })
    expect(within(picker).getAllByRole('option').map(option => option.textContent)).toEqual(['Cards', 'Chess', 'Pong'])
    const cards = screen.getByRole('combobox', { name: 'Card game' })
    expect(within(cards).getAllByRole('option').map(option => option.textContent)).toEqual(['Castle', 'Golf', 'Rummy'])
    expect(screen.getAllByRole('button', { name: /^Open a table/ })).toHaveLength(1)
    expect(screen.queryByText(/Shed every card first/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Open a table: castle' }))
    expect(hook.castle.createTable).toHaveBeenCalledTimes(1)
    for (const game of ['golf', 'rummy'] as const) {
      fireEvent.change(cards, { target: { value: game } })
      fireEvent.click(screen.getByRole('button', { name: `Open a table: ${game}` }))
      expect(hook[game].createTable).toHaveBeenCalledTimes(1)
    }
    fireEvent.change(picker, { target: { value: 'chess' } })
    expect(screen.queryByRole('combobox', { name: 'Card game' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open a table: chess' }))
    expect(hook.chess.createTable).toHaveBeenCalledTimes(1)
    expect(hook.castle.createTable).toHaveBeenCalledTimes(1)
    fireEvent.change(picker, { target: { value: 'pong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Open a table: pong' }))
    expect(hook.pong.createTable).toHaveBeenCalledTimes(1)
    // Back to cards, the card game picked last is still picked.
    fireEvent.change(picker, { target: { value: 'cards' } })
    expect(screen.getByRole('combobox', { name: 'Card game' })).toHaveValue('rummy')
  })

  it('names a card game’s table as cards, then its game', () => {
    render(<LobbyPanel lobby={lobby({ room: room() })} />)
    const tables = within(screen.getByRole('region', { name: 'Tables' }))
    expect(tables.getByText(/^cards · castle G1 · 1\/4/)).toBeTruthy()
    expect(tables.getByText(/^cards · rummy M1/)).toBeTruthy()
  })

  // A summary from before tables named their game is golf's, here as in
  // the command menu.
  it('names an unnamed table golf, and joins it as golf', () => {
    const hook = lobby({ room: room({ games: [{ gameId: 'G9', status: 'waiting', playerCount: 1 }] }) })
    render(<LobbyPanel lobby={hook} />)
    const tables = within(screen.getByRole('region', { name: 'Tables' }))
    expect(tables.getByText(/^cards · golf G9 · 1\/4/)).toBeTruthy()
    fireEvent.click(tables.getByRole('button', { name: 'Join golf G9' }))
    expect(hook.golf.joinTable).toHaveBeenCalledWith('G9')
  })

  it('a member already at a table is offered no other', () => {
    const seated = room()
    seated.players[0] = { ...seated.players[0], table: { game: 'castle', gameId: 'G1' } }
    render(<LobbyPanel lobby={lobby({ room: seated })} />)
    expect(screen.getByRole('button', { name: 'Open a table: castle' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Join castle G1' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Join golf G4' })).toHaveProperty('disabled', true)
  })

  // The command menu is keyboard-only; the panel is where it is told.
  describe('voice', () => {
    const inRoom = (view: Parameters<typeof fakeVoiceMesh>[0], over: Partial<UseLobby> = {}) => {
      const hook = lobby({ room: room(), voice: fakeVoiceMesh(view) as unknown as UseLobby['voice'], ...over })
      render(<LobbyPanel lobby={hook} />)
      return { hook, voice: within(screen.getByRole('group', { name: 'Voice' })) }
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
      expect(screen.getByRole('status')).toHaveTextContent('In voice: you, bob, carol')
      fireEvent.click(voice.getByRole('button', { name: 'Mute' }))
      expect(hook.voice.setMuted).toHaveBeenCalledWith(true)
      fireEvent.click(voice.getByRole('button', { name: 'Leave voice' }))
      expect(hook.voice.leave).toHaveBeenCalledTimes(1)
      cleanup()
      fireEvent.click(inRoom({ status: 'on', muted: true }).voice.getByRole('button', { name: 'Unmute' }))
    })

    it('without a microphone, says it is only listening and offers no mute', () => {
      const { voice } = inRoom({ status: 'on', listenOnly: true })
      expect(screen.getByText(/listening only/i)).toBeInTheDocument()
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
      expect(screen.getByText(/joining/i)).toBeInTheDocument()
      fireEvent.click(voice.getByRole('button', { name: 'Leave voice' }))
      expect(hook.voice.leave).toHaveBeenCalledTimes(1)
    })
  })

  // Sharing the room and its voice share one row at the top: the room's
  // own controls, before who is here.
  it('puts voice beside sharing the room, above the players', () => {
    render(<LobbyPanel lobby={lobby({ room: room() })} />)
    const share = screen.getByRole('button', { name: 'Copy share room' })
    const join = screen.getByRole('button', { name: 'Join voice' })
    expect(share.parentElement).toBe(join.closest('[role="group"]')?.parentElement)
    const players = screen.getByRole('region', { name: 'Players' })
    expect(join.compareDocumentPosition(players) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Voice' })).toBeNull()
  })

  // One row, one size: sharing the room is a button like voice's.
  it('shares the room by a button styled as voice is', () => {
    render(<LobbyPanel lobby={lobby({ room: room() })} />)
    const share = screen.getByRole('button', { name: 'Copy share room' })
    const join = screen.getByRole('button', { name: 'Join voice' })
    expect(join.className).not.toBe('')
    expect(share.className).toBe(join.className)
  })

  // Chat has a button in the row too, beside the floating one with its
  // unread count, which stays as it is.
  it('opens chat from the row, a button styled as voice is', () => {
    const openChat = vi.fn()
    render(<LobbyPanel lobby={lobby({ room: room() })} onOpenChat={openChat} />)
    const chat = screen.getByRole('button', { name: 'Chat' })
    const join = screen.getByRole('button', { name: 'Join voice' })
    expect(chat.parentElement).toBe(join.closest('[role="group"]')?.parentElement)
    expect(chat.className).toBe(join.className)
    fireEvent.click(chat)
    expect(openChat).toHaveBeenCalledTimes(1)
  })

  // The voice line sits under the row, outside the buttons' group, so
  // joining does not move Leave voice; empty, it stays a live region.
  it('keeps the voice status a live region under the row, in or out of voice', () => {
    render(<LobbyPanel lobby={lobby({ room: room() })} />)
    const status = screen.getByRole('status')
    expect(status).toBeEmptyDOMElement()
    expect(screen.getByRole('group', { name: 'Voice' })).not.toContainElement(status)
    expect(status.parentElement).toBe(screen.getByRole('group', { name: 'Voice' }).parentElement)
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
  // join, first; the moderator's forfeits and withdrawals; and a new one.
  describe('round robins', () => {
    const section = () => within(screen.getByRole('region', { name: 'Round robins' }))
    const button = (name: string) => section().getByRole('button', { name }) as HTMLButtonElement
    // Standings, pairings and moderation fold under each one's Details;
    // the form under New round robin.
    const details = () => fireEvent.click(section().getByRole('button', { name: /^Details/ }))
    const newOne = () => fireEvent.click(button('New round robin'))

    it('asks the hub for them on arriving in a room, once, and again on Refresh', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, null), pong: pong(null) })
      const { rerender } = render(<LobbyPanel lobby={hook} />)
      rerender(<LobbyPanel lobby={hook} />)
      expect(hook.chess.loadRoundRobins).toHaveBeenCalledTimes(1)
      expect(section().getByText('Loading round robins…')).toBeTruthy()
      fireEvent.click(button('Refresh round robins'))
      expect(hook.chess.loadRoundRobins).toHaveBeenCalledTimes(2)
    })

    it('does not ask while offline', () => {
      const hook = lobby({ connected: false, room: roundRobinRoom(), chess: chess(null, null) })
      render(<LobbyPanel lobby={hook} />)
      expect(hook.chess.loadRoundRobins).not.toHaveBeenCalled()
    })

    // A room too small for one, with none, shows no section at all; one
    // big enough shows only the way to start one.
    it('takes no room until there is one, or room for one', () => {
      const pair = roundRobinRoom({ players: roundRobinRoom().players.slice(0, 2) })
      const hook = lobby({ room: pair, chess: chess(null, []) })
      render(<LobbyPanel lobby={hook} />)
      expect(screen.queryByRole('region', { name: 'Round robins' })).toBeNull()
      cleanup()
      const unknown = lobby({ room: pair, chess: chess(null, null) })
      render(<LobbyPanel lobby={unknown} />)
      expect(screen.queryByRole('region', { name: 'Round robins' })).toBeNull()
      expect(unknown.chess.loadRoundRobins).toHaveBeenCalledTimes(1)
      cleanup()
      render(<LobbyPanel lobby={lobby({ room: roundRobinRoom(), chess: chess(null, []) })} />)
      expect(section().getByRole('button', { name: 'New round robin' })).toHaveAttribute('aria-expanded', 'false')
      expect(section().queryByRole('group', { name: 'Entrants' })).toBeNull()
      expect(section().queryByText(/No round robins/)).toBeNull()
    })

    it('shows a pair’s round robin, however small the room', () => {
      const pair = roundRobinRoom({ players: roundRobinRoom().players.slice(0, 2) })
      render(<LobbyPanel lobby={lobby({ room: pair, chess: chess(null, [roundRobin()]) })} />)
      expect(section().getByRole('heading', { name: 'Round robin E1 by alice' })).toBeTruthy()
    })

    it('shows each one’s creator, terms, standings and pairings', () => {
      const withdrawn = roundRobin({ withdrawn: ['carol'] })
      withdrawn.standings[2].withdrawn = true
      render(<LobbyPanel lobby={lobby({ playerId: 'dave', room: roundRobinRoom(), chess: chess(null, [withdrawn]) })} />)
      const entry = within(section().getByRole('listitem', { name: 'Round robin E1 by alice' }))
      expect(entry.getByText('5+3 · Standard starting position · 1 of 3 decided')).toBeTruthy()
      expect(entry.queryByRole('list', { name: 'Standings' })).toBeNull()
      expect(entry.getByRole('button', { name: /^Details/ })).toHaveAttribute('aria-expanded', 'false')
      details()
      expect(entry.getByRole('button', { name: /^Details/ })).toHaveAttribute('aria-expanded', 'true')
      const standings = entry.getByRole('list', { name: 'Standings' })
      expect(within(standings).getAllByRole('listitem').map(item => item.textContent)).toEqual([
        '1. bob · 1 (SB 0)',
        '2. alice · 0 (SB 0)',
        '2. carol · 0 (SB 0) · withdrew'
      ])
      const pairings = entry.getByRole('list', { name: 'Pairings' })
      expect(within(pairings).getAllByRole('listitem').map(item => item.textContent)).toEqual([
        'Round 1: bob – carol · 1-0',
        'Round 2: carol – alice · at table K7',
        'Round 3: alice – bob · to play'
      ])
      expect(entry.queryAllByRole('button').map(found => found.textContent)).toEqual(['Details'])
    })

    // A pairing at no table is opened; one at a table, joined. They come
    // before the standings: they are what the player is here to do.
    it('offers the player each of their pairings still to play, first', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, [roundRobin()]) })
      render(<LobbyPanel lobby={hook} />)
      fireEvent.click(button('Play bob'))
      expect(hook.chess.playRoundRobin).toHaveBeenCalledWith('E1', 'bob')
      fireEvent.click(button('Join carol at K7'))
      expect(hook.chess.joinTable).toHaveBeenCalledWith('K7')
      const more = section().getByRole('button', { name: /^Details/ })
      expect(button('Play bob').compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('offers no pairing to a player at a table, offline, or with one already asked for', () => {
      const seated = roundRobinRoom({
        players: [{ playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0, table: { game: 'golf', gameId: 'G2' } }]
      })
      render(<LobbyPanel lobby={lobby({ room: seated, chess: chess(null, [roundRobin()]) })} />)
      expect(button('Play bob').disabled).toBe(true)
      expect(button('Join carol at K7').disabled).toBe(true)
      cleanup()
      render(<LobbyPanel lobby={lobby({ connected: false, room: roundRobinRoom(), chess: chess(null, [roundRobin()]) })} />)
      expect(button('Play bob').disabled).toBe(true)
      expect(button('Join carol at K7').disabled).toBe(true)
      cleanup()
      const opening = { ...chess(null, [roundRobin()]), opening: true } as UseLobby['chess']
      render(<LobbyPanel lobby={lobby({ room: roundRobinRoom(), chess: opening })} />)
      expect(button('Play bob').disabled).toBe(true)
      expect(button('Join carol at K7').disabled).toBe(true)
    })

    // A forfeit is for a pairing still to play, at no table; a withdrawal
    // for an entrant still in.
    it('gives the creator forfeits on the pairings still to play, and withdrawals', () => {
      const held = roundRobin({
        pairings: [...roundRobin().pairings, pairing({ round: 4, white: 'carol', black: 'erin', voided: true })],
        entrants: ['alice', 'bob', 'carol', 'erin'],
        withdrawn: ['erin']
      })
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, [held]) })
      render(<LobbyPanel lobby={hook} />)
      details()
      expect(section().queryAllByRole('button', { name: /by forfeit$/ }).map(found => found.getAttribute('aria-label'))).toEqual([
        'alice wins alice – bob by forfeit',
        'bob wins alice – bob by forfeit'
      ])
      expect(section().queryByRole('button', { name: /bob – carol by forfeit$/ })).toBeNull()
      expect(section().queryByRole('button', { name: /carol – alice by forfeit$/ })).toBeNull()
      expect(section().queryByRole('button', { name: /carol – erin by forfeit$/ })).toBeNull()
      fireEvent.click(button('bob wins alice – bob by forfeit'))
      expect(hook.chess.forfeit).toHaveBeenCalledWith('E1', 'bob', 'alice')
      fireEvent.click(button('Withdraw carol'))
      expect(hook.chess.withdraw).toHaveBeenCalledWith('E1', 'carol')
      expect(section().queryByRole('button', { name: 'Withdraw erin' })).toBeNull()
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
      details()
      expect(button('carol wins carol – alice by forfeit')).toBeTruthy()
      expect(section().queryByRole('button', { name: /bob – carol by forfeit$/ })).toBeNull()
      expect(button('Withdraw alice')).toBeTruthy()
      expect(section().queryByRole('button', { name: 'Withdraw bob' })).toBeNull()
      cleanup()
      render(<LobbyPanel lobby={lobby({ playerId: 'bob', room: roundRobinRoom(), chess: chess(null, [held]) })} />)
      details()
      expect(section().queryAllByRole('button', { name: /by forfeit$/ })).toEqual([])
      expect(section().queryAllByRole('button', { name: /^Withdraw/ })).toEqual([])
    })

    // 3 to 8 of the room's members, in the room's order, on a picked
    // clock; those away start unpicked.
    it('starts one among the members picked, on the clock picked', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, []) })
      render(<LobbyPanel lobby={hook} />)
      newOne()
      const entrants = within(section().getByRole('group', { name: 'Entrants' }))
      const start = button('Start a round robin')
      expect(start.disabled).toBe(false)
      fireEvent.click(entrants.getByRole('checkbox', { name: 'dave' }))
      fireEvent.change(section().getByRole('combobox', { name: 'Round robin clock' }), { target: { value: '5+3' } })
      fireEvent.click(entrants.getByRole('checkbox', { name: 'carol' }))
      expect(start.disabled).toBe(true)
      expect(section().getByText('Pick 3 to 8 players')).toBeTruthy()
      fireEvent.click(entrants.getByRole('checkbox', { name: 'carol' }))
      fireEvent.click(start)
      expect(hook.chess.createRoundRobin).toHaveBeenCalledWith(['alice', 'bob', 'carol'], { initialSeconds: 300, incrementSeconds: 3 })
      // Started, the form folds away: a second click is not a second one.
      expect(section().queryByRole('group', { name: 'Entrants' })).toBeNull()
      expect(button('New round robin')).toHaveAttribute('aria-expanded', 'false')
    })

    // Pong's round robins sit in the same list, each moved in pong's envelope.
    it('lists pong’s round robins beside chess’s, asked for and moved in pong’s envelope', () => {
      const unknown = lobby({ room: roundRobinRoom(), chess: chess(null, []), pong: pong(null) })
      render(<LobbyPanel lobby={unknown} />)
      expect(unknown.pong.loadRoundRobins).toHaveBeenCalledTimes(1)
      expect(unknown.chess.loadRoundRobins).not.toHaveBeenCalled()
      // Chess's answer is in hand: pong's silence doesn't hide it behind a spinner.
      expect(section().queryByText('Loading round robins…')).toBeNull()
      fireEvent.click(button('Refresh round robins'))
      expect(unknown.chess.loadRoundRobins).toHaveBeenCalledTimes(1)
      expect(unknown.pong.loadRoundRobins).toHaveBeenCalledTimes(2)
      cleanup()
      const held: PongRoundRobin = {
        roundRobinId: 'E2',
        creator: 'alice',
        entrants: ['alice', 'bob', 'carol'],
        variant: '3d',
        pairings: [
          { round: 1, first: 'bob', second: 'carol', winner: 'carol', forfeit: false, voided: false },
          { round: 2, first: 'alice', second: 'bob', forfeit: false, voided: false },
          { round: 3, first: 'carol', second: 'alice', forfeit: false, voided: false, gameId: 'P4' }
        ],
        withdrawn: [],
        standings: []
      }
      render(<LobbyPanel lobby={lobby({ room: roundRobinRoom(), chess: chess(null, [roundRobin()]), pong: pong(null) })} />)
      expect(section().getByRole('heading', { name: 'Round robin E1 by alice' })).toBeTruthy()
      cleanup()
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, [roundRobin()]), pong: pong([held]) })
      render(<LobbyPanel lobby={hook} />)
      expect(section().getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual(['Round robin E1 by alice', 'Round robin E2 by alice'])
      const entry = within(section().getByRole('listitem', { name: 'Round robin E2 by alice' }))
      expect(entry.getByText('Pong · 3D · 1 of 3 decided')).toBeTruthy()
      fireEvent.click(entry.getByRole('button', { name: 'Play bob' }))
      expect(hook.pong.playRoundRobin).toHaveBeenCalledWith('E2', 'bob')
      expect(hook.chess.playRoundRobin).not.toHaveBeenCalled()
      fireEvent.click(entry.getByRole('button', { name: 'Join carol at P4' }))
      expect(hook.pong.joinTable).toHaveBeenCalledWith('P4')
      fireEvent.click(entry.getByRole('button', { name: /^Details/ }))
      expect(within(entry.getByRole('list', { name: 'Pairings' })).getAllByRole('listitem')[0].textContent).toBe('Round 1: bob – carol · carol won')
      fireEvent.click(entry.getByRole('button', { name: 'alice wins alice – bob by forfeit' }))
      expect(hook.pong.forfeit).toHaveBeenCalledWith('E2', 'alice', 'bob')
      fireEvent.click(entry.getByRole('button', { name: 'Withdraw carol' }))
      expect(hook.pong.withdraw).toHaveBeenCalledWith('E2', 'carol')
    })

    // A pong pairing's table, like chess's, is its pair's alone.
    it('names a pong pairing’s table by its pair, and opens it to them alone', () => {
      const held: PongRoundRobin = {
        roundRobinId: 'E2',
        creator: 'bob',
        entrants: ['alice', 'bob', 'carol'],
        variant: 'smallcat',
        pairings: [{ round: 1, first: 'carol', second: 'bob', forfeit: false, voided: false, gameId: 'P7' }],
        withdrawn: [],
        standings: []
      }
      const tables = roundRobinRoom({ games: [{ gameId: 'P7', game: 'pong', status: 'waiting', playerCount: 1 }] })
      render(<LobbyPanel lobby={lobby({ room: tables, pong: pong([held]) })} />)
      const list = within(screen.getByRole('region', { name: 'Tables' }))
      expect(list.getByText(/round robin: carol – bob/)).toBeTruthy()
      expect((list.getByRole('button', { name: 'Join pong P7' }) as HTMLButtonElement).disabled).toBe(true)
      cleanup()
      render(<LobbyPanel lobby={lobby({ playerId: 'carol', room: tables, pong: pong([held]) })} />)
      expect((within(screen.getByRole('region', { name: 'Tables' })).getByRole('button', { name: 'Join pong P7' }) as HTMLButtonElement).disabled).toBe(false)
    })

    it('starts a pong one on the variant picked', () => {
      const hook = lobby({ room: roundRobinRoom(), chess: chess(null, []) })
      render(<LobbyPanel lobby={hook} />)
      newOne()
      fireEvent.change(section().getByRole('combobox', { name: 'Round robin game' }), { target: { value: 'pong' } })
      expect(section().queryByRole('combobox', { name: 'Round robin clock' })).toBeNull()
      fireEvent.change(section().getByRole('combobox', { name: 'Round robin variant' }), { target: { value: '3d' } })
      fireEvent.click(button('Start a round robin'))
      expect(hook.pong.createRoundRobin).toHaveBeenCalledWith(['alice', 'bob', 'carol', 'dave'], '3d')
      expect(hook.chess.createRoundRobin).not.toHaveBeenCalled()
    })

    // The form opens under its button, ahead of the round robins listed.
    it('opens the form under its button, before the list', () => {
      render(<LobbyPanel lobby={lobby({ room: roundRobinRoom(), chess: chess(null, [roundRobin()]) })} />)
      newOne()
      expect(button('New round robin')).toHaveAttribute('aria-expanded', 'true')
      const form = section().getByRole('group', { name: 'Entrants' })
      const listed = section().getByRole('heading', { name: 'Round robin E1 by alice' })
      expect(form.compareDocumentPosition(listed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    // A pick is the player's: it holds whoever comes or goes.
    it('keeps each pick as made when its member comes or goes', () => {
      const members = (connected: boolean) =>
        roundRobinRoom({
          players: ['alice', 'bob', 'carol', 'dave'].map(playerId => ({
            playerId,
            connected: playerId === 'dave' ? connected : true,
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0
          }))
        })
      const hook = lobby({ room: members(false), chess: chess(null, []) })
      const { rerender } = render(<LobbyPanel lobby={hook} />)
      newOne()
      const dave = () => within(section().getByRole('group', { name: 'Entrants' })).getByRole('checkbox', { name: 'dave' }) as HTMLInputElement
      const carol = () => within(section().getByRole('group', { name: 'Entrants' })).getByRole('checkbox', { name: 'carol' }) as HTMLInputElement
      expect(dave().checked).toBe(false)
      fireEvent.click(dave())
      fireEvent.click(carol())
      rerender(<LobbyPanel lobby={{ ...hook, room: members(true) }} />)
      expect(dave().checked).toBe(true)
      expect(carol().checked).toBe(false)
      rerender(<LobbyPanel lobby={{ ...hook, room: members(false) }} />)
      expect(dave().checked).toBe(true)
    })

    it('starts with only the members here picked, and takes no more than 8', () => {
      const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'].map(playerId => ({
        playerId,
        connected: playerId !== 'p9',
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0
      }))
      render(<LobbyPanel lobby={lobby({ playerId: 'p1', room: roundRobinRoom({ players }), chess: chess(null, []) })} />)
      newOne()
      const entrants = within(section().getByRole('group', { name: 'Entrants' }))
      expect((entrants.getByRole('checkbox', { name: 'p9' }) as HTMLInputElement).checked).toBe(false)
      expect(button('Start a round robin').disabled).toBe(false)
      fireEvent.click(entrants.getByRole('checkbox', { name: 'p9' }))
      expect(button('Start a round robin').disabled).toBe(true)
    })

    // Ordinary challenges come first: while the round robins are unknown,
    // every challenge is offered as one, and the hub turns away anyone
    // but a pairing table's pair.
    it('offers a challenge to anyone while the round robins are unknown', () => {
      const tables = roundRobinRoom({ games: [{ gameId: 'K7', game: 'chess', status: 'waiting', playerCount: 1, terms: '5+3' }] })
      render(<LobbyPanel lobby={lobby({ playerId: 'dave', room: tables, chess: chess(null, null) })} />)
      const list = within(screen.getByRole('region', { name: 'Tables' }))
      expect((list.getByRole('button', { name: 'Accept chess K7' }) as HTMLButtonElement).disabled).toBe(false)
      expect(list.queryByText(/round robin:/)).toBeNull()
    })

    // A pairing's table is for its pair: the Tables list says whose it is
    // and offers it to no one else.
    it('offers a pairing’s table in the Tables list only to its pair', () => {
      const tables = roundRobinRoom({ games: [{ gameId: 'K7', game: 'chess', status: 'waiting', playerCount: 1, terms: '5+3' }] })
      render(<LobbyPanel lobby={lobby({ room: tables, chess: chess(null, [roundRobin()]) })} />)
      const list = within(screen.getByRole('region', { name: 'Tables' }))
      expect(list.getByText(/round robin: carol – alice/)).toBeTruthy()
      expect((list.getByRole('button', { name: 'Accept chess K7' }) as HTMLButtonElement).disabled).toBe(false)
      cleanup()
      render(<LobbyPanel lobby={lobby({ playerId: 'dave', room: tables, chess: chess(null, [roundRobin()]) })} />)
      expect((within(screen.getByRole('region', { name: 'Tables' })).getByRole('button', { name: 'Accept chess K7' }) as HTMLButtonElement).disabled).toBe(true)
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

    // One button pushes the room's games to 1d4, or stops; what that
    // means is its hover text, said before the click that does it.
    it('pushes to 1d4 by a toggle whose title says what that makes public', () => {
      const hook = lobby({ room: room(), chess: chess({ published: false, games: [] }) })
      const { rerender } = render(<LobbyPanel lobby={hook} />)
      const push = screen.getByRole('button', { name: 'Push to 1d4' })
      expect(push).toHaveAttribute('aria-pressed', 'false')
      const title = push.getAttribute('title') ?? ''
      expect(title).toMatch(/public page with both players’ ids and every move/)
      expect(title).toMatch(/stays public for 30 days/)
      expect(title).toMatch(/Games that already ended stay private/)
      expect(title).toMatch(/is sent to 1d4 to be indexed/)
      expect(title).toContain(hubChessFeedUrl(hubPlayUrl()))
      // Off hover, the same words describe it to a screen reader.
      expect(push).toHaveAccessibleDescription(title)
      expect(screen.queryByRole('checkbox', { name: /Publish/ })).toBeNull()
      expect(screen.queryByText(/sent to 1d4/)).toBeNull()
      fireEvent.click(push)
      expect(hook.chess.publish).toHaveBeenCalledWith(true)

      // Without hover (a phone, a keyboard), ? says the same, the feed a link.
      const help = screen.getByRole('button', { name: 'What Push to 1d4 does' })
      expect(help).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByText(/public page with both players’ ids/)).toBeNull()
      fireEvent.click(help)
      expect(help).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText(/public page with both players’ ids and every move/)).toBeTruthy()
      expect(screen.getByText(/is sent to 1d4 to be indexed/)).toBeTruthy()
      expect(screen.getByRole('link', { name: 'public chess feed' })).toHaveAttribute('href', hubChessFeedUrl(hubPlayUrl()))
      fireEvent.click(help)
      expect(screen.queryByText(/public page with both players’ ids/)).toBeNull()

      const published = lobby({ room: room(), chess: chess({ published: true, games: [] }) })
      rerender(<LobbyPanel lobby={published} />)
      const on = screen.getByRole('button', { name: 'Push to 1d4' })
      expect(on).toHaveAttribute('aria-pressed', 'true')
      fireEvent.click(on)
      expect(published.chess.publish).toHaveBeenCalledWith(false)
    })
  })
})
