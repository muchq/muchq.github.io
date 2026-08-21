import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import R3drPage from '../pages/R3drPage'
import * as api from '../api'

vi.mock('../api', { spy: true })
// The shared nav pulls in router-dependent pieces this page doesn't test.
vi.mock('@/shared/components/Navigation', () => ({ default: () => <nav /> }))
vi.mock('@/shared/components/nav/NavTagline', () => ({ default: () => null }))

const NOW = 1755000000000

describe('R3drPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })

  it('adds a minted link to Recent links and persists it', async () => {
    vi.mocked(api.shorten).mockResolvedValue({ slug: 'AQA' })
    render(<R3drPage />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Long link'), 'https://example.com/page')
    await user.click(screen.getByRole('button', { name: 'Shorten' }))

    const recent = await screen.findByRole('region', { name: 'Recent links' })
    expect(within(recent).getByRole('link', { name: 'iili.uk/r/AQA' })).toBeDefined()
    expect(localStorage.getItem('r3dr.recent')).toContain('"AQA"')
  })

  it('boots with stored links, skipping expired ones', () => {
    localStorage.setItem(
      'r3dr.recent',
      JSON.stringify([
        { slug: 'AQA', longUrl: 'https://example.com/live', expiresAt: NOW + 1000 },
        { slug: 'DAA', longUrl: 'https://example.com/dead', expiresAt: NOW - 1000 },
      ])
    )
    render(<R3drPage />)

    const recent = screen.getByRole('region', { name: 'Recent links' })
    expect(within(recent).getByRole('link', { name: 'iili.uk/r/AQA' })).toBeDefined()
    expect(within(recent).queryByText(/DAA/)).toBeNull()
  })

  it('clears the list and the storage together', async () => {
    localStorage.setItem(
      'r3dr.recent',
      JSON.stringify([{ slug: 'AQA', longUrl: 'https://example.com/x', expiresAt: NOW + 1000 }])
    )
    render(<R3drPage />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Clear recent links' }))

    expect(screen.queryByRole('region', { name: 'Recent links' })).toBeNull()
    expect(localStorage.getItem('r3dr.recent')).toBeNull()
  })
})
