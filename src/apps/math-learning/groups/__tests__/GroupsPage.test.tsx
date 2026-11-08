import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { CHAPTERS } from '../chapters'
import { PROGRESS_KEY } from '../progress'

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )

describe('/groups', () => {
  beforeEach(() => localStorage.clear())

  it('the overview links every chapter and the lab', () => {
    at('/groups')
    expect(screen.getByRole('heading', { level: 1, name: 'Group theory' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Chapters' })
    for (const c of CHAPTERS) expect(within(nav).getByRole('link', { name: `${c.number} · ${c.short}` })).toHaveAttribute('href', `/groups/${c.slug}`)
    expect(within(nav).getByRole('link', { name: 'Lab' })).toHaveAttribute('href', '/groups/lab')
  })

  // Rendering each chapter exercises its embedded tools with their
  // initial props: a typo in a lab's initial subgroup label throws here.
  it.each(CHAPTERS.map(c => [c.slug, c] as const))('/groups/%s renders its text, problems, and drills', (slug, c) => {
    at(`/groups/${slug}`)
    expect(screen.getByRole('heading', { level: 1, name: c.title })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3, name: /^Problem \d+\.\d+$/ })).toHaveLength(c.problems.length)
    expect(screen.getAllByRole('article', { name: /^Drill: / })).toHaveLength(c.drills.length)
  })

  it('/groups/lab is the lab', () => {
    at('/groups/lab')
    expect(screen.getByRole('heading', { level: 1, name: 'The group lab' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Group lab' })).toBeInTheDocument()
  })

  it('an unknown chapter falls back to the overview', () => {
    at('/groups/not-a-chapter')
    expect(screen.getByRole('heading', { level: 1, name: 'Group theory' })).toBeInTheDocument()
  })

  it('solving a problem is remembered and counted on the overview', async () => {
    at('/groups/groups')
    const first = CHAPTERS[0].problems[0]
    const card = screen.getByRole('article', { name: 'Problem 1.1' })
    await userEvent.type(within(card).getByLabelText('Your answer'), '1, 2, 4, 7, 8, 11, 13, 14{Enter}')
    expect(within(card).getByText('✓ Solved')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual([first.id])
    await userEvent.click(screen.getByRole('link', { name: 'Overview' }))
    expect(screen.getByText(/1 of \d+ problems done/)).toBeInTheDocument()
  })
})
