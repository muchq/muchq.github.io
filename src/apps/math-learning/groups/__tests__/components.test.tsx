import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { compose, formatCycles, parseCycles } from '../engine/permutations'
import { answerInput, perm, yesNo } from '../problems/answers'
import { DRILLS } from '../problems/drills'
import { seeded } from '../problems/rng'
import type { Problem } from '../problems/types'
import DrillCard from '../components/DrillCard'
import GroupLab from '../components/GroupLab'
import GroupsProgressProvider from '../components/GroupsProgressProvider'
import PermutationCalculator from '../components/PermutationCalculator'
import ProblemCard from '../components/ProblemCard'
import { PROGRESS_KEY, loadSolved, useGroupsProgress } from '../progress'

const permProblem: Problem = {
  id: 't-perm',
  kind: 'answer',
  prompt: <p>Compute (1 2)(2 3).</p>,
  answer: perm(3, '(1 2 3)'),
  hint: <p>Right to left.</p>,
  solution: <p>Follow each point.</p>,
}

const proofProblem: Problem = {
  id: 't-proof',
  kind: 'proof',
  prompt: <p>Prove it.</p>,
  solution: <p>Model proof.</p>,
}

describe('ProblemCard', () => {
  it('accepts an equivalent permutation and reports the problem solved', async () => {
    const onSolvedChange = vi.fn()
    render(<ProblemCard problem={permProblem} number="3.1" solved={false} onSolvedChange={onSolvedChange} />)
    await userEvent.type(screen.getByLabelText('Your answer'), '(2 3 1){Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Correct.')
    expect(onSolvedChange).toHaveBeenCalledWith(true)
  })

  it('refuses a wrong answer without marking anything solved', async () => {
    const onSolvedChange = vi.fn()
    render(<ProblemCard problem={permProblem} number="3.1" solved={false} onSolvedChange={onSolvedChange} />)
    await userEvent.type(screen.getByLabelText('Your answer'), '(1 3 2)')
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(screen.getByRole('status')).toHaveTextContent('Not quite')
    expect(onSolvedChange).not.toHaveBeenCalled()
  })

  it('cannot be checked empty', () => {
    render(<ProblemCard problem={permProblem} number="3.1" solved={false} onSolvedChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
  })

  it('keeps the answer and solution behind a disclosure', () => {
    render(<ProblemCard problem={permProblem} number="3.1" solved={false} onSolvedChange={() => {}} />)
    const solution = screen.getByText('Solution').closest('details')!
    expect(solution).not.toHaveAttribute('open')
    expect(within(solution).getByText('(1 2 3)', { exact: false })).toBeInTheDocument()
  })

  it('multiple choice: picks an option, then checks it', async () => {
    const onSolvedChange = vi.fn()
    const problem: Problem = { id: 't-mc', kind: 'answer', prompt: <p>Is U(8) cyclic?</p>, answer: yesNo(false), solution: <p>No.</p> }
    render(<ProblemCard problem={problem} number="2.1" solved={false} onSolvedChange={onSolvedChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Yes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(onSolvedChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('radio', { name: 'No' }))
    await userEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(onSolvedChange).toHaveBeenCalledWith(true)
  })

  it('a proof is marked done, and undone, by the reader', async () => {
    const onSolvedChange = vi.fn()
    const { rerender } = render(<ProblemCard problem={proofProblem} number="1.10" solved={false} onSolvedChange={onSolvedChange} />)
    expect(screen.queryByLabelText('Your answer')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }))
    expect(onSolvedChange).toHaveBeenLastCalledWith(true)
    rerender(<ProblemCard problem={proofProblem} number="1.10" solved onSolvedChange={onSolvedChange} />)
    expect(screen.getByText('✓ Solved')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done ✓' }))
    expect(onSolvedChange).toHaveBeenLastCalledWith(false)
  })
})

describe('DrillCard', () => {
  const drill = DRILLS.subgroups[0] // orders in ℤₙ
  const first = drill.make(seeded(1))

  it('shows a reproducible problem and counts a streak of right answers', async () => {
    render(<DrillCard drill={drill} rng={seeded(1)} />)
    expect(screen.getByText(first.prompt)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Your answer'), `${answerInput(first.answer)}{Enter}`)
    expect(screen.getByRole('status')).toHaveTextContent('Correct.')
    expect(screen.getByLabelText('streak 1')).toBeInTheDocument()
    // Enter again moves on to a fresh problem.
    await userEvent.type(screen.getByLabelText('Your answer'), '{Enter}')
    expect(screen.queryByText(first.prompt)).toBeNull()
    expect(screen.getByLabelText('Your answer')).toHaveValue('')
  })

  it('a wrong answer resets the streak', async () => {
    render(<DrillCard drill={drill} rng={seeded(1)} />)
    await userEvent.type(screen.getByLabelText('Your answer'), `${answerInput(first.answer)}{Enter}{Enter}`)
    await userEvent.type(screen.getByLabelText('Your answer'), '-1{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Not quite.')
    expect(screen.getByLabelText('streak 0')).toBeInTheDocument()
  })

  it('a right answer after peeking at the solution does not count', async () => {
    render(<DrillCard drill={drill} rng={seeded(1)} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show solution' }))
    expect(screen.getByText(first.solution)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Your answer'), `${answerInput(first.answer)}{Enter}`)
    expect(screen.getByRole('status')).toHaveTextContent('Correct.')
    expect(screen.getByLabelText('streak 0')).toBeInTheDocument()
  })
})

describe('PermutationCalculator', () => {
  it('multiplies the default σ and τ the way the engine does', () => {
    render(<PermutationCalculator />)
    const st = formatCycles(compose(parseCycles('(1 2 3)(4 5)', 5)!, parseCycles('(1 4)', 5)!))
    const products = screen.getByRole('region', { name: 'Products' })
    expect(within(products).getByText(st)).toBeInTheDocument()
  })

  it('flags input that is not a permutation instead of computing with it', async () => {
    render(<PermutationCalculator />)
    const sigma = screen.getByLabelText('σ =')
    await userEvent.clear(sigma)
    await userEvent.type(sigma, '(1 6)')
    expect(sigma).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/Not a permutation of/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Products' })).toBeNull()
    // In S₆ the same input is fine.
    fireEvent.change(screen.getByLabelText('Work in'), { target: { value: '6' } })
    expect(sigma).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('region', { name: 'Products' })).toBeInTheDocument()
  })
})

describe('GroupLab', () => {
  it('summarizes the group and marks exactly the normal subgroups', () => {
    render(<GroupLab initialGroup="D4" />)
    const summary = screen.getByRole('list', { name: 'Summary' })
    expect(summary).toHaveTextContent('|D₄| = 8')
    expect(summary).toHaveTextContent('10 subgroups')
    expect(summary).toHaveTextContent('5 conjugacy classes')
    expect(screen.getAllByLabelText('normal')).toHaveLength(6)
  })

  it('a normal subgroup gets a quotient; a non-normal one does not', async () => {
    render(<GroupLab initialGroup="D4" initialSubgroup={['r²']} />)
    expect(screen.getByText('H is normal: gH = Hg for every g.')).toBeInTheDocument()
    expect(screen.getByText(/The quotient D₄\/H \(4 elements; abelian, not cyclic\)/)).toBeInTheDocument()
    expect(screen.getByText(/every block is a single color/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^⟨s⟩/ }))
    expect(screen.getByText(/H is not normal/)).toBeInTheDocument()
    expect(screen.queryByText(/The quotient/)).toBeNull()
    expect(screen.getByText(/some blocks mix colors/)).toBeInTheDocument()
  })

  it('omits the table for groups too large to read, and resets the subgroup on a group change', async () => {
    render(<GroupLab initialGroup="D4" initialSubgroup={['r²']} />)
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'A5' } })
    expect(screen.getByText(/The Cayley table of a group of order 60/)).toBeInTheDocument()
    expect(screen.queryByText(/H is normal/)).toBeNull()
    expect(screen.getByRole('list', { name: 'Summary' })).toHaveTextContent('59 subgroups')
  })
})

