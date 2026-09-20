import { describe, expect, it } from 'vitest'
import { containerIds, filterTopology, parseTopology, routeFor } from '../topology'

const SRC = `flowchart LR
  subgraph cf["Cloudflare"]
    muchq_com["muchq.com"]
  end

  subgraph edge["Host edge"]
    caddy["caddy"]
  end

  subgraph apps["Applications"]
    deja["deja"]
    microgpt-serve["microgpt-serve"]
  end

  subgraph data["Data"]
    shared_postgres[("shared_postgres")]
    s3[("S3")]
  end

  muchq_com -->|http| caddy
  caddy -->|http| deja
  deja -->|sql| shared_postgres
  deja -.->|logs| s3

  classDef gated stroke-dasharray: 5 5
  click deja "https://muchq.com/deja"
`

describe('parseTopology', () => {
  it('reads each node with its label and the group holding it', () => {
    const { nodes } = parseTopology(SRC)

    expect(nodes.find(n => n.id === 'shared_postgres')).toEqual({
      id: 'shared_postgres',
      label: 'shared_postgres',
      group: 'data',
    })
    expect(nodes.find(n => n.id === 'microgpt-serve')?.group).toBe('apps')
  })

  it('reads each edge with its kind', () => {
    const { edges } = parseTopology(SRC)

    expect(edges).toContainEqual({ from: 'caddy', to: 'deja', kind: 'http' })
    expect(edges).toContainEqual({ from: 'deja', to: 's3', kind: 'logs' })
  })

  it('reads the group labels, which are not the group ids', () => {
    const { groups } = parseTopology(SRC)

    expect(groups.find(g => g.id === 'cf')?.label).toBe('Cloudflare')
  })

  it('reads the click targets', () => {
    expect(parseTopology(SRC).clicks.deja).toBe('https://muchq.com/deja')
  })
})

describe('filterTopology', () => {
  it('keeps only edges of the enabled kinds', () => {
    const { edges } = filterTopology(parseTopology(SRC), ['sql'])

    expect(edges).toEqual([{ from: 'deja', to: 'shared_postgres', kind: 'sql' }])
  })

  it('drops nodes left with no edge, so no stranded boxes are drawn', () => {
    const { nodes } = filterTopology(parseTopology(SRC), ['sql'])

    expect(nodes.map(n => n.id).sort()).toEqual(['deja', 'shared_postgres'])
  })

  it('drops a group whose nodes have all gone', () => {
    const { groups } = filterTopology(parseTopology(SRC), ['sql'])

    expect(groups.map(g => g.id).sort()).toEqual(['apps', 'data'])
  })
})

describe('containerIds', () => {
  it('counts caddy, the applications and the database', () => {
    expect([...containerIds(parseTopology(SRC))].sort()).toEqual([
      'caddy',
      'deja',
      'microgpt-serve',
      'shared_postgres',
    ])
  })

  it('leaves out the public names and S3, which have no container', () => {
    const ids = containerIds(parseTopology(SRC))

    expect(ids.has('muchq_com')).toBe(false)
    expect(ids.has('s3')).toBe(false)
  })
})

describe('routeFor', () => {
  it('turns a click target into a router path', () => {
    expect(routeFor('https://muchq.com/deja')).toBe('/deja')
  })

  it('ignores a link that leaves the site', () => {
    expect(routeFor('https://example.com/deja')).toBeNull()
  })
})
