import { Fragment, useEffect, useMemo, useState } from 'react'
import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import own from './StatsDashboard.module.css'
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
  AGENT_CLASSES,
  CLASS_LABELS,
  OVER_CAP,
  rollupHosts,
  rollupHubEvents,
  rollupQueries,
  rollupServices,
  SOURCE_LABELS,
  SOURCES,
  scrapersByDay,
  topAgents,
  topCountries,
  topTerms,
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
// The services endpoint's own ceiling. Its rows are folded per service
// before it truncates, so a short answer is missing quiet backends
// entirely rather than part of a busy one's total — which is why the
// row count is checked against what it says it had.
const SERVICE_ROWS = 5000
const HOST_COUNTRIES = 8
// The terms endpoint's ceiling, folded across entry points here, so the
// tail it drops is the language's tail rather than one endpoint's.
const TERM_ROWS = 1000
const TOP_TERMS = 12

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
  const [services, setServices] = useState<StatsServices | null>(null)
  const [slugs, setSlugs] = useState<TopSlugs | null>(null)
  const [hubEvents, setHubEvents] = useState<StatsHubEvents | null>(null)
  const [queries, setQueries] = useState<StatsQueries | null>(null)
  const [terms, setTerms] = useState<StatsQueryTerms | null>(null)
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
    <div className={styles.metricsGrid}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          The hub — last {hubEvents?.days ?? days} days
        </h2>
        <p className={own.note}>
          What happened inside games.muchq.com, which the access log cannot see:
          a session opens one socket and every room, world, table and message
          rides it. {n(hub.rooms.created)} rooms made, {n(hub.rooms.closed)} closed,{' '}
          {n(hub.rooms.joins)} joins, {n(hub.rooms.reshapes)} reshapes,{' '}
          {n(hub.rooms.messages)} messages.
        </p>
        <div className={styles.tableScroll}>
          <table className={styles.containerTable} data-testid="hub-days">
            <thead>
              <tr>
                <th>Date</th>
                <th>Rooms made</th>
                <th>Tables dealt</th>
                <th>Messages</th>
              </tr>
            </thead>
            <tbody>
              {hub.days.map((day) => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  <td>{n(day.rooms)}</td>
                  <td>{n(day.games)}</td>
                  <td>{n(day.messages)}</td>
                </tr>
              ))}
              {hub.days.length === 0 && (
                <tr>
                  <td colSpan={4}>{hubEvents ? 'Nobody has opened a room yet.' : UNAVAILABLE}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.sectionGrid}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Games played</h2>
          <p className={own.note}>
            A table is abandoned when too few seats are left to go on, which
            is most of the ways a game ends when nobody is watching.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable} data-testid="hub-variants">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Dealt</th>
                  <th>Completed</th>
                  <th>Abandoned</th>
                </tr>
              </thead>
              <tbody>
                {hub.variants.map((entry) => (
                  <tr key={entry.variant}>
                    <td>{entry.label}</td>
                    <td>{n(entry.dealt)}</td>
                    <td>{n(entry.completed)}</td>
                    <td>{n(entry.abandoned)}</td>
                  </tr>
                ))}
                {hub.variants.length === 0 && (
                  <tr>
                    <td colSpan={4}>{hubEvents ? 'No tables dealt yet.' : UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Table sizes</h2>
          <p className={own.note}>
            Seats a table was dealt to, counted while it was still whole. How
            many were left at the end is a different number and not this one.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable} data-testid="hub-sizes">
              <thead>
                <tr>
                  <th>Seats</th>
                  <th>Tables</th>
                </tr>
              </thead>
              <tbody>
                {hub.sizes.map((size) => (
                  <tr key={size.players}>
                    <td>{size.players === OVER_CAP ? 'More than a table seats' : n(size.players)}</td>
                    <td>{n(size.dealt)}</td>
                  </tr>
                ))}
                {hub.sizes.length === 0 && (
                  <tr>
                    <td colSpan={2}>{hubEvents ? 'No tables dealt yet.' : UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Worlds</h2>
          <p className={own.note}>
            The shape a room opened on, and the shape somebody reached for
            instead. The second one is taste; the first is the default.
          </p>
          <div className={styles.tableScroll}>
            <table className={styles.containerTable} data-testid="hub-surfaces">
              <thead>
                <tr>
                  <th>World</th>
                  <th>Opened on</th>
                  <th>Changed to</th>
                </tr>
              </thead>
              <tbody>
                {hub.surfaces.map((surface) => (
                  <tr key={surface.surface}>
                    <td>{surface.label}</td>
                    <td>{n(surface.chosen)}</td>
                    <td>{n(surface.changedTo)}</td>
                  </tr>
                ))}
                {hub.surfaces.length === 0 && (
                  <tr>
                    <td colSpan={3}>{hubEvents ? 'No rooms yet.' : UNAVAILABLE}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          one_d4 queries — last {queries?.days ?? days} days
        </h2>
        <p className={own.note}>
          Who asked and how it went. The named columns count the words this
          page knows, so a row whose columns fall short of its requests is
          one_d4 and the stats reader having drifted apart — not lost traffic.
        </p>
        <div className={styles.tableScroll}>
          <table className={styles.containerTable} data-testid="one-d4-queries">
            <thead>
              <tr>
                <th>Entry</th>
                <th>Requests</th>
                {SOURCES.map((source) => (
                  <th key={source}>{SOURCE_LABELS[source]}</th>
                ))}
                <th>Answered</th>
                <th>Invalid</th>
                <th>Failed</th>
                <th>From snapshot</th>
              </tr>
            </thead>
            <tbody>
              {oneD4.map((entry) => (
                <tr key={entry.entry} data-testid={`one-d4-${entry.entry}`}>
                  <td>{entry.label}</td>
                  <td>{n(entry.total)}</td>
                  {SOURCES.map((source) => (
                    <td key={source}>{n(entry.bySource[source] ?? 0)}</td>
                  ))}
                  <td>{n(entry.ok)}</td>
                  <td>{n(entry.invalid)}</td>
                  <td>{n(entry.failed)}</td>
                  <td>{n(entry.cached)}</td>
                </tr>
              ))}
              {oneD4.length === 0 && (
                <tr>
                  <td colSpan={6 + SOURCES.length}>
                    {queries ? 'No queries in the window.' : UNAVAILABLE}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          What one_d4 gets asked for — last {terms?.days ?? days} days
        </h2>
        <p className={own.note}>
          The query language as it is actually used, folded across entry
          points: which fields queries name, which motifs they look for, and
          what they sort and group by.
        </p>
        <div className={styles.sectionGrid} data-testid="one-d4-terms">
          {language.map((group) => (
            <div key={group.kind}>
              <h3 className={own.detailTitle}>{group.label}</h3>
              <table className={own.detailTable}>
                <tbody>
                  {group.terms.map((term) => (
                    <tr key={term.term}>
                      <td className={own.agentName}>{term.term}</td>
                      <td>{n(term.requests)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {language.length === 0 && (
            <span className={own.none}>{terms ? 'No queries in the window.' : UNAVAILABLE}</span>
          )}
        </div>
      </div>

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

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Traffic by service — last {days} days</h2>
        <p className={own.note}>
          Which backend the gateway sent a request to, and who was asking. A path
          the gateway answered itself — a refusal, or something no backend serves
          — is “Nothing served”, and a backend’s refusals count as its errors.
        </p>
        <div className={styles.tableScroll}>
          <table className={styles.containerTable}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Requests</th>
                <th>Errors</th>
                {SOURCES.map((source) => (
                  <th key={source}>{SOURCE_LABELS[source]}</th>
                ))}
                {AGENT_CLASSES.map((agentClass) => (
                  <th key={agentClass}>{CLASS_LABELS[agentClass]}</th>
                ))}
                <th>Reached through</th>
              </tr>
            </thead>
            <tbody>
              {backends.map((entry) => (
                <tr key={entry.service} data-testid={`service-${entry.service}`}>
                  <td>{entry.label}</td>
                  <td>{n(entry.total)}</td>
                  <td>{n(entry.errors)}</td>
                  {SOURCES.map((source) => (
                    <td key={source}>{n(entry.callers[source] ?? 0)}</td>
                  ))}
                  {AGENT_CLASSES.map((agentClass) => (
                    <td key={agentClass}>{n(entry.classes[agentClass] ?? 0)}</td>
                  ))}
                  <td>
                    <span className={own.hostList}>{entry.hosts.join(', ')}</span>
                  </td>
                </tr>
              ))}
              {backends.length === 0 && (
                <tr>
                  <td colSpan={4 + SOURCES.length + AGENT_CLASSES.length}>
                    {services ? 'No aggregated traffic yet.' : UNAVAILABLE}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {services && services.total > services.rows.length && (
          <p className={own.note}>
            Showing {n(services.rows.length)} of {n(services.total)} rows.
            The busiest services are here in full and the quietest are
            missing entirely, so every total above is exact.
          </p>
        )}
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
