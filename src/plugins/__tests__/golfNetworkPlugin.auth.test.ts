import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GolfNetworkPlugin } from '../golfNetworkPlugin'
import type { NetworkContext } from '@/types/network'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock
})

describe('GolfNetworkPlugin - Authentication', () => {
  let plugin: GolfNetworkPlugin
  let mockContext: NetworkContext
  let sentMessages: unknown[]

  beforeEach(() => {
    // Clear localStorage
    localStorageMock.clear()

    // Reset sent messages
    sentMessages = []

    // Create mock context
    mockContext = {
      send: vi.fn((msg) => {
        sentMessages.push(msg)
      }),
      broadcast: vi.fn(),
      getConnectionId: vi.fn(() => 'test-connection'),
      getGameState: vi.fn(() => ({
        playerId: null,
        gameState: null,
        roomState: null,
        gameContext: null,
        isInLobby: true
      })) as NetworkContext['getGameState'],
      updateGameState: vi.fn(),
      isConnected: vi.fn(() => true)
    }

    // Create plugin with callbacks
    plugin = new GolfNetworkPlugin({
      onRoomJoined: vi.fn(),
      onGameJoined: vi.fn(),
      onGameStateUpdate: vi.fn(),
      onRoomStateUpdate: vi.fn(),
      onNotification: vi.fn(),
      onGameEnded: vi.fn(),
      onNewGameStarted: vi.fn()
    })
  })

  describe('onConnect', () => {
    it('should send authenticate message with empty token for new session', () => {
      // Call onConnect
      plugin.onConnect(mockContext)

      // Verify authenticate message was sent
      expect(sentMessages).toHaveLength(1)
      expect(sentMessages[0]).toMatchObject({
        type: 'authenticate',
        sessionToken: ''
      })
    })

    it('should send authenticate message with stored token for reconnection', () => {
      // Store a token in localStorage
      const storedToken = 'test-session-token-12345'
      localStorage.setItem('golf_session_token', storedToken)

      // Call onConnect
      plugin.onConnect(mockContext)

      // Verify authenticate message was sent with stored token
      expect(sentMessages).toHaveLength(1)
      expect(sentMessages[0]).toMatchObject({
        type: 'authenticate',
        sessionToken: storedToken
      })
    })
  })

  describe('handleAuthenticated', () => {
    it('should store session token from authenticated message', () => {
      const handlers = plugin.getMessageHandlers()
      const authenticatedHandler = handlers['authenticated']

      // Simulate authenticated message
      const message = {
        type: 'authenticated',
        sessionToken: 'new-token-67890',
        reconnected: false,
        timestamp: Date.now()
      }

      authenticatedHandler(message, mockContext)

      // Verify token was stored
      const storedToken = localStorage.getItem('golf_session_token')
      expect(storedToken).toBe('new-token-67890')
    })

    it('should handle reconnection flag', () => {
      const handlers = plugin.getMessageHandlers()
      const authenticatedHandler = handlers['authenticated']

      // Simulate reconnected session
      const message = {
        type: 'authenticated',
        sessionToken: 'existing-token-abc',
        reconnected: true,
        timestamp: Date.now()
      }

      authenticatedHandler(message, mockContext)

      // Verify token was stored
      const storedToken = localStorage.getItem('golf_session_token')
      expect(storedToken).toBe('existing-token-abc')
    })
  })

  describe('error handling', () => {
    it('should clear session token on authentication error', () => {
      // Store a token first
      localStorage.setItem('golf_session_token', 'invalid-token')

      const handlers = plugin.getMessageHandlers()
      const errorHandler = handlers['error']

      // Simulate authentication error
      const errorMessage = {
        type: 'error',
        message: 'Invalid session token',
        timestamp: Date.now()
      }

      errorHandler(errorMessage, mockContext)

      // Verify token was cleared
      const storedToken = localStorage.getItem('golf_session_token')
      expect(storedToken).toBeNull()
    })

    it('should clear session token on unauthenticated error', () => {
      // Store a token first
      localStorage.setItem('golf_session_token', 'expired-token')

      const handlers = plugin.getMessageHandlers()
      const errorHandler = handlers['error']

      // Simulate unauthenticated error
      const errorMessage = {
        type: 'error',
        message: 'Unauthenticated: please authenticate first',
        timestamp: Date.now()
      }

      errorHandler(errorMessage, mockContext)

      // Verify token was cleared
      const storedToken = localStorage.getItem('golf_session_token')
      expect(storedToken).toBeNull()
    })

    it('should not clear session token on non-auth errors', () => {
      // Store a token first
      localStorage.setItem('golf_session_token', 'valid-token')

      const handlers = plugin.getMessageHandlers()
      const errorHandler = handlers['error']

      // Simulate non-authentication error
      const errorMessage = {
        type: 'error',
        message: 'Room not found',
        timestamp: Date.now()
      }

      errorHandler(errorMessage, mockContext)

      // Verify token was NOT cleared
      const storedToken = localStorage.getItem('golf_session_token')
      expect(storedToken).toBe('valid-token')
    })
  })

  describe('full authentication flow', () => {
    it('should complete new session flow', () => {
      // 1. Connect (no stored token)
      plugin.onConnect(mockContext)

      // Verify authenticate was sent with empty token
      expect(sentMessages).toHaveLength(1)
      expect(sentMessages[0]).toMatchObject({
        type: 'authenticate',
        sessionToken: ''
      })

      // 2. Receive authenticated response
      const handlers = plugin.getMessageHandlers()
      const authenticatedHandler = handlers['authenticated']

      const authResponse = {
        type: 'authenticated',
        sessionToken: 'new-session-abc123',
        reconnected: false,
        timestamp: Date.now()
      }

      authenticatedHandler(authResponse, mockContext)

      // Verify token was stored
      expect(localStorage.getItem('golf_session_token')).toBe('new-session-abc123')
    })

    it('should complete reconnection flow', () => {
      // 1. Store token from previous session
      localStorage.setItem('golf_session_token', 'existing-session-xyz789')

      // 2. Reconnect
      plugin.onConnect(mockContext)

      // Verify authenticate was sent with stored token
      expect(sentMessages).toHaveLength(1)
      expect(sentMessages[0]).toMatchObject({
        type: 'authenticate',
        sessionToken: 'existing-session-xyz789'
      })

      // 3. Receive reconnected response
      const handlers = plugin.getMessageHandlers()
      const authenticatedHandler = handlers['authenticated']

      const authResponse = {
        type: 'authenticated',
        sessionToken: 'existing-session-xyz789',
        reconnected: true,
        timestamp: Date.now()
      }

      authenticatedHandler(authResponse, mockContext)

      // Verify token is still stored
      expect(localStorage.getItem('golf_session_token')).toBe('existing-session-xyz789')
    })
  })

  describe('message validation', () => {
    it('should accept authenticated message type', () => {
      const message = {
        type: 'authenticated',
        sessionToken: 'test',
        timestamp: Date.now()
      }

      expect(plugin.validateMessage(message)).toBe(true)
    })
  })
})
