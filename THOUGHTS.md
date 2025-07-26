# Thoughts Multiplayer WebSocket API

The `thoughts.html` page implements a multiplayer 3D bouncing sphere environment. Here's the WebSocket API specification for the backend server:

## Messages FROM Client TO Server

### 1. Player Join (sent when player connects)
```json
{
  "type": "player_join",
  "playerId": "player-abc123def",
  "position": [12.5, 0, -8.3],
  "color": [0.8, 0.2, 0.6],
  "timestamp": 1703123456789
}
```

### 2. Position Update (sent during movement, throttled to max 20fps)
```json
{
  "type": "position_update", 
  "playerId": "player-abc123def",
  "position": [15.2, 0, -10.1],
  "timestamp": 1703123456890
}
```

### 3. Player Leave (sent when player disconnects)
```json
{
  "type": "player_leave",
  "playerId": "player-abc123def", 
  "timestamp": 1703123456999
}
```

## Messages FROM Server TO Client

### 1. Player Join (broadcast when new player joins)
```json
{
  "type": "player_join",
  "playerId": "player-xyz789ghi", 
  "position": [20.0, 0, 15.5],
  "color": [0.3, 0.9, 0.4],
  "timestamp": 1703123457000
}
```

### 2. Position Update (broadcast player movements)
```json
{
  "type": "position_update",
  "playerId": "player-xyz789ghi",
  "position": [22.1, 0, 16.8], 
  "timestamp": 1703123457100
}
```

### 3. Player Leave (broadcast when player disconnects)
```json
{
  "type": "player_leave",
  "playerId": "player-xyz789ghi",
  "timestamp": 1703123457200
}
```

### 4. Game State (optional - full state sync)
```json
{
  "type": "game_state",
  "players": [
    {
      "playerId": "player-abc123def",
      "position": [15.2, 0, -10.1], 
      "color": [0.8, 0.2, 0.6]
    },
    {
      "playerId": "player-xyz789ghi", 
      "position": [22.1, 0, 16.8],
      "color": [0.3, 0.9, 0.4]
    }
  ],
  "timestamp": 1703123457300
}
```

## Implementation Notes

### Client Behavior
- **Player IDs**: Generated as `'player-' + Math.random().toString(36).substr(2, 9)`
- **Position Format**: `[x, y, z]` where Y is always 0 (ground level)
- **Color Format**: `[r, g, b]` as floats 0.0-1.0
- **Throttling**: Position updates max every 50ms, min 0.1 unit movement
- **World Boundary**: ±50 units in X/Z directions

### Server Responsibilities
1. **Broadcast player_join** to all other clients when new player connects
2. **Relay position_update** to all other clients (don't echo back to sender)
3. **Broadcast player_leave** when client disconnects
4. **Track active players** and their current positions
5. **Optional**: Send full game_state to new players on join

### Error Handling
- Handle malformed JSON gracefully
- Validate position boundaries (±50 units)
- Validate color values (0.0-1.0 range) 
- Clean up players on WebSocket disconnection

## Testing
The client includes a fake server simulation for local testing. In the browser console, you can use:
- `testDisconnection()` - Manually trigger a bot disconnection

## Architecture

The multiplayer system was implemented in 5 steps:

1. **Refactored for multiplayer**: Separated game state, player management, and network communication
2. **Random spawning**: Players spawn at random locations with random colors
3. **WebSocket communication**: Position updates sent to server with throttling
4. **Multi-sphere rendering**: Updated WebGL shader to render multiple bouncing spheres
5. **Disconnection handling**: Players can leave and their spheres disappear from the world

The system uses WebGL2 ray tracing for rendering, with each player represented as a bouncing sphere in a stormy 3D environment.