import { createRoot } from 'react-dom/client'
import CastleTable from '@/apps/castle/components/CastleTable'
import type { CastlePlayer, CastleView } from '@/apps/castle/wire'
import ChessTable from '@/apps/chess/components/ChessTable'
import type { ChessView } from '@/apps/chess/wire'
import lobby from '@/apps/lobby/components/LobbyGame.module.css'
import RummyTable from '@/apps/rummy/components/RummyTable'
import type { Card as RummyCard, RummyPlayer, RummyView } from '@/apps/rummy/wire'
import SpadesTable from '@/apps/spades/components/SpadesTable'
import type { Card as SpadesCard, SpadesPlayer, SpadesView } from '@/apps/spades/wire'

// One page, many fixtures via ?fixture=. Layout tests mount each under
// the real lobby overlay and measure fit.

export type Fixture = 'spades-2' | 'spades-4' | 'castle' | 'rummy' | 'chess'

const spadesCard = (spelled: string): SpadesCard => ({ rank: spelled.slice(0, -1), suit: spelled.slice(-1) })
const rummyCard = (spelled: string): RummyCard => ({ rank: spelled.slice(0, -1), suit: spelled.slice(-1) })

const SPADES_NAMES = ['alice', 'bob', 'cat', 'dan']
const SPADES_HAND = ['A♠', '7♠', 'K♥', '4♥', '9♣', '2♦']

const spadesSeats = (count: number, over: Partial<Record<string, Partial<SpadesPlayer>>> = {}): SpadesPlayer[] =>
  SPADES_NAMES.slice(0, count).map((playerId, seat) => ({
    playerId,
    team: count === 4 ? seat % 2 : seat,
    handCount: 6,
    hand: playerId === 'alice' ? SPADES_HAND.map(spadesCard) : [],
    tricks: 0,
    bid: seat === 0 ? 3 : seat === 1 ? 0 : seat === 2 ? 4 : 2,
    ...over[playerId],
  }))

const spades2: SpadesView = {
  gameId: 'S2',
  phase: 'playing',
  mode: 'cutthroat',
  handSize: 26,
  players: spadesSeats(2),
  dealer: 'bob',
  currentPlayerId: 'alice',
  handNumber: 2,
  trick: [],
  spadesBroken: false,
  legal: [spadesCard('K♥'), spadesCard('4♥'), spadesCard('9♣'), spadesCard('2♦')],
  teams: [
    { players: ['alice'], score: 31, bags: 1, gamesWon: 0 },
    { players: ['bob'], score: 100, bags: 0, gamesWon: 1 },
  ],
  hands: [{ bids: [3, 0], tricks: [4, 0], points: [31, 100], scores: [31, 100] }],
}

const spades4: SpadesView = {
  gameId: 'S4',
  phase: 'playing',
  mode: 'partners',
  handSize: 13,
  players: spadesSeats(4),
  dealer: 'dan',
  currentPlayerId: 'alice',
  handNumber: 2,
  trick: [],
  spadesBroken: false,
  legal: [spadesCard('K♥'), spadesCard('4♥'), spadesCard('9♣'), spadesCard('2♦')],
  teams: [
    { players: ['alice', 'cat'], score: 62, bags: 2, gamesWon: 1 },
    { players: ['bob', 'dan'], score: -40, bags: 0, gamesWon: 0 },
  ],
  hands: [{ bids: [3, 0, 4, 2], tricks: [5, 1, 4, 3], points: [72, -100], scores: [72, -100] }],
}

const spadesTable = {
  opening: false,
  sending: false,
  startTable: () => undefined,
  leaveTable: () => undefined,
  playAgain: () => undefined,
  bid: () => undefined,
  play: () => undefined,
  deal: () => undefined,
}

const castleSeat = (playerId: string, over: Partial<CastlePlayer> = {}): CastlePlayer => ({
  playerId,
  ready: false,
  handCount: 3,
  hand: [],
  faceUp: [
    { rank: 'J', suit: '♠' },
    { rank: 'J', suit: '♥' },
  ],
  faceDownCount: 3,
  out: false,
  canPlay: false,
  ...over,
})

const castleView: CastleView = {
  gameId: 'C1',
  phase: 'playing',
  players: [
    castleSeat('alice', {
      hand: [
        { rank: 'K', suit: '♦' },
        { rank: 'K', suit: '♣' },
        { rank: 'Q', suit: '♠' },
      ],
    }),
    castleSeat('bob'),
  ],
  currentPlayerId: 'alice',
  drawPileCount: 30,
  pileCount: 2,
  run: [
    { rank: '8', suit: '♠' },
    { rank: '8', suit: '♥' },
  ],
  finished: [],
  lastPlay: { playerId: 'bob', cards: [{ rank: '8', suit: '♥' }], burned: false, pickedUp: false },
}

