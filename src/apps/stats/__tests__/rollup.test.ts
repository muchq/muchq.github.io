import { describe, expect, it } from 'vitest'
import {
  OVER_CAP,
  rollupHosts,
  rollupHubEvents,
  rollupQueries,
  rollupServices,
  scrapersByDay,
  serviceLabel,
  topAgents,
  topCountries,
  topTerms,
} from '../rollup'

const summary = {
  days: 30,
  rows: [
    { date: '2026-08-30', host: 'a', agent_class: 'browser', requests: 5, errors: 1 },
    { date: '2026-08-31', host: 'a', agent_class: 'ai_scraper', requests: 7, errors: 7 },
    { date: '2026-08-30', host: 'b', agent_class: 'bot', requests: 20, errors: 0 },
  ],
}

const agents = {
  days: 30,
  rows: [
    { date: '2026-08-30', host: 'a', agent_class: 'ai_scraper', agent: 'gptbot', requests: 3, blocked: 3 },
    { date: '2026-08-31', host: 'a', agent_class: 'ai_scraper', agent: 'gptbot', requests: 4, blocked: 4 },
    { date: '2026-08-31', host: 'a', agent_class: 'ai_scraper', agent: 'claudebot', requests: 9, blocked: 0 },
    { date: '2026-08-30', host: 'b', agent_class: 'bot', agent: 'curl', requests: 20, blocked: 0 },
    { date: '2026-08-30', host: 'b', agent_class: 'ai_scraper', agent: 'gptbot', requests: 1, blocked: 0 },
    { date: '2026-08-30', host: 'a', agent_class: 'browser', agent: '', requests: 5, blocked: 0 },
    // The same name under another class is a different agent.
    { date: '2026-08-30', host: 'a', agent_class: 'bot', agent: 'gptbot', requests: 2, blocked: 0 },
  ],
}

const probes = {
  days: 30,
  rows: [
    { host: 'a', probe: 'env', requests: 2, served: 0 },
    { host: 'a', probe: 'wordpress', requests: 8, served: 1 },
    { host: 'c', probe: 'git', requests: 1, served: 0 },
  ],
}

describe('rollupHosts', () => {
  it('sums the summary per host and attaches named agents and probes, busiest first', () => {
    const hosts = rollupHosts(summary, agents, probes)

    expect(hosts.map((h) => h.host)).toEqual(['b', 'a', 'c'])
    const a = hosts[1]
    expect(a.total).toBe(12)
    expect(a.errors).toBe(8)
    expect(a.classes).toEqual({ browser: 5, ai_scraper: 7 })
    // Two gptbot days merge; claudebot's 9 outranks the merged 7.
    expect(a.agents.ai_scraper).toEqual([
      { agent: 'claudebot', requests: 9, blocked: 0 },
      { agent: 'gptbot', requests: 7, blocked: 7 },
    ])
    expect(a.agents.browser).toEqual([{ agent: '', requests: 5, blocked: 0 }])
    expect(a.agents.bot).toEqual([{ agent: 'gptbot', requests: 2, blocked: 0 }])
    expect(a.probes.map((p) => p.probe)).toEqual(['wordpress', 'env'])
  })

  it('keeps a host that only the probes mention', () => {
    const c = rollupHosts(summary, agents, probes).find((h) => h.host === 'c')!
    expect(c.total).toBe(0)
    expect(c.probes).toEqual([{ host: 'c', probe: 'git', requests: 1, served: 0 }])
  })

  it('tolerates missing responses', () => {
    expect(rollupHosts(null, null, null)).toEqual([])
    expect(rollupHosts(summary, null, null).map((h) => h.agents)).toEqual([{}, {}])
  })
})

describe('scrapersByDay', () => {
  it('sums AI scrapers only, across hosts, newest day first', () => {
    expect(scrapersByDay(agents)).toEqual([
      { date: '2026-08-31', requests: 13, blocked: 4 },
      { date: '2026-08-30', requests: 4, blocked: 3 },
    ])
  })
})

describe('topAgents', () => {
  it('ranks named agents across hosts, counts hosts, and leaves browsers out', () => {
    expect(topAgents(agents, 10)).toEqual([
      { agent: 'curl', agent_class: 'bot', requests: 20, blocked: 0, hosts: 1 },
      { agent: 'claudebot', agent_class: 'ai_scraper', requests: 9, blocked: 0, hosts: 1 },
      { agent: 'gptbot', agent_class: 'ai_scraper', requests: 8, blocked: 7, hosts: 2 },
      { agent: 'gptbot', agent_class: 'bot', requests: 2, blocked: 0, hosts: 1 },
    ])
  })

  it('honours the limit', () => {
    expect(topAgents(agents, 1).map((a) => a.agent)).toEqual(['curl'])
  })
})

