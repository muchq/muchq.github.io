import { useId } from 'react'
import type { FiniteGroup } from '../engine/finiteGroup'
import styles from './Groups.module.css'

interface CayleyTableProps {
  group: FiniteGroup
  /** The elements in display order (rows and columns alike). */
  order: readonly number[]
  /** Background for a cell holding this element. */
  colorOf: (element: number) => string
  /** Short: a caption is as wide as its table. */
  caption: string
  /** The explanation, shown below the table at the text's width. */
  description?: string
}

const CayleyTable = ({ group, order, colorOf, caption, description }: CayleyTableProps) => {
  const descriptionId = useId()
  return (
    <>
      {/* Focusable so a keyboard can scroll a table wider than the page. */}
      <div className={styles.tableScroll} role="region" aria-label={caption} tabIndex={0}>
        <table className={styles.cayley} aria-describedby={description ? descriptionId : undefined}>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col" aria-label="product">
                ·
              </th>
              {order.map(b => (
                <th key={b} scope="col">
                  {group.labels[b]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map(a => (
              <tr key={a}>
                <th scope="row">{group.labels[a]}</th>
                {order.map(b => {
                  const ab = group.table[a][b]
                  return (
                    <td key={b} style={{ background: colorOf(ab) }}>
                      {group.labels[ab]}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {description && (
        <p id={descriptionId} className={styles.toolHint}>
          {description}
        </p>
      )}
    </>
  )
}

export default CayleyTable
