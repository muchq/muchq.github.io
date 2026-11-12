import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { chapters, guide, introduction, references } from '../sets/content'
import styles from './SetsPage.module.css'

function Inline({ text }: { text: string }) {
  return <>{text.replace(/\\([[\]_])/g, '$1').split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => part.startsWith('**') ? <strong key={i}>{part.slice(2,-2)}</strong> : part.startsWith('*') ? <em key={i}>{part.slice(1,-1)}</em> : part)}</>
}
function Text({ text }: { text: string }) {
  return <>{text.split(/\n\s*\n/).map((block, i) => block.startsWith('|') ? <div className={styles.table} key={i}><table><tbody>{block.split('\n').filter(row => !/^\|[\s|:-]+$/.test(row)).map((row, j) => <tr key={j}>{row.split('|').slice(1,-1).map((cell, k) => j === 0 ? <th key={k}><Inline text={cell.trim()} /></th> : <td key={k}><Inline text={cell.trim()} /></td>)}</tr>)}</tbody></table></div> : block.startsWith('- ') ? <ul key={i}>{block.split('\n').map((line, j) => <li key={j}><Inline text={line.replace(/^- /, '')} /></li>)}</ul> : <p key={i}><Inline text={block} /></p>)}</>
}
const key = 'jech-problems-v1'
export default function SetsPage() {
  const [params, setParams] = useSearchParams()
  const selected = params.get('chapter') || 'overview'
  const chapter = chapters.find(c => String(c.number) === selected)
  const [completed, setCompleted] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && chapters.some(c => c.problems.some(p => p.id === id))) : [] } catch { return [] }
  })
  const [storageError, setStorageError] = useState(false)
  const toggleCompleted = (id: string, checked: boolean) => {
    const next = checked ? [...completed, id] : completed.filter(value => value !== id)
    setCompleted(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }
  useEffect(() => { document.title = 'Set theory · A problem book'; if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView(); else window.scrollTo(0, 0) }, [selected])
  const navigate = (value: string) => setParams(value === 'overview' ? {} : { chapter: value })
  return <div className={styles.page}>
    <header className={styles.top}><Link to="/">← Home</Link><span>SET THEORY / A PROBLEM BOOK</span><span>{completed.length} / 500 proved</span></header>
    <div className={styles.layout}>
      <aside className={styles.sidebar}><label htmlFor="sets-chapter">Browse the curriculum</label><select id="sets-chapter" value={chapter ? selected : selected === 'references' ? selected : 'overview'} onChange={e => navigate(e.target.value)}><option value="overview">Overview & study guide</option>{chapters.map(c => <option key={c.number} value={c.number}>{c.number}. {c.title}</option>)}<option value="references">References & checking your work</option></select><nav aria-label="Curriculum"><Link to="/sets" aria-current={selected === 'overview' ? 'page' : undefined}>Overview & study guide</Link>{chapters.map(c => <Link key={c.number} to={`?chapter=${c.number}`} aria-current={c === chapter ? 'page' : undefined}><span>{String(c.number).padStart(2,'0')}</span>{c.title}<small>{c.problems.filter(p => completed.includes(p.id)).length}/25</small></Link>)}<Link to="?chapter=references">Checking your work</Link></nav></aside>
      <main className={styles.main}>
        {storageError && <p role="status">Progress cannot be saved in this browser. Your checkmarks will last for this visit only.</p>}
        {chapter ? <><p className={styles.eyebrow}>CHAPTER {chapter.number} / 20 · 25 PROBLEMS</p><h1>{chapter.title}</h1><div className={styles.reading}><Text text={chapter.reading} /></div><p className={styles.legend}>Unmarked: routine · ★ Needs an idea · ★★ An evening’s work</p>{chapter.problems.map(p => <article key={p.id} id={`problem-${p.id}`} className={styles.problem}><header><a href={`?chapter=${chapter.number}#problem-${p.id}`}>Problem {p.id}</a><label><input type="checkbox" checked={completed.includes(p.id)} onChange={e => toggleCompleted(p.id, e.target.checked)} /> Proved</label></header><Text text={p.text} /></article>)}<nav className={styles.pager} aria-label="Adjacent chapters">{chapter.number > 1 && <Link to={`?chapter=${chapter.number-1}`}>← Previous chapter</Link>}<Link to={chapter.number < 20 ? `?chapter=${chapter.number+1}` : '?chapter=references'}>{chapter.number < 20 ? 'Next chapter →' : 'Check your work →'}</Link></nav></> : selected === 'references' ? <><p className={styles.eyebrow}>THE READING ROOM</p><h1>Checking your work</h1><Text text={references} /></> : <><p className={styles.eyebrow}>JECH · CHAPTERS 1–20</p><h1>Set theory,<br /><em>one proof at a time.</em></h1><Text text={introduction} /><div className={styles.stats}><span><strong>500</strong> problems</span><span><strong>20</strong> chapters</span><span><strong>46</strong> weeks</span></div><Link className={styles.start} to={`?chapter=${chapters.find(c => c.problems.some(p => !completed.includes(p.id)))?.number || 1}`}>{completed.length ? 'Continue studying →' : 'Begin with the axioms →'}</Link><p className={styles.legend}>Check off written proofs as you go. Progress is saved on this device.</p><h2>How to use this book</h2><Text text={guide} /><Link to="?chapter=references">References & checking your work →</Link></>}
      </main>
    </div>
  </div>
}
