// Golf's notices, kept apart from the table so the wording is testable
// without a wire.

export const GAME_STARTED = 'Game started! Each player can peek at 2 cards.'

export const turnMessage = (player: string) => `It's ${player}'s turn`
export const knockedMessage = (player: string) => `${player} has knocked! Last round!`
export const gameOverMessage = (winner: string) => `Game over! Winner: ${winner}`
