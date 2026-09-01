import { describe, expect, it } from 'vitest'
import { rollupHosts, scrapersByDay, topAgents } from '../rollup'

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
    ])
  })

  it('honours the limit', () => {
    expect(topAgents(agents, 1).map((a) => a.agent)).toEqual(['curl'])
  })
})
