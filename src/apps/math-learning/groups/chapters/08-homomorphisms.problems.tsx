import { choice, int, set } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'hm-count',
    kind: 'answer',
    prompt: <p>How many homomorphisms are there from ℤ₁₂ to ℤ₃₀?</p>,
    answer: int(6),
    solution: <p>gcd(12, 30) = 6.</p>,
  },
  {
    id: 'hm-onto',
    kind: 'answer',
    prompt: <p>How many homomorphisms from ℤ₂₀ onto ℤ₁₀ are there?</p>,
    answer: int(4),
    solution: <p>φ(1) must generate ℤ₁₀, and every generator works since 10 | 20: φ(10) = 4 choices.</p>,
  },
  {
    id: 'hm-into',
    kind: 'answer',
    prompt: <p>How many injective homomorphisms ℤ₆ → ℤ₁₈ are there?</p>,
    answer: int(2),
    solution: <p>φ(1) must have order exactly 6 in ℤ₁₈: the generators 3 and 15 of the subgroup ⟨3⟩ of order 6.</p>,
  },
  {
    id: 'hm-kernel',
    kind: 'answer',
    prompt: <p>φ: ℤ₁₆ → ℤ₂₄ is the homomorphism with φ(1) = 6. List the elements of ker φ.</p>,
    answer: set(0, 4, 8, 12),
    solution: <p>6k ≡ 0 (mod 24) ⟺ 4 | k. So ker φ = {'{'}0, 4, 8, 12{'}'}. (φ is well defined: 16 · 6 = 96 ≡ 0.)</p>,
  },
  {
    id: 'hm-image',
    kind: 'answer',
    prompt: <p>For the same φ: ℤ₁₆ → ℤ₂₄ with φ(1) = 6, how many elements are in the image?</p>,
    answer: int(4),
    solution: <p>|φ(ℤ₁₆)| = 16 / |ker φ| = 4: the image is ⟨6⟩ = {'{'}0, 6, 12, 18{'}'}.</p>,
  },
  {
    id: 'hm-sizes',
    kind: 'answer',
    prompt: <p>φ: G → H is a homomorphism with |G| = 60 and |ker φ| = 12. How many elements does φ(G) have?</p>,
    answer: int(5),
    solution: <p>|φ(G)| = [G : ker φ] = 60/12 = 5.</p>,
  },
  {
    id: 'hm-which',
    kind: 'answer',
    prompt: <p>Which formula defines a homomorphism ℤ₄ → ℤ₆?</p>,
    answer: choice(['x ↦ x', 'x ↦ 2x', 'x ↦ 3x', 'x ↦ x + 1'], 'x ↦ 3x'),
    solution: (
      <p>
        x ↦ ax is well defined on ℤ₄ only if 4a ≡ 0 (mod 6): a = 3 works (12 ≡ 0), a = 1 and a = 2 do not. x ↦ x + 1 does not
        send 0 to 0.
      </p>
    ),
  },
  {
    id: 'hm-s3-z2',
    kind: 'answer',
    prompt: <p>How many homomorphisms are there from S₃ to ℤ₂?</p>,
    answer: int(2),
    solution: (
      <p>
        The kernel is a normal subgroup with quotient of order 1 or 2: S₃ itself (the trivial map) or A₃ (the sign map, up
        to identifying {'{'}±1{'}'} with ℤ₂). A homomorphism with kernel A₃ must send odd permutations to 1, so it is unique.
      </p>
    ),
  },
  {
    id: 'hm-s3-z3',
    kind: 'answer',
    prompt: <p>How many homomorphisms are there from S₃ to ℤ₃?</p>,
    answer: int(1),
    solution: (
      <p>
        The image has order dividing gcd(6, 3) = 3. If it were 3, the kernel would be a normal subgroup of order 2, but no
        subgroup of order 2 in S₃ is normal. So only the trivial homomorphism. (Alternatively: each transposition has order 2,
        so maps to an element of ℤ₃ of order dividing 2, i.e. 0; and transpositions generate S₃.)
      </p>
    ),
  },
  {
    id: 'hm-inn',
    kind: 'proof',
    prompt: <p>Prove that G/Z(G) ≅ Inn(G).</p>,
    solution: (
      <p>
        g ↦ φ_g, where φ_g(x) = gxg⁻¹, is a homomorphism G → Inn(G) because φ_g ∘ φ_h = φ_gh (§4.5). It is onto by
        definition of Inn(G). Its kernel is {'{'}g : gxg⁻¹ = x for all x{'}'} = Z(G). Apply the First Isomorphism Theorem.
      </p>
    ),
  },
  {
    id: 'hm-no-onto',
    kind: 'proof',
    prompt: <p>Prove that there is no homomorphism from ℤ₈ × ℤ₂ onto ℤ₄ × ℤ₄.</p>,
    solution: (
      <p>
        Both groups have order 16, so a surjection would be a bijection, hence an isomorphism. But (1, 0) has order 8 in ℤ₈ ×
        ℤ₂, and every element of ℤ₄ × ℤ₄ has order at most 4.
      </p>
    ),
  },
  {
    id: 'hm-gcd',
    kind: 'proof',
    prompt: <p>Let φ: G → H be a homomorphism of finite groups. Prove that |φ(G)| divides gcd(|G|, |H|).</p>,
    solution: <p>|φ(G)| = |G|/|ker φ| divides |G|, and φ(G) ≤ H, so |φ(G)| divides |H| by Lagrange.</p>,
  },
  {
    id: 'hm-simple',
    kind: 'proof',
    prompt: (
      <p>
        A group is <em>simple</em> if its only normal subgroups are {'{'}e{'}'} and itself. Prove that every homomorphism out
        of a simple group is either trivial or injective.
      </p>
    ),
    solution: <p>ker φ is normal, so it is G (φ trivial) or {'{'}e{'}'} (φ injective).</p>,
  },
  {
    id: 'hm-circle',
    kind: 'proof',
    prompt: <p>Prove that ℝ/ℤ is isomorphic to the circle group S¹ = {'{'}z ∈ ℂ : |z| = 1{'}'} under multiplication.</p>,
    solution: (
      <p>
        φ(x) = e<sup>2πix</sup> = cos 2πx + i sin 2πx is a homomorphism (ℝ, +) → S¹ because e<sup>2πi(x+y)</sup> = e
        <sup>2πix</sup>e<sup>2πiy</sup>. It is onto: every point of the circle is (cos θ, sin θ). Its kernel is {'{'}x : cos
        2πx = 1{'}'} = ℤ. Apply the First Isomorphism Theorem.
      </p>
    ),
  },
  {
    id: 'hm-cyclic-source',
    kind: 'proof',
    prompt: (
      <p>
        Prove that for any group H, the homomorphisms ℤₙ → H correspond bijectively to the elements x ∈ H with xⁿ = e.
      </p>
    ),
    solution: (
      <p>
        A homomorphism φ is determined by x = φ(1), since φ(k) = xᵏ, and xⁿ = φ(n · 1) = φ(0) = e. Conversely if xⁿ = e,
        then k ↦ xᵏ is well defined on ℤₙ (xⁱ = xʲ when i ≡ j mod n, as |x| divides n) and is a homomorphism since xⁱ⁺ʲ =
        xⁱxʲ.
      </p>
    ),
  },
]
