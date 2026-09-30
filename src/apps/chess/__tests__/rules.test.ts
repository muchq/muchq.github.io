import { describe, expect, it } from 'vitest'
import {
  describeResult,
  formatClock,
  lastMoveSquares,
  movesTo,
  pieceName,
  readBoard,
  squaresFor,
  targetsFrom
} from '../rules'

describe('readBoard', () => {
  it('reads the placement field into squares', () => {
    const board = readBoard('7k/4P3/6K1/8/8/8/8/8 w - - 0 1')
    expect(Object.fromEntries(board)).toEqual({ h8: 'k', e7: 'P', g6: 'K' })
  })

  it('reads an empty rank run across the whole board', () => {
    const board = readBoard('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')
    expect(board.size).toBe(32)
    expect(board.get('e4')).toBe('P')
    expect(board.get('e2')).toBeUndefined()
    expect(board.get('a8')).toBe('r')
    expect(board.get('h1')).toBe('R')
  })

  it('reads nothing from nothing', () => {
    expect(readBoard(undefined).size).toBe(0)
    expect(readBoard('').size).toBe(0)
  })
})

describe('squaresFor', () => {
  it('puts White at the bottom: a8 first, h1 last', () => {
    const squares = squaresFor('white')
    expect(squares).toHaveLength(64)
    expect(squares[0]).toBe('a8')
    expect(squares[7]).toBe('h8')
    expect(squares[63]).toBe('h1')
  })

  it('turns the board for Black: h1 first, a8 last', () => {
    const squares = squaresFor('black')
    expect(squares[0]).toBe('h1')
    expect(squares[7]).toBe('a1')
    expect(squares[63]).toBe('a8')
  })
})

describe('moves from the legal list', () => {
  const legal = ['e7e8b', 'e7e8n', 'e7e8q', 'e7e8r', 'g6f5', 'g6f6', 'g6f7', 'g6g5', 'g6h5', 'g6h6']

  it('the targets of a square are the squares its moves reach, once each', () => {
    expect(targetsFrom(legal, 'e7')).toEqual(['e8'])
    expect(targetsFrom(legal, 'g6')).toEqual(['f5', 'f6', 'f7', 'g5', 'h5', 'h6'])
    expect(targetsFrom(legal, 'h8')).toEqual([])
  })

  it('a square to a square is one move, or one per promotion piece', () => {
    expect(movesTo(legal, 'g6', 'f7')).toEqual(['g6f7'])
    expect(movesTo(legal, 'e7', 'e8')).toEqual(['e7e8b', 'e7e8n', 'e7e8q', 'e7e8r'])
    expect(movesTo(legal, 'e7', 'e6')).toEqual([])
  })
})

describe('lastMoveSquares', () => {
  it('names the last move’s two squares, a promotion’s piece aside', () => {
    expect(lastMoveSquares(['e2e4', 'e7e8q'])).toEqual(['e7', 'e8'])
    expect(lastMoveSquares([])).toEqual([])
  })
})

describe('formatClock', () => {
  it('reads minutes and seconds, rounding up so zero means gone', () => {
    expect(formatClock(180_000)).toBe('3:00')
    expect(formatClock(61_001)).toBe('1:02')
    expect(formatClock(10_000)).toBe('0:10')
  })

  it('shows tenths under ten seconds, still rounding up', () => {
    expect(formatClock(9_950)).toBe('0:10')
    expect(formatClock(9_900)).toBe('9.9')
    expect(formatClock(420)).toBe('0.5')
    expect(formatClock(50)).toBe('0.1')
    expect(formatClock(0)).toBe('0.0')
    expect(formatClock(-50)).toBe('0.0')
  })
})

describe('pieceName', () => {
  it('names a piece by its color and kind', () => {
    expect(pieceName('K')).toBe('white king')
    expect(pieceName('p')).toBe('black pawn')
    expect(pieceName('N')).toBe('white knight')
  })
})

describe('describeResult', () => {
  it('speaks to the winner, the loser and a draw', () => {
    const mate = { ending: 'checkmate' as const, winner: 'alice', winnerColor: 'white' as const }
    expect(describeResult(mate, 'alice')).toBe('You won by checkmate')
    expect(describeResult(mate, 'bob')).toBe('alice won by checkmate')
    expect(describeResult({ ending: 'timeout', winner: 'bob', winnerColor: 'black' }, 'alice')).toBe('bob won on time')
    expect(describeResult({ ending: 'resignation', winner: 'bob', winnerColor: 'black' }, 'bob')).toBe('You won by resignation')
    expect(describeResult({ ending: 'abandoned', winner: 'bob', winnerColor: 'black' }, 'bob')).toBe('You won: your opponent left')
    expect(describeResult({ ending: 'stalemate' }, 'alice')).toBe('Draw by stalemate')
    expect(describeResult({ ending: 'insufficientMaterial' }, 'alice')).toBe('Draw: nobody can mate')
    expect(describeResult({ ending: 'fiftyMoves' }, 'alice')).toBe('Draw by the fifty-move rule')
    expect(describeResult({ ending: 'repetition' }, 'alice')).toBe('Draw by repetition')
    // A flag against a bare king draws.
    expect(describeResult({ ending: 'timeout' }, 'alice')).toBe('Draw: time ran out, and a bare king cannot win')
  })
})
