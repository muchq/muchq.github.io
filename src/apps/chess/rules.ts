import type { ChessColor, ChessEnding, ChessResult } from './wire'
import wK from './pieces/wK.svg'
import wQ from './pieces/wQ.svg'
import wR from './pieces/wR.svg'
import wB from './pieces/wB.svg'
import wN from './pieces/wN.svg'
import wP from './pieces/wP.svg'
import bK from './pieces/bK.svg'
import bQ from './pieces/bQ.svg'
import bR from './pieces/bR.svg'
import bB from './pieces/bB.svg'
import bN from './pieces/bN.svg'
import bP from './pieces/bP.svg'

// Reading a chess view: the board out of its FEN, which squares a move
// from here reaches, the clock as a player reads it, and a result as a
// sentence. The hub owns the rules; nothing here decides a move is legal.

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

// The placement field: square to piece, FEN's letters (upper case White).
export function readBoard(fen: string | undefined): Map<string, string> {
  const board = new Map<string, string>()
  if (!fen) return board
  const rows = fen.split(' ')[0].split('/')
  rows.forEach((row, index) => {
    const rank = 8 - index
    let file = 0
    for (const char of row) {
      if (char >= '1' && char <= '8') {
        file += Number(char)
        continue
      }
      if (file < 8) board.set(`${FILES[file]}${rank}`, char)
      file += 1
    }
  })
  return board
}

// The 64 squares in reading order from the viewer's chair: their own
// pieces at the bottom.
export function squaresFor(color: ChessColor): string[] {
  const squares: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    for (const file of FILES) squares.push(`${file}${rank}`)
  }
  return color === 'white' ? squares : squares.reverse()
}

// Where the piece on `from` may go.
export function targetsFrom(legal: string[], from: string): string[] {
  const targets = legal.filter(uci => uci.startsWith(from)).map(uci => uci.slice(2, 4))
  return [...new Set(targets)]
}

// The move, or moves — one per piece a promotion can make — from one
// square to another.
export function movesTo(legal: string[], from: string, to: string): string[] {
  return legal.filter(uci => uci.slice(0, 2) === from && uci.slice(2, 4) === to)
}

// The board once `uci` lands, for drawing a move the hub has not yet
// answered: its rook too when a king castles, the pawn beside when one
// takes en passant. The hub's next view is the truth; this only bridges.
export function applyMove(board: Map<string, string>, uci: string): Map<string, string> {
  const next = new Map(board)
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const piece = next.get(from)
  if (piece === undefined) return next
  const white = piece === piece.toUpperCase()
  const kind = piece.toLowerCase()
  const fileStep = FILES.indexOf(to[0]) - FILES.indexOf(from[0])
  if (kind === 'k' && Math.abs(fileStep) === 2) {
    const [rookFrom, rookTo] = fileStep > 0 ? [`h${from[1]}`, `f${from[1]}`] : [`a${from[1]}`, `d${from[1]}`]
    const rook = next.get(rookFrom)
    if (rook !== undefined) {
      next.delete(rookFrom)
      next.set(rookTo, rook)
    }
  }
  if (kind === 'p' && fileStep !== 0 && !next.has(to)) next.delete(`${to[0]}${from[1]}`)
  const promoted = uci[4]
  next.delete(from)
  next.set(to, promoted === undefined ? piece : white ? promoted.toUpperCase() : promoted)
  return next
}

const MATERIAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }

// White's material less Black's, in pawns: positive when White is ahead.
export function materialBalance(board: Map<string, string>): number {
  let balance = 0
  for (const piece of board.values()) {
    const worth = MATERIAL[piece.toLowerCase()] ?? 0
    balance += piece === piece.toUpperCase() ? worth : -worth
  }
  return balance
}

