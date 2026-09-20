import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TopologyPage from '../pages/TopologyPage'

const rendered: string[] = []

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (_id: string, src: string) => {
      rendered.push(src)
      return { svg: '<svg id="drawn"><g class="node" id="flowchart-deja-1"></g></svg>' }
    }),
  },
}))

const draw = () =>
  render(
    <MemoryRouter>
      <TopologyPage />
    </MemoryRouter>
  )

const lastSource = () => rendered[rendered.length - 1]

beforeEach(() => {
  rendered.length = 0
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
})

describe('TopologyPage', () => {
  it('draws the diagram', async () => {
    draw()

    await waitFor(() => expect(document.querySelector('#drawn')).not.toBeNull())
  })

  it('still draws when the metrics API is unreachable, and says status is unknown', async () => {
    draw()

    await waitFor(() => expect(document.querySelector('#drawn')).not.toBeNull())
    expect(screen.getByText(/status unavailable/i)).toBeDefined()
  })

  it('drops a layer from the drawing when its box is unchecked', async () => {
    draw()
    await waitFor(() => expect(lastSource()).toContain('|metrics|'))

    await userEvent.click(screen.getByRole('checkbox', { name: /metrics/i }))

    await waitFor(() => expect(lastSource()).not.toContain('|metrics|'))
    expect(lastSource()).toContain('|http|')
  })
})
