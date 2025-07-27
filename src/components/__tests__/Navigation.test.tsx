import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Navigation from '../Navigation'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Navigation', () => {
  it('renders navigation logo', () => {
    renderWithRouter(<Navigation />)
    expect(screen.getByText('MuchQ')).toBeDefined()
  })

  it('renders navigation links', () => {
    renderWithRouter(<Navigation />)
    expect(screen.getByText('Projects')).toBeDefined()
    expect(screen.getByText('Interests')).toBeDefined()
    expect(screen.getByText('Blog')).toBeDefined()
    expect(screen.getByText('Thoughts')).toBeDefined()
    expect(screen.getByText('Resume')).toBeDefined()
  })
})