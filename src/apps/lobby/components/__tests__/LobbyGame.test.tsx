import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useImperativeHandle, type Ref } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UseLobby } from '@/hooks/useLobby'
import type { CastleView } from '@/apps/castle/wire'
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
  castle: { view: null as CastleView | null, ended: null, selected: [] },
  golf: { view: null as GameState | null, ended: null, peekCountdown: null }
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
const openChat = vi.fn()
vi.mock('../RoomChat', () => ({
  default: function Chat({ ref }: { ref?: Ref<{ open: () => void }> }) {
    useImperativeHandle(ref, () => ({ open: openChat }))
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

  // /thoughts folded into the lobby, so the bare world is the panel
  // hidden on purpose — and on purpose means it stays hidden.
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

    it('a triple-tap on the world opens it, as space does', () => {
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
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
      state.room = { roomId: 'R1', players: [], games: [] }
      rerender(<LobbyGame />)
      openMenu()
      choose('Open chat')
      expect(openChat).toHaveBeenCalledTimes(1)
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
