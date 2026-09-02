import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import StatsDashboard from '../StatsDashboard'

const summaryResponse = {
  days: 30,
  rows: [
    { date: '2026-08-30', host: 'api.1d4.net', agent_class: 'browser', requests: 100, errors: 2 },
    { date: '2026-08-31', host: 'api.1d4.net', agent_class: 'browser', requests: 50, errors: 0 },
    { date: '2026-08-30', host: 'git.muchq.com', agent_class: 'ai_scraper', requests: 900, errors: 700 },
    { date: '2026-08-30', host: 'git.muchq.com', agent_class: 'bot', requests: 10, errors: 0 },
    { date: '2026-08-30', host: 'git.muchq.com', agent_class: 'other', requests: 3, errors: 3 },
  ],
}

const agentsResponse = {
  days: 30,
  rows: [
    { date: '2026-08-30', host: 'git.muchq.com', agent_class: 'ai_scraper', agent: 'meta-externalagent', requests: 600, blocked: 500 },
    { date: '2026-08-31', host: 'git.muchq.com', agent_class: 'ai_scraper', agent: 'meta-externalagent', requests: 300, blocked: 200 },
    { date: '2026-08-30', host: 'git.muchq.com', agent_class: 'bot', agent: 'curl', requests: 10, blocked: 0 },
    { date: '2026-08-30', host: 'git.muchq.com', agent_class: 'other', agent: '(empty)', requests: 3, blocked: 0 },
    { date: '2026-08-30', host: 'api.1d4.net', agent_class: 'browser', agent: '', requests: 150, blocked: 0 },
  ],
}

const probesResponse = {
  days: 14,
  // Server order is what renders; the fixture is ascending to prove it.
  rows: [
    { host: 'api.1d4.net', probe: 'env', requests: 4, served: 1 },
    { host: 'git.muchq.com', probe: 'wordpress', requests: 12, served: 0 },
  ],
}

const slugsResponse = {
  days: 90,
  // Server order is what renders; the fixture is ascending to prove it.
  rows: [
    { slug: 'xyz', requests: 7 },
    { slug: 'abc123', requests: 41 },
  ],
}

const countriesResponse = {
  days: 30,
  rows: [
    { host: 'git.muchq.com', agent_class: 'ai_scraper', country: 'US', requests: 800, blocked: 700, probes: 0 },
    { host: 'git.muchq.com', agent_class: 'bot', country: 'GB', requests: 10, blocked: 0, probes: 12 },
    { host: 'git.muchq.com', agent_class: 'browser', country: 'US', requests: 5000, blocked: 0, probes: 0 },
    { host: 'api.1d4.net', agent_class: 'other', country: '--', requests: 20, blocked: 0, probes: 4 },
    { host: 'api.1d4.net', agent_class: 'ai_scraper', country: 'US', requests: 100, blocked: 0, probes: 0 },
  ],
}

