import { Fragment, useEffect, useMemo, useState } from 'react'
import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import own from './StatsDashboard.module.css'
import { ConnectionState } from '@/shared/components/nav/ConnectionStatus'
import {
  STATS_API_URL,
  fetchJson,
  type StatsAgents,
  type StatsCountries,
  type StatsProbes,
  type StatsSummary,
  type TopSlugs,
} from '../api'
import {
  AGENT_CLASSES,
  CLASS_LABELS,
  rollupHosts,
  scrapersByDay,
  topAgents,
  topCountries,
  UNKNOWN_COUNTRY,
  type CountryTotal,
  type HostEntry,
  type NamedAgent,
} from '../rollup'

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
const HOST_COUNTRIES = 8

const n = (value: number) => value.toLocaleString()

// A table whose endpoint failed says so; "no rows" is a claim about the
// data, and this page never got any to make it about.
const UNAVAILABLE = 'Not available from the stats service.'

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
  const [slugs, setSlugs] = useState<TopSlugs | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [openHost, setOpenHost] = useState<string | null>(null)

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
    <div className={styles.metricsGrid}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Traffic by host — last {days} days</h2>
        <div className={styles.tableScroll}>
          <table className={styles.containerTable}>
            <thead>
              <tr>
                <th>Host</th>
                <th>Requests</th>
                <th>Errors</th>
                {AGENT_CLASSES.map((agentClass) => (
                  <th key={agentClass}>{CLASS_LABELS[agentClass]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hosts.map((entry) => {
                const open = openHost === entry.host
                const toggle = () => setOpenHost(open ? null : entry.host)
                return (
                  <Fragment key={entry.host}>
                    <tr className={own.hostRow} onClick={toggle}>
                      <td>
                        <button
                          type="button"
                          className={own.hostToggle}
                          aria-expanded={open}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggle()
                          }}
                        >
                          <span className={`${own.chevron} ${open ? own.chevronOpen : ''}`} aria-hidden="true">
                            ›
                          </span>
                          {entry.host}
                        </button>
                      </td>
                      <td>{n(entry.total)}</td>
                      <td>{n(entry.errors)}</td>
                      {AGENT_CLASSES.map((agentClass) => (
                        <td key={agentClass}>{n(entry.classes[agentClass] ?? 0)}</td>
                      ))}
                    </tr>
                    {open && (
                      <tr data-testid={`host-detail-${entry.host}`}>
                        <td colSpan={3 + AGENT_CLASSES.length} className={own.detailCell}>
                          <HostDetail entry={entry} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {hosts.length === 0 && (
                <tr>
                  <td colSpan={3 + AGENT_CLASSES.length}>No aggregated traffic yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.sectionGrid}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>AI scrapers by day</h2>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Requests</th>
                  <th>Blocked</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map((day) => (
                  <tr key={day.date}>
                    <td>{day.date}</td>
                    <td>{n(day.requests)}</td>
                    <td>{n(day.blocked)}</td>
                  </tr>
                ))}
                {byDay.length === 0 && (
                  <tr>
                    <td colSpan={3}>{agents ? 'No AI scraper traffic in the window.' : UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Busiest agents — last {days} days</h2>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable}>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Class</th>
                  <th>Requests</th>
                  <th>Blocked</th>
                  <th>Hosts</th>
                </tr>
              </thead>
              <tbody>
                {busiest.map((agent) => (
                  <tr key={`${agent.agent_class} ${agent.agent}`}>
                    <td className={own.agentName}>{agent.agent}</td>
                    <td>{CLASS_LABELS[agent.agent_class] ?? agent.agent_class}</td>
                    <td>{n(agent.requests)}</td>
                    <td>{n(agent.blocked)}</td>
                    <td>{n(agent.hosts)}</td>
                  </tr>
                ))}
                {busiest.length === 0 && (
                  <tr>
                    <td colSpan={5}>{agents ? 'No named agents aggregated yet.' : UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Where scrapers, bots, and probes come from — last {countries?.days ?? days} days
        </h2>
        <div className={styles.tableScroll}>
          <table className={styles.containerTable} data-testid="countries">
            <thead>
              <tr>
                <th>Country</th>
                <th>Requests</th>
                <th>AI scrapers</th>
                <th>Bots</th>
                <th>Other</th>
                <th>Probes</th>
                <th>Blocked</th>
              </tr>
            </thead>
            <tbody>
              {fromWhere.map((row) => (
                <tr key={row.country}>
                  <td>{countryLabel(row.country)}</td>
                  <td>{n(row.total)}</td>
                  <td>{n(row.scrapers)}</td>
                  <td>{n(row.bots)}</td>
                  <td>{n(row.other)}</td>
                  <td>{n(row.probes)}</td>
                  <td>{n(row.blocked)}</td>
                </tr>
              ))}
              {fromWhere.length === 0 && (
                <tr>
                  <td colSpan={7}>{countries ? 'No non-browser traffic in the window.' : UNAVAILABLE}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className={own.attribution}>
          Browsers are left out. IP geolocation by{' '}
          <a href="https://db-ip.com" rel="noreferrer">
            DB-IP
          </a>
          ; addresses no database placed read as Unknown.
        </p>
      </div>

      <div className={styles.sectionGrid}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Scanner probes — last {probes?.days ?? days} days</h2>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable}>
              <thead>
                <tr>
                  <th>Host</th>
                  <th>Probe</th>
                  <th>Requests</th>
                  <th>Served</th>
                </tr>
              </thead>
              <tbody>
                {(probes?.rows ?? []).map((row) => (
                  <tr key={`${row.host} ${row.probe}`}>
                    <td>{row.host}</td>
                    <td>{row.probe}</td>
                    <td>{n(row.requests)}</td>
                    <td className={row.served > 0 ? own.served : undefined}>{n(row.served)}</td>
                  </tr>
                ))}
                {(probes?.rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4}>{probes ? 'No scanner probes in the window.' : UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Top short links — last {slugs?.days ?? days} days</h2>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable}>
              <thead>
                <tr>
                  <th>Slug</th>
                  <th>Follows</th>
                </tr>
              </thead>
              <tbody>
                {(slugs?.rows ?? []).map((row) => (
                  <tr key={row.slug}>
                    <td>{row.slug}</td>
                    <td>{n(row.requests)}</td>
                  </tr>
                ))}
                {(slugs?.rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={2}>{slugs ? 'No redirects aggregated yet.' : UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// The expanded half of a host row: the three named classes side by side
// (browsers are one bucket and have nothing to expand into) and the
// scanner families that hit this host.
const HostDetail = ({ entry }: { entry: HostEntry }) => (
  <div className={own.detailGrid}>
    {(['ai_scraper', 'bot', 'other'] as const).map((agentClass) => (
      <div key={agentClass}>
        <h3 className={own.detailTitle}>{CLASS_LABELS[agentClass]}</h3>
        <AgentList agents={entry.agents[agentClass] ?? []} />
      </div>
    ))}
    <div>
      <h3 className={own.detailTitle}>Probes</h3>
      {entry.probes.length === 0 ? (
        <span className={own.none}>none</span>
      ) : (
        <table className={own.detailTable}>
          <tbody>
            {entry.probes.map((probe) => (
              <tr key={probe.probe}>
                <td>{probe.probe}</td>
                <td>{n(probe.requests)}</td>
                <td className={probe.served > 0 ? own.served : undefined}>{n(probe.served)} served</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    <div>
      <h3 className={own.detailTitle}>Countries</h3>
      <CountryList countries={entry.countries.slice(0, HOST_COUNTRIES)} />
    </div>
  </div>
)

const countryLabel = (country: string) => (country === UNKNOWN_COUNTRY ? 'Unknown' : country)

const CountryList = ({ countries }: { countries: CountryTotal[] }) =>
  countries.length === 0 ? (
    <span className={own.none}>none</span>
  ) : (
    <table className={own.detailTable}>
      <tbody>
        {countries.map((row) => (
          <tr key={row.country}>
            <td>{countryLabel(row.country)}</td>
            <td>{n(row.total)}</td>
            <td>{n(row.blocked)} blocked</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

const AgentList = ({ agents }: { agents: NamedAgent[] }) =>
  agents.length === 0 ? (
    <span className={own.none}>none</span>
  ) : (
    <table className={own.detailTable}>
      <tbody>
        {agents.map((agent) => (
          <tr key={agent.agent}>
            <td className={own.agentName}>{agent.agent}</td>
            <td>{n(agent.requests)}</td>
            <td>{n(agent.blocked)} blocked</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

export default StatsDashboard
