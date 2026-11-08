import PermutationVisualizer from '../../components/PermutationVisualizer'
import { Definition, Example, Proof, Remark, Section, Theorem } from '../components/Blocks'
import PermutationCalculator from '../components/PermutationCalculator'

const Body = () => (
  <>
    <p>
      Permutation groups are where group theory started — Lagrange, Ruffini, and Galois studied permutations of the roots
      of polynomials — and Cayley's theorem (Chapter 4) says they are, in a precise sense, all the groups there are.
    </p>

    <Section title="3.1 The symmetric group">
      <Definition name="symmetric group">
        <p>
          A <em>permutation</em> of a set X is a bijection X → X. The permutations of {'{'}1, …, n{'}'} form the{' '}
          <em>symmetric group</em> Sₙ under composition. It has n! elements.
        </p>
      </Definition>
      <p>
        One way to write σ ∈ Sₙ is <em>two-line notation</em>: the top row lists 1, …, n and the bottom row lists σ(1), …,
        σ(n). The product στ means σ ∘ τ: <strong>apply τ first, then σ</strong>.
      </p>
      <Remark kind="Warning">
        <p>
          Some books and software (GAP, for one) compose left to right instead. With the convention here, (1 2)(2 3) =
          (1 2 3); left to right it would be (1 3 2).
        </p>
      </Remark>
      <p>
        Sₙ is non-abelian for n ≥ 3: (1 2)(2 3) = (1 2 3) but (2 3)(1 2) = (1 3 2). Drag the elements below to build a
        permutation and watch its notation change.
      </p>
      <PermutationVisualizer />
    </Section>

    <Section title="3.2 Cycles">
      <Definition name="cycle">
        <p>
          For distinct a₁, …, aₖ, the <em>k-cycle</em> (a₁ a₂ … aₖ) sends a₁ → a₂ → ⋯ → aₖ → a₁ and fixes every other
          point. A 2-cycle is a <em>transposition</em>. Cycles are <em>disjoint</em> if no point is moved by both.
        </p>
      </Definition>
      <Theorem name="disjoint cycle decomposition">
        <p>
          Every permutation is a product of disjoint cycles. The decomposition is unique up to the order of the factors
          (and the omission of 1-cycles).
        </p>
      </Theorem>
      <Proof>
        <p>
          Start at a point i and follow i, σ(i), σ²(i), …. Since the set is finite some point repeats, and the first repeat
          is i itself: if σʲ(i) = σᵏ(i) with 0 &lt; j &lt; k, injectivity gives σʲ⁻¹(i) = σᵏ⁻¹(i), an earlier repeat. So the
          orbit of i is a cycle (i σ(i) … σᵐ⁻¹(i)). Orbits of different points are disjoint or equal, so they partition{' '}
          {'{'}1, …, n{'}'}, and σ is the product of these cycles. Uniqueness: the cycle containing i in any such
          decomposition must be (i σ(i) σ²(i) …).
        </p>
      </Proof>
      <Theorem>
        <p>Disjoint cycles commute. The order of a permutation is the least common multiple of its cycle lengths.</p>
      </Theorem>
      <Proof>
        <p>
          Disjoint cycles α, β move disjoint sets of points, so αβ and βα agree on each point: on points moved by α both
          act as α, on points moved by β both act as β, and elsewhere both are the identity. Now write σ = c₁c₂⋯cₘ as a
          product of disjoint cycles. They commute, so σᵏ = c₁ᵏ⋯cₘᵏ. These powers again move disjoint sets, so σᵏ = e if and
          only if every cᵢᵏ = e, i.e. each length |cᵢ| divides k. The least such k is the lcm.
        </p>
      </Proof>
      <Example>
        <p>(1 2 3)(4 5) has order lcm(3, 2) = 6. (1 2)(3 4) has order 2, not 4.</p>
      </Example>
      <p>Try the calculator: it decomposes, inverts, and multiplies permutations, and shows order, cycle type, and sign.</p>
      <PermutationCalculator />
    </Section>

    <Section title="3.3 Transpositions and the sign">
      <p>
        Every cycle is a product of transpositions: (a₁ a₂ … aₖ) = (a₁ aₖ)(a₁ aₖ₋₁)⋯(a₁ a₂). So every permutation is a
        product of transpositions — in many ways. What does not vary is the parity of the number used.
      </p>
      <Theorem kind="Lemma">
        <p>
          Let c(σ) be the number of cycles of σ, counting fixed points as 1-cycles. For a transposition τ, c(τσ) = c(σ) ±
          1.
        </p>
      </Theorem>
      <Proof>
        <p>
          Let τ = (a b). If a and b lie in the same cycle of σ, write it as (a x₁ … xᵣ b y₁ … yₛ). Then τσ sends xᵣ to τ(b)
          = a and yₛ to τ(a) = b, and agrees with σ elsewhere: the cycle splits into (a x₁ … xᵣ)(b y₁ … yₛ), so c goes up by
          one. If instead σ has the two cycles (a x₁ … xᵣ) and (b y₁ … yₛ), then τσ sends xᵣ to τ(a) = b and yₛ to τ(b)
          = a: they merge into (a x₁ … xᵣ b y₁ … yₛ), and c goes down by one.
        </p>
      </Proof>
      <Theorem name="parity is well defined">
        <p>
          If σ ∈ Sₙ is a product of m transpositions, then m ≡ n − c(σ) (mod 2). In particular σ cannot be written both as a
          product of an even number and of an odd number of transpositions.
        </p>
      </Theorem>
      <Proof>
        <p>
          Build σ = τ₁(τ₂(⋯(τₘe))) one transposition at a time, starting from e, which has c(e) = n. Each step changes c by
          ±1, so c(σ) ≡ n + m (mod 2), i.e. m ≡ n − c(σ).
        </p>
      </Proof>
      <Definition name="sign; alternating group">
        <p>
          σ is <em>even</em> or <em>odd</em> according to the parity of any expression as a product of transpositions, and
          sgn(σ) = ±1 accordingly; equivalently sgn(σ) = (−1)<sup>n − c(σ)</sup>. A k-cycle has sign (−1)<sup>k−1</sup>, so
          it is even exactly when k is odd. Concatenating expressions shows sgn(στ) = sgn(σ)sgn(τ). The even permutations
          form the <em>alternating group</em> Aₙ ≤ Sₙ.
        </p>
      </Definition>
      <Theorem>
        <p>For n ≥ 2, |Aₙ| = n!/2.</p>
      </Theorem>
      <Proof>
        <p>
          σ ↦ (1 2)σ maps even permutations to odd ones and odd to even, and it is its own inverse. So it is a bijection
          between the two sets, which therefore have n!/2 elements each.
        </p>
      </Proof>
      <Example>
        <p>
          A₄ consists of e, the eight 3-cycles, and the three double transpositions (1 2)(3 4), (1 3)(2 4), (1 4)(2 3): 1 + 8
          + 3 = 12.
        </p>
      </Example>
    </Section>

    <Section title="3.4 Conjugation and cycle type">
      <Theorem>
        <p>
          For σ, τ ∈ Sₙ, τ(a₁ a₂ … aₖ)τ⁻¹ = (τ(a₁) τ(a₂) … τ(aₖ)). So τστ⁻¹ is obtained by applying τ to every entry in the
          cycle notation of σ.
        </p>
      </Theorem>
      <Proof>
        <p>
          τστ⁻¹ sends τ(aᵢ) to τ(σ(aᵢ)) = τ(aᵢ₊₁) (indices mod k). A point x not of the form τ(aᵢ) has τ⁻¹(x) fixed by the
          cycle, so x is fixed. For a product of cycles, use τ(αβ)τ⁻¹ = (τατ⁻¹)(τβτ⁻¹).
        </p>
      </Proof>
      <Definition name="cycle type">
        <p>
          The <em>cycle type</em> of σ is the list of its cycle lengths, fixed points included: a partition of n. For
          instance (1 2)(3 4 5) ∈ S₇ has cycle type (3, 2, 1, 1).
        </p>
      </Definition>
      <Theorem>
        <p>Two permutations in Sₙ are conjugate if and only if they have the same cycle type.</p>
      </Theorem>
      <Proof>
        <p>
          Conjugation preserves cycle type by the previous theorem. Conversely, if σ and σ′ have the same cycle type, write
          them one above the other with cycles of equal length aligned (fixed points included), and let τ send each entry
          of σ to the entry of σ′ below it. Then τστ⁻¹ = σ′.
        </p>
      </Proof>
      <Theorem kind="Proposition">
        <p>
          If a cycle type has mₖ cycles of length k, the number of permutations of that type is n! / ∏ₖ (k<sup>mₖ</sup> ·
          mₖ!).
        </p>
      </Theorem>
      <Proof>
        <p>
          Write the n points in a row (n! ways) and bracket them into cycles of the required lengths in a fixed pattern.
          Each permutation arises k ways per k-cycle (choice of starting point) and mₖ! ways from reordering the k-cycles
          among themselves.
        </p>
      </Proof>
      <Example name="the classes of S₄">
        <p>
          e (1), transpositions (6), double transpositions (3), 3-cycles (8), 4-cycles (6): 1 + 6 + 3 + 8 + 6 = 24.
        </p>
      </Example>
    </Section>

    <Section title="3.5 Symmetries as permutations">
      <p>
        Number the vertices of a regular n-gon 1, …, n around the boundary. Each symmetry permutes the vertices and is
        determined by that permutation, so Dₙ is a subgroup of Sₙ: r = (1 2 … n) and the reflection through vertex 1 is s
        = (2 n)(3 n−1)⋯. For a square, D₄ = ⟨(1 2 3 4), (2 4)⟩ ≤ S₄, a subgroup of order 8.
      </p>
    </Section>
  </>
)

export default Body