const everything = {
  '/summary': summaryResponse,
  '/agents': agentsResponse,
  '/probes': probesResponse,
  '/iili/top': slugsResponse,
  '/countries': countriesResponse,
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

const cellsOf = (row: HTMLElement) => within(row).getAllByRole('cell').map((c) => c.textContent)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('StatsDashboard', () => {
  it('rolls the summary up per host with the agent classes as columns', async () => {
    mockFetch(everything)
    const onState = vi.fn()

    render(<StatsDashboard onConnectionStateChange={onState} />)

    // git.muchq.com sorts first (913 > 150), and the two api.1d4.net days
    // roll up into one row. The host cell is the disclosure button, so its
    // text carries the chevron.
    const gitRow = (await screen.findByRole('button', { name: /git\.muchq\.com/ })).closest('tr')!
    expect(cellsOf(gitRow)).toEqual(['›git.muchq.com', '913', '703', '0', '900', '10', '3'])
    const apiRow = screen.getByRole('button', { name: /api\.1d4\.net/ }).closest('tr')!
    expect(cellsOf(apiRow)).toEqual(['›api.1d4.net', '150', '2', '150', '0', '0', '0'])
    expect(screen.getByText('abc123')).toBeInTheDocument()
    expect(onState).toHaveBeenLastCalledWith('connected')
  })

  it('opens a host into its named agents by class and its probes', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    const toggle = await screen.findByRole('button', { name: /git\.muchq\.com/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('host-detail-git.muchq.com')).not.toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const detail = within(screen.getByTestId('host-detail-git.muchq.com'))
    // The two meta days sum; blocked comes along.
    const meta = detail.getByText('meta-externalagent').closest('tr')!
    expect(cellsOf(meta)).toEqual(['meta-externalagent', '900', '700 blocked'])
    expect(cellsOf(detail.getByText('curl').closest('tr')!)).toEqual(['curl', '10', '0 blocked'])
    // The unclassified tail is readable by product token, "(empty)" included.
    expect(cellsOf(detail.getByText('(empty)').closest('tr')!)).toEqual(['(empty)', '3', '0 blocked'])
    // Only this host's probes, not api.1d4.net's.
    expect(cellsOf(detail.getByText('wordpress').closest('tr')!)).toEqual(['wordpress', '12', '0 served'])
    expect(detail.queryByText('env')).not.toBeInTheDocument()
    // Browsers do not count toward a host's countries: US is the scraper's 800, not 5,800.
    expect(cellsOf(detail.getByText('US').closest('tr')!)).toEqual(['US', '800', '700 blocked'])
    expect(cellsOf(detail.getByText('GB').closest('tr')!)).toEqual(['GB', '10', '0 blocked'])

    // Opening another host closes the first: one open row at a time.
    fireEvent.click(screen.getByRole('button', { name: /api\.1d4\.net/ }))
    expect(screen.queryByTestId('host-detail-git.muchq.com')).not.toBeInTheDocument()
    const api = within(screen.getByTestId('host-detail-api.1d4.net'))
    expect(cellsOf(api.getByText('env').closest('tr')!)).toEqual(['env', '4', '1 served'])
    // A browser-only host has nothing named to show in the three classes,
    // and browsers themselves are not a fourth: one bucket has no breakdown.
    expect(api.getAllByText('none')).toHaveLength(3)
    expect(api.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'AI scrapers',
      'Bots',
      'Other',
      'Probes',
      'Countries',
    ])
    expect(api.queryByText('150')).not.toBeInTheDocument()
    // Its countries, non-browser only, busiest first, with the unplaced bucket named.
    expect(api.getAllByRole('row').slice(-2).map(cellsOf)).toEqual([
      ['US', '100', '0 blocked'],
      ['Unknown', '20', '0 blocked'],
    ])

    fireEvent.click(screen.getByRole('button', { name: /api\.1d4\.net/ }))
    expect(screen.queryByTestId('host-detail-api.1d4.net')).not.toBeInTheDocument()
  })

  it('shows the top-level scraper, agent, and probe views across hosts', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    await screen.findByRole('button', { name: /git\.muchq\.com/ })

    // AI scrapers by day, newest first, summed across hosts.
    const byDay = screen.getByText('AI scrapers by day').closest('div')!
    const dayRows = within(byDay).getAllByRole('row').slice(1).map(cellsOf)
    expect(dayRows).toEqual([
      ['2026-08-31', '300', '200'],
      ['2026-08-30', '600', '500'],
    ])

    // Busiest agents: browsers excluded, meta summed across its two days.
    const busiest = screen.getByText(/Busiest agents/).closest('div')!
    const agentRows = within(busiest).getAllByRole('row').slice(1).map(cellsOf)
    expect(agentRows).toEqual([
      ['meta-externalagent', 'AI scrapers', '900', '700', '1'],
      ['curl', 'Bots', '10', '0', '1'],
      ['(empty)', 'Other', '3', '0', '1'],
    ])

    const probes = screen.getByText(/Scanner probes/).closest('div')!
    const probeRows = within(probes).getAllByRole('row').slice(1).map(cellsOf)
    expect(probeRows).toEqual([
      ['api.1d4.net', 'env', '4', '1'],
      ['git.muchq.com', 'wordpress', '12', '0'],
    ])
    const links = screen.getByText(/Top short links/).closest('div')!
    expect(within(links).getAllByRole('row').slice(1).map(cellsOf)).toEqual([
      ['xyz', '7'],
      ['abc123', '41'],
    ])

    // Each heading carries the window its own endpoint reported.
    expect(screen.getByText('Traffic by host — last 30 days')).toBeInTheDocument()
    expect(screen.getByText('Busiest agents — last 30 days')).toBeInTheDocument()
    expect(screen.getByText('Scanner probes — last 14 days')).toBeInTheDocument()
    expect(screen.getByText('Top short links — last 90 days')).toBeInTheDocument()
  })

  it('toggles a host from anywhere on its row, not only the button', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)
    const row = (await screen.findByRole('button', { name: /git\.muchq\.com/ })).closest('tr')!
    const requestsCell = within(row).getAllByRole('cell')[1]

    fireEvent.click(requestsCell)
    expect(screen.getByTestId('host-detail-git.muchq.com')).toBeInTheDocument()
    fireEvent.click(requestsCell)
    expect(screen.queryByTestId('host-detail-git.muchq.com')).not.toBeInTheDocument()
  })

  it('shows where non-browser traffic comes from, with the attribution the data requires', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    const table = within(await screen.findByTestId('countries'))
    // Summed across hosts and classes, browsers excluded, busiest first.
    expect(table.getAllByRole('row').slice(1).map(cellsOf)).toEqual([
      ['US', '900', '900', '0', '0', '0', '700'],
      ['Unknown', '20', '0', '0', '20', '4', '0'],
      ['GB', '10', '0', '10', '0', '12', '0'],
    ])
    expect(screen.getByText(/Where scrapers, bots, and probes come from — last 30 days/)).toBeInTheDocument()
    // CC BY: the source is named, and linked, on the page that shows its data.
    const credit = screen.getByRole('link', { name: 'DB-IP' })
    expect(credit.getAttribute('href')).toBe('https://db-ip.com')
    expect(credit.closest('p')?.textContent).toContain('IP geolocation by DB-IP')
  })

  it('asks for one window across all five aggregates', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)
    await screen.findByRole('button', { name: /git\.muchq\.com/ })

    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]))
    expect(urls).toHaveLength(5)
    for (const url of urls) expect(url).toContain('days=30')
    // The agents endpoint truncates busiest-first; ask for its ceiling so
    // a scraper's thin days are rows, not gaps.
    expect(urls.find((url) => url.includes('/agents'))).toContain('limit=2000')
  })

  it('reports failure without rendering a broken table when the API is down', async () => {
    mockFetch({})
    const onState = vi.fn()

    render(<StatsDashboard onConnectionStateChange={onState} />)

    expect(await screen.findByText(/Stats API unavailable/)).toBeInTheDocument()
    expect(onState).toHaveBeenLastCalledWith('failed')
  })

  it('renders empty states rather than empty tables', async () => {
    mockFetch({
      '/summary': { days: 30, rows: [] },
      '/agents': { days: 30, rows: [] },
      '/probes': { days: 30, rows: [] },
      '/iili/top': { days: 30, rows: [] },
      '/countries': { days: 30, rows: [] },
    })

    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    expect(await screen.findByText('No aggregated traffic yet.')).toBeInTheDocument()
    expect(screen.getByText('No non-browser traffic in the window.')).toBeInTheDocument()
    expect(screen.getByText('No AI scraper traffic in the window.')).toBeInTheDocument()
    expect(screen.getByText('No named agents aggregated yet.')).toBeInTheDocument()
    expect(screen.getByText('No scanner probes in the window.')).toBeInTheDocument()
    expect(screen.getByText('No redirects aggregated yet.')).toBeInTheDocument()
  })

  it('still renders the host table when only the summary answers', async () => {
    // The agents and probes endpoints are newer than the summary; a stats
    // service from before they existed must not blank the page.
    mockFetch({ '/summary': summaryResponse, '/iili/top': slugsResponse })
    const onState = vi.fn()

    render(<StatsDashboard onConnectionStateChange={onState} />)

    const gitRow = (await screen.findByRole('button', { name: /git\.muchq\.com/ })).closest('tr')!
    expect(cellsOf(gitRow)).toEqual(['›git.muchq.com', '913', '703', '0', '900', '10', '3'])
    expect(onState).toHaveBeenLastCalledWith('connected')
    // The tables whose endpoints failed say so rather than claiming zero.
    expect(screen.getAllByText('Not available from the stats service.')).toHaveLength(4)
    expect(screen.queryByText('No scanner probes in the window.')).not.toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
  })
})