const castleTable = {
  ended: null,
  selected: [] as number[],
  opening: false,
  startTable: () => undefined,
  leaveTable: () => undefined,
  playAgain: () => undefined,
  swapForSetup: () => undefined,
  ready: () => undefined,
  toggleCard: () => undefined,
  playSelected: () => undefined,
  playFaceDown: () => undefined,
  pickUp: () => undefined,
}

const rummySeat = (playerId: string, hand: string[] = []): RummyPlayer => ({
  playerId,
  handCount: hand.length || 10,
  hand: hand.map(rummyCard),
})

const rummyView: RummyView = {
  gameId: 'R1',
  phase: 'playing',
  variant: '7-card',
  dealNumber: 1,
  standings: [
    { playerId: 'alice', handsWon: 0 },
    { playerId: 'bob', handsWon: 0 },
  ],
  players: [rummySeat('alice', ['K♦', '7♥', '7♣', '8♥', '9♥', '2♠']), rummySeat('bob')],
  currentPlayerId: 'alice',
  stage: 'play',
  stockCount: 30,
  canDrawStock: true,
  canDrawDiscard: true,
  discardCount: 3,
  discardTop: rummyCard('Q♠'),
  melds: [
    { owner: 'bob', cards: [rummyCard('4♣'), rummyCard('5♣'), rummyCard('6♣')] },
    { owner: 'bob', cards: [rummyCard('J♣'), rummyCard('J♦'), rummyCard('J♥')] },
  ],
}

const rummyTable = {
  ended: null,
  selected: [] as string[],
  downTo: null,
  order: 'suit' as const,
  opening: false,
  dealing: false,
  startTable: () => undefined,
  chooseVariant: () => undefined,
  leaveTable: () => undefined,
  playAgain: () => undefined,
  drawStock: () => undefined,
  drawDiscard: () => undefined,
  pickDownTo: () => undefined,
  takeDownMeld: () => undefined,
  takeDownLayOff: () => undefined,
  pass: () => undefined,
  toggleCard: () => undefined,
  meldSelected: () => undefined,
  layOffSelected: () => undefined,
  discardSelected: () => undefined,
  knockSelected: () => undefined,
  setOrder: () => undefined,
}

const chessView: ChessView = {
  gameId: 'G1',
  availableSetups: [
    { setupId: 'random-kpk', name: 'Random K+P vs K' },
    { setupId: 'standard', name: 'Standard starting position' },
  ],
  defaultSetupId: 'standard',
  phase: 'playing',
  variant: 'kpk',
  setupId: 'random-kpk',
  setupName: 'Random K+P vs K',
  players: [
    { playerId: 'alice', color: 'white' },
    { playerId: 'bob', color: 'black' },
  ],
  fen: '7k/4P3/6K1/8/8/8/8/8 w - - 0 1',
  moves: [],
  sideToMove: 'white',
  currentPlayerId: 'alice',
  inCheck: false,
  legalMoves: ['e7e8b', 'e7e8n', 'e7e8q', 'e7e8r', 'g6f5', 'g6f6', 'g6f7', 'g6g5', 'g6h5', 'g6h6'],
  clock: { whiteMs: 180_000, blackMs: 175_000, initialMs: 180_000, incrementMs: 2_000 },
}

const chessTable = {
  opening: false,
  seating: false,
  startTable: () => undefined,
  leaveTable: () => undefined,
  playAgain: () => undefined,
  sent: null,
  play: () => undefined,
  resign: () => undefined,
  addBot: () => undefined,
  reviewGame: () => undefined,
  postChallenge: () => undefined,
}

const fixture = (new URLSearchParams(location.search).get('fixture') ?? 'spades-2') as Fixture

const table =
  fixture === 'spades-2' ? (
    <SpadesTable playerId="alice" connected view={spades2} table={spadesTable} />
  ) : fixture === 'spades-4' ? (
    <SpadesTable playerId="alice" connected view={spades4} table={spadesTable} />
  ) : fixture === 'castle' ? (
    <CastleTable playerId="alice" connected view={castleView} table={castleTable} />
  ) : fixture === 'rummy' ? (
    <RummyTable playerId="alice" connected view={rummyView} table={rummyTable} />
  ) : (
    <ChessTable playerId="alice" connected view={chessView} table={chessTable} />
  )

createRoot(document.getElementById('root')!).render(
  <div className={lobby.tableOverlay} data-table-overlay data-fixture={fixture}>
    {table}
  </div>
)
