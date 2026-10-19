import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { playGoSounds, unlockGoSounds } from '../../sounds'
import GoTable, { type GoTableProps } from '../GoTable'
import type { GoView } from '../../wire'

vi.mock('../../sounds', async importOriginal => ({ ...(await importOriginal<typeof import('../../sounds')>()), playGoSounds: vi.fn(), unlockGoSounds: vi.fn() }))

const empty = (size: number) => Array.from({ length: size }, () => '.'.repeat(size))

const view = (over: Partial<GoView> = {}): GoView => ({
  gameId: 'G01',
  phase: 'playing',
  players: [
    { playerId: 'alice', color: 'black' },
    { playerId: 'bob', color: 'white' }
  ],
  size: 9,
  board: ['b........', '.w.......', ...empty(9).slice(2)],
  captures: { black: 2, white: 1 },
  sideToMove: 'black',
  currentPlayerId: 'alice',
  clock: { blackMs: 300_000, whiteMs: 290_000, initialMs: 300_000, incrementMs: 5_000 },
  lastMove: { color: 'white', pass: false, x: 1, y: 1 },
  moveCount: 2,
  scoreSheet: [],
  komi: 6.5,
  ...over
})

const table = (over: Partial<GoTableProps['table']> = {}): GoTableProps['table'] => ({
  opening: false,
  sent: false,
  startTable: vi.fn(),
  postChallenge: vi.fn(),
  leaveTable: vi.fn(),
  playAgain: vi.fn(),
  play: vi.fn(),
  pass: vi.fn(),
  resign: vi.fn(),
  markDead: vi.fn(),
  accept: vi.fn(),
  ...over
})

// Both passed: alice's stone at A9 and bob's at B8, bob's marked dead.
const scoring = (over: Partial<GoView> = {}) =>
  view({
    phase: 'scoring',
    dead: [{ x: 1, y: 1 }],
    scoring: { acceptedBy: ['bob'], score: { black: 81, white: 6.5 } },
    lastMove: { color: 'white', pass: true },
    ...over
  })

const mount = (props: Partial<GoTableProps> = {}) => {
  const held = props.table ?? table()
  render(<GoTable playerId="alice" connected view={view()} {...props} table={held} />)
  return held
}

const board = () => within(screen.getByRole('group', { name: 'board' }))

