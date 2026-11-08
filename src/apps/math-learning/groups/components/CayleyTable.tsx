import type { FiniteGroup } from '../engine/finiteGroup'
import styles from './Groups.module.css'

interface CayleyTableProps {
  group: FiniteGroup
  /** The elements in display order (rows and columns alike). */
  order: readonly number[]
  /** Background for a cell holding this element. */
  colorOf: (element: number) => string
  caption: string
}

const CayleyTable = ({ group, order, colorOf, caption }: CayleyTableProps) => (
  <div className={styles.tableScroll}>
    <table className={styles.cayley}>
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
)

export default CayleyTable
