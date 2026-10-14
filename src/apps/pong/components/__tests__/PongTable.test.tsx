import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PongTable, { type PongTableProps } from '../PongTable'
import type { PongFrame, PongView } from '../../wire'

const court = { width: 0, height: 400, depth: 600, paddleWidth: 0, paddleHeight: 80, ballRadius: 10, inset: 7, playerSpeed: 8, ticksPerSecond: 60 }
const tunnel = { width: 400, height: 300, depth: 800, paddleWidth: 100, paddleHeight: 75, ballRadius: 12, inset: 10, playerSpeed: 12, ticksPerSecond: 60 }

const view = (over: Partial<PongView> = {}): PongView => ({
  gameId: 'P1',
  phase: 'playing',
  variant: 'smallcat',
  court,
  players: [
    { playerId: 'alice', lives: 3 },
    { playerId: 'bob', lives: 2 }
  ],
  scoreSheet: [],
  ...over
})

const frame: PongFrame = {
  gameId: 'P1',
  tick: 10,
  ball: { x: 0, y: 200, z: 300 },
  velocity: { x: 0, y: 1, z: 1 },
  paddles: [
    { x: 0, y: 120 },
    { x: 0, y: 200 }
  ],
  serveIn: 0
}

const table = (over: Partial<PongTableProps['table']> = {}): PongTableProps['table'] => ({
  opening: false,
  seating: false,
  latestFrame: () => ({ frame, receivedAt: 0 }),
  startTable: vi.fn(),
  playAgain: vi.fn(),
  leaveTable: vi.fn(),
  addBot: vi.fn(),
  aim: vi.fn(),
  aimNow: vi.fn(),
  ...over
})

const mount = (props: Partial<PongTableProps> = {}) => {
  const held = props.table ?? table()
  render(<PongTable playerId="alice" connected view={view()} {...props} table={held} />)
  return held
}

const status = () => screen.getByRole('status').textContent

// An Audio that remembers what it was asked to play, aloud or muted.
class FakeAudio {
  static aloud: string[] = []
  static muted: string[] = []
  static made: FakeAudio[] = []
  muted = false
  currentTime = 0
  constructor(public src: string) {
    FakeAudio.made.push(this)
  }
  play() {
    ;(this.muted ? FakeAudio.muted : FakeAudio.aloud).push(this.src.replace('/audio/smallcat/', '').replace('.wav', ''))
    return Promise.resolve()
  }
  pause() {}
}

