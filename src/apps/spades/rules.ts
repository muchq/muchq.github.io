import { face } from '@/apps/castle/rules'
import type { Card, SpadesResult, SpadesView } from './wire'

// What the spades table says, from the viewer's chair. The rules
// themselves are the hub's: it sends the legal plays with every view.

export { face }

// A bid as it is said: 0 is nil, not zero tricks.
export function bidNumber(bid: number): string {
  return bid === 0 ? 'nil' : `${bid}`
}

export function bidWords(bid: number | undefined): string {
  if (bid === undefined) return 'to bid'
  return bid === 0 ? 'nil' : `bid ${bid}`
}

export const you = (id: string, viewer: string) => (id === viewer ? 'you' : id)
export const You = (id: string, viewer: string) => (id === viewer ? 'You' : id)

// "You & cat" for the viewer's team, "bob & dan" for the other.
export function teamName(view: SpadesView, team: number, viewer: string): string {
  const seats = view.players.filter(player => player.team === team).map(player => you(player.playerId, viewer))
  if (seats[0] === 'you') seats[0] = 'You'
  return seats.join(' & ')
}

export function isLegal(view: SpadesView, card: Card): boolean {
  return view.legal.some(legal => face(legal) === face(card))
}

// The winners' score first: "You and cat won, 520 to 310."
export function describeResult(result: SpadesResult, view: SpadesView, viewer: string): string {
  if (result.ending === 'abandoned') {
    if (view.left === undefined) return 'The game was abandoned.'
    return `${You(view.left, viewer)} left: the game was abandoned.`
  }
  const team = view.players.find(player => player.playerId === result.winners[0])?.team ?? 0
  const [first, second] = [...result.winners].sort((a, b) => Number(b === viewer) - Number(a === viewer))
  const who = first === viewer ? `You and ${second}` : `${first} and ${second}`
  return `${who} won, ${result.scores[team]} to ${result.scores[1 - team]}.`
}