describe('topCountries', () => {
  const countries = {
    days: 30,
    rows: [
      { host: 'a', agent_class: 'ai_scraper', country: 'US', requests: 8, blocked: 7, probes: 0 },
      { host: 'b', agent_class: 'ai_scraper', country: 'US', requests: 1, blocked: 0, probes: 0 },
      { host: 'a', agent_class: 'bot', country: 'GB', requests: 10, blocked: 0, probes: 12 },
      { host: 'a', agent_class: 'other', country: '--', requests: 2, blocked: 0, probes: 1 },
      { host: 'a', agent_class: 'browser', country: 'DE', requests: 5000, blocked: 0, probes: 0 },
    ],
  }

  it('sums the non-browser classes per country across hosts, busiest first', () => {
    expect(topCountries(countries, 10)).toEqual([
      { country: 'GB', scrapers: 0, bots: 10, other: 0, probes: 12, blocked: 0, total: 10 },
      { country: 'US', scrapers: 9, bots: 0, other: 0, probes: 0, blocked: 7, total: 9 },
      { country: '--', scrapers: 0, bots: 0, other: 2, probes: 1, blocked: 0, total: 2 },
    ])
    expect(topCountries(countries, 1).map((c) => c.country)).toEqual(['GB'])
    expect(topCountries(null, 10)).toEqual([])
  })

  it('gives each host its own country list, browsers excluded', () => {
    const hosts = rollupHosts(null, null, null, countries)
    expect(hosts.map((h) => [h.host, h.countries.map((c) => `${c.country}:${c.total}`)])).toEqual([
      ['a', ['GB:10', 'US:8', '--:2']],
      ['b', ['US:1']],
    ])
  })
})

const services = {
  days: 30,
  total: 7,
  rows: [
    // One backend, two vhosts, two days, two callers: all one entry.
    { date: '2026-08-30', host: 'api.muchq.com', service: 'microgpt-serve', source: 'ui', agent_class: 'browser', requests: 9, errors: 0 },
    { date: '2026-08-31', host: 'api.muchq.com', service: 'microgpt-serve', source: 'api', agent_class: 'bot', requests: 4, errors: 1 },
    { date: '2026-08-30', host: 'gpt.muchq.com', service: 'microgpt-serve', source: 'api', agent_class: 'browser', requests: 2, errors: 0 },
    { date: '2026-08-30', host: 'git.muchq.com', service: 'forgejo', source: 'api', agent_class: 'ai_scraper', requests: 40, errors: 40 },
    { date: '2026-08-30', host: 'api.muchq.com', service: 'other', source: 'api', agent_class: 'bot', requests: 3, errors: 3 },
    // A backend the page has no label for yet.
    { date: '2026-08-30', host: 'api.muchq.com', service: 'brand_new', source: 'api', agent_class: 'other', requests: 1, errors: 0 },
  ],
}

describe('rollupServices', () => {
  it('sums a backend across its vhosts, days and callers', () => {
    const [busiest, microgpt] = rollupServices(services)

    expect(busiest.service).toBe('forgejo')
    expect(busiest.total).toBe(40)
    expect(busiest.errors).toBe(40)

    // 9 + 4 + 2, across two hosts and two days.
    expect(microgpt.total).toBe(15)
    expect(microgpt.errors).toBe(1)
    expect(microgpt.callers).toEqual({ ui: 9, api: 6 })
    expect(microgpt.classes).toEqual({ browser: 11, bot: 4 })
    // Busiest vhost first, and both are named.
    expect(microgpt.hosts).toEqual(['api.muchq.com', 'gpt.muchq.com'])
  })

  it('reads the container name as something a visitor recognises', () => {
    const entries = rollupServices(services)
    expect(entries.map((entry) => entry.label)).toContain('microGPT')
    expect(entries.find((entry) => entry.service === 'other')?.label).toBe('Nothing served')
  })

  // A backend added on the server appears on the page the same day, under
  // its own name. Hiding it until someone writes a label would make the
  // page quietly wrong about which services exist.
  it('shows an unlabelled backend under its own name', () => {
    expect(serviceLabel('brand_new')).toBe('brand_new')
    expect(rollupServices(services).find((entry) => entry.service === 'brand_new')?.label)
      .toBe('brand_new')
  })

  it('has nothing to show when the endpoint failed', () => {
    expect(rollupServices(null)).toEqual([])
  })
})

