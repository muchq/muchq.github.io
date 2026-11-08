import { choice, int } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'ab-72',
    kind: 'answer',
    prompt: <p>How many abelian groups of order 72 are there, up to isomorphism?</p>,
    answer: int(6),
    solution: <p>72 = 2³ · 3², so p(3) · p(2) = 3 · 2 = 6.</p>,
  },
  {
    id: 'ab-1000',
    kind: 'answer',
    prompt: <p>How many abelian groups of order 1000 are there, up to isomorphism?</p>,
    answer: int(9),
    solution: <p>1000 = 2³ · 5³, so p(3) · p(3) = 9.</p>,
  },
  {
    id: 'ab-81',
    kind: 'answer',
    prompt: <p>How many abelian groups of order 81 are there, up to isomorphism?</p>,
    answer: int(5),
    solution: <p>81 = 3⁴ and p(4) = 5: 4, 3 + 1, 2 + 2, 2 + 1 + 1, 1 + 1 + 1 + 1.</p>,
  },
  {
    id: 'ab-360',
    kind: 'answer',
    prompt: <p>How many abelian groups of order 360 are there, up to isomorphism?</p>,
    answer: int(6),
    solution: <p>360 = 2³ · 3² · 5, so p(3) · p(2) · p(1) = 3 · 2 · 1 = 6.</p>,
  },
  {
    id: 'ab-invariant',
    kind: 'answer',
    prompt: <p>What is the invariant-factor form of ℤ₂ × ℤ₄ × ℤ₃ × ℤ₉?</p>,
    answer: choice(['ℤ₆ × ℤ₃₆', 'ℤ₂ × ℤ₁₀₈', 'ℤ₃ × ℤ₇₂', 'ℤ₂₁₆'], 'ℤ₆ × ℤ₃₆'),
    solution: <p>Largest powers 4 and 9 give 36; the remaining 2 and 3 give 6. And 6 | 36.</p>,
  },
  {
    id: 'ab-order2',
    kind: 'answer',
    prompt: <p>How many elements of order 2 does ℤ₂ × ℤ₄ × ℤ₈ have?</p>,
    answer: int(7),
    solution: <p>2x = 0 has 2 solutions in each factor, so 2³ = 8 in all; seven are nonzero.</p>,
  },
  {
    id: 'ab-identify',
    kind: 'answer',
    prompt: (
      <p>
        An abelian group of order 16 has exactly three elements of order 2 and no element of order 8. Which group is it?
      </p>
    ),
    answer: choice(['ℤ₁₆', 'ℤ₈ × ℤ₂', 'ℤ₄ × ℤ₄', 'ℤ₄ × ℤ₂ × ℤ₂', 'ℤ₂ × ℤ₂ × ℤ₂ × ℤ₂'], 'ℤ₄ × ℤ₄'),
    solution: (
      <p>
        Three elements of order 2 means 2² − 1: exactly two cyclic factors. The two-factor groups are ℤ₈ × ℤ₂ and ℤ₄ × ℤ₄,
        and the first has an element of order 8.
      </p>
    ),
  },
  {
    id: 'ab-u32',
    kind: 'answer',
    prompt: <p>U(32) is isomorphic to which group?</p>,
    answer: choice(['ℤ₁₆', 'ℤ₂ × ℤ₈', 'ℤ₄ × ℤ₄', 'ℤ₂ × ℤ₂ × ℤ₄'], 'ℤ₂ × ℤ₈'),
    solution: <p>See §9.3: three elements of order 2 and an element (3) of order 8.</p>,
  },
  {
    id: 'ab-z4z6',
    kind: 'answer',
    prompt: <p>ℤ₄ × ℤ₆ is isomorphic to which group?</p>,
    answer: choice(['ℤ₂₄', 'ℤ₂ × ℤ₁₂', 'ℤ₂ × ℤ₂ × ℤ₆'], 'ℤ₂ × ℤ₁₂'),
    solution: <p>Elementary divisors 4, 2, 3. Largest powers 4 · 3 = 12; then 2. So ℤ₂ × ℤ₁₂.</p>,
  },
  {
    id: 'ab-exponent',
    kind: 'answer',
    prompt: <p>What is the largest order of an element of ℤ₆ × ℤ₁₀ × ℤ₁₅?</p>,
    answer: int(30),
    solution: <p>lcm(6, 10, 15) = 30. In fact the group is ℤ₃₀ × ℤ₃₀: its elementary divisors are 2, 2, 3, 3, 5, 5.</p>,
  },
  {
    id: 'ab-cyclic-criterion',
    kind: 'proof',
    prompt: (
      <p>
        Prove that a finite abelian group G is cyclic if and only if, for every prime p dividing |G|, G has exactly p − 1
        elements of order p.
      </p>
    ),
    solution: (
      <p>
        If G is cyclic of order n and p | n, G has φ(p) = p − 1 elements of order p (§2.4). Conversely, write G as the product
        of its p-parts, each a product of r<sub>p</sub> cyclic p-groups. The elements of order p all lie in the p-part, and there
        are p<sup>r<sub>p</sub></sup> − 1 of them. So p<sup>r<sub>p</sub></sup> − 1 = p − 1, i.e. r<sub>p</sub> = 1: each p-part is cyclic. A product of
        cyclic groups of pairwise coprime orders is cyclic.
      </p>
    ),
  },
  {
    id: 'ab-squarefree',
    kind: 'proof',
    prompt: <p>Prove that an abelian group whose order is square-free (a product of distinct primes) is cyclic.</p>,
    solution: (
      <p>
        The elementary divisors are prime powers whose product is |G| = p₁⋯pₖ, so they are exactly p₁, …, pₖ, distinct and
        pairwise coprime. So G ≅ ℤ<sub>p₁</sub> × ⋯ × ℤ<sub>pₖ</sub> ≅ ℤ<sub>p₁⋯pₖ</sub>.
      </p>
    ),
  },
  {
    id: 'ab-lagrange-converse',
    kind: 'proof',
    prompt: <p>Prove that if G is a finite abelian group and m divides |G|, then G has a subgroup of order m.</p>,
    solution: (
      <p>
        Write G ≅ ∏ ℤ<sub>pᵢ<sup>aᵢ</sup></sub>. For each prime p, if p<sup>b</sup> is the power of p in m and the factors for p
        are ℤ<sub>p<sup>a₁</sup></sub>, …, ℤ<sub>p<sup>aᵣ</sup></sub> with a₁ + ⋯ + aᵣ ≥ b, choose bᵢ ≤ aᵢ with b₁ + ⋯ + bᵣ =
        b. Each ℤ<sub>p<sup>aᵢ</sup></sub> has a subgroup of order p<sup>bᵢ</sup> (cyclic groups have one of every order
        dividing theirs). The product of all these subgroups has order m.
      </p>
    ),
  },
  {
    id: 'ab-wilson',
    kind: 'proof',
    prompt: (
      <p>
        Let G be a finite abelian group. Prove that the product of all elements of G is e, unless G has exactly one element
        t of order 2, in which case it is t. Deduce Wilson's theorem: (p − 1)! ≡ −1 (mod p) for p prime.
      </p>
    ),
    hint: <p>Pair each element with its inverse. What survives is the subgroup T = {'{'}x : x² = e{'}'}.</p>,
    solution: (
      <>
        <p>
          In the product, each x with x ≠ x⁻¹ cancels against x⁻¹, so the product equals the product of the elements of T =
          {'{'}x : x² = e{'}'}, a subgroup in which every non-identity element has order 2; by the fundamental theorem T ≅
          ℤ₂ᵏ. If k = 0 the product is e; if k = 1 it is t. If k ≥ 2, in each coordinate exactly half of the 2ᵏ elements have
          a 1, an even number, so the sum is 0.
        </p>
        <p>
          For Wilson (p odd): in U(p), x² ≡ 1 means p | (x − 1)(x + 1), so x ≡ ±1. The unique element of order 2 is −1, and
          the product of all elements of U(p) is (p − 1)!. For p = 2, 1! = 1 ≡ −1.
        </p>
      </>
    ),
  },
]
