import { useEffect, useMemo, useState } from 'react'
import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import {
  STATS_API_URL,
  fetchJson,
  type StatsAgents,
  type StatsCountries,
  type StatsHubEvents,
  type StatsProbes,
  type StatsQueries,
  type StatsQueryTerms,
  type StatsServices,
  type StatsSummary,
  type TopSlugs,
} from '../api'
import {
  rollupHosts,
  rollupHubEvents,
  rollupQueries,
  rollupServices,
  scrapersByDay,
  topAgents,
  topCountries,
  topTerms,
} from '../rollup'
import HubTab from './HubTab'
import QueriesTab from './QueriesTab'
import TrafficTab from './TrafficTab'

interface Props {
  onConnectionStateChange: (status: ConnectionState) => void
}

const WINDOW_DAYS = 30
const TOP_AGENTS = 25
// The agents endpoint caps its rows (busiest first) and this is its
// ceiling; anything less and thin days of a real scraper fall off the
// by-day table as missing rows rather than zeros.
const AGENT_ROWS = 2000
const TOP_COUNTRIES = 25
// The services endpoint's own ceiling. Its rows are folded per service
// before it truncates, so a short answer is missing quiet backends
// entirely rather than part of a busy one's total — which is why the
// row count is checked against what it says it had.
const SERVICE_ROWS = 5000
// The terms endpoint's ceiling, folded across entry points here, so the
// tail it drops is the language's tail rather than one endpoint's.
const TERM_ROWS = 1000
const TOP_TERMS = 12

// Three questions, three tabs. One column of nine tables was already long
// before the app-level events; stacking them all made none of it
// readable. Traffic leads because that is what /stats has always meant.
// All three tabs' data arrives on mount, so switching costs nothing.
const TABS = [
  { id: 'traffic', label: 'Traffic' },
  { id: 'hub', label: 'The hub' },
  { id: 'one_d4', label: 'one_d4' },
] as const

type Tab = (typeof TABS)[number]['id']

// Traffic stats derived from shipped Caddy access logs (MoonBase#1460,
// #1458): who is crawling, per vhost and by name, which scanner shapes are
// probing, plus the most-followed iili short links. Counts refresh on the
// aggregator's own cadence, so this fetches once per mount rather than
// polling.
const StatsDashboard = ({ onConnectionStateChange }: Props) => {
  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [agents, setAgents] = useState<StatsAgents | null>(null)
  const [probes, setProbes] = useState<StatsProbes | null>(null)
  const [countries, setCountries] = useState<StatsCountries | null>(null)
  // The four side-chain endpoints start undefined, not null: until each
  // answers, its tables are loading rather than missing.
  const [services, setServices] = useState<StatsServices | null | undefined>(undefined)
  const [slugs, setSlugs] = useState<TopSlugs | null>(null)
  const [hubEvents, setHubEvents] = useState<StatsHubEvents | null | undefined>(undefined)
  const [queries, setQueries] = useState<StatsQueries | null | undefined>(undefined)
  const [terms, setTerms] = useState<StatsQueryTerms | null | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('traffic')

  useEffect(() => {
    let cancelled = false
    onConnectionStateChange('connecting')
    Promise.all([
      fetchJson<StatsSummary>(`${STATS_API_URL}/summary?days=${WINDOW_DAYS}`),
      fetchJson<StatsAgents>(`${STATS_API_URL}/agents?days=${WINDOW_DAYS}&limit=${AGENT_ROWS}`),
      fetchJson<StatsProbes>(`${STATS_API_URL}/probes?days=${WINDOW_DAYS}`),
      fetchJson<TopSlugs>(`${STATS_API_URL}/iili/top?days=${WINDOW_DAYS}&limit=20`),
      fetchJson<StatsCountries>(`${STATS_API_URL}/countries?days=${WINDOW_DAYS}`),
    ]).then(([summaryResult, agentsResult, probesResult, slugResult, countriesResult]) => {
      if (cancelled) return
      setSummary(summaryResult)
      setAgents(agentsResult)
      setProbes(probesResult)
      setSlugs(slugResult)
      setCountries(countriesResult)
      setLoaded(true)
      onConnectionStateChange(summaryResult ? 'connected' : 'failed')
    })
    // The endpoints a deploy may not have caught up to yet. fetchJson
    // answers null for a 404 fast enough, but a request that never settles
    // would hold Promise.all — and with it the whole page — so each of
    // these waits on its own and empties only its own section.
    const side = <T,>(path: string, set: (value: T | null) => void) => {
      fetchJson<T>(`${STATS_API_URL}${path}`).then((value) => {
        if (!cancelled) set(value)
      })
    }
    side<StatsServices>(`/services?days=${WINDOW_DAYS}&limit=${SERVICE_ROWS}`, setServices)
    side<StatsHubEvents>(`/games_hub/events?days=${WINDOW_DAYS}`, setHubEvents)
    side<StatsQueries>(`/one_d4/queries?days=${WINDOW_DAYS}`, setQueries)
    side<StatsQueryTerms>(`/one_d4/terms?days=${WINDOW_DAYS}&limit=${TERM_ROWS}`, setTerms)
    return () => {
      cancelled = true
    }
  }, [onConnectionStateChange])

  const hosts = useMemo(
    () => rollupHosts(summary, agents, probes, countries),
    [summary, agents, probes, countries]
  )
  const byDay = useMemo(() => scrapersByDay(agents), [agents])
  const busiest = useMemo(() => topAgents(agents, TOP_AGENTS), [agents])
  const fromWhere = useMemo(() => topCountries(countries, TOP_COUNTRIES), [countries])
  const backends = useMemo(() => rollupServices(services), [services])
  const hub = useMemo(() => rollupHubEvents(hubEvents), [hubEvents])
  const oneD4 = useMemo(() => rollupQueries(queries), [queries])
  const language = useMemo(() => topTerms(terms, TOP_TERMS), [terms])

  if (!loaded) {
    return <div className={styles.noData}>Loading stats…</div>
  }
  if (!summary) {
    return (
      <div className={styles.noData}>
        Stats API unavailable. The stats profile may not be deployed yet.
      </div>
    )
  }

  const days = summary.days

  return (
    <>
      <div className={styles.tabNavigation}>
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.tab} ${tab === entry.id ? styles.activeTab : ''}`}
            aria-current={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className={styles.metricsGrid}>
        {tab === 'traffic' && (
          <TrafficTab
            hosts={hosts}
            backends={backends}
            byDay={byDay}
            busiest={busiest}
            fromWhere={fromWhere}
            agents={agents}
            probes={probes}
            countries={countries}
            services={services}
            slugs={slugs}
            days={days}
          />
        )}
        {tab === 'hub' && <HubTab hub={hub} events={hubEvents} days={days} />}
        {tab === 'one_d4' && (
          <QueriesTab
            entries={oneD4}
            language={language}
            queries={queries}
            terms={terms}
            termLimit={TERM_ROWS}
            days={days}
          />
        )}
      </div>
    </>
  )
}

export default StatsDashboard
