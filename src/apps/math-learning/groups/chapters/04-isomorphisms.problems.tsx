import { choice, int } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'iso-aut-z12',
    kind: 'answer',
    prompt: <p>How many automorphisms does ℤ₁₂ have?</p>,
    answer: int(4),
    solution: <p>|Aut(ℤ₁₂)| = |U(12)| = φ(12) = 4: x ↦ x, 5x, 7x, 11x.</p>,
  },
  {
    id: 'iso-z10-u11',
    kind: 'answer',
    prompt: <p>How many isomorphisms are there from ℤ₁₀ to U(11)?</p>,
    answer: int(4),
    hint: <p>Is U(11) cyclic? An isomorphism from ℤ₁₀ is determined by the image of 1.</p>,
    solution: (
      <p>
        U(11) has order 10 and is cyclic (2 has order 10). An isomorphism must send 1 to a generator, and any generator
        works; U(11) has φ(10) = 4 generators.
      </p>
    ),
  },
  {
    id: 'iso-u10',
    kind: 'answer',
    prompt: <p>U(10) is isomorphic to which group?</p>,
    answer: choice(['ℤ₄', 'ℤ₂ × ℤ₂'], 'ℤ₄'),
    solution: <p>3 has order 4 in U(10) (3, 9, 7, 1), so U(10) is cyclic.</p>,
  },
  {
    id: 'iso-u12',
    kind: 'answer',
    prompt: (
      <p>
        U(12) is isomorphic to which group? (ℤ₂ × ℤ₂, the Klein four-group, is the set of pairs of elements of ℤ₂ added
        coordinatewise; Chapter 6 develops such products.)
      </p>
    ),
    answer: choice(['ℤ₄', 'ℤ₂ × ℤ₂'], 'ℤ₂ × ℤ₂'),
    solution: (
      <p>
        U(12) = {'{'}1, 5, 7, 11{'}'} and 5², 7², 11² are all ≡ 1 (mod 12): no element of order 4, so U(12) is not ≅ ℤ₄. In
        ℤ₂ × ℤ₂ too every non-identity element has order 2, and 1 ↦ (0, 0), 5 ↦ (1, 0), 7 ↦ (0, 1), 11 ↦ (1, 1) is an
        isomorphism (5 · 7 = 35 ≡ 11). §5.3 shows these are the only two groups of order 4.
      </p>
    ),
  },
  {
    id: 'iso-d4-q8',
    kind: 'answer',
    prompt: <p>Which property shows that D₄ and Q₈ are not isomorphic?</p>,
    answer: choice(
      ['Their orders', 'One is abelian and the other is not', 'The number of elements of order 2', 'Nothing: they are isomorphic'],
      'The number of elements of order 2'
    ),
    solution: <p>Both have order 8 and both are non-abelian. D₄ has five elements of order 2, Q₈ only one (−1).</p>,
  },
  {
    id: 'iso-inn-d4',
    kind: 'answer',
    prompt: <p>How many inner automorphisms does D₄ have?</p>,
    answer: int(4),
    solution: <p>|Inn(D₄)| = |D₄| / |Z(D₄)| = 8 / 2 = 4.</p>,
  },
  {
    id: 'iso-inn-s3',
    kind: 'answer',
    prompt: <p>How many inner automorphisms does S₃ have?</p>,
    answer: int(6),
    solution: <p>Z(S₃) is trivial, so distinct elements give distinct inner automorphisms: |Inn(S₃)| = 6.</p>,
  },
  {
    id: 'iso-u5',
    kind: 'answer',
    prompt: <p>ψ: U(5) → ℤ₄ is the isomorphism with ψ(2) = 1. What is ψ(3)?</p>,
    answer: int(3),
    solution: <p>2³ = 8 ≡ 3 (mod 5), so ψ(3) = ψ(2³) = 3 · ψ(2) = 3.</p>,
  },
  {
    id: 'iso-exp',
    kind: 'answer',
    prompt: <p>Which map is an isomorphism from (ℝ, +) to (ℝ⁺, ·)?</p>,
    answer: choice(['x ↦ x²', 'x ↦ 2ˣ', 'x ↦ |x| + 1', 'x ↦ x + 1'], 'x ↦ 2ˣ'),
    solution: (
      <p>
        2ˣ⁺ʸ = 2ˣ2ʸ, and x ↦ 2ˣ is a bijection ℝ → ℝ⁺ with inverse log₂. x² and |x| + 1 are not injective, and x + 1 can be
        negative.
      </p>
    ),
  },
  {
    id: 'iso-q-qstar',
    kind: 'proof',
    prompt: <p>Prove that (ℚ, +) and (ℚ*, ·) are not isomorphic.</p>,
    hint: <p>Look for an element of finite order.</p>,
    solution: (
      <p>
        In ℚ*, −1 has order 2. In (ℚ, +), nx = 0 with n ≥ 1 forces x = 0, so no nonzero element has finite order. An
        isomorphism preserves orders, so none exists.
      </p>
    ),
  },
  {
    id: 'iso-z-q',
    kind: 'proof',
    prompt: <p>Prove that (ℤ, +) and (ℚ, +) are not isomorphic.</p>,
    solution: (
      <p>
        ℤ is cyclic; we show ℚ is not. If ℚ = ⟨p/q⟩ with p/q ≠ 0, then p/(2q) = n · p/q for some integer n, giving n = 1/2.
        Contradiction. Isomorphisms preserve cyclicity.
      </p>
    ),
  },
  {
    id: 'iso-center',
    kind: 'proof',
    prompt: <p>Let φ: G → H be an isomorphism. Prove that φ(Z(G)) = Z(H).</p>,
    solution: (
      <p>
        If z ∈ Z(G) and y ∈ H, write y = φ(g). Then φ(z)y = φ(zg) = φ(gz) = yφ(z), so φ(Z(G)) ⊆ Z(H). Applying this to
        the isomorphism φ⁻¹ gives φ⁻¹(Z(H)) ⊆ Z(G), i.e. Z(H) ⊆ φ(Z(G)).
      </p>
    ),
  },
  {
    id: 'iso-inverse-map',
    kind: 'proof',
    prompt: <p>Prove that x ↦ x⁻¹ is an automorphism of G if and only if G is abelian.</p>,
    solution: (
      <p>
        The map is always a bijection (it is its own inverse). It preserves products exactly when (ab)⁻¹ = a⁻¹b⁻¹ for all a,
        b, i.e. b⁻¹a⁻¹ = a⁻¹b⁻¹ for all a, b. Since every element is an inverse, this says yx = xy for all x, y.
      </p>
    ),
  },
  {
    id: 'iso-square-map',
    kind: 'proof',
    prompt: <p>Let G be a finite abelian group in which every element has odd order. Prove that x ↦ x² is an automorphism.</p>,
    solution: (
      <p>
        It preserves products because (xy)² = x²y² in an abelian group. If x² = y², then (xy⁻¹)² = x²y⁻² = e, so |xy⁻¹|
        divides 2. Being odd, it is 1: x = y. An injective map of a finite set to itself is a bijection.
      </p>
    ),
  },
  {
    id: 'iso-aut-z',
    kind: 'proof',
    prompt: <p>Prove that Aut(ℤ) ≅ ℤ₂.</p>,
    solution: (
      <p>
        An automorphism α satisfies α(n) = nα(1), so it is determined by α(1), which must generate ℤ: α(1) = ±1. Both x ↦ x
        and x ↦ −x are automorphisms. A group with two elements is ≅ ℤ₂.
      </p>
    ),
  },
]
