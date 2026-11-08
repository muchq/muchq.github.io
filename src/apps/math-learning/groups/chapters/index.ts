import { DRILLS } from '../problems/drills'
import type { Chapter } from '../problems/types'
import GroupsBody from './01-groups'
import { problems as groupsProblems } from './01-groups.problems'
import SubgroupsBody from './02-subgroups'
import { problems as subgroupsProblems } from './02-subgroups.problems'
import PermutationsBody from './03-permutations'
import { problems as permutationsProblems } from './03-permutations.problems'
import IsomorphismsBody from './04-isomorphisms'
import { problems as isomorphismsProblems } from './04-isomorphisms.problems'
import LagrangeBody from './05-lagrange'
import { problems as lagrangeProblems } from './05-lagrange.problems'
import ProductsBody from './06-products'
import { problems as productsProblems } from './06-products.problems'
import QuotientsBody from './07-quotients'
import { problems as quotientsProblems } from './07-quotients.problems'
import HomomorphismsBody from './08-homomorphisms'
import { problems as homomorphismsProblems } from './08-homomorphisms.problems'
import AbelianBody from './09-abelian'
import { problems as abelianProblems } from './09-abelian.problems'
import ActionsBody from './10-actions'
import { problems as actionsProblems } from './10-actions.problems'
import SylowBody from './11-sylow'
import { problems as sylowProblems } from './11-sylow.problems'
import SimpleBody from './12-simple'
import { problems as simpleProblems } from './12-simple.problems'

/** The course, in order. A chapter's slug is its URL: /groups/<slug>. */
export const CHAPTERS: readonly Chapter[] = [
  {
    slug: 'groups',
    number: 1,
    title: 'Groups',
    short: 'Groups',
    summary: 'The axioms, the standard examples (ℤₙ, U(n), Dₙ, Q₈, matrices), first consequences, and the order of an element.',
    Body: GroupsBody,
    problems: groupsProblems,
    drills: DRILLS.groups,
  },
  {
    slug: 'subgroups',
    number: 2,
    title: 'Subgroups and cyclic groups',
    short: 'Subgroups',
    summary: 'Subgroup tests, centers and centralizers, and a complete description of cyclic groups and their subgroups.',
    Body: SubgroupsBody,
    problems: subgroupsProblems,
    drills: DRILLS.subgroups,
  },
  {
    slug: 'permutations',
    number: 3,
    title: 'Permutation groups',
    short: 'Permutations',
    summary: 'Cycle notation, orders, the sign and the alternating group, and conjugacy in Sₙ by cycle type.',
    Body: PermutationsBody,
    problems: permutationsProblems,
    drills: DRILLS.permutations,
  },
  {
    slug: 'isomorphisms',
    number: 4,
    title: 'Isomorphisms',
    short: 'Isomorphisms',
    summary: 'When two groups are the same, how to prove they are not, Cayley’s theorem, and automorphisms.',
    Body: IsomorphismsBody,
    problems: isomorphismsProblems,
    drills: DRILLS.isomorphisms,
  },
  {
    slug: 'lagrange',
    number: 5,
    title: 'Cosets and Lagrange’s theorem',
    short: 'Lagrange',
    summary: 'Cosets, Lagrange’s theorem and its corollaries (Fermat, Euler), groups of order 4, and where the converse fails.',
    Body: LagrangeBody,
    problems: lagrangeProblems,
    drills: DRILLS.lagrange,
  },
  {
    slug: 'products',
    number: 6,
    title: 'Direct products',
    short: 'Products',
    summary: 'Building groups side by side, when ℤₘ × ℤₙ is cyclic, and U(n) as a product.',
    Body: ProductsBody,
    problems: productsProblems,
    drills: DRILLS.products,
  },
  {
    slug: 'quotients',
    number: 7,
    title: 'Normal subgroups and quotient groups',
    short: 'Quotients',
    summary: 'Normality, quotient groups, the G/Z theorem, Cauchy for abelian groups, internal direct products, and commutators.',
    Body: QuotientsBody,
    problems: quotientsProblems,
    drills: DRILLS.quotients,
  },
  {
    slug: 'homomorphisms',
    number: 8,
    title: 'Homomorphisms and the isomorphism theorems',
    short: 'Homomorphisms',
    summary: 'Kernels and images, the three isomorphism theorems, the correspondence theorem, and maps between cyclic groups.',
    Body: HomomorphismsBody,
    problems: homomorphismsProblems,
    drills: DRILLS.homomorphisms,
  },
  {
    slug: 'abelian',
    number: 9,
    title: 'Finite abelian groups',
    short: 'Abelian groups',
    summary: 'The fundamental theorem: elementary divisors, invariant factors, and counting and recognizing abelian groups.',
    Body: AbelianBody,
    problems: abelianProblems,
    drills: DRILLS.abelian,
  },
  {
    slug: 'actions',
    number: 10,
    title: 'Group actions',
    short: 'Actions',
    summary: 'Orbits and stabilizers, the class equation, p-groups, Cauchy’s theorem, Burnside counting, and actions on cosets.',
    Body: ActionsBody,
    problems: actionsProblems,
    drills: DRILLS.actions,
  },
  {
    slug: 'sylow',
    number: 11,
    title: 'The Sylow theorems',
    short: 'Sylow',
    summary: 'Existence, conjugacy, and counting of Sylow subgroups, and what they say about groups of order pq, 2p, 12, 30, ….',
    Body: SylowBody,
    problems: sylowProblems,
    drills: DRILLS.sylow,
  },
  {
    slug: 'simple',
    number: 12,
    title: 'Simple and solvable groups',
    short: 'Simple groups',
    summary: 'The simplicity of A₅, composition series, solvable groups, and the classification of finite simple groups.',
    Body: SimpleBody,
    problems: simpleProblems,
    drills: DRILLS.simple,
  },
]

export const chapterBySlug = (slug: string): Chapter | undefined => CHAPTERS.find(c => c.slug === slug)
