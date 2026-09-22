import styles from '@/apps/metrics-systems/components/MetricsDashboard.module.css'
import own from './StatsDashboard.module.css'
import { emptyText, n } from '../format'
import { OVER_CAP, type HubRollup } from '../rollup'
import type { StatsHubEvents } from '../api'

interface Props {
  hub: HubRollup
  /** null when the endpoint failed, undefined while it is still answering. */
  events: StatsHubEvents | null | undefined
  days: number
}

// What happened inside games.muchq.com (MoonBase#1571). The access log
// sees one socket per session and nothing that rode it.
const HubTab = ({ hub, events: hubEvents, days }: Props) => (
  <>
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        Hub — last {hubEvents?.days ?? days} days
      </h2>
      <p className={own.note}>
        What happened inside games.muchq.com, which the access log cannot see:
        a session opens one socket and every room, world, table and message
        rides it.{' '}
        {/* The counts only once the endpoint has answered: zeroes from a
            request that failed or has not landed read as a quiet evening. */}
        {hubEvents && (
          <>
            {n(hub.rooms.created)} rooms made, {n(hub.rooms.closed)} closed,{' '}
            {n(hub.rooms.joins)} joins, {n(hub.rooms.reshapes)} reshapes,{' '}
            {n(hub.rooms.messages)} messages.
          </>
        )}
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
                <td colSpan={4}>{emptyText(hubEvents, 'Nobody has opened a room yet.')}</td>
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
                  <td colSpan={4}>{emptyText(hubEvents, 'No tables dealt yet.')}</td>
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
                  <td colSpan={2}>{emptyText(hubEvents, 'No tables dealt yet.')}</td>
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
                  <td colSpan={3}>{emptyText(hubEvents, 'No rooms yet.')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </>
)

export default HubTab
