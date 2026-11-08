import { describe, expect, it } from 'vitest'
import { problemById } from '../content'
import { freshState } from '../gate'
import { refereePrompt } from '../referee'

const attempt = { ...freshState(), attempt: '  Let x be arbitrary. Then ...  ' }

describe('the referee prompt', () => {
  const { problem } = problemById('0.4')!

  it('carries the conventions, the statement and the attempt', () => {
    const text = refereePrompt(problem, attempt)
    expect(text).toContain('Compact does not include Hausdorff.')
    expect(text).toContain(problem.statement)
    expect(text).toContain("Student's answer:\nLet x be arbitrary. Then ...")
    expect(text).toMatch(/Verdict: complete/)
  })

  // A correct proof by another route must pass; handing over the reference
  // invites grading by resemblance.
  it('never includes the reference proof or the checks', () => {
    const text = refereePrompt(problem, attempt)
    expect(text).not.toContain(problem.solution)
    for (const c of problem.checks) expect(text).not.toContain(c)
  })

  it("states the student's verdict on a prove-or-disprove, or that there is none", () => {
    const { problem: decide } = problemById('0.7')!
    expect(refereePrompt(decide, { ...attempt, verdict: false })).toContain('claims the statement is FALSE')
    expect(refereePrompt(decide, attempt)).toContain('has not committed to a verdict')
  })

  it('includes the numbered argument and the chosen line on a find-the-flaw, without the answer', () => {
    const { problem: flaw } = problemById('0.8')!
    const text = refereePrompt(flaw, { ...attempt, line: 3 })
    expect(text).toContain(`1. ${flaw.lines![0]}`)
    expect(text).toContain('first faulty line is line 3')
    expect(text).not.toContain(flaw.solution)
  })
})
