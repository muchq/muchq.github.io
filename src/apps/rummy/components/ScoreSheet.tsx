import type { RummyView } from '../wire'
import styles from './RummyTable.module.css'

// The table's running score as a notepad pinned in the felt's corner: a
// column a player, a line a deal with the points in its winner's column,
// and the totals under a rule. A player who has left keeps their column
// for the deals they won.

export interface ScoreSheetProps {
  view: RummyView
  playerId: string
}

const ScoreSheet = ({ view, playerId }: ScoreSheetProps) => {
  const lines = view.scoreSheet ?? []
  const columns = [...view.standings.map(standing => standing.playerId)]
  for (const line of lines) {
    if (line.winner !== undefined && !columns.includes(line.winner)) columns.push(line.winner)
  }
  const total = (id: string) => lines.reduce((sum, line) => sum + (line.winner === id ? line.points : 0), 0)
  return (
    <aside className={styles.notepad}>
      <table className={styles.notepadSheet} aria-label="Score sheet">
        <thead>
          <tr>
            <th scope="col">#</th>
            {columns.map(id => (
              <th key={id} scope="col" title={id}>
                {id === playerId ? 'you' : id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i}>
              <th scope="row">{i + 1}</th>
              {line.winner === undefined ? (
                <td colSpan={columns.length} className={styles.notepadDraw}>
                  draw
                </td>
              ) : (
                columns.map(id => <td key={id}>{id === line.winner ? line.points : '—'}</td>)
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {columns.map(id => (
              <td key={id}>{total(id)}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </aside>
  )
}

export default ScoreSheet
