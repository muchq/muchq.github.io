import { describe, expect, it } from 'vitest'
import { goSoundEvents } from '../sounds'
import type { GoView } from '../wire'

const view = (over: Partial<GoView> = {}): GoView => ({
  gameId: 'G01',
  phase: 'playing',
  players: [],
  captures: { black: 0, white: 0 },
  moveCount: 4,
  scoreSheet: [],
  ...over
})

describe('goSoundEvents', () => {
  it('a first view says nothing, even mid-game', () => {
    expect(goSoundEvents(undefined, view({ moveCount: 40, captures: { black: 3, white: 2 } }))).toEqual([])
  })

  it('a stone played, by either side, places', () => {
    expect(goSoundEvents(view(), view({ moveCount: 5, lastMove: { color: 'white', pass: false, x: 1, y: 1 } }))).toEqual([{ kind: 'place' }])
  })

  it('a pass passes, and places nothing', () => {
    expect(goSoundEvents(view(), view({ moveCount: 5, lastMove: { color: 'black', pass: true } }))).toEqual([{ kind: 'pass' }])
  })

  it('a capture follows the placement, counting the stones taken', () => {
    const next = view({ moveCount: 5, lastMove: { color: 'black', pass: false, x: 0, y: 0 }, captures: { black: 3, white: 0 } })
    expect(goSoundEvents(view(), next)).toEqual([{ kind: 'place' }, { kind: 'capture', stones: 3 }])
  })

  it('the same move again, or no move, says nothing', () => {
    const same = view({ captures: { black: 2, white: 0 } })
    expect(goSoundEvents(same, view({ captures: { black: 2, white: 0 } }))).toEqual([])
    expect(goSoundEvents(same, view({ phase: 'ended', captures: { black: 2, white: 0 } }))).toEqual([])
  })

  it('another game’s view says nothing', () => {
    expect(goSoundEvents(view({ moveCount: 1 }), view({ gameId: 'G02', moveCount: 3 }))).toEqual([])
  })

  it('a jump of more than one move says nothing, captures and all', () => {
    const next = view({ moveCount: 7, lastMove: { color: 'black', pass: true }, captures: { black: 4, white: 0 } })
    expect(goSoundEvents(view(), next)).toEqual([])
  })

  it('a move with no lastMove still places', () => {
    expect(goSoundEvents(view(), view({ moveCount: 5 }))).toEqual([{ kind: 'place' }])
  })
})
