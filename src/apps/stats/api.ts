// Log-derived stats (MoonBase#1460, #1458): aggregates the stats service
// computes from shipped Caddy access logs. Its own base URL because the
// backend is a different service behind the same gateway as the metrics
// API, whose fetch helper is reused.
export { fetchJson } from '@/apps/metrics-systems/api'

export const STATS_API_URL =
  import.meta.env.VITE_STATS_API_URL || 'https://api.muchq.com/stats/v1'

export interface StatsSummaryRow {
  date: string
  host: string
  agent_class: string
  requests: number
  errors: number
}

export interface StatsSummary {
  days: number
  rows: StatsSummaryRow[]
}

export interface TopSlugRow {
  slug: string
  requests: number
}

export interface TopSlugs {
  days: number
  rows: TopSlugRow[]
}

// One day of one named agent on one host. The name is bounded per class
// on the server: the marker for AI scrapers and named bots, the UA's
// product token for the rest, empty for browsers. Blocked is the 403 count.
export interface AgentRow {
  date: string
  host: string
  agent_class: string
  agent: string
  requests: number
  blocked: number
}

export interface StatsAgents {
  days: number
  rows: AgentRow[]
}

// One scanner family on one host over the window; served is how many of
// those probes got a sub-400 answer.
export interface ProbeRow {
  host: string
  probe: string
  requests: number
  served: number
}

export interface StatsProbes {
  days: number
  rows: ProbeRow[]
}

// One host's traffic of one class from one country over the window;
// blocked is the 403 count and probes how many were scanner probes. "--"
// is an address no database placed.
export interface CountryRow {
  host: string
  agent_class: string
  country: string
  requests: number
  blocked: number
  probes: number
}

export interface StatsCountries {
  days: number
  rows: CountryRow[]
}

// One day of one backend's traffic on one vhost, from one caller of one
// agent class (MoonBase#1573). The service is the container the gateway
// proxies the route to, not necessarily the thing that answered: Caddy
// handles CORS preflights and refuses scrapers above the handle that
// would have proxied them, so those land under the backend whose path
// they asked for, and the refusals land in its errors.
export interface ServiceRow {
  date: string
  host: string
  service: string
  source: string
  agent_class: string
  requests: number
  errors: number
}

// total is how many rows there were before the limit. The server truncates
// by service, not by row, so a short list is missing whole quiet services
// rather than part of a busy one — which is what makes summing these per
// service meaningful.
export interface StatsServices {
  days: number
  total: number
  rows: ServiceRow[]
}
