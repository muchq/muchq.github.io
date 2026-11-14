import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import HomePage from '../HomePage'

describe('HomePage greeting', () => {
  it('exposes one Hello heading while drawing five independent letters', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { level: 1, name: 'Hello' })
    expect(screen.getAllByRole('heading', { level: 1 })).toEqual([heading])
    expect(within(heading).queryByText('Hello')).not.toBeInTheDocument()
    expect([...heading.querySelectorAll('[aria-hidden="true"]')].map(letter => letter.textContent)).toEqual(['H', 'e', 'l', 'l', 'o'])
  })
})
