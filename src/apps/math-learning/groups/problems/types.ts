import type { ComponentType, ReactNode } from 'react'
import type { Answer } from './answers'

interface ProblemBase {
  /** Stable across releases: progress is stored by id. */
  readonly id: string
  readonly prompt: ReactNode
  readonly hint?: ReactNode
  readonly solution: ReactNode
}

/** Checked automatically. */
export interface AnswerProblem extends ProblemBase {
  readonly kind: 'answer'
  readonly answer: Answer
}

/** Written by the reader, then compared against a model solution. */
export interface ProofProblem extends ProblemBase {
  readonly kind: 'proof'
}

export type Problem = AnswerProblem | ProofProblem

/** A uniform [0, 1) source, injectable so drills are reproducible in tests. */
export type Rng = () => number

export interface DrillItem {
  readonly prompt: string
  readonly answer: Answer
  readonly solution: string
}

/** An endless supply of one kind of computation. */
export interface Drill {
  readonly id: string
  readonly title: string
  readonly make: (rng: Rng) => DrillItem
}

export interface Chapter {
  readonly slug: string
  readonly number: number
  readonly title: string
  readonly summary: string
  readonly Body: ComponentType
  readonly problems: readonly Problem[]
  readonly drills: readonly Drill[]
}
