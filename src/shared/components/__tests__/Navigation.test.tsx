import React from 'react'
import { render, screen as testingScreen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
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
    expect(testingScreen.getAllByText('MuchQ')).toHaveLength(2)
  })

  it('renders navigation links', () => {
    renderWithRouter(<Navigation />)
    expect(testingScreen.getByText('Projects')).toBeDefined()
    expect(testingScreen.getByText('Games')).toBeDefined()
    expect(testingScreen.getByText('Code')).toBeDefined()
    expect(testingScreen.getByText('Metrics')).toBeDefined()
  })

  it('renders the app name in the brand link', () => {
    renderWithRouter(<Navigation appName="Golf" />)
    expect(testingScreen.getByText('MuchQ : Golf')).toBeDefined()
  })

  it('renders site menu links on app pages too', () => {
    renderWithRouter(<Navigation appName="Golf" />)
    expect(testingScreen.getByText('Thoughts')).toBeDefined()
    expect(testingScreen.getByText('Tracy')).toBeDefined()
  })

  it('renders per-page context content', () => {
    renderWithRouter(<Navigation appName="Golf" context={<span>Room: abc123</span>} />)
    expect(testingScreen.getByText('Room: abc123')).toBeDefined()
  })

  it('applies the floating class only when requested', () => {
    const { container, unmount } = renderWithRouter(<Navigation floating />)
    expect(container.querySelector('nav')?.className).toContain('homepage-nav')
    unmount()

    const { container: staticContainer } = renderWithRouter(<Navigation appName="Golf" />)
    expect(staticContainer.querySelector('nav')?.className).not.toContain('homepage-nav')
  })

  it('highlights the current route in the menu', () => {
    render(
      <MemoryRouter initialEntries={['/golf/room/xyz']}>
        <Navigation appName="Golf" />
      </MemoryRouter>
    )
    const golfLink = testingScreen.getByText('Golf', { selector: 'a' })
    expect(golfLink.className).toContain('currentItem')
    const partyLink = testingScreen.getByText('Party')
    expect(partyLink.className).not.toContain('currentItem')
  })
})
