import { describe, expect, it } from 'vitest'
import { containerNodes, filterByKinds, parseTopology, routeFor } from '../topology'

const SRC = `flowchart LR
  subgraph apps["Applications"]
    caddy["caddy"]
    deja["deja"]
    shared_postgres[("shared_postgres")]
  end

  caddy -->|http| deja
  deja -.->|metrics| shared_postgres

  classDef gated stroke-dasharray: 5 5
  click deja "https://muchq.com/deja"
`

describe('parseTopology', () => {
  it('reads each edge with its kind', () => {
    const { edges } = parseTopology(SRC)

    expect(edges).toEqual([
      { from: 'caddy', to: 'deja', kind: 'http' },
      { from: 'deja', to: 'shared_postgres', kind: 'metrics' },
    ])
  })

  it('reads declared nodes, not the subgraph that holds them', () => {
    const { nodes } = parseTopology(SRC)

    expect(nodes).toEqual(['caddy', 'deja', 'shared_postgres'])
  })
})

describe('filterByKinds', () => {
  it('keeps only edges of the enabled kinds', () => {
    const { edges } = parseTopology(filterByKinds(SRC, ['http']))

    expect(edges).toEqual([{ from: 'caddy', to: 'deja', kind: 'http' }])
  })

  it('drops nodes that lose every edge, so no empty boxes are left behind', () => {
    const { nodes } = parseTopology(filterByKinds(SRC, ['http']))

    expect(nodes).toEqual(['caddy', 'deja'])
  })

  it('keeps the diagram header so the result still renders', () => {
    expect(filterByKinds(SRC, ['http']).split('\n')[0]).toBe('flowchart LR')
  })
})

const GROUPED = `flowchart LR
  subgraph cf["Cloudflare"]
    muchq_com["muchq.com"]
  end

  subgraph ui["muchq.com routes"]
    ui_deja["/deja"]
  end

  subgraph apps["Applications"]
    deja["deja"]
    microgpt-serve["microgpt-serve"]
  end

  subgraph data["Data"]
    shared_postgres[("shared_postgres")]
    s3[("S3")]
  end

  subgraph obs["Observability"]
    otelcol["otelcol"]
  end
`

describe('containerNodes', () => {
  it('counts the application and observability nodes, and the database', () => {
    expect([...containerNodes(GROUPED)].sort()).toEqual([
      'deja',
      'microgpt-serve',
      'otelcol',
      'shared_postgres',
    ])
  })

  it('leaves out the public names, the UI routes and S3, which have no container', () => {
    const containers = containerNodes(GROUPED)

    expect(containers.has('muchq_com')).toBe(false)
    expect(containers.has('ui_deja')).toBe(false)
    expect(containers.has('s3')).toBe(false)
  })
})

describe('routeFor', () => {
  it('turns a click target into a router path', () => {
    expect(routeFor('https://muchq.com/deja')).toBe('/deja')
  })

  it('ignores a link that leaves the site, so it navigates normally', () => {
    expect(routeFor('https://example.com/deja')).toBeNull()
  })
})
