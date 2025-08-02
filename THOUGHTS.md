# Thoughts Multiplayer WebSocket API

The `thoughts.html` page implements a multiplayer 3D bouncing sphere environment. Here's the WebSocket API specification for the backend server:

## Messages FROM Client TO Server

### 1. Player Join (sent when player connects)
```json
{
  "type": "player_join",
  "position": [12.5, 0, -8.3],
  "color": [0.8, 0.2, 0.6],
  "shape": 0,
  "timestamp": 1703123456789
}
```
Note: playerId is no longer sent by client - server will generate and assign

### 2. Position Update (sent during movement, throttled to max 20fps)
```json
{
  "type": "position_update", 
  "position": [15.2, 0, -10.1],
  "timestamp": 1703123456890
}
```
Note: playerId no longer needed - server tracks client by WebSocket connection

### 3. Shape Update (sent when player changes shape)
```json
{
  "type": "shape_update",
  "shape": 1,
  "timestamp": 1703123456950
}
```
Note: playerId no longer needed - server tracks client by WebSocket connection

### 4. Player Leave (sent when player disconnects)
```json
{
  "type": "player_leave",
  "timestamp": 1703123456999
}
```
Note: playerId no longer needed - server detects disconnection automatically

## Messages FROM Server TO Client

### 1. Welcome (sent to client immediately after connection)
```json
{
  "type": "welcome",
  "playerId": "xyz789ghi",
  "timestamp": 1703123456800
}
```
Note: This is the first message sent to a client after connecting, providing their server-assigned ID (opaque string)

### 2. Player Join (broadcast when new player joins)
```json
{
  "type": "player_join",
  "playerId": "xyz789ghi", 
  "position": [20.0, 0, 15.5],
  "color": [0.3, 0.9, 0.4],
  "shape": 0,
  "timestamp": 1703123457000
}
```

### 3. Position Update (broadcast player movements)
```json
{
  "type": "position_update",
  "playerId": "xyz789ghi",
  "position": [22.1, 0, 16.8], 
  "timestamp": 1703123457100
}
```

### 4. Shape Update (broadcast when player changes shape)
```json
{
  "type": "shape_update",
  "playerId": "xyz789ghi",
  "shape": 2,
  "timestamp": 1703123457150
}
```

### 5. Player Leave (broadcast when player disconnects)
```json
{
  "type": "player_leave",
  "playerId": "xyz789ghi",
  "timestamp": 1703123457200
}
```

### 6. Game State (optional - full state sync)
```json
{
  "type": "game_state",
  "players": [
    {
      "playerId": "abc123def",
      "position": [15.2, 0, -10.1], 
      "color": [0.8, 0.2, 0.6],
      "shape": 1
    },
    {
      "playerId": "xyz789ghi", 
      "position": [22.1, 0, 16.8],
      "color": [0.3, 0.9, 0.4],
      "shape": 2
    }
  ],
  "timestamp": 1703123457300
}
```

## Implementation Notes

### Client Behavior
- **Player IDs**: Assigned by server on connection via "welcome" message
- **Position Format**: `[x, y, z]` where Y is always 0 (ground level)
- **Color Format**: `[r, g, b]` as floats 0.0-1.0
- **Shape Format**: Integer where 0=Sphere, 1=Cube, 2=Pyramid
- **Shape Controls**: Press spacebar to cycle through shapes
- **Throttling**: Position updates max every 50ms, min 0.1 unit movement
- **World Boundary**: ±50 units in X/Z directions

### Server Responsibilities
1. **Generate unique player ID** for each new connection (opaque string format)
2. **Send welcome message** with assigned player ID immediately after connection
3. **Broadcast player_join** to all other clients when new player sends initial join
4. **Relay position_update** to all other clients (don't echo back to sender)
5. **Relay shape_update** to all other clients (don't echo back to sender)
6. **Broadcast player_leave** when client disconnects
7. **Track active players** by WebSocket connection and their current positions/shapes
8. **Optional**: Send full game_state to new players after welcome message

### Error Handling
- Handle malformed JSON gracefully
- Validate position boundaries (±50 units)
- Validate color values (0.0-1.0 range)
- Validate shape values (0-2 range)
- Clean up players on WebSocket disconnection

## Testing
The client includes a fake server simulation for local testing. In the browser console, you can use:
- `testDisconnection()` - Manually trigger a bot disconnection

## Connection Flow

1. Client establishes WebSocket connection to server
2. Server generates unique player ID and sends "welcome" message
3. Client receives welcome message and stores assigned player ID
4. Client sends "player_join" message with initial position, color, and shape
5. Server broadcasts "player_join" to all other connected clients
6. Normal gameplay proceeds with position/shape updates

## Architecture

The multiplayer system was implemented in 5 steps:

1. **Refactored for multiplayer**: Separated game state, player management, and network communication
2. **Random spawning**: Players spawn at random locations with random colors
3. **WebSocket communication**: Position updates sent to server with throttling
4. **Multi-sphere rendering**: Updated WebGL shader to render multiple bouncing spheres
5. **Disconnection handling**: Players can leave and their spheres disappear from the world

The system uses WebGL2 ray tracing for rendering, with each player represented as a bouncing 3D shape (sphere, cube, or pyramid) in a stormy 3D environment. Players can cycle through shapes using the spacebar.