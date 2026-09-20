import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TopologyGraph from '../components/TopologyGraph'

const SVG = `<svg id="drawn">
  <g class="node" id="flowchart-caddy-1"><a href="https://muchq.com/deja"><rect></rect></a></g>
  <g class="node" id="flowchart-deja-2"><rect></rect></g>
  <g class="node" id="flowchart-otelcol-3"><rect></rect></g>
</svg>`

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn(async () => ({ svg: SVG })) },
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

const nodeFor = (id: string) => document.querySelector(`#flowchart-${id}`) as Element
const classesOf = (el: Element) => el.getAttribute('class') ?? ''

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('TopologyGraph', () => {
  it('routes a node click without reloading the page', async () => {
    draw()
    await waitFor(() => expect(nodeFor('caddy-1')).not.toBeNull())

    await userEvent.click(nodeFor('caddy-1').querySelector('rect') as Element)

    await waitFor(() => expect(document.body.textContent).toContain('deja page'))
  })

  it('dims the nodes a hovered node has no edge to', async () => {
    draw()
    await waitFor(() => expect(nodeFor('caddy-1')).not.toBeNull())

    await userEvent.hover(nodeFor('caddy-1') as HTMLElement)

    expect(classesOf(nodeFor('otelcol-3'))).toContain('is-dimmed')
    expect(classesOf(nodeFor('deja-2'))).not.toContain('is-dimmed')
  })

  it('marks a container with no reported state as unknown, not as healthy', async () => {
    draw(new Map([['deja', 'up']]))
    await waitFor(() => expect(nodeFor('deja-2')).not.toBeNull())

    expect(classesOf(nodeFor('deja-2'))).toContain('state-up')
    expect(classesOf(nodeFor('otelcol-3'))).toContain('state-unknown')
  })
})
