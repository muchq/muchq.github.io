import { nameOf } from '../rules'
import type { ChessView } from '../wire'
import styles from './ChessTable.module.css'

// The table's running score as a notepad, rummy's: a column a player, a
// line a game with a 1 in its winner's column, and the wins totalled under
// a rule. The page holds the last few games, so a long match's sheet never
// pushes the board off the screen; the totals count them all.

const PAGE = 5

export interface ScoreSheetProps {
  view: ChessView
  playerId: string
}

const ScoreSheet = ({ view, playerId }: ScoreSheetProps) => {
  const lines = view.scoreSheet ?? []
  if (lines.length === 0) return null
  const columns = view.players.map(player => player.playerId)
  for (const line of lines) {
    if (line.winner !== undefined && !columns.includes(line.winner)) columns.push(line.winner)
  }
  const first = Math.max(0, lines.length - PAGE)
  const wins = (id: string) => lines.filter(line => line.winner === id).length
  return (
    <div className={styles.notepad}>
      <table className={styles.notepadSheet} aria-label="Score sheet">
        <thead>
          <tr>
            <th scope="col">#</th>
            {columns.map(id => (
              <th key={id} scope="col" title={nameOf(id)}>
                <span className={styles.notepadName}>{id === playerId ? 'you' : nameOf(id)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.slice(first).map((line, i) => (
            <tr key={first + i}>
              <th scope="row">{first + i + 1}</th>
              {line.winner === undefined ? (
                <td colSpan={columns.length} className={styles.notepadDraw}>
                  draw
                </td>
              ) : (
                columns.map(id => <td key={id}>{id === line.winner ? 1 : <span aria-hidden="true">—</span>}</td>)
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            {columns.map(id => (
              <td key={id}>{wins(id)}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default ScoreSheet
