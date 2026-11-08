import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { problemById } from '../content'
import { freshState, MIN_ATTEMPT } from '../gate'
import { exportProgress, loadProgress, saveProgress, STORAGE_KEY } from '../store'

// Through the real router and the lazy route, as a visitor arrives.
const at = async (path: string) => {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
  await screen.findByRole('main')
  return view
}

const write = (text: string) => fireEvent.change(screen.getByLabelText(/^Your (attempt|diagnosis)$/), { target: { value: text } })
const long = (tag: string) => `${tag} `.padEnd(MIN_ATTEMPT, '.')
const button = (name: RegExp | string) => screen.getByRole('button', { name })

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('/proofs is unlisted', () => {
  it('serves the overview without a nav entry, and asks not to be indexed', async () => {
    await at('/proofs')
    const nav = screen.getByRole('navigation', { name: (_, el) => el.tagName === 'NAV' && !!el.querySelector('a[href="/"]') })
    expect(within(nav).getByText('MuchQ : Proofs')).toBeDefined()
    expect(document.querySelector('a[href="/proofs"]')).toBeNull()
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    expect(screen.getAllByRole('link', { name: /^Unit \d+: .*, \d+ of \d+ solved$/ })).toHaveLength(12)
  })

  it('drops the noindex tag on leaving', async () => {
    const view = await at('/proofs')
    view.unmount()
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })

  it('says so for a unit or problem that does not exist', async () => {
    await at('/proofs/nope')
    expect(screen.getByText(/No such unit/)).toBeDefined()
  })

  it('says so for a problem that does not exist in a real unit', async () => {
    await at('/proofs/craft/9-9')
    expect(screen.getByText(/No such problem/)).toBeDefined()
  })
})

describe('a prove problem', () => {
  it('charges a revision for each hint and for the reference, then grades and schedules a redo', async () => {
    await at('/proofs/craft/0-4')
    const hint = () => button(/^Hint \d of \d$/)
    const reveal = () => button('Show reference proof')

    expect(hint()).toBeDisabled()
    expect(reveal()).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(`Write ${MIN_ATTEMPT} more characters`)

    write(long('first'))
    expect(hint()).toBeEnabled()
    fireEvent.click(hint())
    expect(screen.getByText('Hint 1')).toBeDefined()
    expect(hint()).toHaveTextContent('Hint 2 of 3')
    expect(hint()).toBeDisabled()
    expect(reveal()).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Revise your attempt')

    write(long('second'))
    expect(reveal()).toBeEnabled()
    expect(screen.queryByRole('heading', { name: 'Reference proof' })).toBeNull()
    fireEvent.click(reveal())
    expect(screen.getByRole('heading', { name: 'Reference proof' })).toBeDefined()
    // Every hint is open once the reference is, and the attempt is frozen.
    expect(screen.getByText('Hint 3')).toBeDefined()
    expect(screen.getByLabelText('Your attempt')).toHaveAttribute('readonly')

    fireEvent.click(button(/^Gap/))
    expect(screen.getByText(/Graded/)).toHaveTextContent('Graded gap with 1 hint.')
    expect(screen.getByText(/A redo from a blank page comes due/)).toBeDefined()
    expect(screen.getAllByText('redo scheduled').length).toBeGreaterThan(0)

    fireEvent.click(button('Start over from a blank page'))
    expect(screen.getByLabelText('Your attempt')).toHaveValue('')
    expect(hint()).toHaveTextContent('Hint 1 of 3')
  })

  it('keeps the work across a reload', async () => {
    const first = await at('/proofs/craft/0-4')
    write(long('kept'))
    fireEvent.click(button(/^Hint 1/))
    first.unmount()
    await at('/proofs/craft/0-4')
    expect(screen.getByLabelText('Your attempt')).toHaveValue(long('kept'))
    expect(screen.getByText('Hint 1')).toBeDefined()
    expect(loadProgress()['0.4'].hints).toBe(1)
  })

  it('copies the problem and the attempt for a referee, without the reference', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await at('/proofs/craft/0-4')
    expect(button('Copy for a referee')).toBeDisabled()
    write('my attempt at it')
    await act(async () => fireEvent.click(button('Copy for a referee')))
    expect(writeText).toHaveBeenCalledOnce()
    const sent = writeText.mock.calls[0][0] as string
    expect(sent).toContain('my attempt at it')
    expect(sent).not.toContain(problemById('0.4')!.problem.solution)
    expect(screen.getByText(/Copied:/)).toBeDefined()
  })

  it('says so when the browser refuses the clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })
    await at('/proofs/craft/0-4')
    write('my attempt at it')
    await act(async () => fireEvent.click(button('Copy for a referee')))
    expect(screen.getByText(/Copying was blocked/)).toBeDefined()
  })
})

