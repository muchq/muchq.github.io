import { useState } from 'react'
import { nameOf } from '../rules'
import type { ChessView } from '../wire'
import styles from './ChessTable.module.css'

// The table's running score as a notepad, rummy's: a column a player, a
// line a game with a 1 in its winner's column, and the wins totalled under
// a rule. Width stays in the header row; height is dropped from the board's
// flex budget (zero-height slot), so a new line or the first sheet does not
// resize the squares. Closed, the sheet is the totals alone, so a long match
// never hangs over the board; the game count opens the last few games. The
// totals count them all.

const PAGE = 5

export interface ScoreSheetProps {
  view: ChessView
  playerId: string
}

const ScoreSheet = ({ view, playerId }: ScoreSheetProps) => {
  const [open, setOpen] = useState(false)
  const lines = view.scoreSheet ?? []
  if (lines.length === 0) return null
  const columns = view.players.map(player => player.playerId)
  for (const line of lines) {
    if (line.winner !== undefined && !columns.includes(line.winner)) columns.push(line.winner)
  }
  const first = Math.max(0, lines.length - PAGE)
  const wins = (id: string) => lines.filter(line => line.winner === id).length
  // Slot keeps the notepad's width in the header row and drops its height
  // from the flex budget, so the sheet can grow down the side without
  // resizing the board.
  return (
    <div className={styles.notepadSlot}>
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
          <tbody hidden={!open}>
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
        <button type="button" className={styles.notepadToggle} aria-expanded={open} onClick={() => setOpen(!open)}>
          {lines.length} {lines.length === 1 ? 'game' : 'games'}
        </button>
      </div>
    </div>
  )
}

export default ScoreSheet
