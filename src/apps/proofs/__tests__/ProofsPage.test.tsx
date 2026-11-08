import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { problemById, UNITS } from '../content'
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

const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard)
  else delete (navigator as { clipboard?: unknown }).clipboard
})

describe('/proofs is unlisted', () => {
  it('serves the overview without a nav entry, and asks not to be indexed', async () => {
    await at('/proofs')
    const nav = screen.getByRole('navigation', { name: (_, el) => el.tagName === 'NAV' && !!el.querySelector('a[href="/"]') })
    expect(within(nav).getByText('MuchQ : Proofs')).toBeDefined()
    expect(document.querySelector('a[href="/proofs"]')).toBeNull()
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    expect(screen.getAllByRole('link', { name: /^Unit \d+: .*, \d+ of \d+ solved$/ })).toHaveLength(UNITS.length)
  })

  it('titles itself, and drops the noindex tag and the title on leaving', async () => {
    document.title = 'MuchQ'
    const view = await at('/proofs')
    expect(document.title).toBe('Proofs · MuchQ')
    view.unmount()
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
    expect(document.title).toBe('MuchQ')
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
    // Not while the reference is fresh.
    expect(screen.queryByRole('button', { name: 'Start over from a blank page' })).toBeNull()
    expect(screen.getByText(/The blank page opens then/)).toBeDefined()
  })

  it('opens the blank page once the redo is due, and the overview lists it until then', async () => {
    const graded = Date.now()
    const first = await at('/proofs/craft/0-4')
    write(long('first'))
    fireEvent.click(button('Show reference proof'))
    fireEvent.click(button(/^Wrong/))
    first.unmount()

    vi.spyOn(Date, 'now').mockReturnValue(graded + 24 * 60 * 60 * 1000 + 60_000)
    const overview = await at('/proofs')
    expect(within(screen.getByRole('region', { name: 'Due for a redo' })).getByRole('link')).toHaveTextContent('0.4')
    overview.unmount()

    await at('/proofs/craft/0-4')
    expect(screen.getByText('A redo from a blank page is due now.', { exact: false })).toBeDefined()
    fireEvent.click(button('Start over from a blank page'))
    expect(screen.getByLabelText('Your attempt')).toHaveValue('')
    expect(button(/^Hint \d of \d$/)).toHaveTextContent('Hint 1 of 3')
    // Started and not finished, it is still owed.
    expect(screen.getAllByText('redo due').length).toBeGreaterThan(0)
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
    // The copy was of the old text; an edit makes the note untrue.
    write('my attempt at it, revised')
    expect(screen.queryByText(/Copied:/)).toBeNull()
  })

  // Naming the earlier results up front would announce the method.
  it('names the results the proof draws on only after the reveal', async () => {
    await at('/proofs/quotients/3-7')
    expect(screen.queryByText(/Draws on/)).toBeNull()
    expect(screen.queryByRole('link', { name: '1.4' })).toBeNull()
    write(long('attempt'))
    fireEvent.click(button('Show reference proof'))
    expect(screen.getByText(/Draws on/)).toBeDefined()
    expect(screen.getByRole('link', { name: '1.4' })).toHaveAttribute('href', '/proofs/relations/1-4')
  })

  it('previews hostile text as text', async () => {
    await at('/proofs/craft/0-4')
    write('<img src=x onerror="alert(1)"> and $\\href{javascript:alert(1)}{x}$')
    fireEvent.click(button('Preview'))
    const preview = screen.getByRole('region', { name: 'Preview of your attempt' })
    expect(preview.querySelector('img')).toBeNull()
    expect(preview.querySelector('a')).toBeNull()
    expect(preview).toHaveTextContent('<img src=x onerror="alert(1)">')
  })

  it('adopts what another tab saved, so its next save keeps that work', async () => {
    await at('/proofs/craft/0-4')
    write(long('this tab'))
    // Another tab writes its own problem, then the browser tells this one.
    const theirs = { ...freshState(), attempt: 'other tab' }
    saveProgress({ ...loadProgress(), '0.2': theirs })
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    })
    write(long('this tab, more'))
    expect(loadProgress()['0.2']).toEqual(theirs)
    expect(loadProgress()['0.4'].attempt).toBe(long('this tab, more'))
  })

  it('ignores storage events about other keys', async () => {
    await at('/proofs/craft/0-4')
    write(long('this tab'))
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'something.else' }))
    })
    expect(screen.getByLabelText('Your attempt')).toHaveValue(long('this tab'))
  })

  it('does not honour a stored confirmation the pick does not earn', async () => {
    // 0.7 is false; a hand-edited store claims "true" was confirmed.
    saveProgress({ '0.7': { ...freshState(), attempt: long('x'), verdict: true, confirmed: true } })
    await at('/proofs/craft/0-7')
    expect(screen.queryByText(/Right verdict/)).toBeNull()
    write(long('y'))
    expect(button('Show reference proof')).toBeDisabled()
    expect(button('Check verdict')).toBeEnabled()
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

  it('cancels an import without changing anything', async () => {
    const mine = { ...freshState(), attempt: 'mine' }
    saveProgress({ '0.2': mine })
    await at('/proofs')
    const file = new File([exportProgress({ '0.2': { ...freshState(), attempt: 'theirs' } })], 'p.json')
    await userEvent.upload(screen.getByLabelText('Progress file'), file)
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('group', { name: 'Confirm import' })).toBeNull()
    expect(loadProgress()).toEqual({ '0.2': mine })
  })

  it('exports the progress as a downloadable file', async () => {
    const mine = { ...freshState(), attempt: 'mine' }
    saveProgress({ '0.2': mine })
    const created: Blob[] = []
    Object.assign(URL, {
      createObjectURL: vi.fn((b: Blob) => {
        created.push(b)
        return 'blob:x'
      }),
      revokeObjectURL: vi.fn(),
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await at('/proofs')
    fireEvent.click(button('Export progress'))
    expect(click).toHaveBeenCalledOnce()
    expect(JSON.parse(await created[0].text())).toEqual({ version: 1, progress: { '0.2': mine } })
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

describe('scrolling', () => {
  const spyOnScroll = () => {
    const set = vi.fn()
    Object.defineProperty(document.body, 'scrollTop', { configurable: true, get: () => 0, set })
    return set
  }

  it('starts a page opened by a link at the top, but leaves the first load alone', async () => {
    const set = spyOnScroll()
    await at('/proofs/craft')
    expect(set).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: /^0\.3 Postage/ }))
    await screen.findByRole('heading', { level: 1, name: /0\.3/ })
    expect(set).toHaveBeenCalledWith(0)
    delete (document.body as { scrollTop?: number }).scrollTop
  })
})

describe('a mixed unit', () => {
  it('has no definitions section and no unit-specific signposts', async () => {
    await at('/proofs/mixed')
    expect(screen.queryByRole('heading', { name: 'Definitions' })).toBeNull()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
  })
})
