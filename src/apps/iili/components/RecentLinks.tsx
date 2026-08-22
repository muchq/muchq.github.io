import { shortLink, shortLinkLabel } from '../api'
import { describeExpiry } from '../expiry'
import type { RecentLink } from '../recent'
import CopyButton from './CopyButton'
import styles from './RecentLinks.module.css'

const RecentLinks = ({ links, onClear }: { links: RecentLink[]; onClear: () => void }) => {
  if (links.length === 0) return null
  return (
    <section className={styles.recent} aria-labelledby="recent-heading">
      <div className={styles.head}>
        <h2 id="recent-heading">Recent links</h2>
        <button
          type="button"
          className={styles.ghostBtn}
          onClick={onClear}
          aria-label="Clear recent links"
        >
          Clear
        </button>
      </div>
      <ul className={styles.list}>
        {links.map(link => (
          <li key={link.slug} className={styles.row}>
            <div className={styles.urls}>
              <a href={shortLink(link.slug)} target="_blank" rel="noreferrer">
                {shortLinkLabel(link.slug)}
              </a>
              <span className={styles.target} title={link.longUrl}>
                {link.longUrl}
              </span>
              <span className={styles.expiry}>
                expires {describeExpiry(link.expiresAt - Date.now())}
              </span>
            </div>
            <CopyButton text={shortLink(link.slug)} compact />
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RecentLinks
