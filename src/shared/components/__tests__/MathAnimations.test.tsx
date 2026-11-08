import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import MathAnimations from '../MathAnimations'

describe('MathAnimations', () => {
  const home = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MathAnimations />} />
          <Route path="/groups" element={<p>the course</p>} />
        </Routes>
      </MemoryRouter>
    )

  it('the spiraling isomorphism theorem links to the group theory course', async () => {
    home()
    const link = screen.getByRole('link', { name: 'Group theory course' })
    expect(link).toHaveAttribute('href', '/groups')
    // ker φ ≅ im φ, with MathML's invisible function application between ker and φ.
    expect(link.textContent).toMatch(/^G\/ker\W?φ≅im\W?φ$/)
    await userEvent.click(link)
    expect(screen.getByText('the course')).toBeInTheDocument()
  })
})