afterEach(() => {
  cleanup()
  vi.mocked(playGoSounds).mockClear()
  vi.mocked(unlockGoSounds).mockClear()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('GoTable', () => {
  it('opens beginner tips from the ? button and closes them on Escape, scrim, or Close', () => {
    mount()
    expect(screen.queryByRole('dialog')).toBeNull()
    const help = screen.getByRole('button', { name: 'Tips for beginners' })
    const open = () => {
      help.focus()
      fireEvent.click(help)
    }
    open()
    const dialog = screen.getByRole('dialog', { name: 'Tips for beginners' })
    expect(within(dialog).getAllByRole('listitem').length).toBeGreaterThan(3)
    expect(within(dialog).getByRole('link', { name: /tutorial/ })).toHaveAttribute('href', 'https://online-go.com/learn-to-play-go')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    fireEvent.click(dialog)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Escape is consumed, so the lobby's command-menu hotkey leaves it be.
    expect(fireEvent.keyDown(dialog, { key: 'Escape' })).toBe(false)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(help).toHaveFocus()
    open()
    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(help).toHaveFocus()
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(help).toHaveFocus()
  })

  it('keeps Tab inside the tips', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Tips for beginners' }))
    const dialog = screen.getByRole('dialog')
    const link = within(dialog).getByRole('link')
    const close = within(dialog).getByRole('button', { name: 'Close' })
    expect(fireEvent.keyDown(close, { key: 'Tab' })).toBe(false)
    expect(link).toHaveFocus()
    expect(fireEvent.keyDown(link, { key: 'Tab', shiftKey: true })).toBe(false)
    expect(close).toHaveFocus()
  })

  it('puts the tips away when the phase changes', () => {
    const held = table()
    const { rerender } = render(<GoTable playerId="alice" connected view={view()} table={held} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tips for beginners' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rerender(<GoTable playerId="alice" connected view={view({ phase: 'ended' })} table={held} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('draws the stones, the last move, captures and clocks', () => {
    mount()
    expect(document.querySelectorAll('[data-color="black"][r="0.47"]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-color="white"][r="0.47"]')).toHaveLength(1)
    expect(screen.getByTestId('go-last-move').getAttribute('cx')).toBe('1')
    expect(screen.getByTestId('go-seat-black').textContent).toContain('captured 2')
    expect(screen.getByTestId('go-seat-white').textContent).toContain('4:50')
  })

  it('on your turn a tap on an empty point plays it, column lettered without I', () => {
    const held = mount()
    // Occupied points offer nothing.
    expect(board().queryByRole('button', { name: 'Play A9' })).toBeNull()
    expect(board().getAllByRole('button')).toHaveLength(81 - 2)
    fireEvent.click(board().getByRole('button', { name: 'Play C7' }))
    expect(held.play).toHaveBeenCalledWith(2, 2)
    expect(board().getByRole('button', { name: 'Play J1' })).toBeTruthy()
  })

  it('offers no point off your turn, or while a move is unanswered', () => {
    mount({ view: view({ currentPlayerId: 'bob', sideToMove: 'white' }) })
    expect(board().queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Pass' })).toHaveProperty('disabled', true)
    cleanup()
    mount({ table: table({ sent: true }) })
    expect(board().queryAllByRole('button')).toHaveLength(0)
  })

  it('passes, and resigns once confirmed', () => {
    const held = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }))
    expect(held.pass).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
    expect(held.resign).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm resign' }))
    expect(held.resign).toHaveBeenCalledTimes(1)
  })

  it('starts on the picked board size and clock', () => {
    const held = mount({ view: view({ phase: 'waiting', size: undefined, board: undefined }) })
    fireEvent.change(screen.getByRole('combobox', { name: 'Board size' }), { target: { value: '13' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(held.startTable).toHaveBeenCalledWith({ size: 13, initialSeconds: 600, incrementSeconds: 5 })
  })

  it('alone, the picked board size and clock are posted as a challenge', () => {
    const held = mount({ view: view({ phase: 'waiting', players: [{ playerId: 'alice' }], size: undefined, board: undefined }) })
    expect(screen.getByTestId('go-status').textContent).toBe('Post a challenge, or wait for a second seat.')
    fireEvent.change(screen.getByRole('combobox', { name: 'Board size' }), { target: { value: '13' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Clock' }), { target: { value: '5+3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post challenge' }))
    expect(held.postChallenge).toHaveBeenCalledWith({ size: 13, initialSeconds: 300, incrementSeconds: 3 })
    expect(held.startTable).not.toHaveBeenCalled()
  })

  it('a posted challenge is said, picked again, and updated in place', () => {
    const terms = { size: 13 as const, komi: 6.5, initialSeconds: 300, incrementSeconds: 3 }
    const held = mount({ view: view({ phase: 'waiting', players: [{ playerId: 'alice' }], size: undefined, board: undefined, terms }) })
    expect(screen.getByTestId('go-status').textContent).toBe('Challenge posted: 13×13, komi 6.5, 5+3. Whoever joins starts on it.')
    expect((screen.getByRole('combobox', { name: 'Board size' }) as HTMLSelectElement).value).toBe('13')
    expect((screen.getByRole('combobox', { name: 'Clock' }) as HTMLSelectElement).value).toBe('5+3')
    fireEvent.change(screen.getByRole('combobox', { name: 'Board size' }), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update challenge' }))
    expect(held.postChallenge).toHaveBeenCalledWith({ size: 9, initialSeconds: 300, incrementSeconds: 3 })
  })

  it('a watcher of a challenge is told its terms and posts nothing', () => {
    const terms = { size: 9 as const, komi: 6.5, initialSeconds: 600, incrementSeconds: 5 }
    mount({ playerId: 'carol', view: view({ phase: 'waiting', players: [{ playerId: 'alice' }], size: undefined, board: undefined, terms }) })
    expect(screen.getByTestId('go-status').textContent).toBe('Challenge posted: 9×9, komi 6.5, 10+5.')
    expect(screen.queryByRole('button', { name: /challenge/ })).toBeNull()
  })

  it('a posted clock none of the presets has is offered, and updating keeps it', () => {
    const terms = { size: 9 as const, komi: 6.5, initialSeconds: 60, incrementSeconds: 0 }
    const held = mount({ view: view({ phase: 'waiting', players: [{ playerId: 'alice' }], size: undefined, board: undefined, terms }) })
    expect((screen.getByRole('combobox', { name: 'Clock' }) as HTMLSelectElement).value).toBe('1+0')
    fireEvent.click(screen.getByRole('button', { name: 'Update challenge' }))
    expect(held.postChallenge).toHaveBeenCalledWith({ size: 9, initialSeconds: 60, incrementSeconds: 0 })
  })

  it('with both seats on terms whose start failed, the terms are said and Start plays them', () => {
    const terms = { size: 13 as const, komi: 6.5, initialSeconds: 300, incrementSeconds: 3 }
    const held = mount({ view: view({ phase: 'waiting', players: [{ playerId: 'alice' }, { playerId: 'bob' }], size: undefined, board: undefined, terms }) })
    expect(screen.getByTestId('go-status').textContent).toBe('Challenge posted: 13×13, komi 6.5, 5+3.')
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(held.startTable).toHaveBeenCalledWith({ size: 13, initialSeconds: 300, incrementSeconds: 3 })
  })

  it('says the result, and offers the next game on the size picked', () => {
    const result = { ending: 'score' as const, winner: 'bob', winnerColor: 'white' as const, score: { black: 40, white: 45.5 } }
    const held = mount({ view: view({ phase: 'ended', result }) })
    expect(screen.getByTestId('go-status').textContent).toBe('bob (White) won on points. Black 40, White 45.5.')
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull()
    fireEvent.change(screen.getByRole('combobox', { name: 'Next board size' }), { target: { value: '19' } })
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(held.playAgain).toHaveBeenCalledWith(19)
  })

  it('the next game follows the table’s size when none is picked', () => {
    const held = mount({ view: view({ phase: 'ended', result: { ending: 'resignation', winner: 'bob' } }) })
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(held.playAgain).toHaveBeenCalledWith(9)
  })

  it('a size picked before the start gives way to the size the game has', () => {
    const waiting = view({ phase: 'waiting', size: undefined, board: undefined })
    const { rerender } = render(<GoTable playerId="alice" connected view={waiting} table={table()} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Board size' }), { target: { value: '13' } })
    const held = table()
    rerender(<GoTable playerId="alice" connected view={view({ phase: 'ended', result: { ending: 'resignation', winner: 'bob' } })} table={held} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }))
    expect(held.playAgain).toHaveBeenCalledWith(9)
  })

  it('names the stones and says the last move', () => {
    mount()
    expect(board().getByRole('img', { name: 'A9, black stone' })).toBeTruthy()
    expect(board().getByRole('img', { name: 'B8, white stone' })).toBeTruthy()
    expect(screen.getByTestId('go-status').textContent).toBe('White played B8. Your move.')
    cleanup()
    mount({ view: view({ lastMove: { color: 'white', pass: true } }) })
    expect(screen.getByTestId('go-status').textContent).toBe('White passed. Your move.')
  })

  it('keeps one point in the tab order, moved by the arrows', () => {
    mount()
    const tabbable = () => document.querySelectorAll('[data-point][tabindex="0"]')
    expect(tabbable()).toHaveLength(1)
    expect(tabbable()[0].getAttribute('aria-label')).toBe('Play E5')
    fireEvent.keyDown(tabbable()[0], { key: 'ArrowRight' })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Play F5')
    expect(tabbable()).toHaveLength(1)
    expect(tabbable()[0]).toBe(document.activeElement)
  })

  it('a pass hands focus back to the board', () => {
    const held = mount()
    const pass = screen.getByRole('button', { name: 'Pass' })
    pass.focus()
    fireEvent.click(pass)
    expect(held.pass).toHaveBeenCalledTimes(1)
    expect(document.activeElement?.getAttribute('data-point')).toBe('4-4')
  })

  it('resigning asks first, and keeping on puts focus back on Resign', () => {
    const held = mount()
    fireEvent.click(screen.getByRole('button', { name: 'Resign' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirm resign' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(held.resign).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Resign' }))
  })

  it('in the scoring a tap on a stone marks its group, and the count and acceptances are said', () => {
    const held = mount({ view: scoring() })
    expect(screen.getByTestId('go-status')).toHaveTextContent(
      'Mark the dead stones, then accept, or play on. Black 81, White 6.5. bob accepts.'
    )
    expect(board().getByRole('button', { name: 'B8, white stone, dead: mark alive' })).toBeInTheDocument()
    expect(screen.getByTestId('go-dead-1-1')).toBeInTheDocument()
    expect(screen.queryByTestId('go-dead-0-0')).toBeNull()
    fireEvent.click(board().getByRole('button', { name: 'A9, black stone: mark dead' }))
    expect(held.markDead).toHaveBeenCalledWith(0, 0)
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull()
  })

  it('accepts the marks, once, and hands focus back to the board', () => {
    const held = mount({ view: scoring() })
    const accept = screen.getByRole('button', { name: 'Accept' })
    accept.focus()
    fireEvent.click(accept)
    expect(held.accept).toHaveBeenCalled()
    expect(board().getByRole('button', { name: 'Play E5' })).toHaveFocus()
    cleanup()
    mount({ view: scoring({ scoring: { acceptedBy: ['alice'], score: { black: 81, white: 6.5 } } }) })
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
    expect(screen.getByTestId('go-status')).toHaveTextContent('You accept.')
  })

  it('the seat off turn marks too, and is not told to play on', () => {
    const held = mount({ playerId: 'bob', view: scoring() })
    expect(screen.getByTestId('go-status')).toHaveTextContent(/^Mark the dead stones, then accept\. Black/)
    fireEvent.click(board().getByRole('button', { name: 'A9, black stone: mark dead' }))
    expect(held.markDead).toHaveBeenCalledWith(0, 0)
  })

  it('a move unanswered holds the scoring', () => {
    mount({ view: scoring(), table: table({ sent: true }) })
    expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled()
    expect(board().queryByRole('button', { name: /mark/ })).toBeNull()
  })

  it('the clock on turn runs through the scoring', () => {
    mount({ view: scoring() })
    expect(screen.getByTestId('go-seat-black')).toHaveAttribute('data-running', 'true')
    expect(screen.getByTestId('go-seat-white')).toHaveAttribute('data-running', 'false')
  })

  it('in the scoring the seat on turn may play on; the other may not', () => {
    const held = mount({ view: scoring() })
    fireEvent.click(board().getByRole('button', { name: 'Play C9' }))
    expect(held.play).toHaveBeenCalledWith(2, 0)
    cleanup()
    mount({ playerId: 'bob', view: scoring() })
    expect(board().queryByRole('button', { name: 'Play C9' })).toBeNull()
  })

  it('a watcher of the scoring marks nothing and is told what is happening', () => {
    mount({ playerId: 'carol', view: scoring() })
    expect(screen.getByTestId('go-status')).toHaveTextContent('Scoring: the players mark dead stones. Black 81, White 6.5. bob accepts.')
    expect(board().queryByRole('button', { name: /mark/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull()
  })

  it('offline, nothing can be played', () => {
    mount({ connected: false })
    expect(board().queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Pass' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Resign' })).toHaveProperty('disabled', true)
  })

  it('a closed table offers another, focused, or the way back', () => {
    const held = mount({ view: view({ phase: 'closed' }) })
    expect(screen.getByTestId('go-status').textContent).toBe('Your opponent left the table.')
    expect(screen.queryByRole('combobox', { name: 'Next board size' })).toBeNull()
    const again = screen.getByRole('button', { name: 'Play again' })
    expect(document.activeElement).toBe(again)
    fireEvent.click(again)
    expect(held.playAgain).toHaveBeenCalledWith(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Back to the room' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('a watcher sees Black’s clock under the board and touches nothing', () => {
    const held = mount({ playerId: 'carol' })
    expect(screen.getByRole('heading').textContent).toContain('Watching go')
    expect(board().queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Resign' })).toBeNull()
    expect(screen.getByTestId('go-seat-white').compareDocumentPosition(screen.getByTestId('go-seat-black')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Stop watching' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('the viewer’s clock sits under the board', () => {
    mount({ playerId: 'bob' })
    expect(screen.getByTestId('go-seat-black').compareDocumentPosition(screen.getByTestId('go-seat-white')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sounds a move off the view, not on arrival', () => {
    const { rerender } = render(<GoTable playerId="alice" connected view={view()} table={table()} />)
    expect(playGoSounds).not.toHaveBeenCalled()
    rerender(<GoTable playerId="alice" connected view={view({ moveCount: 3, captures: { black: 3, white: 1 } })} table={table()} />)
    expect(playGoSounds).toHaveBeenCalledWith([{ kind: 'place' }, { kind: 'capture', stones: 1 }])
  })

  it('muted stays muted across tables', () => {
    render(<GoTable playerId="alice" connected view={view()} table={table()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sound on' }))
    cleanup()
    const { rerender } = render(<GoTable playerId="alice" connected view={view()} table={table()} />)
    rerender(<GoTable playerId="alice" connected view={view({ moveCount: 3 })} table={table()} />)
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeTruthy()
    expect(playGoSounds).not.toHaveBeenCalled()
  })

  it('moves heard while muted are not replayed on unmuting', () => {
    const { rerender } = render(<GoTable playerId="alice" connected view={view()} table={table()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sound on' }))
    rerender(<GoTable playerId="alice" connected view={view({ moveCount: 3 })} table={table()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sound off' }))
    expect(playGoSounds).not.toHaveBeenCalled()
    rerender(<GoTable playerId="alice" connected view={view({ moveCount: 4 })} table={table()} />)
    expect(playGoSounds).toHaveBeenCalledTimes(1)
    expect(playGoSounds).toHaveBeenCalledWith([{ kind: 'place' }])
  })

  it('without storage, sound starts on and mute holds for the visit', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    render(<GoTable playerId="alice" connected view={view()} table={table()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Sound on' }))
    expect(screen.getByRole('button', { name: 'Sound off' })).toBeTruthy()
  })

  it('a key or a touch at the table readies audio', () => {
    mount()
    fireEvent.keyDown(board().getByRole('button', { name: 'Play C9' }), { key: 'ArrowRight' })
    expect(unlockGoSounds).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(screen.getByTestId('go-status'))
    expect(unlockGoSounds).toHaveBeenCalledTimes(2)
  })
})
