// User-facing golf notification strings, kept apart from the adapter so
// the wording is testable without a wire.

export const JOINED_ROOM = 'Joined room successfully!'
export const JOINED_GAME = 'Joined game successfully!'
export const NEW_GAME = 'New game started!'
export const GAME_STARTED = 'Game started! Each player can peek at 2 cards.'

export const turnMessage = (player: string) => `It's ${player}'s turn`
export const knockedMessage = (player: string) => `${player} has knocked! Last round!`
export const gameOverMessage = (winner: string) => `Game over! Winner: ${winner}`
