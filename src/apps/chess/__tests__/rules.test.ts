import { describe, expect, it } from 'vitest'
import {
  imbalance,
  materialBalance,
  applyMove,
  analysisUrl,
  moveRows,
  nameOf,
  pieceImage,
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

// The board as it will be once a move the hub has not yet answered lands.
describe('applyMove', () => {
  const after = (fen: string, uci: string) => Object.fromEntries(applyMove(readBoard(fen), uci))

  it('moves the piece, taking whatever stood on its square', () => {
    expect(after('7k/4P3/6K1/8/8/8/8/8 w - - 0 1', 'g6f7')).toEqual({ h8: 'k', e7: 'P', f7: 'K' })
    expect(after('7k/6P1/6K1/8/8/8/8/8 b - - 0 1', 'h8g7')).toEqual({ g7: 'k', g6: 'K' })
  })

  it('promotes to the piece named, in the mover’s color', () => {
    expect(after('7k/4P3/6K1/8/8/8/8/8 w - - 0 1', 'e7e8n')).toEqual({ h8: 'k', e8: 'N', g6: 'K' })
    expect(after('8/8/8/8/8/6k1/4p3/7K b - - 0 1', 'e2e1q')).toEqual({ g3: 'k', e1: 'q', h1: 'K' })
  })

  it('castles the rook with the king', () => {
    expect(after('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1')).toEqual({ a8: 'r', e8: 'k', h8: 'r', a1: 'R', f1: 'R', g1: 'K' })
    expect(after('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1', 'e8c8')).toEqual({ c8: 'k', d8: 'r', h8: 'r', a1: 'R', e1: 'K', h1: 'R' })
  })

  it('takes en passant the pawn beside, not the empty square landed on', () => {
    expect(after('7k/8/8/3pP3/8/8/8/7K w - d6 0 1', 'e5d6')).toEqual({ h8: 'k', d6: 'P', h1: 'K' })
  })

  // Only a king two files over castles, and only a pawn's diagonal onto
  // an empty square is en passant.
  it('leaves everything else where it stands', () => {
    expect(after('7k/8/8/8/8/8/8/R3K2R w K - 0 1', 'e1f1')).toEqual({ h8: 'k', a1: 'R', f1: 'K', h1: 'R' })
    expect(after('7k/8/8/3pP3/8/8/8/7K w - - 0 1', 'e5e6')).toEqual({ h8: 'k', d5: 'p', e6: 'P', h1: 'K' })
    expect(after('7k/8/3n4/3pP3/8/8/8/7K w - - 0 1', 'e5d6')).toEqual({ h8: 'k', d6: 'P', d5: 'p', h1: 'K' })
    expect(after('7k/8/8/8/8/8/8/7K w - - 0 1', 'a1a2')).toEqual({ h8: 'k', h1: 'K' })
  })
})

// Pawn 1, knight and bishop 3, rook 5, queen 9; kings uncounted.
describe('materialBalance', () => {
  const balance = (fen: string) => materialBalance(readBoard(fen))

  it('is even in the starting position', () => {
    expect(balance('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(0)
  })

  it('counts White’s lead up and Black’s down', () => {
    expect(balance('7k/4P3/6K1/8/8/8/8/8 w - - 0 1')).toBe(1)
    expect(balance('r3k3/8/8/8/8/8/8/1N2K3 w - - 0 1')).toBe(-2)
    expect(balance('3qk3/8/8/8/8/8/8/1B1RK3 w - - 0 1')).toBe(-1)
  })
})

// What each side has over the other, piece by piece: equal trades cancel,
// a promotion is just another queen.
describe('imbalance', () => {
  const of = (fen: string) => imbalance(readBoard(fen))

  it('is nothing in the starting position', () => {
    expect(of('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual({ white: [], black: [] })
  })

  it('lists each side’s extras, heaviest first', () => {
    expect(of('7k/4P3/6K1/8/8/8/8/8 w - - 0 1')).toEqual({ white: ['p'], black: [] })
    expect(of('3rk3/8/8/8/8/8/1pp5/3QK3 w - - 0 1')).toEqual({ white: ['q'], black: ['r', 'p', 'p'] })
  })

  it('counts a promoted queen as a queen', () => {
    expect(of('3qk3/8/8/8/8/8/8/Q2QK3 w - - 0 1')).toEqual({ white: ['q'], black: [] })
  })
})

describe('pieceImage', () => {
  // Drawn, not typeset: a system font's ♝ and ♟ are near twins at board
  // size, and every platform draws them differently.
  it('draws each of the twelve pieces with its own image', () => {
    const images = [...'KQRBNPkqrbnp'].map(pieceImage)
    for (const image of images) expect(image).toBeTruthy()
    expect(new Set(images).size).toBe(12)
  })

  it('draws nothing for a letter that is not a piece', () => {
    expect(pieceImage('x')).toBeUndefined()
    expect(pieceImage('')).toBeUndefined()
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

// A bot's seat is named for its engine and strength; a player's id is
// already their name.
describe('nameOf', () => {
  it('reads a bot’s seat as its engine and strength', () => {
    expect(nameOf('stockfish@1500')).toBe('Stockfish 1500')
    expect(nameOf('bouncy-coral-quokka-x9k2')).toBe('bouncy-coral-quokka-x9k2')
  })

  it('names a bot that won', () => {
    expect(describeResult({ winner: 'stockfish@1500', winnerColor: 'white', ending: 'checkmate' }, 'alice')).toBe(
      'Stockfish 1500 won by checkmate'
    )
  })
})

describe('moveRows', () => {
  it('numbers moves from the start position, a row a full move', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(moveRows(start, ['e4', 'e5', 'Nf3'])).toEqual([
      { number: 1, white: { san: 'e4', ply: 1 }, black: { san: 'e5', ply: 2 } },
      { number: 2, white: { san: 'Nf3', ply: 3 } }
    ])
  })

  it('starts on the black half when Black moves first, counting from the FEN', () => {
    expect(moveRows('7k/8/6K1/8/8/8/4p3/8 b - - 0 12', ['Kg8', 'Kf6'])).toEqual([
      { number: 12, black: { san: 'Kg8', ply: 1 } },
      { number: 13, white: { san: 'Kf6', ply: 2 } }
    ])
  })

  it('has no rows for no moves', () => {
    expect(moveRows('7k/8/6K1/8/8/8/4p3/8 b - - 0 1', [])).toEqual([])
  })
})

describe('analysisUrl', () => {
  it('opens the position on lichess, its spaces as underscores', () => {
    expect(analysisUrl('4Q2k/8/6K1/8/8/8/8/8 b - - 0 1')).toBe('https://lichess.org/analysis/standard/4Q2k/8/6K1/8/8/8/8/8_b_-_-_0_1')
  })
})
