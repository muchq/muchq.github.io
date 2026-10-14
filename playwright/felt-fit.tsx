import { createRoot } from 'react-dom/client'
import SpadesTable from '@/apps/spades/components/SpadesTable'
import type { Card, SpadesPlayer, SpadesView } from '@/apps/spades/wire'
import lobby from '@/apps/lobby/components/LobbyGame.module.css'

// Four-seat mid-game: header, felt, score sheet and a hand history —
// the chrome that has to share the overlay with the circle.

const c = (spelled: string): Card => ({ rank: spelled.slice(0, -1), suit: spelled.slice(-1) })

const NAMES = ['alice', 'bob', 'cat', 'dan']
const myHand = ['A♠', '7♠', 'K♥', '4♥', '9♣', '2♦']

const seats = (): SpadesPlayer[] =>
  NAMES.map((playerId, seat) => ({
    playerId,
    team: seat % 2,
    handCount: 6,
    hand: playerId === 'alice' ? myHand.map(c) : [],
    tricks: 0,
    bid: seat === 0 ? 3 : seat === 1 ? 0 : seat === 2 ? 4 : 2,
  }))

const view: SpadesView = {
  gameId: 'S1',
  phase: 'playing',
  players: seats(),
  dealer: 'dan',
  currentPlayerId: 'alice',
  handNumber: 2,
  trick: [],
  spadesBroken: false,
  legal: [c('K♥'), c('4♥'), c('9♣'), c('2♦')],
  teams: [
    { players: ['alice', 'cat'], score: 62, bags: 2, gamesWon: 1 },
    { players: ['bob', 'dan'], score: -40, bags: 0, gamesWon: 0 },
  ],
  hands: [{ bids: [3, 0, 4, 2], tricks: [5, 1, 4, 3], points: [72, -100], scores: [72, -100] }],
}

const table = {
  opening: false,
  sending: false,
  startTable: () => undefined,
  leaveTable: () => undefined,
  playAgain: () => undefined,
  bid: () => undefined,
  play: () => undefined,
  deal: () => undefined,
}

createRoot(document.getElementById('root')!).render(
  <div className={lobby.tableOverlay} data-table-overlay>
    <SpadesTable playerId="alice" connected view={view} table={table} />
  </div>
)
