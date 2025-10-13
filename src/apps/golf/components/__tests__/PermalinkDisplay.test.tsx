import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import PermalinkDisplay from '../PermalinkDisplay'

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn()
}

describe('PermalinkDisplay', () => {
  const defaultProps = {
    label: 'Share Room',
    url: 'https://example.com/golf/room/ABC123'
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true
    })
    
    // Mock secure context
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders the component with label and URL', () => {
      render(<PermalinkDisplay {...defaultProps} />)

      expect(screen.getByText('Share Room')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy share room/i })).toBeInTheDocument()
    })

    it('renders with custom label and URL', () => {
      const customProps = {
        label: 'Share Game',
        url: 'https://example.com/golf/room/ABC123/game/XYZ789'
      }

      render(<PermalinkDisplay {...customProps} />)

      expect(screen.getByText('Share Game')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy share game/i })).toBeInTheDocument()
    })

    it('renders copy button with initial text', () => {
      render(<PermalinkDisplay {...defaultProps} />)

      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      expect(copyButton).toHaveTextContent('Share Room')
    })
  })

  describe('Copy Functionality - Modern Clipboard API', () => {
    it('copies URL to clipboard using modern API', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined)
      
      render(<PermalinkDisplay {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      fireEvent.click(copyButton)
      
      expect(mockClipboard.writeText).toHaveBeenCalledWith(defaultProps.url)
      
      // Check button state changes
      expect(copyButton).toHaveTextContent('Copying...')
      
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Copied!')
      })
      
      // Wait for reset
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Share Room')
      }, { timeout: 3000 })
    })

    it('calls onCopy callback when copy succeeds', async () => {
      const onCopy = vi.fn()
      mockClipboard.writeText.mockResolvedValue(undefined)
      
      render(<PermalinkDisplay {...defaultProps} onCopy={onCopy} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(onCopy).toHaveBeenCalled()
      })
    })

    it('handles clipboard API errors gracefully', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'))
      
      render(<PermalinkDisplay {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Failed')
      })
      
      // Wait for reset
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Share Room')
      }, { timeout: 3000 })
    })
  })

  describe('Button States and Interactions', () => {
    it('disables button while copying', async () => {
      mockClipboard.writeText.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<PermalinkDisplay {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      fireEvent.click(copyButton)
      
      expect(copyButton).toBeDisabled()
      expect(copyButton).toHaveTextContent('Copying...')
      
      await waitFor(() => {
        expect(copyButton).not.toBeDisabled()
      })
    })

    it('prevents multiple simultaneous copy attempts', async () => {
      mockClipboard.writeText.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<PermalinkDisplay {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      
      // Click multiple times rapidly
      fireEvent.click(copyButton)
      fireEvent.click(copyButton)
      fireEvent.click(copyButton)
      
      // Should only be called once
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1)
    })

    it('resets button state after timeout', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined)
      
      render(<PermalinkDisplay {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Copied!')
      })
      
      // Wait for the timeout to reset the button
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Share Room')
      }, { timeout: 3000 })
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label for copy button', () => {
      render(<PermalinkDisplay {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      expect(copyButton).toHaveAttribute('aria-label', 'Copy share room')
    })

    it('has proper aria-label for game permalink', () => {
      const gameProps = {
        label: 'Share Game',
        url: 'https://example.com/golf/room/ABC123/game/XYZ789'
      }
      
      render(<PermalinkDisplay {...gameProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share game/i })
      expect(copyButton).toHaveAttribute('aria-label', 'Copy share game')
    })
  })

  describe('Error Handling', () => {
    it('logs errors to console when copy fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Copy failed')
      mockClipboard.writeText.mockRejectedValue(error)
      
      render(<PermalinkDisplay {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /copy share room/i })
      fireEvent.click(copyButton)
      
      await waitFor(() => {
        expect(copyButton).toHaveTextContent('Failed')
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy permalink:', error)
      
      consoleSpy.mockRestore()
    })
  })
})