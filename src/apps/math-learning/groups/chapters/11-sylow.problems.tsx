import { int, set, yesNo } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'sy-36-n3',
    kind: 'answer',
    prompt: <p>Let |G| = 36. List the values of n₃ allowed by the Sylow theorems.</p>,
    answer: set(1, 4),
    solution: <p>36 = 9 · 4. n₃ divides 4 and is ≡ 1 (mod 3): 1 or 4.</p>,
  },
  {
    id: 'sy-60-n5',
    kind: 'answer',
    prompt: <p>Let |G| = 60. List the values of n₅ allowed by the Sylow theorems.</p>,
    answer: set(1, 6),
    solution: <p>60 = 5 · 12. Divisors of 12 that are ≡ 1 (mod 5): 1 and 6.</p>,
  },
  {
    id: 'sy-60-n2',
    kind: 'answer',
    prompt: <p>Let |G| = 60. List the values of n₂ allowed by the Sylow theorems.</p>,
    answer: set(1, 3, 5, 15),
    solution: <p>60 = 4 · 15. Every divisor of 15 is odd, so ≡ 1 (mod 2): 1, 3, 5, 15.</p>,
  },
  {
    id: 'sy-s3-n2',
    kind: 'answer',
    prompt: <p>How many Sylow 2-subgroups does S₃ have?</p>,
    answer: int(3),
    solution: <p>⟨(1 2)⟩, ⟨(1 3)⟩, ⟨(2 3)⟩. Indeed 3 ≡ 1 (mod 2) and 3 | 3.</p>,
  },
  {
    id: 'sy-a4-n3',
    kind: 'answer',
    prompt: <p>How many Sylow 3-subgroups does A₄ have?</p>,
    answer: int(4),
    solution: <p>The eight 3-cycles pair off into four subgroups of order 3, one for each choice of the fixed point.</p>,
  },
  {
    id: 'sy-s4-n2',
    kind: 'answer',
    prompt: <p>How many Sylow 2-subgroups does S₄ have?</p>,
    answer: int(3),
    solution: (
      <p>
        n₂ divides 3 and is odd: 1 or 3. Each copy of D₄ in S₄ (the symmetries of a square whose corners are labeled 1–4)
        is one, and there are three ways to arrange 1, 2, 3, 4 around a square up to symmetry. So n₂ = 3.
      </p>
    ),
  },
  {
    id: 'sy-a5-n5',
    kind: 'answer',
    prompt: <p>How many Sylow 5-subgroups does A₅ have?</p>,
    answer: int(6),
    solution: <p>A₅ has 24 five-cycles, 4 in each subgroup of order 5: 24/4 = 6.</p>,
  },
  {
    id: 'sy-s6-order',
    kind: 'answer',
    prompt: <p>What is the order of a Sylow 3-subgroup of S₆?</p>,
    answer: int(9),
    solution: <p>|S₆| = 720 = 2⁴ · 3² · 5. For example ⟨(1 2 3), (4 5 6)⟩ ≅ ℤ₃ × ℤ₃.</p>,
  },
  {
    id: 'sy-35',
    kind: 'answer',
    prompt: <p>Is every group of order 35 cyclic?</p>,
    answer: yesNo(true),
    solution: <p>35 = 5 · 7 and 5 ∤ 6, so by §11.3 every group of order 35 is cyclic.</p>,
  },
  {
    id: 'sy-168',
    kind: 'answer',
    prompt: <p>A simple group of order 168 = 2³ · 3 · 7 has how many elements of order 7?</p>,
    answer: int(48),
    solution: <p>n₇ ∈ {'{'}1, 8{'}'}, and simplicity rules out 1. Eight subgroups of order 7 meeting trivially: 8 · 6 = 48.</p>,
  },
  {
    id: 'sy-smallest',
    kind: 'answer',
    prompt: <p>What is the smallest order of a non-abelian group?</p>,
    answer: int(6),
    solution: <p>Orders 1–5 are cyclic or ℤ₂ × ℤ₂ (prime order, or order 4). S₃ has order 6.</p>,
  },
  {
    id: 'sy-30',
    kind: 'proof',
    prompt: <p>Prove that no group of order 30 is simple.</p>,
    solution: (
      <p>
        n₃ ∈ {'{'}1, 10{'}'} and n₅ ∈ {'{'}1, 6{'}'}. If n₃ = 10 and n₅ = 6, the subgroups of prime order meet pairwise
        trivially, giving 10 · 2 = 20 elements of order 3 and 6 · 4 = 24 of order 5: 44 &gt; 30. So n₃ = 1 or n₅ = 1, and that
        Sylow subgroup is a proper nontrivial normal subgroup.
      </p>
    ),
  },
  {
    id: 'sy-56',
    kind: 'proof',
    prompt: <p>Prove that no group of order 56 is simple.</p>,
    solution: (
      <p>
        56 = 2³ · 7 and n₇ ∈ {'{'}1, 8{'}'}. If n₇ = 8 there are 8 · 6 = 48 elements of order 7. A Sylow 2-subgroup has
        order 8 and contains none of them, so it is exactly the remaining 8 elements, and n₂ = 1. Either n₇ = 1 or n₂ = 1.
      </p>
    ),
  },
  {
    id: 'sy-45',
    kind: 'proof',
    prompt: <p>Prove that every group of order 45 is abelian.</p>,
    solution: (
      <p>
        45 = 9 · 5. n₃ divides 5 and is ≡ 1 (mod 3): n₃ = 1. n₅ divides 9 and is ≡ 1 (mod 5): n₅ = 1. So the Sylow
        subgroups P₃ (order 9) and P₅ (order 5) are normal, meet trivially, and |P₃P₅| = 45: G ≅ P₃ × P₅. A group of order
        9 is abelian (§10.4) and one of order 5 is cyclic, so G is abelian.
      </p>
    ),
  },
  {
    id: 'sy-48',
    kind: 'proof',
    prompt: <p>Prove that no group of order 48 is simple.</p>,
    hint: <p>If n₂ = 3, let G act on its Sylow 2-subgroups by conjugation.</p>,
    solution: (
      <p>
        48 = 16 · 3, so n₂ ∈ {'{'}1, 3{'}'}. If n₂ = 1 the Sylow 2-subgroup is normal. If n₂ = 3, conjugation on the three
        Sylow 2-subgroups gives a homomorphism G → S₃. It is nontrivial because the action is transitive (Sylow II), so its
        kernel is not G; and the kernel is not {'{'}e{'}'} because 48 &gt; 6 = |S₃|. The kernel is a proper nontrivial normal
        subgroup.
      </p>
    ),
  },
  {
    id: 'sy-pq-normal',
    kind: 'proof',
    prompt: <p>Let |G| = pq with primes p &lt; q. Prove that G has a normal subgroup of order q.</p>,
    solution: <p>n<sub>q</sub> divides p and is ≡ 1 (mod q). Since 1 &lt; p &lt; q + 1, n<sub>q</sub> = 1.</p>,
  },
  {
    id: 'sy-normal-contains',
    kind: 'proof',
    prompt: <p>Let P be a normal Sylow p-subgroup of G. Prove that every element of G whose order is a power of p lies in P.</p>,
    solution: (
      <p>
        If |g| = pʲ then ⟨g⟩ is a p-subgroup, so by Sylow II it lies in some Sylow p-subgroup — a conjugate of P, which is P
        itself.
      </p>
    ),
  },
]
