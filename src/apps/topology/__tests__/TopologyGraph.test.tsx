import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import TopologyGraph from '../components/TopologyGraph'
import { parseTopology } from '../topology'

const topology = parseTopology(`flowchart LR
  subgraph edge["Host edge"]
    caddy["caddy"]
  end

  subgraph apps["Applications"]
    deja["deja"]
    portrait["portrait"]
  end

  subgraph cf["Cloudflare"]
    muchq_com["muchq.com"]
  end

  muchq_com -->|http| caddy
  caddy -->|http| deja
  caddy -->|http| portrait

  click deja "https://muchq.com/deja"
`)

const draw = (states: Map<string, 'up'> | null = null) =>
  render(
    <MemoryRouter initialEntries={['/topology']}>
      <Routes>
        <Route path="/topology" element={<TopologyGraph topology={topology} states={states} />} />
        <Route path="/deja" element={<div>deja page</div>} />
      </Routes>
    </MemoryRouter>
  )

const nodeEl = (id: string) => document.querySelector(`[data-node="${id}"]`) as Element

describe('TopologyGraph', () => {
  it('draws a box per node and a label per group', () => {
    draw()

    expect(nodeEl('caddy')).not.toBeNull()
    expect(nodeEl('deja')).not.toBeNull()
    expect(screen.getByText('Applications')).toBeDefined()
  })

  it('routes a node click without reloading the page', async () => {
    draw()

    await userEvent.click(nodeEl('deja'))

    expect(document.body.textContent).toContain('deja page')
  })

  it('leaves a node alone when nothing links it anywhere', async () => {
    draw()

    await userEvent.click(nodeEl('caddy'))

    expect(document.body.textContent).not.toContain('deja page')
  })

  it('dims the nodes a hovered node has no edge to', async () => {
    draw()

    await userEvent.hover(nodeEl('caddy'))

    expect(nodeEl('muchq_com').getAttribute('data-dimmed')).toBe('false')
    expect(nodeEl('deja').getAttribute('data-dimmed')).toBe('false')
    expect(nodeEl('portrait').getAttribute('data-dimmed')).toBe('false')

    await userEvent.hover(nodeEl('deja'))

    expect(nodeEl('portrait').getAttribute('data-dimmed')).toBe('true')
    expect(nodeEl('caddy').getAttribute('data-dimmed')).toBe('false')
  })

  it('marks a container with no reported state as unknown, not as healthy', () => {
    draw(new Map([['deja', 'up']]))

    expect(nodeEl('deja').getAttribute('data-state')).toBe('up')
    expect(nodeEl('portrait').getAttribute('data-state')).toBe('unknown')
  })

  it('gives a node with no container no state at all', () => {
    draw(new Map([['deja', 'up']]))

    expect(nodeEl('muchq_com').getAttribute('data-state')).toBeNull()
  })
})
