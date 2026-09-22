import styles from "@/apps/metrics-systems/components/MetricsDashboard.module.css";
import own from "./StatsDashboard.module.css";
import { n, UNAVAILABLE } from "../format";
import {
  SOURCE_LABELS,
  SOURCES,
  type QueryEntry,
  type TermGroup,
} from "../rollup";
import type { StatsQueries, StatsQueryTerms } from "../api";

interface Props {
  entries: QueryEntry[];
  language: TermGroup[];
  /** null when the endpoint failed: an empty table then makes no claim. */
  queries: StatsQueries | null;
  terms: StatsQueryTerms | null;
  days: number;
}

// one_d4's own query events (MoonBase#1465), which the access log cannot
// tell apart: every one of them is a POST to the same path.
const QueriesTab = ({
  entries: oneD4,
  language,
  queries,
  terms,
  days,
}: Props) => (
  <>
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        one_d4 queries — last {queries?.days ?? days} days
      </h2>
      <p className={own.note}>
        Who asked and how it went. The named columns count the words this page
        knows, so a row whose columns fall short of its requests is one_d4 and
        the stats reader having drifted apart — not lost traffic.
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
                  {queries ? "No queries in the window." : UNAVAILABLE}
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
        The query language as it is actually used, folded across entry points:
        which fields queries name, which motifs they look for, and what they
        sort and group by.
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
          <span className={own.none}>
            {terms ? "No queries in the window." : UNAVAILABLE}
          </span>
        )}
      </div>
    </div>
  </>
);

export default QueriesTab;
