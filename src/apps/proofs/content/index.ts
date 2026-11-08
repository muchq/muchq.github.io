import type { Problem, Unit } from '../types'
import craft from './u00-craft'
import relations from './u01-relations'
import groups from './u02-groups'
import quotients from './u03-quotients'
import actions from './u04-actions'
import metric from './u05-metric'
import spaces from './u06-spaces'
import bridge from './u07-bridge'
import connected from './u08-connected'
import compact from './u09-compact'
import homotopy from './u10-homotopy'
import circle from './u11-circle'
import mixed from './u12-mixed'

/** In order. Problem ids are "unit.n" and are the storage keys for progress. */
export const UNITS: Unit[] = [
  craft,
  relations,
  groups,
  quotients,
  actions,
  metric,
  spaces,
  bridge,
  connected,
  compact,
  homotopy,
  circle,
  mixed,
]

/** Stated once on the overview and handed to referees with every problem. */
export const CONVENTIONS: string[] = [
  'ℕ = {0, 1, 2, …}.',
  'Compact does not include Hausdorff.',
  'I = [0, 1]; a path is a continuous map from I.',
  'S¹ is the unit circle in ℂ, and p(t) = e^{2πit}.',
  'Groups are written multiplicatively with identity e; permutations compose right to left.',
  'Choice is used freely (e.g. picking one point from each of countably many nonempty sets).',
  'Assumed background: arithmetic of ℤ and ℝ, the division algorithm, unique prime factorization, the least upper bound property of ℝ, the Cauchy–Schwarz inequality, and continuity of polynomials, |·|, √, sin, cos, e^{it}, and quotients with nonvanishing denominators.',
  'Any earlier problem may be cited by number.',
]

export const ALL_PROBLEMS: { unit: Unit; problem: Problem }[] = UNITS.flatMap(unit =>
  unit.problems.map(problem => ({ unit, problem }))
)

export const unitById = (id: string | undefined): Unit | undefined => UNITS.find(u => u.id === id)

export const problemById = (id: string): { unit: Unit; problem: Problem } | undefined =>
  ALL_PROBLEMS.find(e => e.problem.id === id)

/** URL segment for a problem: "2.10" → "2-10". */
export const problemSlug = (id: string) => id.replace('.', '-')

export const problemBySlug = (unit: Unit, slug: string | undefined): Problem | undefined =>
  unit.problems.find(p => problemSlug(p.id) === slug)
