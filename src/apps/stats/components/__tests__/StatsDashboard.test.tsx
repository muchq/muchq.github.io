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

const servicesResponse = {
  days: 30,
  total: 4,
  rows: [
    { date: '2026-08-30', host: 'git.muchq.com', service: 'forgejo', source: 'api', agent_class: 'ai_scraper', requests: 900, errors: 900 },
    { date: '2026-08-30', host: 'api.muchq.com', service: 'microgpt-serve', source: 'ui', agent_class: 'browser', requests: 30, errors: 0 },
    { date: '2026-08-30', host: 'gpt.muchq.com', service: 'microgpt-serve', source: 'api', agent_class: 'bot', requests: 12, errors: 2 },
    { date: '2026-08-30', host: 'api.muchq.com', service: 'other', source: 'api', agent_class: 'bot', requests: 5, errors: 5 },
  ],
}

const hubResponse = {
  days: 30,
  rows: [
    { date: '2026-08-30', event: 'room_created', variant: '', surface: 'plane', outcome: '', players: 0, events: 2 },
    { date: '2026-08-31', event: 'room_created', variant: '', surface: 'sphere', outcome: '', players: 0, events: 1 },
    { date: '2026-08-31', event: 'room_closed', variant: '', surface: '', outcome: '', players: 0, events: 3 },
    { date: '2026-08-31', event: 'room_joined', variant: '', surface: '', outcome: '', players: 2, events: 4 },
    { date: '2026-08-31', event: 'chat_message', variant: '', surface: '', outcome: '', players: 2, events: 11 },
    { date: '2026-08-31', event: 'geometry_changed', variant: '', surface: 'glasshouse', outcome: '', players: 0, events: 5 },
    { date: '2026-08-31', event: 'game_started', variant: 'golf', surface: '', outcome: '', players: 2, events: 6 },
    { date: '2026-08-31', event: 'game_started', variant: 'golf', surface: '', outcome: '', players: -1, events: 1 },
    { date: '2026-08-30', event: 'game_started', variant: 'castle', surface: '', outcome: '', players: 3, events: 2 },
    { date: '2026-08-31', event: 'game_finished', variant: 'golf', surface: '', outcome: 'completed', players: 2, events: 4 },
    { date: '2026-08-31', event: 'game_finished', variant: 'golf', surface: '', outcome: 'abandoned', players: 1, events: 3 },
  ],
}

const queriesResponse = {
  days: 30,
  rows: [
    { date: '2026-08-30', entry: 'query', source: 'ui', outcome: 'ok', cache: 'snapshot', requests: 40 },
    { date: '2026-08-31', entry: 'query', source: 'mcp', outcome: 'ok', cache: 'live', requests: 12 },
    { date: '2026-08-31', entry: 'query', source: 'mcp', outcome: 'invalid', cache: 'none', requests: 5 },
    { date: '2026-08-31', entry: 'query', source: 'api', outcome: 'failed', cache: 'none', requests: 2 },
    { date: '2026-08-31', entry: 'aggregate', source: 'ui', outcome: 'ok', cache: 'live', requests: 9 },
  ],
}

const termsResponse = {
  days: 30,
  rows: [
    { entry: 'query', kind: 'field', term: 'name', requests: 30 },
    { entry: 'aggregate', kind: 'field', term: 'name', requests: 8 },
    { entry: 'query', kind: 'motif', term: 'draw', requests: 12 },
    { entry: 'query', kind: 'group_by', term: 'color', requests: 3 },
  ],
}

