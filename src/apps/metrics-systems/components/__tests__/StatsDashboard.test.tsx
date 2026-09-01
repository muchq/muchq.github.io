import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import StatsDashboard from '../StatsDashboard'

const summaryResponse = {
  days: 7,
  rows: [
    { date: '2026-08-30', host: 'api.1d4.net', agent_class: 'browser', requests: 100, errors: 2 },
    { date: '2026-08-31', host: 'api.1d4.net', agent_class: 'browser', requests: 50, errors: 0 },
    { date: '2026-08-30', host: 'git.muchq.com', agent_class: 'ai_scraper', requests: 900, errors: 700 },
  ],
}

const slugsResponse = {
  days: 30,
  rows: [
    { slug: 'abc123', requests: 41 },
    { slug: 'xyz', requests: 7 },
  ],
}

function mockFetch(bodies: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      for (const [fragment, body] of Object.entries(bodies)) {
        if (url.includes(fragment)) {
          return new Response(JSON.stringify(body), { status: 200 })
        }
      }
      return new Response('', { status: 500 })
    })
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('StatsDashboard', () => {
  it('rolls the summary up per host with the agent classes as columns', async () => {
    mockFetch({ '/summary': summaryResponse, '/iili/top': slugsResponse })
    const onState = vi.fn()

    render(<StatsDashboard onConnectionStateChange={onState} />)

    // git.muchq.com sorts first (900 > 150), and the two api.1d4.net days
    // roll up into one row.
    const gitRow = (await screen.findByText('git.muchq.com')).closest('tr')!
    expect(within(gitRow).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'git.muchq.com',
      '900',
      '700',
      '0',
      '900',
      '0',
      '0',
    ])
    const apiRow = screen.getByText('api.1d4.net').closest('tr')!
    expect(within(apiRow).getAllByRole('cell').map((c) => c.textContent)).toEqual([
      'api.1d4.net',
      '150',
      '2',
      '150',
      '0',
      '0',
      '0',
    ])
    expect(screen.getByText('abc123')).toBeInTheDocument()
    expect(onState).toHaveBeenLastCalledWith('connected')
  })

  it('reports failure without rendering a broken table when the API is down', async () => {
    mockFetch({})
    const onState = vi.fn()

    render(<StatsDashboard onConnectionStateChange={onState} />)

    expect(await screen.findByText(/Stats API unavailable/)).toBeInTheDocument()
    expect(onState).toHaveBeenLastCalledWith('failed')
  })

  it('renders empty states rather than empty tables', async () => {
    mockFetch({ '/summary': { days: 7, rows: [] }, '/iili/top': { days: 30, rows: [] } })

    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    expect(await screen.findByText('No aggregated traffic yet.')).toBeInTheDocument()
    expect(screen.getByText('No redirects aggregated yet.')).toBeInTheDocument()
  })
})
