import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TopologyPage from '../pages/TopologyPage'

const draw = () =>
  render(
    <MemoryRouter>
      <TopologyPage />
    </MemoryRouter>
  )

const drawnKinds = () =>
  new Set([...document.querySelectorAll('[data-kind]')].map(el => el.getAttribute('data-kind')))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
})

describe('TopologyPage', () => {
  it('draws the real diagram', () => {
    draw()

    expect(document.querySelector('[data-node="caddy"]')).not.toBeNull()
    expect(drawnKinds().has('http')).toBe(true)
  })

  it('still draws when the metrics API is unreachable, and says status is unknown', async () => {
    draw()

    await waitFor(() => expect(screen.getByText(/status unavailable/i)).toBeDefined())
    expect(document.querySelector('[data-node="caddy"]')).not.toBeNull()
  })

  it('drops a layer from the drawing when its box is unchecked', async () => {
    draw()
    expect(drawnKinds().has('metrics')).toBe(true)

    await userEvent.click(screen.getByRole('checkbox', { name: /metrics/i }))

    expect(drawnKinds().has('metrics')).toBe(false)
    expect(drawnKinds().has('http')).toBe(true)
  })

  it('takes the groups with it when a layer empties them', async () => {
    draw()
    expect(screen.queryByText('Observability')).not.toBeNull()

    await userEvent.click(screen.getByRole('checkbox', { name: /metrics/i }))

    expect(screen.queryByText('Observability')).toBeNull()
  })
})
