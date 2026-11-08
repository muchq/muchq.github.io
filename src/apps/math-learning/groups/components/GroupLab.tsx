import { useId, useMemo, useState } from 'react'
import { CATALOG, catalogGroup } from '../engine/catalog'
import {
  byLabel,
  center,
  conjugacyClasses,
  elementOrder,
  generate,
  isAbelian,
  isCyclic,
  isNormal,
  leftCosets,
  order,
  quotient,
  range,
  rightCosets,
  subgroupName,
  subgroups,
  type FiniteGroup,
} from '../engine/finiteGroup'
import CayleyTable from './CayleyTable'
import styles from './Groups.module.css'

/** Tables past this order are too wide to read; the lab lists facts instead. */
export const TABLE_LIMIT = 24

const FAMILIES = [...new Set(CATALOG.map(e => e.family))]

const hue = (i: number, n: number, lightness: number) => `hsl(${Math.round((i * 360) / Math.max(n, 1))} 70% ${lightness}%)`

const setText = (G: FiniteGroup, xs: readonly number[]) => `{${xs.map(x => G.labels[x]).join(', ')}}`

interface GroupLabProps {
  initialGroup?: string
  /** Labels generating the subgroup to select at first, e.g. ['r²']. */
  initialSubgroup?: readonly string[]
}

/**
 * Pick a small group and look at it: its Cayley table, element orders,
 * conjugacy classes, every subgroup, and — for a chosen subgroup — its
 * cosets, whether it is normal, and the quotient.
 */