describe('a prove-or-disprove problem', () => {
  // 0.7 is false.
  it('keeps the reference locked behind a confirmed verdict, and charges a revision per check', async () => {
    await at('/proofs/craft/0-7')
    const check = () => button('Check verdict')
    write(long('attempt'))
    expect(check()).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Commit to a verdict')

    fireEvent.click(button(/^True/))
    expect(button(/^True/)).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(check())
    expect(screen.getByText(/1 wrong check\. If you wrote a proof, it has a hole/)).toBeDefined()
    expect(button('Show reference proof')).toBeDisabled()

    fireEvent.click(button(/^False/))
    expect(check()).toBeDisabled()
    write(long('refutation'))
    fireEvent.click(check())
    expect(screen.getByText(/Right verdict/)).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Check verdict' })).toBeNull()
    expect(button(/^False/)).toBeDisabled()
    expect(button('Show reference proof')).toBeDisabled()

    write(long('refutation, finished'))
    fireEvent.click(button('Show reference proof'))
    expect(screen.getByRole('heading', { name: 'Reference proof' })).toBeDefined()
  })
})

describe('a find-the-flaw problem', () => {
  // 0.8's flaw is line 4.
  it('confirms only the flawed line', async () => {
    await at('/proofs/craft/0-8')
    write(long('diagnosis'))
    fireEvent.click(button('Line 2'))
    fireEvent.click(button('Check line'))
    expect(screen.getByText(/That line holds up/)).toBeDefined()
    fireEvent.click(button('Line 4'))
    expect(button('Check line')).toBeDisabled()
    write(long('diagnosis, revised'))
    fireEvent.click(button('Check line'))
    expect(screen.getByText(/That is the line/)).toBeDefined()
    expect(button('Line 1')).toBeDisabled()
  })
})

describe('the overview', () => {
  it('lists problems whose redo has come due, and only those', async () => {
    const base = { ...freshState(), attempt: 'x', spentOn: 'x', solution: true }
    saveProgress({
      '2.5': { ...base, grade: 'gap', redoAt: Date.now() - 1 },
      '2.6': { ...base, grade: 'gap', redoAt: Date.now() + 60_000 },
      '2.7': { ...base, grade: 'complete', redoAt: null },
    })
    await at('/proofs')
    const due = screen.getByRole('region', { name: 'Due for a redo' })
    expect(within(due).getAllByRole('link').map(a => a.textContent)).toEqual(['2.5 When a union is a subgroup'])
    expect(screen.getByRole('link', { name: 'Unit 2: Groups, 1 of 10 solved' })).toBeDefined()
  })

  it('has no due list when nothing is due', async () => {
    await at('/proofs')
    expect(screen.queryByRole('region', { name: 'Due for a redo' })).toBeNull()
  })

  it('imports an exported file only after confirmation, keeping other problems', async () => {
    const mine = { ...freshState(), attempt: 'mine' }
    const theirs = { ...freshState(), attempt: 'theirs' }
    saveProgress({ '0.1': mine, '0.2': mine })
    await at('/proofs')
    const file = new File([exportProgress({ '0.2': theirs })], 'p.json', { type: 'application/json' })
    await userEvent.upload(screen.getByLabelText('Progress file'), file)
    await screen.findByRole('group', { name: 'Confirm import' })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)['0.2'].attempt).toBe('mine')
    fireEvent.click(button('Replace'))
    expect(loadProgress()).toEqual({ '0.1': mine, '0.2': theirs })
  })

  it('rejects a file that is not an export and changes nothing', async () => {
    saveProgress({ '0.1': { ...freshState(), attempt: 'mine' } })
    await at('/proofs')
    await userEvent.upload(screen.getByLabelText('Progress file'), new File(['{}'], 'p.json'))
    await screen.findByText('That file is not an exported progress file.')
    expect(screen.queryByRole('group', { name: 'Confirm import' })).toBeNull()
    expect(loadProgress()['0.1'].attempt).toBe('mine')
  })
})

describe('a unit', () => {
  it('lists its problems with readable names and their status', async () => {
    saveProgress({ '0.2': { ...freshState(), attempt: 'started' } })
    await at('/proofs/craft')
    expect(screen.getByRole('heading', { level: 1, name: 'Proof craft' })).toBeDefined()
    expect(screen.getByRole('link', { name: '0.1 Negating continuity · Prove not started' })).toBeDefined()
    expect(screen.getByRole('link', { name: '0.2 Squares modulo 3 · Prove in progress' })).toBeDefined()
    expect(screen.getByRole('link', { name: '0.9 Divisors by pigeonhole · Prove · challenge not started' })).toBeDefined()
  })
})
