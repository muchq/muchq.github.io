import { describe, expect, it } from 'vitest'
import { rollupHosts, rollupServices, scrapersByDay, serviceLabel, topAgents, topCountries } from '../rollup'

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
