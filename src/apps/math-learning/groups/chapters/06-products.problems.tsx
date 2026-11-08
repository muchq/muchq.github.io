import { choice, int, yesNo } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'dp-order',
    kind: 'answer',
    prompt: <p>Find the order of (4, 6) in ℤ₁₂ × ℤ₁₅.</p>,
    answer: int(15),
    solution: <p>|4| = 12/4 = 3 in ℤ₁₂ and |6| = 15/3 = 5 in ℤ₁₅, so the order is lcm(3, 5) = 15.</p>,
  },
  {
    id: 'dp-order5',
    kind: 'answer',
    prompt: <p>How many elements of order 5 does ℤ₂₅ × ℤ₅ have?</p>,
    answer: int(24),
    solution: <p>Pairs with both orders in {'{'}1, 5{'}'}, not both 1: 5 · 5 − 1 = 24.</p>,
  },
  {
    id: 'dp-cyclic-subgroups',
    kind: 'answer',
    prompt: <p>How many cyclic subgroups of order 5 does ℤ₂₅ × ℤ₅ have?</p>,
    answer: int(6),
    solution: <p>Each contains φ(5) = 4 of the 24 elements of order 5, and distinct ones share only the identity: 24/4 = 6.</p>,
  },
  {
    id: 'dp-cyclic',
    kind: 'answer',
    prompt: <p>Is ℤ₃ × ℤ₅ × ℤ₄ cyclic?</p>,
    answer: yesNo(true),
    solution: <p>3, 5, 4 are pairwise coprime, so it is ≅ ℤ₆₀.</p>,
  },
  {
    id: 'dp-u15',
    kind: 'answer',
    prompt: <p>U(15) is isomorphic to which group?</p>,
    answer: choice(['ℤ₈', 'ℤ₂ × ℤ₄', 'ℤ₂ × ℤ₂ × ℤ₂'], 'ℤ₂ × ℤ₄'),
    solution: <p>U(15) ≅ U(3) × U(5) ≅ ℤ₂ × ℤ₄. (Check: 2 has order 4, and 4, 11, 14 have order 2.)</p>,
  },
  {
    id: 'dp-max-order',
    kind: 'answer',
    prompt: <p>What is the largest order of an element of ℤ₄ × ℤ₆?</p>,
    answer: int(12),
    solution: <p>lcm(|a|, |b|) is at most lcm(4, 6) = 12, attained by (1, 1).</p>,
  },
  {
    id: 'dp-order2',
    kind: 'answer',
    prompt: <p>How many elements of order 2 does ℤ₂ × ℤ₄ × ℤ₆ have?</p>,
    answer: int(7),
    solution: <p>Each factor has exactly 2 elements with 2x = 0, so 2 · 2 · 2 = 8 such elements; all but (0, 0, 0) have order 2.</p>,
  },
  {
    id: 'dp-u16',
    kind: 'answer',
    prompt: <p>What is the largest order of an element of U(16)?</p>,
    answer: int(4),
    solution: <p>U(16) ≅ ℤ₂ × ℤ₄ by Gauss, so 4 (for instance 3: 3, 9, 27 ≡ 11, 33 ≡ 1).</p>,
  },
  {
    id: 'dp-u105',
    kind: 'answer',
    prompt: <p>How many elements of order 2 does U(105) have?</p>,
    answer: int(7),
    solution: <p>U(105) ≅ ℤ₂ × ℤ₄ × ℤ₆, with 2 · 2 · 2 = 8 solutions of 2x = 0; seven of them are not the identity.</p>,
  },
  {
    id: 'dp-z2z2z3',
    kind: 'answer',
    prompt: <p>ℤ₂ × ℤ₂ × ℤ₃ is isomorphic to which group?</p>,
    answer: choice(['ℤ₁₂', 'ℤ₂ × ℤ₆', 'ℤ₄ × ℤ₃'], 'ℤ₂ × ℤ₆'),
    solution: <p>ℤ₂ × ℤ₃ ≅ ℤ₆, so the product is ℤ₂ × ℤ₆. It is not cyclic (gcd(2, 6) = 2), while ℤ₄ × ℤ₃ ≅ ℤ₁₂ is.</p>,
  },
  {
    id: 'dp-abelian',
    kind: 'proof',
    prompt: <p>Prove that G × H is abelian if and only if both G and H are abelian.</p>,
    solution: (
      <p>
        (g, h)(g′, h′) = (gg′, hh′) and (g′, h′)(g, h) = (g′g, h′h); these agree for all choices exactly when gg′ = g′g for
        all g, g′ ∈ G and hh′ = h′h for all h, h′ ∈ H.
      </p>
    ),
  },
  {
    id: 'dp-zz',
    kind: 'proof',
    prompt: <p>Prove that ℤ × ℤ is not cyclic.</p>,
    solution: (
      <p>
        Suppose (a, b) generates. Then (1, 0) = n(a, b) and (0, 1) = m(a, b) for some integers n, m. From na = 1, a = ±1 and
        n ≠ 0, so nb = 0 forces b = 0. But then mb = 1 is impossible.
      </p>
    ),
  },
  {
    id: 'dp-cyclic-product',
    kind: 'proof',
    prompt: <p>Let G and H be finite. Prove that if G × H is cyclic, then G and H are cyclic and gcd(|G|, |H|) = 1.</p>,
    solution: (
      <p>
        Let (g, h) generate. Every (x, e) is a power (gᵏ, hᵏ), so every x ∈ G is a power of g: G = ⟨g⟩. Likewise H = ⟨h⟩.
        Then |G||H| = |(g, h)| = lcm(|G|, |H|) = |G||H| / gcd(|G|, |H|), so the gcd is 1.
      </p>
    ),
  },
  {
    id: 'dp-diagonal',
    kind: 'proof',
    prompt: <p>Prove that the diagonal Δ = {'{'}(g, g) : g ∈ G{'}'} is a subgroup of G × G isomorphic to G.</p>,
    solution: (
      <p>
        (g, g)(h, h)⁻¹ = (gh⁻¹, gh⁻¹) ∈ Δ, and Δ is nonempty, so Δ ≤ G × G. The map g ↦ (g, g) is a bijection G → Δ and
        respects products.
      </p>
    ),
  },
  {
    id: 'dp-not-a-product',
    kind: 'proof',
    prompt: <p>Show that not every subgroup of G × H has the form A × B with A ≤ G and B ≤ H.</p>,
    solution: (
      <p>
        In ℤ₂ × ℤ₂ take D = {'{'}(0, 0), (1, 1){'}'}. If D = A × B, then (1, 1) ∈ D gives 1 ∈ A and 1 ∈ B, and also 0 ∈ B, so
        (1, 0) ∈ A × B = D. It is not.
      </p>
    ),
  },
]
