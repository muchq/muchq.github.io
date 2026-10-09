import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useImperativeHandle, type Ref } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UseLobby } from '@/hooks/useLobby'
import { fakeVoiceMesh } from '@/test/fakeVoice'
import type { CastleView } from '@/apps/castle/wire'
import type { RummyView } from '@/apps/rummy/wire'
import type { ChessReview, ChessView } from '@/apps/chess/wire'
import type { GameState } from '@/types/golf'
import type { CommandRegistry } from '@/utils/commandRegistry'
import { COMMAND_HOTKEY } from '@/utils/hotkeys'

// The panel's folding: open beside the world, away while a table is up,
// back when the table goes, and always a toggle away.

const state = {
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
  world: {},
  voice: fakeVoiceMesh(),
  castle: { view: null as CastleView | null, ended: null, selected: [] },
  golf: { view: null as GameState | null, ended: null, peekCountdown: null },
  rummy: { view: null as RummyView | null, ended: null, selected: [] },
  chess: { view: null as ChessView | null, opening: false, history: null, review: null as ChessReview | null, closeReview: vi.fn() }
} as unknown as UseLobby

vi.mock('@/hooks/useLobby', async importOriginal => ({
  ...(await importOriginal<typeof import('@/hooks/useLobby')>()),
  useLobby: () => state
}))
// The world publishes into the registry it is handed, as the real one does.
const wearCube = vi.fn()
vi.mock('@/apps/thoughts/components/ThoughtsGame', () => ({
  default: function World({ commands, onTripleTap }: { commands: CommandRegistry; onTripleTap: () => void }) {
    useEffect(() => {
      commands.publish('world', [{ id: 'cube', label: 'Avatar: Cube', run: wearCube }])
      return () => commands.withdraw('world')
    }, [commands])
    return (
      <div>
        world
        <button type="button" onClick={onTripleTap}>
          triple-tap the world
        </button>
      </div>
    )
  }
}))
vi.mock('@/apps/castle/components/CastleTable', () => ({ default: () => <div>table</div> }))
vi.mock('@/apps/chess/components/ChessTable', () => ({ default: () => <div>chess table</div> }))
vi.mock('@/apps/chess/components/GameReview', () => ({
  default: ({ review, onClose }: { review: ChessReview; onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      review of {review.summary.gameId}
    </button>
  )
}))
vi.mock('@/apps/rummy/components/RummyTable', () => ({
  default: ({ away }: { away?: string[] }) => <div>rummy table{away !== undefined && away.length > 0 ? `, away: ${away.join(' ')}` : ''}</div>
}))
const openChat = vi.fn()
const askBot = vi.fn()
vi.mock('../RoomChat', () => ({
  default: function Chat({ ref }: { ref?: Ref<{ open: () => void; askBot: () => void }> }) {
    useImperativeHandle(ref, () => ({ open: openChat, askBot }))
    return <div>chat</div>
  }
}))
vi.mock('@/apps/golf/components/GolfTable', () => ({
  default: ({ shareUrl }: { shareUrl: string | null }) => <div>golf table {shareUrl}</div>
}))

import LobbyGame from '../LobbyGame'

const view = { gameId: 'G1', phase: 'waiting', players: [], drawPileCount: 0, pileCount: 0, run: [], finished: [] } as unknown as CastleView
const golfView = { id: 'G2', gamePhase: 'waiting', players: [] } as unknown as GameState

describe('LobbyGame', () => {
  beforeEach(() => {
    cleanup()
    state.castle.view = null
    state.golf.view = null
    state.chess.view = null
    state.lost = null
    state.room = null
    localStorage.clear()
    vi.clearAllMocks()
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

  it('chat is up whenever the session is in a room, before anyone has spoken', () => {
    const { rerender } = render(<LobbyGame />)
    expect(screen.queryByText('chat')).toBeNull()
    state.room = { roomId: 'R1', players: [], games: [] }
    rerender(<LobbyGame />)
    expect(screen.getByText('chat')).toBeTruthy()
    state.room = null
    rerender(<LobbyGame />)
    expect(screen.queryByText('chat')).toBeNull()
  })

  it('a lost hub leaves the world up and says so', () => {
    state.lost = 'Lost connection to the games hub'
    render(<LobbyGame />)
    expect(screen.getByText('Lost connection to the games hub')).toBeTruthy()
    expect(screen.getByText('world')).toBeTruthy()
  })

  it('a golf table is a table too: over the world, the panel folded', () => {
    const { rerender } = render(<LobbyGame />)
    state.golf.view = golfView
    state.room = { roomId: 'R1', players: [], games: [] }
    rerender(<LobbyGame />)
    expect(screen.getByText(`golf table ${window.location.origin}/games/room/R1/table/G2`)).toBeTruthy()
    expect(screen.queryByText('table')).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'lobby' })).toBeNull()
    state.golf.view = null
    state.room = null
    rerender(<LobbyGame />)
    expect(screen.queryByText(/golf table/)).toBeNull()
    expect(screen.getByRole('complementary', { name: 'lobby' })).toBeTruthy()
  })

  it('a rummy table is a table too: over the world, the panel folded', () => {
    const { rerender } = render(<LobbyGame />)
    state.rummy.view = { gameId: 'M1' } as RummyView
    rerender(<LobbyGame />)
    expect(screen.getByText('rummy table')).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: 'lobby' })).toBeNull()
    state.rummy.view = null
    rerender(<LobbyGame />)
    expect(screen.queryByText('rummy table')).toBeNull()
    expect(screen.getByRole('complementary', { name: 'lobby' })).toBeTruthy()
  })

  it('a chess table is a table too: over the world, the panel folded', () => {
    const { rerender } = render(<LobbyGame />)
    state.chess.view = { gameId: 'K1' } as ChessView
    rerender(<LobbyGame />)
    expect(screen.getByText('chess table')).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: 'lobby' })).toBeNull()
    state.chess.view = null
    rerender(<LobbyGame />)
    expect(screen.queryByText('chess table')).toBeNull()
    expect(screen.getByRole('complementary', { name: 'lobby' })).toBeTruthy()
  })

  // Who the room shows gone is what lets a seat deal for an away dealer.
  // A review comes up over everything, the table it came from included,
  // and closing it goes back to what was under it (MoonBase#1637).
  it('puts a chess review over the table, and closes it', () => {
    state.chess.view = { gameId: 'K1' } as ChessView
    state.chess.review = { summary: { gameId: 'K1' } } as ChessReview
    try {
      render(<LobbyGame />)
      expect(screen.getByText('chess table')).toBeTruthy()
      const review = screen.getByRole('button', { name: 'review of K1' })
      expect(screen.getByText('chess table').compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      fireEvent.click(review)
      expect(state.chess.closeReview).toHaveBeenCalledTimes(1)
    } finally {
      state.chess.view = null
      state.chess.review = null
    }
  })

  // A review takes the screen as a table does (MoonBase#1637): opened
  // from the panel's own list, it folds the panel it came from, and the
  // panel stays folded while the review is up, table or no table.
  it('a review folds the panel, and keeps it folded when the table under it goes', () => {
    const panel = () => screen.queryByRole('complementary', { name: 'lobby' })
    const { rerender } = render(<LobbyGame />)
    expect(panel()).toBeTruthy()
    state.chess.view = { gameId: 'K1' } as ChessView
    state.chess.review = { summary: { gameId: 'K1' } } as ChessReview
    try {
      rerender(<LobbyGame />)
      expect(panel()).toBeNull()
      state.chess.view = null
      rerender(<LobbyGame />)
      expect(panel()).toBeNull()
      expect(screen.getByRole('button', { name: 'review of K1' })).toBeTruthy()
      state.chess.review = null
      rerender(<LobbyGame />)
      expect(panel()).toBeTruthy()
    } finally {
      state.chess.view = null
      state.chess.review = null
    }
  })

  it('hands the rummy table the seats the room shows away', () => {
    state.room = {
      roomId: 'R1',
      games: [],
      players: [
        { playerId: 'alice', connected: true, gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
        { playerId: 'bob', connected: false, gamesPlayed: 0, gamesWon: 0, totalScore: 0 }
      ]
    } as unknown as UseLobby['room']
    state.rummy.view = { gameId: 'M1' } as RummyView
    try {
      render(<LobbyGame />)
      expect(screen.getByText('rummy table, away: bob')).toBeTruthy()
    } finally {
      state.rummy.view = null
      state.room = null
    }
  })

  // The bare world is the panel hidden on purpose, and on purpose means
  // it stays hidden.
  describe('a hidden panel', () => {
    const panel = () => screen.queryByRole('complementary', { name: 'lobby' })

    it('stays hidden on the next visit', () => {
      render(<LobbyGame />)
      fireEvent.click(screen.getByRole('button', { name: 'Hide lobby' }))
      cleanup()
      render(<LobbyGame />)
      expect(panel()).toBeNull()
    })

    it('comes back on the next visit once shown again', () => {
      render(<LobbyGame />)
      fireEvent.click(screen.getByRole('button', { name: 'Hide lobby' }))
      fireEvent.click(screen.getByRole('button', { name: 'Lobby' }))
      cleanup()
      render(<LobbyGame />)
      expect(panel()).toBeTruthy()
    })

    it('stays hidden when a table comes and goes', () => {
      const { rerender } = render(<LobbyGame />)
      fireEvent.click(screen.getByRole('button', { name: 'Hide lobby' }))
      state.castle.view = view
      rerender(<LobbyGame />)
      state.castle.view = null
      rerender(<LobbyGame />)
      expect(panel()).toBeNull()
    })

    it('a peek at the panel over a table is not kept', () => {
      const { rerender } = render(<LobbyGame />)
      state.castle.view = view
      rerender(<LobbyGame />)
      fireEvent.click(screen.getByRole('button', { name: 'Lobby' }))
      fireEvent.click(screen.getByRole('button', { name: 'Hide lobby' }))
      state.castle.view = null
      rerender(<LobbyGame />)
      expect(panel()).toBeTruthy()
      cleanup()
      render(<LobbyGame />)
      expect(panel()).toBeTruthy()
    })

    it('shown on a narrow screen, still starts folded there next time', () => {
      const width = window.innerWidth
      window.innerWidth = 500
      try {
        render(<LobbyGame />)
        expect(panel()).toBeNull()
        fireEvent.click(screen.getByRole('button', { name: 'Lobby' }))
        cleanup()
        render(<LobbyGame />)
        expect(panel()).toBeNull()
      } finally {
        window.innerWidth = width
      }
    })

    it('without storage, opens by width as before', () => {
      const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      try {
        render(<LobbyGame />)
        expect(panel()).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: 'Hide lobby' }))
        expect(panel()).toBeNull()
      } finally {
        getItem.mockRestore()
        setItem.mockRestore()
      }
    })
  })

  describe('the command menu', () => {
    const openMenu = () => act(() => void fireEvent.keyDown(document, { key: COMMAND_HOTKEY }))
    const choose = (label: string) => fireEvent.click(screen.getByRole('option', { name: label }))

    it("lists the world's commands and the lobby's together, and runs either", () => {
      render(<LobbyGame />)
      openMenu()
      expect(screen.getByRole('option', { name: 'Avatar: Cube' })).toBeTruthy()
      choose('Create a room')
      expect(state.createRoom).toHaveBeenCalled()
      openMenu()
      choose('Avatar: Cube')
      expect(wearCube).toHaveBeenCalled()
    })

    it('a triple-tap on the world opens it, as Escape does', () => {
      render(<LobbyGame />)
      fireEvent.click(screen.getByRole('button', { name: 'triple-tap the world' }))
      expect(screen.getByRole('option', { name: 'Avatar: Cube' })).toBeTruthy()
    })

    it('join by code shows the panel and puts focus in its code field', () => {
      render(<LobbyGame />)
      fireEvent.click(screen.getByRole('button', { name: 'Hide lobby' }))
      openMenu()
      choose('Join a room by code')
      expect(screen.getByRole('complementary', { name: 'lobby' })).toBeTruthy()
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Room code' }))
    })

    it('open chat is there only in a room, and opens it', () => {
      const { rerender } = render(<LobbyGame />)
      openMenu()
      expect(screen.queryByRole('option', { name: 'Open chat' })).toBeNull()
      expect(screen.queryByRole('option', { name: 'Ask the bot' })).toBeNull()
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
      state.room = { roomId: 'R1', players: [], games: [] }
      rerender(<LobbyGame />)
      openMenu()
      choose('Open chat')
      expect(openChat).toHaveBeenCalledTimes(1)
    })

    it('Ask the bot is only in a room, and seeds the composer', () => {
      const { rerender } = render(<LobbyGame />)
      openMenu()
      expect(screen.queryByRole('option', { name: 'Ask the bot' })).toBeNull()
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
      state.room = { roomId: 'R1', players: [], games: [] }
      rerender(<LobbyGame />)
      openMenu()
      choose('Ask the bot')
      expect(askBot).toHaveBeenCalledTimes(1)
    })

    it('copying the room link says so in the status line', async () => {
      vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
      try {
        state.room = { roomId: 'R1', players: [], games: [] }
        render(<LobbyGame />)
        openMenu()
        await act(async () => choose('Copy room link'))
        expect(screen.getByText('Room link copied')).toBeTruthy()
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it('hiding the panel from the menu is the toggle, remembered the same way', () => {
      render(<LobbyGame />)
      openMenu()
      choose('Hide lobby panel')
      expect(screen.queryByRole('complementary', { name: 'lobby' })).toBeNull()
      cleanup()
      render(<LobbyGame />)
      expect(screen.queryByRole('complementary', { name: 'lobby' })).toBeNull()
      openMenu()
      expect(screen.getByRole('option', { name: 'Show lobby panel' })).toBeTruthy()
    })
  })
})
