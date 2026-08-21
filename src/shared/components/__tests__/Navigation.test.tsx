import React from 'react'
import { render, screen as testingScreen, within } from '@testing-library/react'
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
    expect(testingScreen.getByText('Elsewhere')).toBeDefined()
    expect(testingScreen.getByText('Code')).toBeDefined()
    expect(testingScreen.getByText('Metrics')).toBeDefined()
  })

  // The accessible-name regexes are anchored and include "(external site)" on
  // purpose: they pin that the srOnly text is part of the name AND that the
  // aria-hidden ↗ is excluded from it (its presence would break the anchor).
  it('links each Elsewhere app to its URL, with its description inside the link', () => {
    renderWithRouter(<Navigation />)
    const groupEl = testingScreen.getByText('Elsewhere').closest('li')
    if (!groupEl) throw new Error('Elsewhere nav group not found')
    const group = within(groupEl)
    const expected: Array<[RegExp, string, string]> = [
      [/^Snowbonk\s?\(external site\)/, 'https://snowbonk.com', 'N-body simulation viewer'],
      [/^1d4\s?\(external site\)/, 'https://1d4.net', 'Chess game indexer'],
      [/^HoverCrap\s?\(external site\)/, 'https://hovercrap.com', 'ASCII hovercraft'],
      [/^3xe\s?\(external site\)/, 'https://3xe.org', 'Madrid-style cheesecake'],
      [/^BitFear\s?\(external site\)/, 'https://bitfear.net', 'Text-to-binary converter'],
      [/^Smallcat\s?\(external site\)/, 'https://smallcat.dog', 'Pong'],
      [/^2n-1\s?\(external site\)/, 'https://2n-1.org', 'Odd-number mathematics'],
      [/^tty1\s?\(external site\)/, 'https://tty1.uk', 'Web terminal'],
      [/^里に春が来ました\s?\(external site\)/, 'https://sato-ni-haru-ga-kimashita.uk', 'Japanese sentence breakdown'],
      [/^p2bx\s?\(external site\)/, 'https://p2bx.uk', 'Stone–Čech compactification'],
    ]
    for (const [name, href, description] of expected) {
      const link = group.getByRole('link', { name })
      expect(link.getAttribute('href')).toBe(href)
      expect(within(link).getByText(description)).toBeDefined()
    }
  })

  // r3dr moved from Elsewhere to Projects when the page moved into this
  // site (#1359 chunk 2): internal now, description intact.
  it('links r3dr as an internal Projects page', () => {
    renderWithRouter(<Navigation />)
    const groupEl = testingScreen.getByText('Projects').closest('li')
    if (!groupEl) throw new Error('Projects nav group not found')
    const link = within(groupEl).getByRole('link', { name: /^r3dr/ })
    expect(link.getAttribute('href')).toBe('/r3dr')
    expect(link.textContent).not.toContain('(external site)')
    expect(within(link).getByText('URL shortener')).toBeDefined()
  })

  it('marks external links with a visible ↗ kept out of the accessible name', () => {
    renderWithRouter(<Navigation />)
    const external = testingScreen.getByRole('link', {
      name: /^Snowbonk\s?\(external site\)/,
    })
    expect(external.textContent).toContain('↗')
  })

  it('visually hides the screen-reader-only external marker text', () => {
    renderWithRouter(<Navigation />)
    const external = testingScreen.getByRole('link', {
      name: /^Snowbonk\s?\(external site\)/,
    })
    const srSpan = Array.from(external.querySelectorAll('span')).find(s =>
      s.textContent?.includes('(external site)')
    )
    expect(srSpan?.className).toContain('srOnly')
  })

  it('leaves internal links unmarked', () => {
    renderWithRouter(<Navigation />)
    const internal = testingScreen.getByRole('link', { name: 'Golf' })
    expect(internal.getAttribute('href')).toBe('/golf')
    expect(internal.textContent).not.toContain('↗')
    expect(internal.textContent).not.toContain('(external site)')
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
