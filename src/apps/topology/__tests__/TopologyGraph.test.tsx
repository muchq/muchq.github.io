import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TopologyGraph from '../components/TopologyGraph'

// Mermaid 12 builds a node's DOM id as `${renderId}-flowchart-${node}-${n}`,
// so the mock has to be given the render id it was called with. A fixture
// using the bare `flowchart-` shape passes against code that never matches
// anything in a browser.
const svgFor = (renderId: string) => `<svg id="drawn">
  <g class="node" id="${renderId}-flowchart-caddy-0"><a href="https://muchq.com/deja"><rect></rect></a></g>
  <g class="node" id="${renderId}-flowchart-deja-1"><rect></rect></g>
  <g class="node" id="${renderId}-flowchart-otelcol-2"><rect></rect></g>
</svg>`

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id: string) => ({ svg: svgFor(id) })),
  },
}))

const SOURCE = `flowchart LR
  subgraph apps["Applications"]
    caddy["caddy"]
    deja["deja"]
  end
  subgraph obs["Observability"]
    otelcol["otelcol"]
  end
  caddy -->|http| deja
`

const draw = (states: Map<string, 'up'> | null = null) =>
  render(
    <MemoryRouter initialEntries={['/topology']}>
      <Routes>
        <Route path="/topology" element={<TopologyGraph source={SOURCE} states={states} />} />
        <Route path="/deja" element={<div>deja page</div>} />
      </Routes>
    </MemoryRouter>
  )

const nodeFor = (node: string) => document.querySelector(`[id^="topology-"][id*="-flowchart-${node}-"]`) as Element
const classesOf = (el: Element) => el.getAttribute('class') ?? ''

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('TopologyGraph', () => {
  it('routes a node click without reloading the page', async () => {
    draw()
    await waitFor(() => expect(nodeFor('caddy')).not.toBeNull())

    await userEvent.click(nodeFor('caddy').querySelector('rect') as Element)

    await waitFor(() => expect(document.body.textContent).toContain('deja page'))
  })

  it('dims the nodes a hovered node has no edge to', async () => {
    draw()
    await waitFor(() => expect(nodeFor('caddy')).not.toBeNull())

    await userEvent.hover(nodeFor('caddy') as HTMLElement)

    expect(classesOf(nodeFor('otelcol'))).toContain('is-dimmed')
    expect(classesOf(nodeFor('deja'))).not.toContain('is-dimmed')
  })

  it('marks a container with no reported state as unknown, not as healthy', async () => {
    draw(new Map([['deja', 'up']]))
    await waitFor(() => expect(nodeFor('deja')).not.toBeNull())

    expect(classesOf(nodeFor('deja'))).toContain('state-up')
    expect(classesOf(nodeFor('otelcol'))).toContain('state-unknown')
  })
})
