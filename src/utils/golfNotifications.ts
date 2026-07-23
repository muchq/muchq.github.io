// User-facing golf notification strings, shared by the v1 plugin and the
// v2 adapter so the same game event reads identically on either wire.

export const JOINED_ROOM = 'Joined room successfully!'
export const JOINED_GAME = 'Joined game successfully!'
export const NEW_GAME = 'New game started!'
export const GAME_STARTED = 'Game started! Each player can peek at 2 cards.'

export const turnMessage = (player: string) => `It's ${player}'s turn`
export const knockedMessage = (player: string) => `${player} has knocked! Last round!`
export const gameOverMessage = (winner: string) => `Game over! Winner: ${winner}`
