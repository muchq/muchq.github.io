import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { UseLobby } from '@/hooks/useLobby'
import type { HubRoom } from '@/utils/hubStream'
import { fakeVoiceMesh as voiceIn } from '@/test/fakeVoice'
import { lobbyCommands, type LobbyUi } from '../lobbyCommands'

// The lobby's verbs as the command menu lists them. The panel's buttons
// grey out; here an unavailable verb is simply not offered, by the same
// connected/seated rules the panel reads.

const lobbyWith = (over: Partial<UseLobby>): UseLobby =>
  ({
    playerId: 'alice',
    connected: true,
    room: null,
    createRoom: vi.fn(),
    leaveRoom: vi.fn(),
    castle: { createTable: vi.fn(), joinTable: vi.fn() },
    golf: { createTable: vi.fn(), joinTable: vi.fn() },
    voice: voiceIn(),
    ...over,
  }) as unknown as UseLobby

const room = (over: Partial<HubRoom> = {}): HubRoom => ({
  roomId: 'R1',
  players: [{ playerId: 'alice', connected: true, gamesWon: 0, gamesPlayed: 0, totalScore: 0 }],
  games: [
    { gameId: 'C1', game: 'castle', status: 'waiting', playerCount: 1 },
    { gameId: 'G1', status: 'waiting', playerCount: 2 },
    { gameId: 'C2', game: 'castle', status: 'playing', playerCount: 2 },
    { gameId: 'C3', game: 'castle', status: 'waiting', playerCount: 4 },
  ],
  ...over,
})

