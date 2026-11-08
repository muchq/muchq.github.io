import type { Problem, Unit } from '../types'
import craft from './u00-craft'
import relations from './u01-relations'
import groups from './u02-groups'
import quotients from './u03-quotients'
import actions from './u04-actions'
import rings from './u05-rings'
import metric from './u06-metric'
import spaces from './u07-spaces'
import bridge from './u08-bridge'
import connected from './u09-connected'
import compact from './u10-compact'
import separation from './u11-separation'
import products from './u12-products'
import countability from './u13-countability'
import homotopy from './u14-homotopy'
import circle from './u15-circle'
import mixed from './u16-mixed'

/** In order. Problem ids are "unit.n" and are the storage keys for progress. */
export const UNITS: Unit[] = [
  craft,
  relations,
  groups,
  quotients,
  actions,
  rings,
  metric,
  spaces,
  bridge,
  connected,
  compact,
  separation,
  products,
  countability,
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
  'Rings are commutative with 1, and ring homomorphisms send 1 to 1.',
  'Choice is used freely: picking points from nonempty sets, and Zorn’s lemma (Unit 1).',
  'Assumed background: arithmetic of ℤ and ℝ, the division algorithm, unique prime factorization, the least upper bound property and completeness of ℝ, the Cauchy–Schwarz inequality, continuity of polynomials, |·|, √, sin, cos and e^{it}, and that sums, products and quotients (with nonvanishing denominator) of continuous real- or complex-valued functions on any space are continuous.',
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