const GroupLab = ({ initialGroup = 'D4', initialSubgroup }: GroupLabProps) => {
  const id = useId()
  const [groupId, setGroupId] = useState(initialGroup)
  const G = catalogGroup(groupId)
  const subs = useMemo(() => subgroups(G).map(H => ({ H, key: H.join(), normal: isNormal(G, H), name: subgroupName(G, H) })), [G])
  const [subKey, setSubKey] = useState<string | null>(() =>
    initialSubgroup ? generate(G, byLabel(G, ...initialSubgroup)).join() : null
  )
  const [arranged, setArranged] = useState(initialSubgroup !== undefined)
  const selected = subs.find(s => s.key === subKey) ?? null

  const classes = useMemo(() => conjugacyClasses(G), [G])
  const Z = useMemo(() => center(G), [G])
  const n = order(G)

  const cosets = selected ? leftCosets(G, selected.H) : null
  const cosetOf = new Map<number, number>()
  cosets?.forEach((C, i) => C.forEach(g => cosetOf.set(g, i)))
  const byCoset = selected !== null && arranged && cosets !== null

  const rows = byCoset ? cosets.flat() : range(n)
  const colorOf = byCoset ? (g: number) => hue(cosetOf.get(g)!, cosets.length, 82) : (g: number) => hue(g, n, 90)

  return (
    <div className={styles.lab} role="group" aria-label="Group lab">
      <div className={styles.toolControls}>
        <div className={styles.field}>
          <label htmlFor={`${id}-group`}>Group</label>
          <select
            id={`${id}-group`}
            value={groupId}
            onChange={e => {
              setGroupId(e.target.value)
              setSubKey(null)
            }}
          >
            {FAMILIES.map(family => (
              <optgroup key={family} label={family}>
                {CATALOG.filter(e => e.family === family).map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <ul className={styles.chips} aria-label="Summary">
          <li>|{G.name}| = {n}</li>
          <li>{isAbelian(G) ? 'abelian' : 'non-abelian'}</li>
          <li>{isCyclic(G) ? 'cyclic' : 'not cyclic'}</li>
          <li>|Z| = {Z.length}</li>
          <li>{subs.length} subgroups</li>
          <li>{classes.length} conjugacy classes</li>
        </ul>
      </div>

      {n <= TABLE_LIMIT ? (
        <>
          {selected && (
            <label className={styles.toggle}>
              <input type="checkbox" checked={arranged} onChange={e => setArranged(e.target.checked)} />
              Group the table by left cosets of {selected.name} and color by coset
            </label>
          )}
          <CayleyTable
            group={G}
            order={rows}
            colorOf={colorOf}
            caption={
              byCoset
                ? `Cayley table of ${G.name}, rows and columns grouped by the left cosets of ${selected.name}. Each color is one coset. ${
                    selected.normal
                      ? 'The subgroup is normal, so every block is a single color: the blocks form the table of the quotient.'
                      : 'The subgroup is not normal, so some blocks mix colors: coset multiplication is not well defined.'
                  }`
                : `Cayley table of ${G.name}: row a, column b holds a·b.`
            }
          />
        </>
      ) : (
        <p className={styles.toolHint}>
          The Cayley table of a group of order {n} has {n * n} entries; it is omitted here. Everything else below is computed from it.
        </p>
      )}

      <section aria-label="Subgroups">
        <h4>Subgroups {Z.length > 1 && <span className={styles.toolHint}>(center Z = {setText(G, Z)})</span>}</h4>
        <p className={styles.toolHint}>Pick one to see its cosets. ◁ marks the normal subgroups.</p>
        <ul className={styles.subgroupList}>
          {subs.map(s => (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={s.key === subKey}
                className={s.key === subKey ? styles.subgroupSelected : styles.subgroupButton}
                onClick={() => setSubKey(s.key === subKey ? null : s.key)}
              >
                {s.name} <span className={styles.order}>order {s.H.length}</span>
                {s.normal && <span aria-label="normal"> ◁</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && cosets && <SubgroupDetails G={G} H={selected.H} name={selected.name} normal={selected.normal} cosets={cosets} />}

      <section aria-label="Elements">
        <h4>Elements</h4>
        <div className={styles.tableScroll}>
          <table className={styles.facts2}>
            <thead>
              <tr>
                <th scope="col">g</th>
                <th scope="col">|g|</th>
                <th scope="col">g⁻¹</th>
                <th scope="col">conjugacy class</th>
              </tr>
            </thead>
            <tbody>
              {classes.flatMap(cls =>
                cls.map(g => (
                  <tr key={g}>
                    <th scope="row">{G.labels[g]}</th>
                    <td>{elementOrder(G, g)}</td>
                    <td>{G.labels[G.inverses[g]]}</td>
                    <td>{g === cls[0] ? `${setText(G, cls)} (size ${cls.length})` : '〃'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

const SubgroupDetails = ({
  G,
  H,
  name,
  normal,
  cosets,
}: {
  G: FiniteGroup
  H: readonly number[]
  name: string
  normal: boolean
  cosets: number[][]
}) => {
  const right = rightCosets(G, H)
  const Q = normal && H.length < order(G) ? quotient(G, H, 'H') : null
  return (
    <section aria-label={`Subgroup ${name}`} className={styles.subgroupDetails}>
      <h4>
        H = {name}
      </h4>
      <p>
        H = {setText(G, H)}, of order {H.length} and index [{G.name} : H] = {cosets.length}.{' '}
        <strong>{normal ? 'H is normal: gH = Hg for every g.' : 'H is not normal: some left coset gH differs from Hg.'}</strong>
      </p>
      <div className={styles.cosetColumns}>
        <div>
          <h5>Left cosets gH</h5>
          <ul>
            {cosets.map(C => (
              <li key={C.join()}>
                {G.labels[C[0]]}H = {setText(G, C)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5>Right cosets Hg</h5>
          <ul>
            {right.map(C => (
              <li key={C.join()} className={cosets.some(L => L.join() === C.join()) ? undefined : styles.differs}>
                H{G.labels[C[0]]} = {setText(G, C)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {Q && (
        <>
          <h5>
            The quotient {G.name}/H ({order(Q)} elements; {isCyclic(Q) ? 'cyclic' : isAbelian(Q) ? 'abelian, not cyclic' : 'non-abelian'})
          </h5>
          {order(Q) <= TABLE_LIMIT && (
            <CayleyTable
              group={Q}
              order={range(order(Q))}
              colorOf={g => hue(g, order(Q), 82)}
              caption={`Cayley table of ${G.name}/H; each coset is named by its first element.`}
            />
          )}
        </>
      )}
    </section>
  )
}

export default GroupLab