const hubEvents = {
  days: 30,
  rows: [
    { date: '2026-09-20', event: 'room_created', variant: '', surface: 'plane', outcome: '', players: 0, events: 3 },
    { date: '2026-09-21', event: 'room_created', variant: '', surface: 'sphere', outcome: '', players: 0, events: 2 },
    { date: '2026-09-21', event: 'room_closed', variant: '', surface: '', outcome: '', players: 0, events: 4 },
    { date: '2026-09-21', event: 'room_joined', variant: '', surface: '', outcome: '', players: 2, events: 5 },
    { date: '2026-09-21', event: 'room_joined', variant: '', surface: '', outcome: '', players: 3, events: 1 },
    { date: '2026-09-21', event: 'chat_message', variant: '', surface: '', outcome: '', players: 3, events: 9 },
    { date: '2026-09-20', event: 'geometry_changed', variant: '', surface: 'glasshouse', outcome: '', players: 0, events: 6 },
    { date: '2026-09-21', event: 'game_started', variant: 'golf', surface: '', outcome: '', players: 2, events: 7 },
    { date: '2026-09-21', event: 'game_started', variant: 'golf', surface: '', outcome: '', players: 4, events: 1 },
    { date: '2026-09-20', event: 'game_started', variant: 'castle', surface: '', outcome: '', players: 3, events: 2 },
    { date: '2026-09-21', event: 'game_finished', variant: 'golf', surface: '', outcome: 'completed', players: 2, events: 5 },
    { date: '2026-09-21', event: 'game_finished', variant: 'golf', surface: '', outcome: 'abandoned', players: 1, events: 3 },
    { date: '2026-09-20', event: 'game_finished', variant: 'castle', surface: '', outcome: 'completed', players: 3, events: 2 },
  ],
}

describe('rollupHubEvents', () => {
  it('counts each event into the question it answers', () => {
    const hub = rollupHubEvents(hubEvents)

    expect(hub.rooms).toEqual({ created: 5, closed: 4, joins: 6, messages: 9, reshapes: 6 })
    // Every row, whatever its event — the section's "nothing yet" test.
    expect(hub.total).toBe(50)
  })

  it('separates games dealt from how they ended, busiest variant first', () => {
    const hub = rollupHubEvents(hubEvents)

    expect(hub.variants).toEqual([
      { variant: 'golf', label: 'Golf', dealt: 8, completed: 5, abandoned: 3 },
      { variant: 'castle', label: 'Castle', dealt: 2, completed: 2, abandoned: 0 },
    ])
  })

  // game_finished's players is the seats still held — 1 for nearly every
  // abandonment — so only game_started may reach this table. A finish
  // folded in here would report a flood of one-player tables that were
  // never dealt.
  it('reads table sizes from game_started alone, smallest first', () => {
    expect(rollupHubEvents(hubEvents).sizes).toEqual([
      { players: 2, dealt: 7 },
      { players: 3, dealt: 2 },
      { players: 4, dealt: 1 },
    ])
  })

  it('sorts a count past its cap last, where it cannot read as a size', () => {
    const hub = rollupHubEvents({
      days: 30,
      rows: [
        { date: '2026-09-21', event: 'game_started', variant: 'golf', surface: '', outcome: '', players: OVER_CAP, events: 1 },
        { date: '2026-09-21', event: 'game_started', variant: 'golf', surface: '', outcome: '', players: 4, events: 2 },
      ],
    })
    expect(hub.sizes.map((size) => size.players)).toEqual([4, OVER_CAP])
  })

  // Which surface a room opened on and which one somebody switched it to
  // are different answers: the first is the default, the second is taste.
  it('tells the surface a room started on from one it was changed to', () => {
    expect(rollupHubEvents(hubEvents).surfaces).toEqual([
      { surface: 'glasshouse', label: 'Glasshouse', chosen: 0, changedTo: 6 },
      { surface: 'plane', label: 'Plane', chosen: 3, changedTo: 0 },
      { surface: 'sphere', label: 'Sphere', chosen: 2, changedTo: 0 },
    ])
  })

  it('reports each day of rooms, games, and chat, newest first', () => {
    expect(rollupHubEvents(hubEvents).days).toEqual([
      { date: '2026-09-21', rooms: 2, games: 8, messages: 9 },
      { date: '2026-09-20', rooms: 3, games: 2, messages: 0 },
    ])
  })

  // A hub release the page has not learned about yet still counts, rather
  // than vanishing from a funnel that then does not add up.
  it('counts an event shape it does not recognise in the total', () => {
    const hub = rollupHubEvents({
      days: 30,
      rows: [{ date: '2026-09-21', event: 'hand_played', variant: '', surface: '', outcome: '', players: 0, events: 12 }],
    })
    expect(hub.total).toBe(12)
    expect(hub.variants).toEqual([])
  })

  it('has nothing to show when the endpoint failed', () => {
    expect(rollupHubEvents(null)).toEqual({
      days: [],
      variants: [],
      sizes: [],
      rooms: { created: 0, closed: 0, joins: 0, messages: 0, reshapes: 0 },
      surfaces: [],
      total: 0,
    })
  })
})

