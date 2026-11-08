import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LoadBoundary from '../LoadBoundary'

const Throws = () => {
  throw new Error('chunk failed')
}

afterEach(() => vi.restoreAllMocks())

describe('LoadBoundary', () => {
  it('replaces a failed page with a way back, instead of unmounting the app', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <main>
        <p>still here</p>
        <LoadBoundary>
          <Throws />
        </LoadBoundary>
      </main>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('This page failed to load.')
    expect(screen.getByRole('link', { name: 'home' })).toHaveAttribute('href', '/')
    expect(screen.getByText('still here')).toBeDefined()
  })

  it('renders its children when nothing fails', () => {
    render(
      <LoadBoundary>
        <p>fine</p>
      </LoadBoundary>
    )
    expect(screen.getByText('fine')).toBeDefined()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
