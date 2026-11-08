import { choice, int, list, sum, yesNo } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'sm-a5-classeq',
    kind: 'answer',
    prompt: <p>Give the class equation of A₅.</p>,
    answer: sum(1, 12, 12, 15, 20),
    solution: <p>60 = 1 + 15 + 20 + 12 + 12 (§12.2).</p>,
  },
  {
    id: 'sm-a5-order5',
    kind: 'answer',
    prompt: <p>How many elements of order 5 does A₅ have?</p>,
    answer: int(24),
    solution: <p>The 5-cycles: 4! = 24 of them, all even.</p>,
  },
  {
    id: 'sm-z60-length',
    kind: 'answer',
    prompt: <p>How many factors does a composition series of ℤ₆₀ have?</p>,
    answer: int(4),
    solution: <p>The factors are cyclic of prime order with product 60 = 2 · 2 · 3 · 5: four of them.</p>,
  },
  {
    id: 'sm-s4-solvable',
    kind: 'answer',
    prompt: <p>Is S₄ solvable?</p>,
    answer: yesNo(true),
    solution: <p>S₄ ▷ A₄ ▷ V ▷ {'{'}e{'}'} has abelian factors ℤ₂, ℤ₃, ℤ₂ × ℤ₂.</p>,
  },
  {
    id: 'sm-s4-factors',
    kind: 'answer',
    prompt: <p>List the orders of the composition factors of S₄.</p>,
    answer: list(2, 3, 2, 2),
    solution: (
      <p>
        Refine S₄ ▷ A₄ ▷ V ▷ {'{'}e{'}'} by inserting a subgroup of order 2 in V: factors of orders 2, 3, 2, 2. By
        Jordan–Hölder every composition series gives the same list.
      </p>
    ),
  },
  {
    id: 'sm-s4-derived',
    kind: 'answer',
    prompt: <p>What is the order of the commutator subgroup of S₄?</p>,
    answer: int(12),
    solution: (
      <p>
        S₄/A₄ is abelian, so S₄′ ≤ A₄. And S₄′ contains [(1 2), (1 3)] = (1 2)(1 3)(1 2)(1 3) = (1 2 3) and its conjugates —
        all eight 3-cycles, which generate A₄. So S₄′ = A₄.
      </p>
    ),
  },
  {
    id: 'sm-a4-derived',
    kind: 'answer',
    prompt: <p>What is the order of the commutator subgroup of A₄?</p>,
    answer: int(4),
    solution: (
      <p>
        A₄/V has order 3, so is abelian, and A₄′ ≤ V. A₄ is not abelian, so A₄′ ≠ {'{'}e{'}'}; A₄′ is normal in A₄ and the
        subgroups of order 2 in V are not, so A₄′ = V.
      </p>
    ),
  },
  {
    id: 'sm-derived-length',
    kind: 'answer',
    prompt: <p>How many steps does the derived series of S₄ take to reach {'{'}e{'}'}?</p>,
    answer: int(3),
    solution: <p>S₄′ = A₄, A₄′ = V, V′ = {'{'}e{'}'} since V is abelian: three steps.</p>,
  },
  {
    id: 'sm-which-order',
    kind: 'answer',
    prompt: <p>For which of these orders is there a non-abelian simple group?</p>,
    answer: choice(['30', '56', '60', '72'], '60'),
    solution: <p>A₅ has order 60. Orders 30 and 56 are ruled out in Chapter 11; 72 by a similar Sylow argument.</p>,
  },
  {
    id: 'sm-perfect',
    kind: 'proof',
    prompt: <p>Prove that if G is a non-abelian simple group, then G′ = G.</p>,
    solution: <p>G′ ◁ G, so G′ is {'{'}e{'}'} or G. It is not {'{'}e{'}'}, because G is not abelian.</p>,
  },
  {
    id: 'sm-solvable-simple',
    kind: 'proof',
    prompt: <p>Prove that a solvable simple group is cyclic of prime order.</p>,
    solution: (
      <p>
        If G′ = G, the derived series is constant and never reaches {'{'}e{'}'} (G is nontrivial), contradicting
        solvability. So G′ is a proper normal subgroup, hence {'{'}e{'}'}: G is abelian. An abelian simple group is cyclic of
        prime order.
      </p>
    ),
  },
  {
    id: 'sm-a5-no-30',
    kind: 'proof',
    prompt: <p>Prove that A₅ has no subgroup of order 30.</p>,
    solution: <p>Such a subgroup would have index 2, hence be normal, contradicting the simplicity of A₅.</p>,
  },
  {
    id: 'sm-p-groups',
    kind: 'proof',
    prompt: <p>Prove that every finite p-group is solvable.</p>,
    solution: (
      <p>
        Induct on |G|. A nontrivial p-group has nontrivial center Z (§10.4), which is abelian, hence solvable, and normal.
        G/Z is a smaller p-group, solvable by induction. By §12.4, G is solvable.
      </p>
    ),
  },
  {
    id: 'sm-sn',
    kind: 'proof',
    prompt: <p>Assuming Aₙ is simple for n ≥ 5, prove that Sₙ is not solvable for n ≥ 5.</p>,
    solution: (
      <p>
        Aₙ is a subgroup of Sₙ, and subgroups of solvable groups are solvable. But Aₙ is non-abelian and simple, so Aₙ′ =
        Aₙ and its derived series never reaches {'{'}e{'}'}.
      </p>
    ),
  },
  {
    id: 'sm-simple-60',
    kind: 'proof',
    prompt: (
      <p>
        Prove that a simple group G of order 60 has exactly six Sylow 5-subgroups and exactly ten Sylow 3-subgroups.
      </p>
    ),
    hint: <p>For n₃, rule out 4 by letting G act on its Sylow 3-subgroups.</p>,
    solution: (
      <p>
        n₅ ∈ {'{'}1, 6{'}'}, and n₅ = 1 would give a normal subgroup, so n₅ = 6. n₃ divides 20 and is ≡ 1 (mod 3): n₃ ∈ {'{'}1,
        4, 10{'}'}. Not 1, by simplicity. If n₃ = 4, conjugation on the four Sylow 3-subgroups gives a homomorphism G → S₄,
        nontrivial because the action is transitive. Its kernel is normal, not G, so trivial by simplicity — but then G
        embeds in S₄, and 60 ∤ 24. So n₃ = 10.
      </p>
    ),
  },
]
