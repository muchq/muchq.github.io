import type { ProbeRow, StatsAgents, StatsProbes, StatsSummary } from './api'

export const AGENT_CLASSES = ['browser', 'ai_scraper', 'bot', 'other'] as const

export const CLASS_LABELS: Record<string, string> = {
  browser: 'Browser',
  ai_scraper: 'AI scrapers',
  bot: 'Bots',
  other: 'Other',
}

export interface NamedAgent {
  agent: string
  requests: number
  blocked: number
}

export interface HostEntry {
  host: string
  total: number
  errors: number
  classes: Record<string, number>
  /** Per class, named agents summed over the window, busiest first. */
  agents: Record<string, NamedAgent[]>
  /** Scanner families seen on this host, busiest first. */
  probes: ProbeRow[]
}

const byRequestsDesc = <T extends { requests: number }>(a: T, b: T) => b.requests - a.requests

// One entry per host over the window: totals and the class columns from the
// summary, the named breakdown from the agents rollup, and the host's probe
// families. Hosts come from whichever response mentions them, so a host
// with only probe rows still gets a (zero-total) row rather than vanishing.
export function rollupHosts(
  summary: StatsSummary | null,
  agents: StatsAgents | null,
  probes: StatsProbes | null
): HostEntry[] {
  const hosts = new Map<string, HostEntry>()
  const entryFor = (host: string) => {
    let entry = hosts.get(host)
    if (!entry) {
      entry = { host, total: 0, errors: 0, classes: {}, agents: {}, probes: [] }
      hosts.set(host, entry)
    }
    return entry
  }

  for (const row of summary?.rows ?? []) {
    const entry = entryFor(row.host)
    entry.total += row.requests
    entry.errors += row.errors
    entry.classes[row.agent_class] = (entry.classes[row.agent_class] ?? 0) + row.requests
  }

  const named = new Map<string, NamedAgent>()
  for (const row of agents?.rows ?? []) {
    const key = `${row.host} ${row.agent_class} ${row.agent}`
    let agent = named.get(key)
    if (!agent) {
      agent = { agent: row.agent, requests: 0, blocked: 0 }
      named.set(key, agent)
      const entry = entryFor(row.host)
      const list = entry.agents[row.agent_class] ?? (entry.agents[row.agent_class] = [])
      list.push(agent)
    }
    agent.requests += row.requests
    agent.blocked += row.blocked
  }

  for (const row of probes?.rows ?? []) {
    entryFor(row.host).probes.push(row)
  }

  for (const entry of hosts.values()) {
    for (const list of Object.values(entry.agents)) list.sort(byRequestsDesc)
    entry.probes.sort(byRequestsDesc)
  }
  return [...hosts.values()].sort((a, b) => b.total - a.total)
}

export interface DayRow {
  date: string
  requests: number
  blocked: number
}

// AI scraper volume per day across every host, newest first: "do they back
// off after a 403" is blocked against requests over time.
export function scrapersByDay(agents: StatsAgents | null): DayRow[] {
  const days = new Map<string, DayRow>()
  for (const row of agents?.rows ?? []) {
    if (row.agent_class !== 'ai_scraper') continue
    const day = days.get(row.date) ?? { date: row.date, requests: 0, blocked: 0 }
    day.requests += row.requests
    day.blocked += row.blocked
    days.set(row.date, day)
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export interface TopAgent extends NamedAgent {
  agent_class: string
  hosts: number
}

// The busiest named agents across hosts, browsers excluded: they are one
// unnamed bucket per host and would only ever top the list.
export function topAgents(agents: StatsAgents | null, limit: number): TopAgent[] {
  const totals = new Map<string, TopAgent & { hostSet: Set<string> }>()
  for (const row of agents?.rows ?? []) {
    if (row.agent_class === 'browser') continue
    const key = `${row.agent_class} ${row.agent}`
    const total = totals.get(key) ?? {
      agent: row.agent,
      agent_class: row.agent_class,
      requests: 0,
      blocked: 0,
      hosts: 0,
      hostSet: new Set<string>(),
    }
    total.requests += row.requests
    total.blocked += row.blocked
    total.hostSet.add(row.host)
    totals.set(key, total)
  }
  return [...totals.values()]
    .map(({ hostSet, ...rest }) => ({ ...rest, hosts: hostSet.size }))
    .sort(byRequestsDesc)
    .slice(0, limit)
}
