import type {
  CountryRow,
  ProbeRow,
  StatsAgents,
  StatsCountries,
  StatsProbes,
  StatsServices,
  StatsSummary,
} from './api'

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
  /** Where this host's non-browser traffic came from, busiest first. */
  countries: CountryTotal[]
}

export const UNKNOWN_COUNTRY = '--'

// Junk traffic by country: everything that is not a browser, split by
// class, with the probe and refusal counts alongside. Browsers are left
// out on purpose — where the humans are is a different question, and one
// this page is not for.
export interface CountryTotal {
  country: string
  scrapers: number
  bots: number
  other: number
  probes: number
  blocked: number
  total: number
}

function addCountry(totals: Map<string, CountryTotal>, row: CountryRow) {
  if (row.agent_class === 'browser') return
  const total = totals.get(row.country) ?? {
    country: row.country,
    scrapers: 0,
    bots: 0,
    other: 0,
    probes: 0,
    blocked: 0,
    total: 0,
  }
  if (row.agent_class === 'ai_scraper') total.scrapers += row.requests
  else if (row.agent_class === 'bot') total.bots += row.requests
  else total.other += row.requests
  total.probes += row.probes
  total.blocked += row.blocked
  total.total += row.requests
  totals.set(row.country, total)
}

const byTotalDesc = (a: CountryTotal, b: CountryTotal) =>
  b.total - a.total || a.country.localeCompare(b.country)

export function topCountries(countries: StatsCountries | null, limit: number): CountryTotal[] {
  const totals = new Map<string, CountryTotal>()
  for (const row of countries?.rows ?? []) addCountry(totals, row)
  return [...totals.values()].sort(byTotalDesc).slice(0, limit)
}

const byRequestsDesc = <T extends { requests: number }>(a: T, b: T) => b.requests - a.requests

// One entry per host over the window: totals and the class columns from the
// summary, the named breakdown from the agents rollup, and the host's probe
// families. Hosts come from whichever response mentions them, so a host
// with only probe rows still gets a (zero-total) row rather than vanishing.
export function rollupHosts(
  summary: StatsSummary | null,
  agents: StatsAgents | null,
  probes: StatsProbes | null,
  countries: StatsCountries | null = null
): HostEntry[] {
  const hosts = new Map<string, HostEntry>()
  const entryFor = (host: string) => {
    let entry = hosts.get(host)
    if (!entry) {
      entry = { host, total: 0, errors: 0, classes: {}, agents: {}, probes: [], countries: [] }
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

  const perHost = new Map<string, Map<string, CountryTotal>>()
  for (const row of countries?.rows ?? []) {
    let totals = perHost.get(row.host)
    if (!totals) {
      totals = new Map()
      perHost.set(row.host, totals)
    }
    addCountry(totals, row)
  }
  for (const [host, totals] of perHost) {
    entryFor(host).countries = [...totals.values()].sort(byTotalDesc)
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

// What a container is called, for people who never deployed it. The API
// returns the gateway's own upstream names because that is what its pin
// against the Caddyfile can hold; "posterize" and "mithril" mean nothing
// to a reader who clicked Imagine or Wordchains, and "one_d4_v2" is a
// deployment detail nobody asked for. A service with no entry here shows
// under its own name rather than vanishing, which is the right failure:
// a backend added on the server should appear on the page the same day.
export const SERVICE_LABELS: Record<string, string> = {
  deja: 'Deja',
  forgejo: 'Git',
  games_hub: 'Games',
  iili: 'Short links',
  mcpserver: 'MCP',
  'microgpt-serve': 'microGPT',
  mithril: 'Wordchains',
  one_d4: '1d4',
  one_d4_v2: '1d4 v2',
  portrait: 'Tracy',
  posterize: 'Imagine',
  prom_proxy: 'Metrics',
  stats: 'Stats',
  // Not a backend: the paths the gateway answered itself, or refused.
  other: 'Nothing served',
}

export const serviceLabel = (service: string) => SERVICE_LABELS[service] ?? service

// The callers the source column can name, in the order the table reads.
export const SOURCES = ['ui', 'mcp', 'api'] as const

export const SOURCE_LABELS: Record<string, string> = {
  ui: 'Web app',
  mcp: 'MCP',
  // Everything that is neither: a script, a scanner, a person with curl.
  api: 'Direct',
}

export interface ServiceEntry {
  service: string
  label: string
  total: number
  errors: number
  /** Per agent class, so a busy backend can be read as people or crawlers. */
  classes: Record<string, number>
  /** Per caller, from the source column. */
  callers: Record<string, number>
  /** The vhosts this backend was reached through, busiest first. */
  hosts: string[]
}

// One entry per backend over the window, busiest first. Rows arrive
// per day, host, caller and class; a service reached through two vhosts
// (microgpt-serve answers both api.muchq.com and gpt.muchq.com) is one
// entry that names both.
export function rollupServices(services: StatsServices | null): ServiceEntry[] {
  const entries = new Map<string, ServiceEntry>()
  const hostTotals = new Map<string, Map<string, number>>()

  for (const row of services?.rows ?? []) {
    let entry = entries.get(row.service)
    if (!entry) {
      entry = {
        service: row.service,
        label: serviceLabel(row.service),
        total: 0,
        errors: 0,
        classes: {},
        callers: {},
        hosts: [],
      }
      entries.set(row.service, entry)
      hostTotals.set(row.service, new Map())
    }
    entry.total += row.requests
    entry.errors += row.errors
    entry.classes[row.agent_class] = (entry.classes[row.agent_class] ?? 0) + row.requests
    entry.callers[row.source] = (entry.callers[row.source] ?? 0) + row.requests
    const hosts = hostTotals.get(row.service)!
    hosts.set(row.host, (hosts.get(row.host) ?? 0) + row.requests)
  }

  for (const entry of entries.values()) {
    const hosts = hostTotals.get(entry.service)!
    entry.hosts = [...hosts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([host]) => host)
  }
  return [...entries.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}
