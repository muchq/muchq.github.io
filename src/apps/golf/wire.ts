// Golf's vocabulary on the room stream, mirroring MoonBase's
// model/golf.smithy, and its translation into the UI's older model
// (types/golf): ids to seat indexes, card slots to nullable cards.

import type { Card, GameState, Player, Room } from '@/types/golf'
import type { HubRoom } from '@/utils/hubStream'

export type GolfPhase = GameState['gamePhase']

interface CardSlot {
  card?: Card
}

export interface GolfWirePlayer {
  playerId: string
  cards: CardSlot[]
  revealedIndexes: number[]
  hasPeeked: boolean
  score?: number
}

export interface GolfView {
  gameId: string
  phase: GolfPhase
  players: GolfWirePlayer[]
  currentPlayerId?: string
  drawPileCount: number
  discardCount: number
  discardTop?: Card
  drawnCard?: Card
  knockedPlayerId?: string
  allPlayersPeeked: boolean
}

export interface GolfGameEnded {
  winner: string
  winners: string[]
  finalScores: { playerId: string; score: number }[]
}

// The golf update union's JSON encoding: exactly one member present.
export interface GolfUpdate {
  gameJoined?: { view: GolfView }
  gameState?: { view: GolfView }
  gameCreated?: { gameId: string; createdBy?: string }
  gameStarted?: Record<string, never>
  turnChanged?: { playerId: string }
  playerKnocked?: { playerId: string }
  gameEnded?: GolfGameEnded
  gameLeft?: { gameId: string }
}

export type GolfMoveName =
  | 'createGame'
  | 'joinGame'
  | 'startGame'
  | 'leaveGame'
  | 'peekCard'
  | 'drawCard'
  | 'takeFromDiscard'
  | 'swapCard'
  | 'discardDrawn'
  | 'knock'
  | 'hideCards'

// The hub has no separate display names: the whimsical playerId is the
// label, so it fills both id and name.
export function stubPlayer(id: string): Player {
  return {
    id,
    name: id,
    cards: [],
    score: 0,
    revealedCards: [],
    isReady: false,
    hasPeeked: false,
    clientId: '',
    totalScore: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    isConnected: true,
    joinedAt: ''
  }
}

// Placeholder seats carrying only a count — the Room shape wants Player[]
// where the hub sends playerCount, and the lobby reads only the length.
function stubSeats(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => stubPlayer(`seat-${i}`))
}

function mapGamePlayer(player: GolfWirePlayer): Player {
  return {
    ...stubPlayer(player.playerId),
    cards: player.cards.map(slot => slot.card ?? null),
    score: player.score ?? 0,
    revealedCards: player.revealedIndexes,
    hasPeeked: player.hasPeeked
  }
}

export function mapGameView(view: GolfView): GameState {
  // The UI renders only the discard top, and holding the top during the
  // take emulation must not "reveal" a card beneath that this client was
  // never sent — so the pile maps to at most one card.
  const discardPile: Card[] = view.discardTop == null ? [] : [view.discardTop]
  const currentSeat = view.currentPlayerId
    ? view.players.findIndex(p => p.playerId === view.currentPlayerId)
    : -1
  return {
    id: view.gameId,
    players: view.players.map(mapGamePlayer),
    // An absent or unknown current player (e.g. an ended game) shows as
    // seat 0; nothing turn-gated renders in those phases.
    currentPlayerIndex: currentSeat >= 0 ? currentSeat : 0,
    drawPile: view.drawPileCount,
    discardPile,
    gamePhase: view.phase,
    knockedPlayerId: view.knockedPlayerId ?? null,
    drawnCard: view.drawnCard ?? null,
    allPlayersPeeked: view.allPlayersPeeked
  }
}

// A room hosts golf and castle tables on one stream (MoonBase#77); this
// lists only golf's.
export function mapRoomState(room: HubRoom): Room {
  const games: Record<string, GameState> = {}
  for (const summary of room.games) {
    if ((summary.game ?? 'golf') !== 'golf') continue
    games[summary.gameId] = {
      id: summary.gameId,
      players: stubSeats(summary.playerCount),
      currentPlayerIndex: 0,
      drawPile: 0,
      discardPile: [],
      gamePhase: summary.status as GolfPhase,
      knockedPlayerId: null,
      drawnCard: null,
      allPlayersPeeked: false
    }
  }
  return {
    id: room.roomId,
    players: room.players.map(info => ({
      ...stubPlayer(info.playerId),
      isConnected: info.connected,
      totalScore: info.totalScore,
      gamesPlayed: info.gamesPlayed,
      gamesWon: info.gamesWon
    })),
    games,
    gameHistory: [],
    createdAt: '',
    lastActivity: ''
  }
}