describe('progress', () => {
  const Probe = () => {
    const { solved, setSolved } = useGroupsProgress()
    return (
      <>
        <span data-testid="solved">{[...solved].join(',')}</span>
        <button onClick={() => setSolved('x', true)}>solve x</button>
        <button onClick={() => setSolved('x', false)}>unsolve x</button>
      </>
    )
  }

  it('persists solved problems and reads them back', async () => {
    localStorage.clear()
    const { unmount } = render(
      <GroupsProgressProvider>
        <Probe />
      </GroupsProgressProvider>
    )
    await userEvent.click(screen.getByText('solve x'))
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual(['x'])
    unmount()
    render(
      <GroupsProgressProvider>
        <Probe />
      </GroupsProgressProvider>
    )
    expect(screen.getByTestId('solved')).toHaveTextContent('x')
    await userEvent.click(screen.getByText('unsolve x'))
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual([])
  })

  it('shrugs off corrupt storage', () => {
    for (const junk of ['not json', '{"a":1}', '[1, "ok", null]']) {
      localStorage.setItem(PROGRESS_KEY, junk)
      expect([...loadSolved()]).toEqual(junk.includes('ok') ? ['ok'] : [])
    }
  })

  it('the hook refuses to run outside its provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => act(() => render(<Probe />))).toThrow(/GroupsProgressProvider/)
    vi.restoreAllMocks()
  })
})

