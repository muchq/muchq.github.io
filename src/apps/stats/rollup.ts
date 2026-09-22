import type {
  CountryRow,
  ProbeRow,
  StatsAgents,
  StatsCountries,
  StatsHubEvents,
  StatsProbes,
  StatsQueries,
  StatsQueryTerms,
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

// ---------------------------------------------------------------------
// games_hub (MoonBase#1571)
// ---------------------------------------------------------------------

export const VARIANT_LABELS: Record<string, string> = {
  golf: 'Golf',
  castle: 'Castle',
  other: 'Other',
}

export const SURFACE_LABELS: Record<string, string> = {
  plane: 'Plane',
  sphere: 'Sphere',
  glasshouse: 'Glasshouse',
  other: 'Other',
}

// A count past what its event could carry. The server sends -1 rather
// than clamping, precisely so it cannot be read as a table size.
export const OVER_CAP = -1

export interface VariantEntry {
  variant: string
  label: string
  dealt: number
  completed: number
  abandoned: number
}

// How many tables were dealt at each size. Only game_started carries a
// table's real size — game_finished's players is the seats *still held*,
// which for an abandonment is one by definition, so the two must never
// share an axis.
export interface TableSize {
  players: number
  dealt: number
}

export interface RoomTotals {
  created: number
  closed: number
  joins: number
  messages: number
  reshapes: number
}

// One day of the hub, newest first. Rooms made, tables dealt and things
// said is the whole question during an alpha: whether anybody was here.
export interface HubDay {
  date: string
  rooms: number
  games: number
  messages: number
}

export interface HubRollup {
  days: HubDay[]
  variants: VariantEntry[]
  sizes: TableSize[]
  rooms: RoomTotals
  surfaces: { surface: string; label: string; chosen: number; changedTo: number }[]
  /** Any event at all, so a section can tell "nothing yet" from "no data". */
  total: number
}

const emptyHub = (): HubRollup => ({
  days: [],
  variants: [],
  sizes: [],
  rooms: { created: 0, closed: 0, joins: 0, messages: 0, reshapes: 0 },
  surfaces: [],
  total: 0,
})

export function rollupHubEvents(events: StatsHubEvents | null): HubRollup {
  const out = emptyHub()
  if (!events) return out

  const variants = new Map<string, VariantEntry>()
  const sizes = new Map<number, number>()
  const surfaces = new Map<string, { chosen: number; changedTo: number }>()
  const days = new Map<string, HubDay>()

  const dayOf = (date: string) => {
    const seen = days.get(date) ?? { date, rooms: 0, games: 0, messages: 0 }
    days.set(date, seen)
    return seen
  }

  const variantOf = (variant: string) => {
    const seen = variants.get(variant) ?? {
      variant,
      label: VARIANT_LABELS[variant] ?? variant,
      dealt: 0,
      completed: 0,
      abandoned: 0,
    }
    variants.set(variant, seen)
    return seen
  }
  const surfaceOf = (surface: string) => {
    const seen = surfaces.get(surface) ?? { chosen: 0, changedTo: 0 }
    surfaces.set(surface, seen)
    return seen
  }

  for (const row of events.rows) {
    out.total += row.events
    switch (row.event) {
      case 'room_created':
        out.rooms.created += row.events
        dayOf(row.date).rooms += row.events
        surfaceOf(row.surface).chosen += row.events
        break
      case 'room_closed':
        out.rooms.closed += row.events
        break
      case 'room_joined':
        out.rooms.joins += row.events
        break
      case 'chat_message':
        out.rooms.messages += row.events
        dayOf(row.date).messages += row.events
        break
      case 'geometry_changed':
        out.rooms.reshapes += row.events
        surfaceOf(row.surface).changedTo += row.events
        break
      case 'game_started':
        variantOf(row.variant).dealt += row.events
        dayOf(row.date).games += row.events
        sizes.set(row.players, (sizes.get(row.players) ?? 0) + row.events)
        break
      case 'game_finished':
        if (row.outcome === 'abandoned') variantOf(row.variant).abandoned += row.events
        else variantOf(row.variant).completed += row.events
        break
      default:
        break
    }
  }

  out.days = [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
  out.variants = [...variants.values()].sort((a, b) => b.dealt - a.dealt || a.label.localeCompare(b.label))
  // Over-cap last, whatever its numeric value: it is not a size, so it
  // does not belong in the middle of a run of sizes.
  out.sizes = [...sizes.entries()]
    .map(([players, dealt]) => ({ players, dealt }))
    .sort((a, b) => {
      if (a.players === OVER_CAP) return 1
      if (b.players === OVER_CAP) return -1
      return a.players - b.players
    })
  out.surfaces = [...surfaces.entries()]
    .map(([surface, counts]) => ({
      surface,
      label: SURFACE_LABELS[surface] ?? surface,
      ...counts,
    }))
    .sort((a, b) => b.chosen + b.changedTo - (a.chosen + a.changedTo) || a.label.localeCompare(b.label))
  return out
}

// ---------------------------------------------------------------------
// one_d4 queries (MoonBase#1465)
// ---------------------------------------------------------------------

export const ENTRY_LABELS: Record<string, string> = {
  query: 'Query',
  aggregate: 'Aggregate',
  other: 'Other',
}

export const TERM_KINDS = ['field', 'motif', 'order_by', 'group_by'] as const

export const TERM_KIND_LABELS: Record<string, string> = {
  field: 'Fields',
  motif: 'Motifs',
  order_by: 'Ordered by',
  group_by: 'Grouped by',
}

export interface QueryEntry {
  entry: string
  label: string
  total: number
  /** The engine answered. */
  ok: number
  /** The query did not compile. */
  invalid: number
  /** It compiled and the engine could not answer it. */
  failed: number
  /** Answered from the snapshot rather than live. */
  cached: number
  bySource: Record<string, number>
}

// `total` counts every row; the named columns count only the words this
// build knows. A word the server collapsed to `other` — drift between
// one_d4 and the reader — is therefore a total that its columns do not
// add up to, which is the point: it is visible rather than miscounted.
export function rollupQueries(queries: StatsQueries | null): QueryEntry[] {
  if (!queries) return []
  const entries = new Map<string, QueryEntry>()
  for (const row of queries.rows) {
    const seen = entries.get(row.entry) ?? {
      entry: row.entry,
      label: ENTRY_LABELS[row.entry] ?? row.entry,
      total: 0,
      ok: 0,
      invalid: 0,
      failed: 0,
      cached: 0,
      bySource: {},
    }
    seen.total += row.requests
    if (row.outcome === 'ok') seen.ok += row.requests
    if (row.outcome === 'invalid') seen.invalid += row.requests
    if (row.outcome === 'failed') seen.failed += row.requests
    if (row.cache === 'snapshot') seen.cached += row.requests
    seen.bySource[row.source] = (seen.bySource[row.source] ?? 0) + row.requests
    entries.set(row.entry, seen)
  }
  return [...entries.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

export interface TermGroup {
  kind: string
  label: string
  terms: { term: string; requests: number }[]
}

// The busiest terms of each kind, folded across entries: "which fields do
// queries actually ask for" is a question about the language, not about
// which endpoint was called.
export function topTerms(terms: StatsQueryTerms | null, limit: number): TermGroup[] {
  if (!terms) return []
  const byKind = new Map<string, Map<string, number>>()
  for (const row of terms.rows) {
    const kind = byKind.get(row.kind) ?? new Map<string, number>()
    kind.set(row.term, (kind.get(row.term) ?? 0) + row.requests)
    byKind.set(row.kind, kind)
  }
  return TERM_KINDS.filter((kind) => byKind.has(kind)).map((kind) => ({
    kind,
    label: TERM_KIND_LABELS[kind],
    terms: [...byKind.get(kind)!.entries()]
      .map(([term, requests]) => ({ term, requests }))
      .sort((a, b) => b.requests - a.requests || a.term.localeCompare(b.term))
      .slice(0, limit),
  }))
}