const everything = {
  '/summary': summaryResponse,
  '/agents': agentsResponse,
  '/probes': probesResponse,
  '/iili/top': slugsResponse,
  '/countries': countriesResponse,
  '/services': servicesResponse,
  '/games_hub/events': hubResponse,
  '/one_d4/queries': queriesResponse,
  '/one_d4/terms': termsResponse,
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

  it('names the backend behind the traffic, and who was asking', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    // Busiest backend first, under a name a visitor recognises rather
    // than the container's.
    const forgejo = await screen.findByTestId('service-forgejo')
    expect(cellsOf(forgejo)).toEqual([
      'Git', '900', '900', '0', '0', '900', '0', '900', '0', '0', 'git.muchq.com',
    ])

    // One backend reached through two vhosts is one row naming both, with
    // its callers and classes summed across them.
    const microgpt = screen.getByTestId('service-microgpt-serve')
    expect(cellsOf(microgpt)).toEqual([
      'microGPT', '42', '2', '30', '0', '12', '30', '0', '12', '0',
      'api.muchq.com, gpt.muchq.com',
    ])

    // And the paths no backend served are named as that, not as a service.
    expect(cellsOf(screen.getByTestId('service-other'))[0]).toBe('Nothing served')
  })

  it('says so when the services list came back truncated', async () => {
    mockFetch({ ...everything, '/services': { ...servicesResponse, total: 99 } })
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    expect(await screen.findByText(/Showing 4 of 99 rows/)).toBeInTheDocument()
    // What is missing is whole services, which is why the totals shown can
    // still be read as totals.
    expect(await screen.findByText(/every total above is exact/)).toBeInTheDocument()
  })

  // The services endpoint is the newest and the only one that may be
  // missing; a request that never settles must not hold the five that
  // answered behind it.
  it('renders the rest of the dashboard when services never answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/services')) return new Promise(() => {})
        for (const [fragment, body] of Object.entries(everything)) {
          if (String(url).includes(fragment)) {
            return new Response(JSON.stringify(body), { status: 200 })
          }
        }
        return new Response('', { status: 500 })
      })
    )
    const onState = vi.fn()

    render(<StatsDashboard onConnectionStateChange={onState} />)

    expect(await screen.findByRole('button', { name: /git\.muchq\.com/ })).toBeInTheDocument()
    expect(screen.queryByText('Loading stats…')).not.toBeInTheDocument()
    expect(onState).toHaveBeenLastCalledWith('connected')
  })

  it('asks for one window across every aggregate', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)
    await screen.findByRole('button', { name: /git\.muchq\.com/ })

    const urls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]))
    expect(urls).toHaveLength(9)
    for (const url of urls) expect(url).toContain('days=30')
    // The agents endpoint truncates busiest-first; ask for its ceiling so
    // a scraper's thin days are rows, not gaps.
    expect(urls.find((url) => url.includes('/agents'))).toContain('limit=2000')
    // Same reason for services: it folds routes into services before it
    // truncates, so a low limit loses whole backends.
    expect(urls.find((url) => url.includes('/services'))).toContain('limit=5000')
    // Terms are folded across entry points here, so the tail its limit
    // drops should be the language's tail and not one endpoint's.
    expect(urls.find((url) => url.includes('/one_d4/terms'))).toContain('limit=1000')
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
      '/games_hub/events': { days: 30, rows: [] },
      '/one_d4/queries': { days: 30, rows: [] },
      '/one_d4/terms': { days: 30, rows: [] },
    })

    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    expect(await screen.findByText('No aggregated traffic yet.')).toBeInTheDocument()
    expect(screen.getByText('No non-browser traffic in the window.')).toBeInTheDocument()
    expect(screen.getByText('No AI scraper traffic in the window.')).toBeInTheDocument()
    expect(screen.getByText('No named agents aggregated yet.')).toBeInTheDocument()
    expect(screen.getByText('No scanner probes in the window.')).toBeInTheDocument()
    expect(screen.getByText('No redirects aggregated yet.')).toBeInTheDocument()
    expect(screen.getByText('Nobody has opened a room yet.')).toBeInTheDocument()
    expect(screen.getAllByText('No tables dealt yet.')).toHaveLength(2)
    expect(screen.getByText('No rooms yet.')).toBeInTheDocument()
    expect(screen.getAllByText('No queries in the window.')).toHaveLength(2)
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
    // The tables whose endpoints failed say so rather than claiming zero,
    // services among them.
    expect(screen.getAllByText('Not available from the stats service.')).toHaveLength(11)
    expect(screen.queryByText('No scanner probes in the window.')).not.toBeInTheDocument()
    expect(screen.getByText('abc123')).toBeInTheDocument()
  })

  it('shows the hub day by day, newest first', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    const days = within(await screen.findByTestId('hub-days')).getAllByRole('row').slice(1)
    expect(days.map(cellsOf)).toEqual([
      ['2026-08-31', '1', '7', '11'],
      ['2026-08-30', '2', '2', '0'],
    ])
    // Rooms made and closed do not have to match: the difference over the
    // window is the rooms still open.
    expect(screen.getByText(/3 rooms made, 3 closed, 4 joins, 5 reshapes, 11 messages/)).toBeInTheDocument()
  })

  it('separates tables dealt from how they ended', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    const variants = within(await screen.findByTestId('hub-variants')).getAllByRole('row').slice(1)
    expect(variants.map(cellsOf)).toEqual([
      ['Golf', '7', '4', '3'],
      ['Castle', '2', '0', '0'],
    ])
  })

  it('names a table size past what a table seats rather than printing -1', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    const sizes = within(await screen.findByTestId('hub-sizes')).getAllByRole('row').slice(1)
    expect(sizes.map(cellsOf)).toEqual([
      ['2', '6'],
      ['3', '2'],
      ['More than a table seats', '1'],
    ])
  })

  it('tells the world a room opened on from the one it was changed to', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    const surfaces = within(await screen.findByTestId('hub-surfaces')).getAllByRole('row').slice(1)
    expect(surfaces.map(cellsOf)).toEqual([
      ['Glasshouse', '0', '5'],
      ['Plane', '2', '0'],
      ['Sphere', '1', '0'],
    ])
  })

  it('shows one_d4 queries by who asked and how they went', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    // Entry, requests, ui, mcp, api, answered, invalid, failed, snapshot.
    expect(cellsOf(await screen.findByTestId('one-d4-query'))).toEqual([
      'Query', '59', '40', '17', '2', '52', '5', '2', '40',
    ])
    expect(cellsOf(screen.getByTestId('one-d4-aggregate'))).toEqual([
      'Aggregate', '9', '9', '0', '0', '9', '0', '0', '0',
    ])
  })

  it('folds query terms across entry points, busiest first per kind', async () => {
    mockFetch(everything)
    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    const language = within(await screen.findByTestId('one-d4-terms'))
    expect(language.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Fields',
      'Motifs',
      'Grouped by',
    ])
    // 30 from query plus 8 from aggregate: one term, not two.
    expect(cellsOf(language.getByText('name').closest('tr')!)).toEqual(['name', '38'])
  })

  // The reason these four do not ride the page's Promise.all: one of them
  // hanging would hold every table on the page, not just its own.
  it('renders the page while a newer endpoint never answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/games_hub/events')) return new Promise<Response>(() => {})
        for (const [fragment, body] of Object.entries(everything)) {
          if (String(url).includes(fragment)) return new Response(JSON.stringify(body), { status: 200 })
        }
        return new Response('', { status: 500 })
      })
    )

    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /git\.muchq\.com/ })).toBeInTheDocument()
    expect(cellsOf(screen.getByTestId('one-d4-query'))[1]).toBe('59')
    // Only the hub's own tables are still waiting.
    expect(within(screen.getByTestId('hub-days')).getAllByRole('row')).toHaveLength(2)
  })

  // The three sections below the traffic tables are the newest endpoints.
  // A stats service from before them must leave them empty and nothing else.
  it('keeps the page when only the hub and one_d4 endpoints are missing', async () => {
    mockFetch({
      '/summary': summaryResponse,
      '/agents': agentsResponse,
      '/probes': probesResponse,
      '/iili/top': slugsResponse,
      '/countries': countriesResponse,
      '/services': servicesResponse,
    })

    render(<StatsDashboard onConnectionStateChange={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /git\.muchq\.com/ })).toBeInTheDocument()
    expect(screen.getAllByText('Not available from the stats service.')).toHaveLength(6)
    expect(screen.queryByText('Nobody has opened a room yet.')).not.toBeInTheDocument()
  })
})