const queries = {
  days: 30,
  rows: [
    { date: '2026-09-20', entry: 'query', source: 'ui', outcome: 'ok', cache: 'snapshot', requests: 10 },
    { date: '2026-09-21', entry: 'query', source: 'ui', outcome: 'ok', cache: 'live', requests: 4 },
    { date: '2026-09-21', entry: 'query', source: 'mcp', outcome: 'ok', cache: 'snapshot', requests: 6 },
    { date: '2026-09-21', entry: 'query', source: 'mcp', outcome: 'invalid', cache: 'none', requests: 3 },
    { date: '2026-09-21', entry: 'query', source: 'api', outcome: 'failed', cache: 'none', requests: 1 },
    { date: '2026-09-21', entry: 'aggregate', source: 'ui', outcome: 'ok', cache: 'live', requests: 2 },
  ],
}

describe('rollupQueries', () => {
  it('folds a day-by-day table into who asked and how it went, busiest first', () => {
    const entries = rollupQueries(queries)

    expect(entries.map((entry) => entry.entry)).toEqual(['query', 'aggregate'])
    expect(entries[0]).toEqual({
      entry: 'query',
      label: 'Query',
      total: 24,
      ok: 20,
      invalid: 3,
      failed: 1,
      cached: 16,
      bySource: { ui: 14, mcp: 9, api: 1 },
    })
  })

  // A word the reader collapsed to `other` is drift between one_d4 and
  // the stats service. It counts in the total and in no column, so the
  // page shows a discrepancy rather than losing the requests.
  it('counts a word it does not know in the total and in no column', () => {
    const [entry] = rollupQueries({
      days: 30,
      rows: [
        { date: '2026-09-21', entry: 'query', source: 'other', outcome: 'other', cache: 'other', requests: 8 },
      ],
    })
    expect(entry.total).toBe(8)
    expect(entry.ok + entry.invalid + entry.failed).toBe(0)
    expect(entry.cached).toBe(0)
  })

  it('shows an entry point it has no label for under its own name', () => {
    const [entry] = rollupQueries({
      days: 30,
      rows: [{ date: '2026-09-21', entry: 'explain', source: 'ui', outcome: 'ok', cache: 'live', requests: 1 }],
    })
    expect(entry.label).toBe('explain')
  })

  it('has nothing to show when the endpoint failed', () => {
    expect(rollupQueries(null)).toEqual([])
  })
})

const terms = {
  days: 30,
  rows: [
    { entry: 'query', kind: 'field', term: 'name', requests: 30 },
    { entry: 'aggregate', kind: 'field', term: 'name', requests: 5 },
    { entry: 'query', kind: 'field', term: 'cmc', requests: 20 },
    { entry: 'query', kind: 'motif', term: 'draw', requests: 12 },
    { entry: 'query', kind: 'order_by', term: 'cmc', requests: 4 },
    { entry: 'query', kind: 'group_by', term: 'color', requests: 2 },
  ],
}

describe('topTerms', () => {
  // A term asked for at two entry points is one term: the question is
  // which fields the language gets used for, not which endpoint got it.
  it('folds a term across entry points and orders each kind by use', () => {
    const groups = topTerms(terms, 10)

    expect(groups.map((group) => group.kind)).toEqual(['field', 'motif', 'order_by', 'group_by'])
    expect(groups[0]).toEqual({
      kind: 'field',
      label: 'Fields',
      terms: [
        { term: 'name', requests: 35 },
        { term: 'cmc', requests: 20 },
      ],
    })
  })

  it('keeps the busiest terms of each kind and drops the tail', () => {
    const [fields] = topTerms(terms, 1)
    expect(fields.terms).toEqual([{ term: 'name', requests: 35 }])
  })

  it('leaves out a kind nothing used, rather than showing an empty one', () => {
    expect(topTerms({ days: 30, rows: terms.rows.slice(0, 1) }, 10).map((g) => g.kind)).toEqual(['field'])
  })

  it('has nothing to show when the endpoint failed', () => {
    expect(topTerms(null, 10)).toEqual([])
  })
})