describe('lobbyCommands', () => {
  let ui: LobbyUi
  beforeEach(() => {
    ui = {
      panelOpen: true,
      togglePanel: vi.fn(),
      askRoomCode: vi.fn(),
      openChat: vi.fn(),
      askBot: vi.fn(),
      say: vi.fn(),
    }
  })

  const labels = (lobby: UseLobby) => lobbyCommands(lobby, ui).map(c => c.label)
  const run = (lobby: UseLobby, label: string) => {
    const command = lobbyCommands(lobby, ui).find(c => c.label === label)
    if (!command) throw new Error(`no ${label}`)
    command.run()
  }

  it('in the plaza: a room to create or join, and the panel', () => {
    const lobby = lobbyWith({})
    expect(labels(lobby)).toEqual(['Create a room', 'Join a room by code', 'Hide lobby panel'])
    run(lobby, 'Create a room')
    expect(lobby.createRoom).toHaveBeenCalledTimes(1)
    run(lobby, 'Join a room by code')
    expect(ui.askRoomCode).toHaveBeenCalledTimes(1)
  })

  it('off the hub, nothing that needs it', () => {
    expect(labels(lobbyWith({ connected: false }))).toEqual(['Hide lobby panel'])
    expect(labels(lobbyWith({ connected: false, room: room() }))).toEqual([
      'Open chat',
      'Ask the bot',
      'Copy room link',
      'Hide lobby panel',
    ])
  })

  it('in a room: chat, ask the bot, its link, leaving, a table of either game, and every open table', () => {
    const lobby = lobbyWith({ room: room() })
    const offered = lobbyCommands(lobby, ui)
    expect(offered.map(c => c.label)).toEqual([
      'Open chat',
      'Ask the bot',
      'Copy room link',
      'Leave the room',
      'Join voice',
      'Open a castle table',
      'Open a golf table',
      'Join castle table C1',
      'Join golf table G1',
      'Hide lobby panel',
    ])
    expect(offered.find(c => c.label === 'Join golf table G1')!.detail).toBe('2/4 seated')
  })

  it('a table in play or full is not offered, and one in the list is joined as its game', () => {
    const lobby = lobbyWith({ room: room() })
    expect(labels(lobby).filter(l => /C2|C3/.test(l))).toEqual([])
    run(lobby, 'Join castle table C1')
    expect(lobby.castle.joinTable).toHaveBeenCalledWith('C1')
    run(lobby, 'Join golf table G1')
    expect(lobby.golf.joinTable).toHaveBeenCalledWith('G1')
    run(lobby, 'Open a golf table')
    expect(lobby.golf.createTable).toHaveBeenCalledTimes(1)
    run(lobby, 'Leave the room')
    expect(lobby.leaveRoom).toHaveBeenCalledTimes(1)
    run(lobby, 'Open chat')
    expect(ui.openChat).toHaveBeenCalledTimes(1)
    run(lobby, 'Ask the bot')
    expect(ui.askBot).toHaveBeenCalledTimes(1)
  })

  it('seated at a table, no other table is offered', () => {
    const seated = room({
      players: [{ playerId: 'alice', connected: true, gamesWon: 0, gamesPlayed: 0, totalScore: 0, table: { game: 'castle', gameId: 'C2' } }],
    })
    expect(labels(lobbyWith({ room: seated }))).toEqual([
      'Open chat',
      'Ask the bot',
      'Copy room link',
      'Leave the room',
      'Join voice',
      'Hide lobby panel',
    ])
  })

  it("voice: join it in a room; once in, leave it, and mute unless there is no mic to mute", () => {
    const off = lobbyWith({ room: room(), voice: voiceIn() as unknown as UseLobby['voice'] })
    run(off, 'Join voice')
    expect(off.voice.join).toHaveBeenCalledTimes(1)
    expect(labels(lobbyWith({ room: null })).filter(l => /voice/i.test(l))).toEqual([])

    const on = lobbyWith({ room: room(), voice: voiceIn({ status: 'on' }) as unknown as UseLobby['voice'] })
    expect(labels(on).filter(l => /voice|mute/i.test(l))).toEqual(['Leave voice', 'Mute'])
    run(on, 'Mute')
    expect(on.voice.setMuted).toHaveBeenCalledWith(true)
    run(on, 'Leave voice')
    expect(on.voice.leave).toHaveBeenCalledTimes(1)

    const muted = lobbyWith({ room: room(), voice: voiceIn({ status: 'on', muted: true }) as unknown as UseLobby['voice'] })
    run(muted, 'Unmute')
    expect(muted.voice.setMuted).toHaveBeenCalledWith(false)

    const listening = lobbyWith({ room: room(), voice: voiceIn({ status: 'on', listenOnly: true }) as unknown as UseLobby['voice'] })
    expect(labels(listening).filter(l => /voice|mute/i.test(l))).toEqual(['Leave voice'])
    const joining = lobbyWith({ room: room(), voice: voiceIn({ status: 'joining' }) as unknown as UseLobby['voice'] })
    expect(labels(joining).filter(l => /voice|mute/i.test(l))).toEqual(['Leave voice'])
  })

  it('the panel entry says which way it will go', () => {
    ui.panelOpen = false
    expect(labels(lobbyWith({})).at(-1)).toBe('Show lobby panel')
    run(lobbyWith({}), 'Show lobby panel')
    expect(ui.togglePanel).toHaveBeenCalledTimes(1)
  })

  describe('copying the room link', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('copies the share link the panel shows, and says so', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', { clipboard: { writeText } })
      run(lobbyWith({ room: room() }), 'Copy room link')
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/games/room/R1`)
      await vi.waitFor(() => expect(ui.say).toHaveBeenCalledWith('Room link copied'))
    })

    it('a refused clipboard says so, and is not an error the page sees', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      vi.stubGlobal('navigator', { clipboard: { writeText } })
      run(lobbyWith({ room: room() }), 'Copy room link')
      await vi.waitFor(() => expect(ui.say).toHaveBeenCalledWith('Could not copy the room link'))
    })

    it('no clipboard at all says so too', () => {
      vi.stubGlobal('navigator', {})
      run(lobbyWith({ room: room() }), 'Copy room link')
      expect(ui.say).toHaveBeenCalledWith('Could not copy the room link')
    })
  })

  it('a castle and a golf table with the same id are two entries', () => {
    const twins = room({
      games: [
        { gameId: 'T1', game: 'castle', status: 'waiting', playerCount: 1 },
        { gameId: 'T1', game: 'golf', status: 'waiting', playerCount: 1 },
      ],
    })
    const ids = lobbyCommands(lobbyWith({ room: twins }), ui).map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
