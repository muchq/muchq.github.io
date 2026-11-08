import { choice, int, set, yesNo } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'sg-z12-generators',
    kind: 'answer',
    prompt: <p>List the generators of ℤ₁₂.</p>,
    answer: set(1, 5, 7, 11),
    solution: <p>k generates ℤ₁₂ exactly when gcd(k, 12) = 1: k = 1, 5, 7, 11.</p>,
  },
  {
    id: 'sg-z36-count',
    kind: 'answer',
    prompt: <p>How many subgroups does ℤ₃₆ have?</p>,
    answer: int(9),
    solution: <p>One for each divisor of 36: 1, 2, 3, 4, 6, 9, 12, 18, 36.</p>,
  },
  {
    id: 'sg-z30-order',
    kind: 'answer',
    prompt: <p>What is the order of 18 in ℤ₃₀?</p>,
    answer: int(5),
    solution: <p>30 / gcd(30, 18) = 30 / 6 = 5.</p>,
  },
  {
    id: 'sg-z24-order8',
    kind: 'answer',
    prompt: <p>How many elements of order 8 does ℤ₂₄ have?</p>,
    answer: int(4),
    solution: (
      <p>
        φ(8) = 4. Concretely: the subgroup of order 8 is ⟨3⟩, and its generators are 3, 9, 15, 21.
      </p>
    ),
  },
  {
    id: 'sg-z30-subgroup',
    kind: 'answer',
    prompt: <p>List the elements of the subgroup ⟨21⟩ of ℤ₃₀.</p>,
    answer: set(0, 3, 6, 9, 12, 15, 18, 21, 24, 27),
    hint: <p>⟨21⟩ = ⟨gcd(30, 21)⟩.</p>,
    solution: <p>gcd(30, 21) = 3, so ⟨21⟩ = ⟨3⟩ = {'{'}0, 3, 6, …, 27{'}'}, ten elements.</p>,
  },
  {
    id: 'sg-z20-same',
    kind: 'answer',
    prompt: <p>Find every k ∈ ℤ₂₀ with ⟨k⟩ = ⟨4⟩.</p>,
    answer: set(4, 8, 12, 16),
    solution: (
      <p>
        ⟨k⟩ = ⟨4⟩ exactly when gcd(20, k) = gcd(20, 4) = 4. The k in 0, …, 19 with gcd(20, k) = 4 are 4, 8, 12, 16 — the
        φ(5) = 4 generators of the subgroup of order 5.
      </p>
    ),
  },
  {
    id: 'sg-u20',
    kind: 'answer',
    prompt: <p>Is U(20) cyclic?</p>,
    answer: yesNo(false),
    solution: (
      <p>
        U(20) = {'{'}1, 3, 7, 9, 11, 13, 17, 19{'}'} has order 8. But 3 has order 4 (3, 9, 7, 1), as do 7, 13, 17; and
        9, 11, 19 have order 2. No element has order 8.
      </p>
    ),
  },
  {
    id: 'sg-d6-center',
    kind: 'answer',
    prompt: <p>How many elements are in the center of D₆?</p>,
    answer: int(2),
    solution: <p>By §2.2, for even n, Z(Dₙ) = {'{'}e, r<sup>n/2</sup>{'}'}. Here Z(D₆) = {'{'}e, r³{'}'}.</p>,
  },
  {
    id: 'sg-d4-centralizer',
    kind: 'answer',
    prompt: <p>How many elements are in the centralizer C(s) of the reflection s in D₄?</p>,
    answer: int(4),
    solution: (
      <p>
        C(s) = {'{'}e, r², s, sr²{'}'}. Check r²s = sr⁻² = sr², and s · sr² = r² = sr² · s. But r · s = sr³ ≠ sr = s · r, and
        likewise sr and sr³ fail.
      </p>
    ),
  },
  {
    id: 'sg-which-subgroup',
    kind: 'answer',
    prompt: <p>Which of these subsets of ℤ₁₂ is a subgroup?</p>,
    answer: choice(['{0, 3, 6}', '{0, 4, 8}', '{0, 1, 11}', '{0, 5, 7}'], '{0, 4, 8}'),
    solution: (
      <p>
        {'{'}0, 4, 8{'}'} = ⟨4⟩. The others are not closed: 3 + 6 = 9, 1 + 1 = 2, and 5 + 5 = 10.
      </p>
    ),
  },
  {
    id: 'sg-unique-involution',
    kind: 'proof',
    prompt: <p>Suppose G has exactly one element a of order 2. Prove that a ∈ Z(G).</p>,
    hint: <p>What is the order of gag⁻¹?</p>,
    solution: (
      <p>
        For any g ∈ G, gag⁻¹ has the same order as a (a Chapter 1 problem), namely 2. Since a is the only element of order 2,
        gag⁻¹ = a, i.e. ga = ag.
      </p>
    ),
  },
  {
    id: 'sg-no-subgroups',
    kind: 'proof',
    prompt: <p>Prove that a nontrivial group with no subgroups other than {'{'}e{'}'} and itself is cyclic of prime order.</p>,
    solution: (
      <p>
        Pick a ≠ e. Then ⟨a⟩ ≠ {'{'}e{'}'}, so ⟨a⟩ = G and G is cyclic. If G were infinite, ⟨a²⟩ would be a proper nontrivial
        subgroup (it does not contain a). So |G| = n is finite. If n = dm with 1 &lt; d &lt; n, then ⟨aᵈ⟩ has order n/d = m,
        strictly between 1 and n — again impossible. So n is prime.
      </p>
    ),
  },
  {
    id: 'sg-union',
    kind: 'proof',
    prompt: <p>Let H, K ≤ G. Prove that H ∪ K is a subgroup if and only if H ⊆ K or K ⊆ H.</p>,
    hint: <p>Suppose neither containment holds and pick h ∈ H ∖ K and k ∈ K ∖ H. Where is hk?</p>,
    solution: (
      <p>
        If one contains the other, H ∪ K is the larger one. Otherwise pick h ∈ H ∖ K and k ∈ K ∖ H. If H ∪ K were a
        subgroup, hk ∈ H ∪ K. If hk ∈ H then k = h⁻¹(hk) ∈ H, a contradiction; if hk ∈ K then h = (hk)k⁻¹ ∈ K, also a
        contradiction.
      </p>
    ),
  },
  {
    id: 'sg-center',
    kind: 'proof',
    prompt: <p>Prove that Z(G) is a subgroup of G.</p>,
    solution: (
      <p>
        e ∈ Z(G). Let a, b ∈ Z(G) and g ∈ G. From bg = gb, multiplying by b⁻¹ on both sides gives gb⁻¹ = b⁻¹g, so b⁻¹ ∈ Z(G).
        Then (ab⁻¹)g = a(b⁻¹g) = a(gb⁻¹) = (ag)b⁻¹ = (ga)b⁻¹ = g(ab⁻¹). By the one-step test, Z(G) ≤ G.
      </p>
    ),
  },
  {
    id: 'sg-involutions',
    kind: 'proof',
    prompt: (
      <p>
        Prove that if G is abelian, then {'{'}g ∈ G : g² = e{'}'} is a subgroup. Show by example that this can fail for
        non-abelian G.
      </p>
    ),
    solution: (
      <p>
        e² = e. If a² = b² = e then (ab⁻¹)² = a²(b⁻¹)² = e · (b²)⁻¹ = e, using commutativity to regroup. In D₃, s and sr
        both square to e, but s · sr = r has order 3.
      </p>
    ),
  },
  {
    id: 'sg-finitely-many',
    kind: 'proof',
    prompt: <p>Prove that a group with only finitely many subgroups is finite.</p>,
    hint: <p>Every element lies in a cyclic subgroup. What if one of them is infinite?</p>,
    solution: (
      <p>
        If some a has infinite order, ⟨a⟩ ≅ ℤ has the infinitely many distinct subgroups ⟨aⁿ⟩, n ≥ 1 — and these are
        subgroups of G. So every element has finite order, and each ⟨a⟩ is finite. G is the union of its cyclic subgroups
        ⟨a⟩, of which there are finitely many, each finite. So G is finite.
      </p>
    ),
  },
]