describe('PongTable', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
    FakeAudio.aloud = []
    FakeAudio.muted = []
    FakeAudio.made = []
    vi.stubGlobal('Audio', FakeAudio)
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // Alone at a table, a bot can take the second seat, at a level picked.
  it('alone, offers smallcat’s bot at the level picked', () => {
    const held = mount({ view: view({ phase: 'waiting', variant: undefined, court: undefined, players: [{ playerId: 'alice' }] }) })
    expect(status()).toBe('Waiting for a second seat.')
    expect(screen.queryByRole('button', { name: 'Start' })).toBeNull()
    const bot = screen.getByRole('combobox', { name: 'Bot' })
    // Labelled on screen, not only for screen readers: a phone's picker shows the options alone.
    expect(bot.closest('label')?.firstChild?.textContent).toBe('Bot')
    expect(within(bot).getAllByRole('option').map(option => option.textContent)).toEqual(['Easy', 'Medium', 'Hard'])
    fireEvent.change(bot, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add a bot' }))
    expect(held.addBot).toHaveBeenCalledWith(3)
    fireEvent.click(screen.getByRole('button', { name: 'Leave table' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('starts nothing with the link down, and plays again once only', () => {
    const seated = [{ playerId: 'alice' }, { playerId: 'bob' }]
    render(<PongTable playerId="alice" connected={false} view={view({ phase: 'waiting', variant: undefined, court: undefined, players: seated })} table={table()} />)
    expect(screen.getByRole('combobox', { name: 'Court' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Start' })).toHaveProperty('disabled', true)
    cleanup()
    const ended = view({ phase: 'ended', players: seated, result: { winner: 'bob', ending: 'points' } })
    render(<PongTable playerId="alice" connected={false} view={ended} table={table()} />)
    expect(screen.getByRole('button', { name: 'Play again' })).toHaveProperty('disabled', true)
    cleanup()
    mount({ view: ended, table: table({ opening: true }) })
    expect(screen.getByRole('button', { name: 'Play again' })).toHaveProperty('disabled', true)
  })

  it('with both seats filled, starts on the court picked', () => {
    const held = mount({ view: view({ phase: 'waiting', variant: undefined, court: undefined, players: [{ playerId: 'alice' }, { playerId: 'smallcat@2', bot: true }] }) })
    expect(screen.getByText('smallcat bot (Medium)')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add a bot' })).toBeNull()
    const courtPick = screen.getByRole('combobox', { name: 'Court' })
    expect(courtPick.closest('label')?.firstChild?.textContent).toBe('Court')
    expect(within(courtPick).getAllByRole('option').map(option => option.textContent)).toEqual(['2D', '3D'])
    fireEvent.change(courtPick, { target: { value: '3d' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(held.startTable).toHaveBeenCalledWith('3d')
  })

  // A pairing's table starts itself once its pair is seated: no bot, no court.
  it('at a round robin pairing, offers neither bot nor court', () => {
    mount({ view: view({ phase: 'waiting', variant: undefined, court: undefined, players: [{ playerId: 'alice' }], roundRobinId: 'E1' }) })
    expect(status()).toBe('Round robin pairing: it starts when your opponent sits.')
    expect(screen.queryByRole('button', { name: 'Add a bot' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Court' })).toBeNull()
  })

  it('in play, shows each seat’s lives and that leaving forfeits', () => {
    const held = mount()
    expect(screen.getByRole('img', { name: /pong court/ })).toBeTruthy()
    const seats = within(screen.getByRole('list', { name: 'Players' }))
    expect(seats.getAllByRole('listitem').map(item => item.textContent)).toEqual(['alice (you) · red · 3 lives', 'bob · green · 2 lives'])
    // A stray tap above a court played by touch forfeits nothing: it asks first.
    fireEvent.click(screen.getByRole('button', { name: 'Leave (forfeits)' }))
    expect(held.leaveTable).not.toHaveBeenCalled()
    const keep = screen.getByRole('button', { name: 'Keep playing' })
    keep.focus()
    fireEvent.click(keep)
    expect(screen.queryByRole('button', { name: 'Forfeit' })).toBeNull()
    // Back to the game: the keyboard is back on the court.
    expect(document.activeElement).toBe(screen.getByRole('img', { name: /pong court/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Leave (forfeits)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Forfeit' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  // A watcher is told which colour is whose: red is the second seat's, on the right.
  it('tells a watcher whose paddle is which colour', () => {
    mount({ playerId: 'carol' })
    const seats = within(screen.getByRole('list', { name: 'Players' }))
    expect(seats.getAllByRole('listitem').map(item => item.textContent)).toEqual(['alice · green · 3 lives', 'bob · red · 2 lives'])
  })

  // A pressed key runs the paddle for the court's edge at full speed, past
  // the keyboard's repeat delay; letting go stops it where it has got to:
  // the last frame's paddle, moved on at the court's speed since. Neither
  // waits on the pointer's throttle, so a tap is never undone.
  it('runs the paddle while an arrow key is held, and stops it where it got to', () => {
    vi.spyOn(performance, 'now').mockReturnValue(50)
    const held = mount()
    const canvas = screen.getByRole('img', { name: /pong court/ })
    fireEvent.keyDown(canvas, { key: 'ArrowUp' })
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 0)
    fireEvent.keyDown(canvas, { key: 'ArrowUp', repeat: true })
    expect(held.aimNow).toHaveBeenCalledTimes(1)
    fireEvent.keyUp(canvas, { key: 'ArrowUp' })
    // 50ms is 3 ticks at 8 a tick.
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 120 - 3 * 8)
    fireEvent.keyDown(canvas, { key: 'ArrowDown' })
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 400)
    expect(held.aim).not.toHaveBeenCalled()
  })

  // Released past the court's end, it stops at the end, not beyond.
  it('stops no further than where the key was running it', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5000)
    const held = mount()
    const canvas = screen.getByRole('img', { name: /pong court/ })
    fireEvent.keyDown(canvas, { key: 'ArrowUp' })
    fireEvent.keyUp(canvas, { key: 'ArrowUp' })
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 0)
  })

  // The 3D court moves across too; from the second seat, x is mirrored.
  it('in the tunnel, moves across with left and right, mirrored for the second seat', () => {
    const across: PongFrame = { ...frame, paddles: [{ x: 200, y: 150 }, { x: 100, y: 150 }] }
    const held = table({ latestFrame: () => ({ frame: across, receivedAt: 0 }) })
    mount({ playerId: 'bob', view: view({ variant: '3d', court: tunnel }), table: held })
    const canvas = screen.getByRole('img', { name: /pong court/ })
    fireEvent.keyDown(canvas, { key: 'ArrowLeft' })
    expect(held.aimNow).toHaveBeenLastCalledWith(400, 150)
    fireEvent.keyUp(canvas, { key: 'ArrowLeft' })
    fireEvent.keyDown(canvas, { key: 'ArrowRight' })
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 150)
  })

  it('aims the paddle where the pointer is over the court', () => {
    const held = mount()
    const canvas = screen.getByRole('img', { name: /pong court/ })
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 300, height: 200 } as DOMRect)
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 70 })
    expect(held.aim).toHaveBeenLastCalledWith(0, 100)
    // A tap aims too: on touch, a pointer moves only while it drags.
    fireEvent.pointerDown(canvas, { clientX: 160, clientY: 120 })
    expect(held.aim).toHaveBeenLastCalledWith(0, 200)
  })

  it('a watcher sees the rally and touches nothing', () => {
    const held = mount({ playerId: 'carol' })
    expect(screen.getByRole('heading').textContent).toBe('Watching pong P1 · 2D')
    const canvas = screen.getByRole('img', { name: /pong court/ })
    fireEvent.keyDown(canvas, { key: 'ArrowUp' })
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 70 })
    expect(held.aim).not.toHaveBeenCalled()
    expect(held.aimNow).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Stop watching' }))
    expect(held.leaveTable).toHaveBeenCalledTimes(1)
  })

  it('between games, says who won, keeps the score sheet, and plays again on the court picked', () => {
    const held = mount({
      view: view({
        phase: 'ended',
        result: { winner: 'bob', ending: 'points' },
        scoreSheet: [
          { winner: 'alice', ending: 'points' },
          { winner: 'bob', ending: 'points' }
        ]
      })
    })
    expect(status()).toBe('bob won.')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play again' }))
    const sheet = within(screen.getByRole('list', { name: 'Score sheet' }))
    expect(sheet.getAllByRole('listitem').map(item => item.textContent)).toEqual(['Game 1: alice', 'Game 2: bob'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Court' }), { target: { value: '3d' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(held.playAgain).toHaveBeenCalledWith('3d')
  })

  it('says who left a closed table, and offers a new one', () => {
    const held = mount({ view: view({ phase: 'closed', players: [{ playerId: 'alice' }], result: { winner: 'alice', ending: 'abandoned' } }) })
    expect(status()).toBe('You won: your opponent left.')
    // The court no longer answers: the keyboard lands on what does.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Play again' }))
    // A closed table plays again on its own court: nothing to pick.
    expect(screen.queryByRole('combobox', { name: 'Court' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(held.playAgain).toHaveBeenCalledWith('smallcat')
    cleanup()
    mount({ view: view({ phase: 'closed', players: [{ playerId: 'alice' }, { playerId: 'bob' }] }) })
    expect(status()).toBe('bob left the table.')
    cleanup()
    mount({ playerId: 'carol', view: view({ phase: 'closed', players: [{ playerId: 'bob' }], result: { winner: 'bob', ending: 'abandoned' } }) })
    expect(status()).toBe('bob won: the other seat left.')
    cleanup()
    mount({ playerId: 'carol', view: view({ phase: 'closed', players: [{ playerId: 'bob' }] }) })
    expect(status()).toBe('The table closed.')
  })

  it('says what a watcher waits for, and how the tunnel is steered', () => {
    mount({ playerId: 'carol', view: view({ phase: 'waiting', variant: undefined, court: undefined }) })
    expect(status()).toBe('Waiting for the players to start.')
    cleanup()
    mount({ playerId: 'carol', view: view({ phase: 'waiting', variant: undefined, court: undefined, roundRobinId: 'E1' }) })
    expect(status()).toBe('Round robin pairing: it starts when both players sit.')
    cleanup()
    mount({ view: view({ variant: '3d', court: tunnel }) })
    expect(status()).toBe('You’re red, nearest you. Steer with the pointer or the arrow keys.')
  })

  // A pairing's game is its one result.
  it('offers no next game at a round robin pairing', () => {
    mount({ view: view({ phase: 'ended', result: { winner: 'alice', ending: 'points' }, roundRobinId: 'E1' }) })
    expect(status()).toBe('You won.')
    expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull()
  })

  // smallcat's sounds, from the viewer's side: woo when they miss, mah when you do.
  it('plays smallcat’s sound for each miss', () => {
    const held = table()
    const { rerender } = render(<PongTable playerId="alice" connected view={view()} table={held} />)
    rerender(<PongTable playerId="alice" connected view={view({ players: [{ playerId: 'alice', lives: 3 }, { playerId: 'bob', lives: 1 }] })} table={held} />)
    expect(FakeAudio.aloud).toEqual(['woo'])
    rerender(<PongTable playerId="alice" connected view={view({ players: [{ playerId: 'alice', lives: 2 }, { playerId: 'bob', lives: 1 }] })} table={held} />)
    expect(FakeAudio.aloud).toEqual(['woo', 'mah'])
  })

  // A hit is heard where the ball turns back: boo for yours, ping for theirs.
  it('plays smallcat’s sound for each hit, heard between frames', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => frames.push(callback))
    let current: PongFrame = { ...frame, velocity: { x: 0, y: 1, z: -6 } }
    const held = table({ latestFrame: () => ({ frame: current, receivedAt: 0 }) })
    render(<PongTable playerId="alice" connected view={view()} table={held} />)
    const step = () => frames.splice(0).forEach(callback => callback(0))
    current = { ...frame, tick: 12, velocity: { x: 0, y: 1, z: 6 } }
    step()
    expect(FakeAudio.aloud).toEqual(['boo'])
    step()
    expect(FakeAudio.aloud).toEqual(['boo'])
    current = { ...frame, tick: 14, velocity: { x: 0, y: 1, z: -6 } }
    step()
    expect(FakeAudio.aloud).toEqual(['boo', 'ping'])
  })

  // Each view brings a new court; the last frame heard outlives it, so a
  // hit across a view is still heard.
  it('hears a hit across a new view', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => frames.push(callback))
    let current: PongFrame = { ...frame, velocity: { x: 0, y: 1, z: -6 } }
    const held = table({ latestFrame: () => ({ frame: current, receivedAt: 0 }) })
    const { rerender } = render(<PongTable playerId="alice" connected view={view()} table={held} />)
    rerender(<PongTable playerId="alice" connected view={view({ court: { ...court } })} table={held} />)
    current = { ...frame, tick: 12, velocity: { x: 0, y: 1, z: 6 } }
    frames.splice(0).forEach(callback => callback(0))
    expect(FakeAudio.aloud).toEqual(['boo'])
  })

  // iOS plays a sound from a loop only once a gesture has started it: the
  // first touch at the table starts each one, muted.
  it('readies the sounds on the first touch at the table', async () => {
    mount({ view: view({ phase: 'waiting', variant: undefined, court: undefined, players: [{ playerId: 'alice' }] }) })
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Add a bot' }))
    expect(FakeAudio.muted.sort()).toEqual(['boo', 'mah', 'ping', 'woo'])
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Add a bot' }))
    expect(FakeAudio.muted).toHaveLength(4)
    expect(FakeAudio.aloud).toEqual([])
    // Readied, each is unmuted again for the game to play.
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(FakeAudio.made.every(sound => !sound.muted)).toBe(true)
  })

  // On a phone the court is small and a finger hides it: a stick under it
  // runs the paddle for the edge it leans toward and stops it on release,
  // as the arrow keys do.
  it('steers with the stick under the court, and stops on release', () => {
    vi.spyOn(performance, 'now').mockReturnValue(50)
    const held = mount()
    const stick = screen.getByRole('group', { name: 'Paddle stick' })
    vi.spyOn(stick, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100 } as DOMRect)
    fireEvent.pointerDown(stick, { clientX: 50, clientY: 0, pointerId: 1 })
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 0)
    fireEvent.pointerMove(stick, { clientX: 50, clientY: 100, pointerId: 1 })
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 400)
    fireEvent.pointerMove(stick, { clientX: 55, clientY: 95, pointerId: 1 })
    expect(held.aimNow).toHaveBeenCalledTimes(2)
    fireEvent.pointerUp(stick, { pointerId: 1 })
    // 50ms is 3 ticks at 8 a tick, from 120 toward the bottom.
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 144)
    expect(held.aim).not.toHaveBeenCalled()
  })

  // Capture can end with no lift, when the browser takes the pointer back:
  // the paddle stops then too.
  it('stops the paddle when the stick loses its pointer', () => {
    vi.spyOn(performance, 'now').mockReturnValue(50)
    const held = mount()
    const stick = screen.getByRole('group', { name: 'Paddle stick' })
    vi.spyOn(stick, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100 } as DOMRect)
    fireEvent.pointerDown(stick, { clientX: 50, clientY: 100, pointerId: 1 })
    fireEvent.lostPointerCapture(stick, { pointerId: 1 })
    expect(held.aimNow).toHaveBeenLastCalledWith(0, 144)
    fireEvent.pointerMove(stick, { clientX: 50, clientY: 0, pointerId: 1 })
    expect(held.aimNow).toHaveBeenCalledTimes(2)
  })

  it('offers a watcher no stick', () => {
    mount({ playerId: 'carol' })
    expect(screen.queryByRole('group', { name: 'Paddle stick' })).toBeNull()
  })
})