// Each side's pieces beyond the other's, heaviest first, as lower-case
// letters: equal trades cancel, as lichess shows it.
export function imbalance(board: Map<string, string>): { white: string[]; black: string[] } {
  const count = new Map<string, number>()
  for (const piece of board.values()) count.set(piece, (count.get(piece) ?? 0) + 1)
  const white: string[] = []
  const black: string[] = []
  for (const kind of 'qrbnp') {
    const diff = (count.get(kind.toUpperCase()) ?? 0) - (count.get(kind) ?? 0)
    for (let i = 0; i < Math.abs(diff); i++) (diff > 0 ? white : black).push(kind)
  }
  return { white, black }
}

const PROMOTED: Record<string, string> = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }

// A move as a sentence's tail: "h7 to h8", "b2 to b1, promoting to a queen".
export function describeMove(uci: string): string {
  const promoted = PROMOTED[uci[4] ?? '']
  return `${uci.slice(0, 2)} to ${uci.slice(2, 4)}${promoted === undefined ? '' : `, promoting to a ${promoted}`}`
}

export function lastMoveSquares(moves: string[]): string[] {
  const last = moves[moves.length - 1]
  return last === undefined ? [] : [last.slice(0, 2), last.slice(2, 4)]
}

// m:ss, or tenths under ten seconds, where they decide games; rounded up
// either way, so a clock reads zero only once it is gone.
export function formatClock(ms: number): string {
  const left = Math.max(0, ms)
  const tenths = Math.ceil(left / 100)
  if (tenths < 100) return (tenths / 10).toFixed(1)
  const seconds = Math.ceil(left / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const PIECE_NAMES: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn'
}

export function pieceName(piece: string): string {
  const color = piece === piece.toUpperCase() ? 'white' : 'black'
  return `${color} ${PIECE_NAMES[piece.toLowerCase()] ?? 'piece'}`
}

// "rook, 2 pawns" from imbalance's ['r', 'p', 'p'].
export function describeExtras(extras: string[]): string {
  return [...new Set(extras)]
    .map(kind => {
      const n = extras.filter(extra => extra === kind).length
      return n === 1 ? PIECE_NAMES[kind] : `${n} ${PIECE_NAMES[kind]}s`
    })
    .join(', ')
}

const PIECE_IMAGES: Record<string, string> = {
  K: wK, Q: wQ, R: wR, B: wB, N: wN, P: wP,
  k: bK, q: bQ, r: bR, b: bB, n: bN, p: bP
}

// Colin M.L. Burnett's set, the one Wikipedia and lichess draw: drawn
// rather than typeset, so a bishop never reads as a pawn whatever fonts
// the device has.
export function pieceImage(piece: string): string | undefined {
  return PIECE_IMAGES[piece]
}

const WON_BY: Record<ChessEnding, string> = {
  checkmate: 'by checkmate',
  resignation: 'by resignation',
  timeout: 'on time',
  abandoned: '',
  stalemate: '',
  insufficientMaterial: '',
  fiftyMoves: '',
  repetition: ''
}

const DRAWN_BY: Record<ChessEnding, string> = {
  stalemate: 'Draw by stalemate',
  insufficientMaterial: 'Draw: nobody can mate',
  fiftyMoves: 'Draw by the fifty-move rule',
  repetition: 'Draw by repetition',
  timeout: 'Draw: time ran out, and a bare king cannot win',
  checkmate: 'Draw',
  resignation: 'Draw',
  abandoned: 'Draw'
}

// A seat as people read it: a player's id is their name; a bot's
// ("stockfish@1500") its engine and strength. The id's shape is the hub's
// bot-naming contract (games_hub chess_bots.h); a new engine extends it here.
export function nameOf(playerId: string): string {
  const bot = /^stockfish@(\d+)$/.exec(playerId)
  return bot === null ? playerId : `Stockfish ${bot[1]}`
}

export function describeResult(result: ChessResult, playerId: string): string {
  if (result.winner === undefined) return DRAWN_BY[result.ending]
  const mine = result.winner === playerId
  const winner = nameOf(result.winner)
  if (result.ending === 'abandoned') return mine ? 'You won: your opponent left' : `${winner} won: their opponent left`
  return `${mine ? 'You' : winner} won ${WON_BY[result.ending]}`
}
