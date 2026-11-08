// The curriculum is data: units of definitions, and problems that are the
// theorems. Text fields are the small markup that ./markup.tsx renders
// (paragraphs, lists, **bold**, *italic*, $inline$ and $$display$$ TeX).

export type ProblemKind = 'prove' | 'decide' | 'flaw'

export interface Problem {
  /** Stable id, "unit.n" — progress is stored under it, so never renumber. */
  id: string
  kind: ProblemKind
  title: string
  statement: string
  /** Nudges, weakest first. Each one costs a revision of the attempt. */
  hints: string[]
  /** Reference proof, shown only once the gate opens. */
  solution: string
  /** What a complete answer must contain; the self-grade is against these. */
  checks: string[]
  /** decide: whether the statement is true. */
  verdict?: boolean
  /** flaw: the bogus proof, one step per entry. */
  lines?: string[]
  /** flaw: 1-based index of the first line that does not follow. */
  flawLine?: number
  /** Earlier problems whose results this one may cite. */
  uses?: string[]
  challenge?: boolean
}

export type Track = 'Foundations' | 'Algebra' | 'Topology' | 'Bridge' | 'Synthesis'

export interface Definition {
  term: string
  body: string
}

export interface Unit {
  /** URL slug. */
  id: string
  n: number
  title: string
  track: Track
  /** Unit numbers worth finishing first. Advice, not a gate. */
  prereqs: number[]
  why: string
  definitions: Definition[]
  problems: Problem[]
}
