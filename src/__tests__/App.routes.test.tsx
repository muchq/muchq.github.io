import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )

describe('App routes', () => {
  it('serves the shortener at /iili', () => {
    at('/iili')
    expect(within(screen.getByRole('navigation')).getByText('MuchQ : iili')).toBeDefined()
  })

  // Links to muchq.com/r3dr predate the rename and still arrive.
  it('redirects the pre-rename /r3dr to /iili', () => {
    at('/r3dr')
    expect(within(screen.getByRole('navigation')).getByText('MuchQ : iili')).toBeDefined()
  })
})
