import { Definition, Example, Proof, Remark, Section, Theorem } from '../components/Blocks'
import GroupLab from '../components/GroupLab'

const Body = () => (
  <>
    <p>
      Normal subgroups let us break a group into a normal subgroup and a quotient. Simple groups are the pieces that cannot
      be broken further, and solvable groups are those built entirely from abelian pieces. This is where a first course
      ends and Galois theory begins.
    </p>

    <Section title="12.1 Simple groups">
      <Definition name="simple group">
        <p>A nontrivial group is <em>simple</em> if its only normal subgroups are {'{'}e{'}'} and itself.</p>
      </Definition>
      <Theorem>
        <p>An abelian group is simple if and only if it is cyclic of prime order.</p>
      </Theorem>
      <Proof>
        <p>
          In an abelian group every subgroup is normal, so a simple abelian group has no proper nontrivial subgroups at all,
          and is cyclic of prime order (a Chapter 2 problem). Conversely ℤₚ has no proper nontrivial subgroups, by Lagrange.
        </p>
      </Proof>
    </Section>

    <Section title="12.2 A₅ is simple">
      <Theorem>
        <p>The conjugacy classes of A₅ have sizes 1, 15, 20, 12, 12.</p>
      </Theorem>
      <Proof>
        <p>
          The even cycle types in S₅ are e, (2, 2, 1), (3, 1, 1), and (5), with 1, 15, 20, and 24 elements. In A₅ the class
          of σ has size |A₅| / |C<sub>A</sub>(σ)|, where C<sub>A</sub>(σ) = C(σ) ∩ A₅ and C(σ) is the centralizer in S₅.
        </p>
        <ul>
          <li>
            σ = (1 2)(3 4): |C(σ)| = 120/15 = 8, and C(σ) contains the odd permutation (1 2), so exactly half of it is even:
            |C<sub>A</sub>(σ)| = 4 and the A₅-class has 60/4 = 15 elements.
          </li>
          <li>σ = (1 2 3): |C(σ)| = 120/20 = 6, containing the odd (4 5), so |C<sub>A</sub>(σ)| = 3 and the class has 20 elements.</li>
          <li>
            σ = (1 2 3 4 5): |C(σ)| = 120/24 = 5, so C(σ) = ⟨σ⟩ ⊆ A₅ and the class has 60/5 = 12 elements. The 24 five-cycles
            split into two classes of 12.
          </li>
        </ul>
      </Proof>
      <Theorem>
        <p>A₅ is simple.</p>
      </Theorem>
      <Proof>
        <p>
          A normal subgroup N is a union of conjugacy classes, contains {'{'}e{'}'}, and has order dividing 60. The sums of 1
          with some of 15, 20, 12, 12 are 1, 13, 16, 21, 25, 28, 33, 36, 40, 45, 48, and 60. Of these, only 1 and 60 divide 60.
        </p>
      </Proof>
      <Theorem>
        <p>Aₙ is simple for every n ≥ 5.</p>
      </Theorem>
      <Proof label="Proof sketch">
        <p>
          Let {'{'}e{'}'} ≠ N ◁ Aₙ. One shows N contains a 3-cycle: take σ ≠ e in N moving as few points as possible. If σ
          is not a 3-cycle, a suitable 3-cycle τ gives a commutator στσ⁻¹τ⁻¹ = σ · (τσ⁻¹τ⁻¹) ∈ N that is not e but moves
          fewer points than σ — contradicting minimality. For n ≥
          5, all 3-cycles are conjugate in Aₙ (conjugate in Sₙ, then fix the parity using a transposition of two points the
          3-cycle does not move), so N contains every 3-cycle, and 3-cycles generate Aₙ (Chapter 3).
        </p>
      </Proof>
      <Remark>
        <p>
          A₄ is not simple: V = {'{'}e, (1 2)(3 4), (1 3)(2 4), (1 4)(2 3){'}'} ◁ A₄. A₅, of order 60, is the smallest
          non-abelian simple group. In the lab, A₅ has 59 subgroups but only two of them normal.
        </p>
      </Remark>
      <GroupLab initialGroup="A5" />
    </Section>

    <Section title="12.3 Composition series">
      <Definition name="composition series">
        <p>
          A <em>composition series</em> of G is a chain {'{'}e{'}'} = G₀ ◁ G₁ ◁ ⋯ ◁ Gᵣ = G (each normal in the next, though
          not necessarily in G) in which every factor Gᵢ₊₁/Gᵢ is simple. The factors are the <em>composition factors</em>.
        </p>
      </Definition>
      <p>
        Every finite group has one: take a maximal proper normal subgroup (by the Correspondence Theorem the quotient is then
        simple) and repeat inside it.
      </p>
      <Theorem name="Jordan–Hölder">
        <p>
          Any two composition series of a finite group have the same length and the same composition factors, up to order
          and isomorphism.
        </p>
      </Theorem>
      <Example>
        <p>
          ℤ₁₂ has the composition series {'{'}0{'}'} ◁ ⟨6⟩ ◁ ⟨3⟩ ◁ ℤ₁₂ with factors ℤ₂, ℤ₂, ℤ₃, and {'{'}0{'}'} ◁ ⟨4⟩ ◁ ⟨2⟩
          ◁ ℤ₁₂ with factors ℤ₃, ℤ₂, ℤ₂. The factors do not determine the group: ℤ₄ and ℤ₂ × ℤ₂ both have factors ℤ₂, ℤ₂.
        </p>
      </Example>
    </Section>

    <Section title="12.4 Solvable groups">
      <Definition name="solvable group">
        <p>
          G is <em>solvable</em> if it has a chain {'{'}e{'}'} = G₀ ◁ G₁ ◁ ⋯ ◁ Gᵣ = G with every factor Gᵢ₊₁/Gᵢ abelian. For
          finite G this says every composition factor is cyclic of prime order.
        </p>
      </Definition>
      <p>
        The <em>derived series</em> is G ⊵ G′ ⊵ G″ ⊵ ⋯, where G⁽ⁱ⁺¹⁾ = (G⁽ⁱ⁾)′ is the commutator subgroup of the previous
        term (§7.5).
      </p>
      <Theorem>
        <p>G is solvable if and only if its derived series reaches {'{'}e{'}'}.</p>
      </Theorem>
      <Proof>
        <p>
          If G⁽ⁿ⁾ = {'{'}e{'}'}, the derived series is a chain with abelian factors G⁽ⁱ⁾/G⁽ⁱ⁺¹⁾. Conversely, given a chain with
          abelian factors, Gᵢ₊₁/Gᵢ abelian means (Gᵢ₊₁)′ ≤ Gᵢ, and by induction G⁽ʲ⁾ ≤ Gᵣ₋ⱼ, so G⁽ʳ⁾ = {'{'}e{'}'}.
        </p>
      </Proof>
      <Theorem>
        <p>
          Subgroups and quotients of solvable groups are solvable. If N ◁ G and both N and G/N are solvable, so is G.
        </p>
      </Theorem>
      <Proof>
        <p>
          For H ≤ G, H⁽ⁱ⁾ ≤ G⁽ⁱ⁾. For a quotient, the commutators of G/N are the images of those of G, so (G/N)⁽ⁱ⁾ = G⁽ⁱ⁾N/N.
          And if (G/N)⁽ᵏ⁾ is trivial and N⁽ʲ⁾ = {'{'}e{'}'}, then G⁽ᵏ⁾ ≤ N, so G⁽ᵏ⁺ʲ⁾ ≤ N⁽ʲ⁾ = {'{'}e{'}'}.
        </p>
      </Proof>
      <Example>
        <ul>
          <li>Abelian groups are solvable; so is S₃ (S₃ ▷ A₃ ▷ {'{'}e{'}'}).</li>
          <li>
            S₄ is solvable: its derived series is S₄ ▷ A₄ ▷ V ▷ {'{'}e{'}'}, with factors ℤ₂, ℤ₃, and ℤ₂ × ℤ₂.
          </li>
          <li>Every finite p-group is solvable (a problem below).</li>
          <li>Sₙ for n ≥ 5 is not solvable: it contains the non-abelian simple group Aₙ.</li>
        </ul>
      </Example>
      <Remark>
        <p>
          Galois proved that a polynomial equation is solvable by radicals exactly when its Galois group is solvable — the
          origin of the name. A general quintic has Galois group S₅, which is not solvable. Two deep theorems: Burnside's
          (groups of order pᵃqᵇ are solvable) and Feit–Thompson's (groups of odd order are solvable).
        </p>
      </Remark>
    </Section>

    <Section title="12.5 The classification of finite simple groups">
      <p>
        Every finite simple group is one of: a cyclic group of prime order; an alternating group Aₙ with n ≥ 5; a group of Lie
        type (16 infinite families of matrix groups over finite fields, such as PSL₂(𝔽<sub>q</sub>)); or one of 26 sporadic groups, the
        largest of which, the Monster, has about 8 × 10⁵³ elements. The proof, completed in the early 2000s, runs to
        thousands of pages across hundreds of papers.
      </p>
    </Section>
  </>
)

export default Body
