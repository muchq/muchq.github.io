/**
 * Golf permalink utilities for URL parameter parsing and validation
 */

import { isGolfV2Enabled } from './golfV2'

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
 * Validates if a room or game ID has the correct format.
 * Hub-minted ids are alphanumeric codes; hyphens are tolerated so an
 * unexpected id shape degrades to an invalid-permalink message instead
 * of a throw mid-render.
 */
export function isValidId(id: string | undefined): boolean {
  if (!id) return false
  return /^[a-zA-Z0-9-]+$/.test(id)
}

/**
 * While the v2 beta is active, minted permalinks carry the opt-in flag so
 * a shared link lands its recipient on the same backend as its sender —
 * a v2 room does not exist on the v1 hub. Deliberately applied on every
 * generated path, not just explicit share links: navigation pushes these
 * into the address bar, and a hand-copied URL must carry the flag too.
 */
function betaSuffix(): string {
  return isGolfV2Enabled() ? '?golf=v2' : ''
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
      error: 'Invalid room ID format. Room IDs may contain only letters, numbers, and hyphens.'
    }
  }
  
  // Validate game ID if provided
  if (gameId && !isValidId(gameId)) {
    return {
      roomId: roomId || null,
      gameId: null,
      isValid: false,
      error: 'Invalid game ID format. Game IDs may contain only letters, numbers, and hyphens.'
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
  return `/golf/room/${roomId}${betaSuffix()}`
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
  return `/golf/room/${roomId}/game/${gameId}${betaSuffix()}`
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