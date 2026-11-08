import { int, set, yesNo } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'lg-index-s4',
    kind: 'answer',
    prompt: <p>What is the index of ⟨(1 2 3 4)⟩ in S₄?</p>,
    answer: int(6),
    solution: <p>The subgroup has order 4, so the index is 24 / 4 = 6.</p>,
  },
  {
    id: 'lg-orders-20',
    kind: 'answer',
    prompt: <p>List every order that Lagrange's theorem allows for a subgroup of a group of order 20.</p>,
    answer: set(1, 2, 4, 5, 10, 20),
    solution: <p>The divisors of 20.</p>,
  },
  {
    id: 'lg-orders-35',
    kind: 'answer',
    prompt: <p>Let |G| = 35. List every possible order of an element of G.</p>,
    answer: set(1, 5, 7, 35),
    solution: <p>Element orders divide |G| = 35. (In fact every group of order 35 is cyclic — Chapter 11 — so all four occur.)</p>,
  },
  {
    id: 'lg-fermat',
    kind: 'answer',
    prompt: <p>Compute 5¹⁰⁰ mod 13.</p>,
    answer: int(1),
    solution: <p>By Fermat, 5¹² ≡ 1. 100 = 8 · 12 + 4, and 5² = 25 ≡ −1, so 5¹⁰⁰ ≡ 5⁴ ≡ (−1)² = 1.</p>,
  },
  {
    id: 'lg-euler',
    kind: 'answer',
    prompt: <p>What is the last digit of 7²²²?</p>,
    answer: int(9),
    solution: <p>Work mod 10. φ(10) = 4 and 222 = 55 · 4 + 2, so 7²²² ≡ 7² = 49 ≡ 9.</p>,
  },
  {
    id: 'lg-d6',
    kind: 'answer',
    prompt: <p>How many left cosets does ⟨r⟩ have in D₆?</p>,
    answer: int(2),
    solution: <p>|⟨r⟩| = 6 and |D₆| = 12, so 2: the rotations and the reflections.</p>,
  },
  {
    id: 'lg-coset',
    kind: 'answer',
    prompt: <p>List the elements of the coset 5 + ⟨4⟩ in ℤ₁₂.</p>,
    answer: set(1, 5, 9),
    solution: <p>⟨4⟩ = {'{'}0, 4, 8{'}'}, so 5 + ⟨4⟩ = {'{'}5, 9, 1{'}'}.</p>,
  },
  {
    id: 'lg-s3-cosets',
    kind: 'answer',
    prompt: <p>In S₃ with H = ⟨(1 2)⟩, is (1 3)H = H(1 3)?</p>,
    answer: yesNo(false),
    solution: <p>(1 3)H = {'{'}(1 3), (1 3)(1 2){'}'} = {'{'}(1 3), (1 2 3){'}'}, while H(1 3) = {'{'}(1 3), (1 3 2){'}'}.</p>,
  },
  {
    id: 'lg-hk',
    kind: 'answer',
    prompt: <p>In S₃ let H = ⟨(1 2)⟩ and K = ⟨(1 3)⟩. How many elements does HK have?</p>,
    answer: int(4),
    solution: <p>|H||K| / |H ∩ K| = 2 · 2 / 1 = 4: e, (1 2), (1 3), and (1 2)(1 3) = (1 3 2).</p>,
  },
  {
    id: 'lg-pq',
    kind: 'proof',
    prompt: <p>Let |G| = pq for primes p and q. Prove that every proper subgroup of G is cyclic.</p>,
    solution: <p>A proper subgroup has order 1, p, or q by Lagrange. A group of order 1 or of prime order is cyclic.</p>,
  },
  {
    id: 'lg-intersection',
    kind: 'proof',
    prompt: <p>Let H, K ≤ G with |H| = 12 and |K| = 35. Prove that H ∩ K = {'{'}e{'}'}.</p>,
    solution: <p>H ∩ K is a subgroup of both, so its order divides gcd(12, 35) = 1.</p>,
  },
  {
    id: 'lg-index-two',
    kind: 'proof',
    prompt: <p>Prove that if [G : H] = 2, then aH = Ha for every a ∈ G.</p>,
    solution: (
      <p>
        If a ∈ H, both cosets are H. If a ∉ H, the two left cosets are H and aH, so aH = G ∖ H. The right coset Ha is
        disjoint from H (if ha ∈ H then a ∈ H), so Ha ⊆ G ∖ H = aH. The same applied to a⁻¹ ∉ H gives Ha⁻¹ ⊆ a⁻¹H, and
        taking inverses of every element, aH ⊆ Ha. So aH = Ha.
      </p>
    ),
  },
  {
    id: 'lg-tower',
    kind: 'proof',
    prompt: <p>Let G be finite and H ≤ K ≤ G. Prove that [G : H] = [G : K][K : H].</p>,
    solution: <p>[G : K][K : H] = (|G|/|K|)(|K|/|H|) = |G|/|H| = [G : H], by Lagrange three times.</p>,
  },
  {
    id: 'lg-prime-power',
    kind: 'proof',
    prompt: <p>Let |G| = pⁿ with p prime and n ≥ 1. Prove that G has an element of order p.</p>,
    solution: (
      <p>
        Take a ≠ e. Its order divides pⁿ and is not 1, so |a| = pᵏ with k ≥ 1. Then a<sup>pᵏ⁻¹</sup> has order pᵏ /
        gcd(pᵏ, pᵏ⁻¹) = p.
      </p>
    ),
  },
  {
    id: 'lg-2p',
    kind: 'proof',
    prompt: <p>Let |G| = 2p with p an odd prime. Prove that G has an element of order p.</p>,
    hint: (
      <p>
        Element orders lie in {'{'}1, 2, p, 2p{'}'}. What if every non-identity element had order 2? A Chapter 1 problem
        helps.
      </p>
    ),
    solution: (
      <p>
        If some a has order 2p, then a² has order p. If some element has order p, we are done. Otherwise every non-identity
        element has order 2. Then G is abelian (x² = e for all x), and for distinct a, b of order 2, {'{'}e, a, b, ab{'}'} is
        closed — a subgroup of order 4. But 4 ∤ 2p, contradicting Lagrange.
      </p>
    ),
  },
  {
    id: 'lg-left-right',
    kind: 'proof',
    prompt: (
      <p>
        Prove that aH ↦ Ha⁻¹ is a well-defined bijection from the left cosets of H to the right cosets. (So "index" does not
        depend on which side you use, even for infinite groups.)
      </p>
    ),
    solution: (
      <p>
        For right cosets, Hx = Hy ⟺ xy⁻¹ ∈ H (the mirror image of the coset lemma). With x = a⁻¹ and y = b⁻¹ this reads
        Ha⁻¹ = Hb⁻¹ ⟺ a⁻¹b ∈ H ⟺ aH = bH. Read left to right, that says the map is injective; right to left, that it is
        well defined. It is onto because Hb is the image of b⁻¹H.
      </p>
    ),
  },
]
