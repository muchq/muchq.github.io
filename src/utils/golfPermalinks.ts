/**
 * Golf permalink utilities for URL parameter parsing and validation
 */

export interface GolfRouteParams extends Record<string, string | undefined> {
  roomId?: string
  gameId?: string
}

export interface ParsedPermalinkParams {
  roomId: string | null
  gameId: string | null
  isValid: boolean
  error?: string
}

/**
 * Validates if a room or game ID has the correct format
 * IDs should be alphanumeric strings
 */
export function isValidId(id: string | undefined): boolean {
  if (!id) return false
  // Check if ID is alphanumeric (letters and numbers only)
  return /^[a-zA-Z0-9]+$/.test(id)
}

/**
 * Parses URL parameters for golf permalinks
 * Returns parsed and validated room and game IDs
 */
export function parsePermalinkParams(params: GolfRouteParams): ParsedPermalinkParams {
  const { roomId, gameId } = params
  
  // If no parameters provided, return valid empty state
  if (!roomId && !gameId) {
    return {
      roomId: null,
      gameId: null,
      isValid: true
    }
  }
  
  // Validate room ID if provided
  if (roomId && !isValidId(roomId)) {
    return {
      roomId: null,
      gameId: null,
      isValid: false,
      error: 'Invalid room ID format. Room IDs must be alphanumeric.'
    }
  }
  
  // Validate game ID if provided
  if (gameId && !isValidId(gameId)) {
    return {
      roomId: roomId || null,
      gameId: null,
      isValid: false,
      error: 'Invalid game ID format. Game IDs must be alphanumeric.'
    }
  }
  
  // Game ID requires room ID
  if (gameId && !roomId) {
    return {
      roomId: null,
      gameId: null,
      isValid: false,
      error: 'Game ID provided without room ID. Game permalinks require both room and game IDs.'
    }
  }
  
  return {
    roomId: roomId || null,
    gameId: gameId || null,
    isValid: true
  }
}

/**
 * Generates a room permalink URL
 */
export function generateRoomPermalink(roomId: string): string {
  if (!isValidId(roomId)) {
    throw new Error('Invalid room ID provided for permalink generation')
  }
  return `/golf/room/${roomId}`
}

/**
 * Generates a game permalink URL
 */
export function generateGamePermalink(roomId: string, gameId: string): string {
  if (!isValidId(roomId)) {
    throw new Error('Invalid room ID provided for permalink generation')
  }
  if (!isValidId(gameId)) {
    throw new Error('Invalid game ID provided for permalink generation')
  }
  return `/golf/room/${roomId}/game/${gameId}`
}

/**
 * Extracts room and game IDs from a permalink URL
 * Useful for parsing shared URLs
 */
export function extractIdsFromUrl(url: string): ParsedPermalinkParams {
  try {
    const urlObj = new URL(url, window.location.origin)
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0)
    
    // Expected patterns:
    // /golf/room/{roomId}
    // /golf/room/{roomId}/game/{gameId}
    
    if (pathParts.length < 3 || pathParts[0] !== 'golf' || pathParts[1] !== 'room') {
      return {
        roomId: null,
        gameId: null,
        isValid: false,
        error: 'URL does not match golf permalink pattern'
      }
    }
    
    const roomId = pathParts[2]
    let gameId: string | undefined
    
    if (pathParts.length >= 5 && pathParts[3] === 'game') {
      gameId = pathParts[4]
    }
    
    return parsePermalinkParams({ roomId, gameId })
  } catch {
    return {
      roomId: null,
      gameId: null,
      isValid: false,
      error: 'Invalid URL format'
    }
  }
}