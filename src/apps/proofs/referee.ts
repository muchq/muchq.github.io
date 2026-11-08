// Self-grading is the weak point of any self-study course. This packages a
// problem and the student's attempt for an outside referee — a person or a
// model — with instructions to grade strictly. The reference proof is left
// out on purpose: a correct proof by a different route must still pass.
import type { ProblemState } from './gate'
import type { Problem } from './types'
import { CONVENTIONS } from './content'

/** Proof hygiene that applies to every problem, read before self-grading. */
export const REFEREE_QUESTIONS = [
  'Is every object introduced before it is used, with its quantifier (let / there is)?',
  'Does each step follow from a definition, a hypothesis, or a cited earlier result?',
  'Are all cases covered, and both directions of every "if and only if"?',
  'Is every function on classes, cosets or quotients shown to be well defined?',
]

export function refereePrompt(p: Problem, s: ProblemState): string {
  const parts = [
    'You are refereeing a proof written by a student of algebra and topology. Grade it strictly, as a ' +
      'careful examiner would. Do not rewrite or complete the proof. Quote the first line that is wrong, ' +
      'unjustified, or missing a case, and say exactly why. Then list any further problems. End with one ' +
      'line: "Verdict: complete", "Verdict: gap" (fixable omission) or "Verdict: wrong".',
    `Conventions: ${CONVENTIONS.join(' ')}`,
    `Problem ${p.id} (${p.title}):\n${p.statement}`,
  ]
  if (p.kind === 'decide') {
    const claim = s.verdict === null ? 'has not committed to a verdict' : `claims the statement is ${s.verdict ? 'TRUE' : 'FALSE'}`
    parts.push(`This is a prove-or-disprove problem. The student ${claim}.`)
  }
  if (p.kind === 'flaw' && p.lines) {
    parts.push(`The argument under examination:\n${p.lines.map((l, i) => `${i + 1}. ${l}`).join('\n')}`)
    const pick = s.line === null ? 'has not picked a line' : `says the first faulty line is line ${s.line}`
    parts.push(`The student ${pick}, and explains:`)
  }
  parts.push(`Student's answer:\n${s.attempt.trim() || '(empty)'}`)
  return parts.join('\n\n')
}
