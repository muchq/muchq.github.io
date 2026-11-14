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
          <Route path="/proofs" element={<p>the proofs course</p>} />
          <Route path="/games" element={<p>the games</p>} />
        </Routes>
      </MemoryRouter>
    )

  it('the knight opens the chess shortcut in one click', async () => {
    home()
    const link = screen.getByRole('link', { name: 'Play chess' })
    expect(link).toHaveAttribute('href', '/games?play=chess')
    await userEvent.click(link)
    expect(screen.getByText('the games')).toBeInTheDocument()
  })

  it('the spiraling isomorphism theorem links to the group theory course', async () => {
    home()
    const link = screen.getByRole('link', { name: 'Group theory course' })
    expect(link).toHaveAttribute('href', '/groups')
    // ker φ ≅ im φ, with MathML's invisible function application between ker and φ.
    expect(link.textContent).toMatch(/^G\/ker\W?φ≅im\W?φ$/)
    await userEvent.click(link)
    expect(screen.getByText('the course')).toBeInTheDocument()
  })

  it('the orbiting fundamental group of the circle links to the proofs course', async () => {
    home()
    const link = screen.getByRole('link', { name: 'Algebra and topology, by proof' })
    expect(link).toHaveAttribute('href', '/proofs')
    expect(link.textContent).toBe('π1(S1)≅ℤ')
    await userEvent.click(link)
    expect(screen.getByText('the proofs course')).toBeInTheDocument()
  })
})
