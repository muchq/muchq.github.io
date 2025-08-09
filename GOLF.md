# Golf Card Game WebSocket API

The golf game implements a multiplayer 4-card golf card game. Here's the WebSocket API specification for the backend server:

## Messages FROM Client TO Server

### 1. Create Game (sent to create a new game room)
```json
{
  "type": "createGame"
}
```
Note: Server will assign player ID and generate a display name

### 2. Join Game (sent to join an existing game room)
```json
{
  "type": "joinGame",
  "gameId": "ABC123"
}
```
Note: Server will assign player ID and generate a display name

### 3. Start Game (sent by any player to start the game)
```json
{
  "type": "startGame"
}
```
Note: Game requires at least 2 players to start

### 4. Peek Card (sent during initial phase to peek at own cards)
```json
{
  "type": "peekCard",
  "cardIndex": 0
}
```
Note: Each player can peek at exactly 2 of their 4 cards at the start

### 5. Draw Card (sent on player's turn to draw from deck)
```json
{
  "type": "drawCard"
}
```

### 6. Take From Discard (sent on player's turn to take the top discard)
```json
{
  "type": "takeFromDiscard"
}
```

### 7. Swap Card (sent after drawing to swap with one of player's cards)
```json
{
  "type": "swapCard",
  "cardIndex": 3
}
```

### 8. Discard Drawn (sent to discard the drawn card without swapping)
```json
{
  "type": "discardDrawn"
}
```

### 9. Knock (sent to signal last round)
```json
{
  "type": "knock"
}
```
Note: Only available when it's the player's turn and they haven't drawn yet

### 10. Hide Cards (sent to hide cards after peek countdown)
```json
{
  "type": "hideCards"
}
```
Note: Sent by the client after a client-side countdown when all players have peeked

## Messages FROM Server TO Client

### 1. Game Joined (sent after successfully creating/joining a game)
```json
{
  "type": "gameJoined",
  "playerId": "player_abc123",
  "gameState": {
    "id": "ABC123",
    "players": [
      {
        "id": "player_abc123",
        "name": "Alice",
        "cards": [null, null, null, null],
        "score": 0,
        "revealedCards": [],
        "isReady": false,
        "hasPeeked": false
      }
    ],
    "currentPlayerIndex": 0,
    "drawPile": 52,
    "discardPile": [],
    "gamePhase": "waiting",
    "knockedPlayerId": null,
    "drawnCard": null,
    "allPlayersPeeked": false
  }
}
```

### 2. Game State Update (broadcast to all players on any state change)
```json
{
  "type": "gameState",
  "gameState": {
    "id": "ABC123",
    "players": [
      {
        "id": "player_abc123",
        "name": "Alice",
        "cards": [
          {"rank": "7", "suit": "♠"},
          {"rank": "K", "suit": "♥"},
          null,
          null
        ],
        "score": 17,
        "revealedCards": [0, 1],
        "isReady": true
      },
      {
        "id": "player_def456",
        "name": "Bob",
        "cards": [null, null, null, null],
        "score": 0,
        "revealedCards": [2, 3],
        "isReady": true
      }
    ],
    "currentPlayerIndex": 0,
    "drawPile": 41,
    "discardPile": [{"rank": "3", "suit": "♦"}],
    "gamePhase": "playing", 
    "knockedPlayerId": null,
    "drawnCard": null,
    "allPlayersPeeked": false
  }
}
```

### 3. Error (sent when an invalid action is attempted)
```json
{
  "type": "error",
  "message": "Not your turn"
}
```

### 4. Game Started (broadcast when game begins)
```json
{
  "type": "gameStarted"
}
```

### 5. Turn Changed (broadcast when turn changes)
```json
{
  "type": "turnChanged",
  "playerName": "Bob"
}
```

### 6. Player Knocked (broadcast when a player knocks)
```json
{
  "type": "playerKnocked",
  "playerName": "Alice"
}
```

### 7. Game Ended (broadcast when game ends)
```json
{
  "type": "gameEnded",
  "winner": "Bob",
  "finalScores": [
    {"playerName": "Alice", "score": 15},
    {"playerName": "Bob", "score": 8}
  ]
}
```

## Implementation Notes

### Game Rules
- **Players**: 2-4 players
- **Cards**: Each player has 4 cards arranged in a 2x2 grid
- **Initial Phase**: Each player must peek at exactly 2 of their cards
- **Objective**: Achieve the lowest score possible
- **Card Values**: 
  - Aces = 1 point
  - 2-10 = Face value
  - Jacks, Queens, Kings = 10 points each
- **Turn Actions**:
  1. Draw from deck OR take top discard card
  2. Either swap with one of your cards OR discard the drawn card
- **Knocking**: A player can knock at the start of their turn to trigger the final round
- **Game End**: After a knock, each other player gets one final turn

### Client Behavior
- **Connection**: WebSocket connection to `ws://localhost:8080`
- **Room Codes**: 6-character alphanumeric codes (uppercase)
- **Player Names**: Max 20 characters
- **Card Grid**: 2x2 layout (indices 0-3)
- **Turn Timer**: Optional - server can implement turn timeouts
- **Auto-disconnect**: Server should handle cleanup on WebSocket close

### Server Responsibilities
1. **Generate unique 6-character room codes** for new games
2. **Assign unique player IDs** when players join
3. **Generate display names** for players (e.g., "Player 1", "Player 2")
4. **Initialize game state** with shuffled deck and dealt cards
5. **Validate all player actions** (correct turn, valid moves, etc.)
6. **Calculate scores** based on revealed cards
7. **Broadcast state updates** to all players in the game
8. **Handle the knock mechanic** and final round
9. **Determine winner** and final scores
10. **Clean up disconnected players** and abandoned games

### Game State Management
- **Waiting Phase**: Players join, minimum 2 to start
- **Playing Phase**: Main game loop with turns
- **Knocked Phase**: After a knock, final round for other players
- **Ended Phase**: Game complete, showing final scores

### Card Management
- **Deck**: Standard 52-card deck
- **Dealing**: 4 cards per player, remaining cards form draw pile
- **Discard Pile**: Starts with one card face-up
- **Hidden Cards**: Server tracks which cards each player has peeked at
- **Drawn Card**: Temporarily held card before swap/discard decision

### Error Handling
- Validate room codes exist
- Prevent duplicate player names in same game
- Ensure proper turn order
- Validate card indices (0-3)
- Prevent peeking at more than 2 cards
- Prevent actions when not player's turn
- Handle mid-game disconnections

## Connection Flow

1. Client establishes WebSocket connection to server
2. Client sends "createGame" or "joinGame" message
3. Server validates and responds with "gameJoined" message
4. Server broadcasts updated "gameState" to all players
5. Players ready up and someone starts the game
6. Initial peeking phase - each player peeks at 2 cards
7. When all players have peeked (allPlayersPeeked=true), client shows 3-second countdown
8. After countdown, client sends "hideCards" message to server
9. Normal gameplay proceeds with turns
10. Game ends when someone knocks and final round completes

## Architecture

The golf game uses:
- React components for UI rendering
- WebSocket for real-time multiplayer communication
- TypeScript interfaces for type safety
- CSS modules for component styling
- Turn-based game state management
- Card visibility tracking per player

The game implements classic 4-card golf rules where players try to achieve the lowest score by swapping cards strategically while having limited information about their hand.