import React from 'react'
import { render, screen as testingScreen } from '@testing-library/react'
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
    expect(testingScreen.getByText('MuchQ')).toBeDefined()
  })

  it('renders navigation links', () => {
    renderWithRouter(<Navigation />)
    expect(testingScreen.getByText('Projects')).toBeDefined()
    expect(testingScreen.getByText('Interests')).toBeDefined()
    expect(testingScreen.getByText('Blog')).toBeDefined()
    expect(testingScreen.getByText('Games')).toBeDefined()
  })
})