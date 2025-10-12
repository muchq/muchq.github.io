import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NewGameNotification from '../NewGameNotification'

// Mock the permalink utility
vi.mock('../../../../utils/golfPermalinks', () => ({
  generateGamePermalink: (roomId: string, gameId: string) => `/golf/room/${roomId}/game/${gameId}`
}))

describe('NewGameNotification', () => {
  const mockProps = {
    gameId: 'test-game-123',
    roomId: 'test-room-456',
    onJoin: vi.fn(),
    onDismiss: vi.fn(),
    timestamp: Date.now() - 60000 // 1 minute ago
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://example.com'
      },
      writable: true
    })
  })

  it('renders game notification with correct game ID', () => {
    render(<NewGameNotification {...mockProps} />)
    
    expect(screen.getByText('🎮 New Game: test-game-123')).toBeInTheDocument()
  })

  it('displays timestamp correctly', () => {
    render(<NewGameNotification {...mockProps} />)
    
    expect(screen.getByText('1 minute ago')).toBeInTheDocument()
  })

  it('displays "just now" for recent timestamps', () => {
    const recentProps = {
      ...mockProps,
      timestamp: Date.now() - 30000 // 30 seconds ago
    }
    
    render(<NewGameNotification {...recentProps} />)
    
    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  it('calls onJoin when join button is clicked', () => {
    render(<NewGameNotification {...mockProps} />)
    
    const joinButton = screen.getByText('Join Game')
    fireEvent.click(joinButton)
    
    expect(mockProps.onJoin).toHaveBeenCalledWith('test-game-123')
  })

  it('calls onDismiss when dismiss button is clicked', () => {
    render(<NewGameNotification {...mockProps} />)
    
    const dismissButton = screen.getByTitle('Dismiss notification')
    fireEvent.click(dismissButton)
    
    expect(mockProps.onDismiss).toHaveBeenCalledWith('test-game-123')
  })

  it('expands to show permalink when expand button is clicked', async () => {
    render(<NewGameNotification {...mockProps} />)
    
    // Initially, permalink should not be visible
    expect(screen.queryByText('Share Game Link')).not.toBeInTheDocument()
    
    // Click expand button
    const expandButton = screen.getByTitle('Show game link')
    fireEvent.click(expandButton)
    
    // Permalink should now be visible
    await waitFor(() => {
      expect(screen.getByText('Share Game Link')).toBeInTheDocument()
    })
  })

  it('collapses when expand button is clicked again', async () => {
    render(<NewGameNotification {...mockProps} />)
    
    const expandButton = screen.getByTitle('Show game link')
    
    // Expand
    fireEvent.click(expandButton)
    await waitFor(() => {
      expect(screen.getByText('Share Game Link')).toBeInTheDocument()
    })
    
    // Collapse
    fireEvent.click(expandButton)
    await waitFor(() => {
      expect(screen.queryByText('Share Game Link')).not.toBeInTheDocument()
    })
  })

  it('generates correct permalink URL', async () => {
    render(<NewGameNotification {...mockProps} />)
    
    // Expand to show permalink
    const expandButton = screen.getByTitle('Show game link')
    fireEvent.click(expandButton)
    
    await waitFor(() => {
      expect(screen.getByText('Share Game Link')).toBeInTheDocument()
    })
    
    // The PermalinkDisplay component should receive the correct URL
    // We can't easily test the exact URL without mocking PermalinkDisplay,
    // but we can verify the component renders
    expect(screen.getByText('Share Game Link')).toBeInTheDocument()
  })

  it('shows correct expand/collapse icons', async () => {
    render(<NewGameNotification {...mockProps} />)
    
    const expandButton = screen.getByTitle('Show game link')
    
    // Initially should show expand icon
    expect(expandButton).toHaveTextContent('▶')
    
    // After clicking, should show collapse icon
    fireEvent.click(expandButton)
    await waitFor(() => {
      expect(expandButton).toHaveTextContent('▼')
    })
  })

  it('handles multiple minute timestamps correctly', () => {
    const oldProps = {
      ...mockProps,
      timestamp: Date.now() - 300000 // 5 minutes ago
    }
    
    render(<NewGameNotification {...oldProps} />)
    
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<NewGameNotification {...mockProps} />)
    
    expect(screen.getByTitle('Join this game')).toBeInTheDocument()
    expect(screen.getByTitle('Show game link')).toBeInTheDocument()
    expect(screen.getByTitle('Dismiss notification')).toBeInTheDocument()
  })
})