import { Definition, Example, Proof, Remark, Section, Theorem } from '../components/Blocks'
import GroupLab from '../components/GroupLab'

const Body = () => (
  <>
    <p>
      Groups earn their keep by acting on things. Counting orbits and fixed points of an action is the single most useful
      technique in finite group theory: it proves Cauchy's theorem, that p-groups have centers, the Sylow theorems, and it
      counts necklaces.
    </p>

    <Section title="10.1 Group actions">
      <Definition name="group action">
        <p>
          An <em>action</em> of a group G on a set X is a map G × X → X, (g, x) ↦ g·x, such that e·x = x and g·(h·x) = (gh)·x
          for all g, h ∈ G and x ∈ X.
        </p>
      </Definition>
      <p>
        Equivalently, an action is a homomorphism G → Sym(X): each g acts as the permutation x ↦ g·x, whose inverse is x ↦
        g⁻¹·x. The kernel of this homomorphism is the <em>kernel of the action</em>; the action is <em>faithful</em> if the
        kernel is trivial.
      </p>
      <Example>
        <ul>
          <li>Sₙ acts on {'{'}1, …, n{'}'}; Dₙ acts on the vertices of the n-gon.</li>
          <li>G acts on itself by left multiplication, g·x = gx — faithfully. This is Cayley's theorem.</li>
          <li>G acts on itself by <em>conjugation</em>, g·x = gxg⁻¹.</li>
          <li>G acts on the left cosets of a subgroup H by g·aH = gaH.</li>
          <li>G acts on the set of its subgroups by conjugation, g·K = gKg⁻¹.</li>
          <li>The 24 rotations of a cube act on its 6 faces, 8 vertices, 12 edges, and 4 long diagonals.</li>
        </ul>
      </Example>
    </Section>

    <Section title="10.2 Orbits and stabilizers">
      <Definition name="orbit, stabilizer, fixed points">
        <p>
          The <em>orbit</em> of x ∈ X is Orb(x) = {'{'}g·x : g ∈ G{'}'}. Its <em>stabilizer</em> is Stab(x) = {'{'}g ∈ G :
          g·x = x{'}'}, a subgroup of G. For g ∈ G, its <em>fixed points</em> are Xᵍ = {'{'}x : g·x = x{'}'}. The action is{' '}
          <em>transitive</em> if there is only one orbit.
        </p>
      </Definition>
      <p>
        The orbits partition X: "y = g·x for some g" is an equivalence relation (reflexive by e, symmetric by g⁻¹, transitive
        by multiplying).
      </p>
      <Theorem name="orbit–stabilizer">
        <p>|Orb(x)| = [G : Stab(x)]. For finite G, |Orb(x)| · |Stab(x)| = |G|.</p>
      </Theorem>
      <Proof>
        <p>
          Map the left cosets of Stab(x) to Orb(x) by g Stab(x) ↦ g·x. Then g·x = h·x ⟺ (h⁻¹g)·x = x ⟺ h⁻¹g ∈ Stab(x) ⟺
          g Stab(x) = h Stab(x). Read one way this shows the map is well defined, the other way that it is injective; it is
          onto by definition of the orbit.
        </p>
      </Proof>
      <Example>
        <p>
          The rotations of a cube act transitively on the 6 faces, and the stabilizer of a face is the 4 rotations about the
          axis through its center: the rotation group has order 6 · 4 = 24. The same count with vertices (8 · 3) or edges (12 ·
          2) agrees. Similarly |Dₙ| = n · 2.
        </p>
      </Example>
    </Section>

    <Section title="10.3 The class equation">
      <p>
        For the conjugation action, the orbit of x is its <em>conjugacy class</em> cl(x) = {'{'}gxg⁻¹ : g ∈ G{'}'}, the
        stabilizer is the centralizer C(x), and the fixed points are the center. Orbit–stabilizer gives |cl(x)| = [G : C(x)],
        a divisor of |G|.
      </p>
      <Theorem name="class equation">
        <p>
          For a finite group G, |G| = |Z(G)| + Σᵢ [G : C(xᵢ)], where x₁, x₂, … are representatives of the conjugacy classes
          with more than one element.
        </p>
      </Theorem>
      <Proof>
        <p>The classes partition G; the one-element classes are exactly the elements of Z(G).</p>
      </Proof>
      <Example>
        <p>
          D₄: 8 = 1 + 1 + 2 + 2 + 2, from {'{'}e{'}'}, {'{'}r²{'}'}, {'{'}r, r³{'}'}, {'{'}s, sr²{'}'}, {'{'}sr, sr³{'}'}. S₄: 24 = 1
          + 3 + 6 + 6 + 8. The lab lists the classes of any group in its catalog.
        </p>
      </Example>
      <GroupLab initialGroup="A4" />
    </Section>

    <Section title="10.4 p-groups">
      <Theorem>
        <p>A nontrivial finite p-group has a nontrivial center.</p>
      </Theorem>
      <Proof>
        <p>
          Let |G| = pⁿ, n ≥ 1. Each [G : C(xᵢ)] in the class equation is greater than 1 and divides pⁿ, so is divisible by p.
          So is |G|. Hence p divides |Z(G)|, and since e ∈ Z(G), |Z(G)| ≥ p.
        </p>
      </Proof>
      <Theorem kind="Corollary">
        <p>Every group of order p² is abelian, so isomorphic to ℤ<sub>p²</sub> or ℤₚ × ℤₚ.</p>
      </Theorem>
      <Proof>
        <p>
          |Z(G)| is p or p². If it were p, G/Z(G) would have order p and be cyclic, so G would be abelian by the G/Z theorem —
          but then Z(G) = G. So Z(G) = G.
        </p>
      </Proof>
    </Section>

    <Section title="10.5 Cauchy's theorem">
      <Theorem name="Cauchy">
        <p>If a prime p divides |G|, then G has an element of order p.</p>
      </Theorem>
      <Proof label="Proof (McKay)">
        <p>
          Let X = {'{'}(g₁, …, gₚ) ∈ Gᵖ : g₁g₂⋯gₚ = e{'}'}. Choosing g₁, …, gₚ₋₁ freely determines gₚ, so |X| = |G|ᵖ⁻¹,
          divisible by p. The group ℤₚ acts on X by rotating tuples: if g₁⋯gₚ = e then g₂⋯gₚg₁ = g₁⁻¹(g₁⋯gₚ)g₁ = e. By
          orbit–stabilizer, orbits have size 1 or p, and the orbits of size 1 are the constant tuples (g, …, g) with gᵖ = e.
          Since |X| and the sizes of the larger orbits are multiples of p, so is the number of constant tuples. That number is
          at least 1, because of (e, …, e), so it is at least p: some g ≠ e has gᵖ = e, and then |g| = p.
        </p>
      </Proof>
    </Section>

    <Section title="10.6 Counting with Burnside's lemma">
      <Theorem name="Burnside's lemma">
        <p>
          If a finite group G acts on a finite set X, the number of orbits is (1/|G|) Σ<sub>g ∈ G</sub> |Xᵍ| — the average
          number of fixed points.
        </p>
      </Theorem>
      <Proof>
        <p>
          Count the pairs (g, x) with g·x = x in two ways: Σ<sub>g</sub> |Xᵍ| = Σ<sub>x</sub> |Stab(x)| = Σ<sub>x</sub> |G| / |Orb(x)|. Within one orbit O
          the terms |G|/|O| add up to |G|, so the total is |G| times the number of orbits.
        </p>
      </Proof>
      <Example name="necklaces">
        <p>
          Color 6 beads on a circle black or white, counting two colorings the same if one rotates to the other. Rotation by j
          places fixes 2<sup>gcd(j, 6)</sup> colorings: 64, 2, 4, 8, 4, 2 for j = 0, …, 5. The sum is 84, and 84/6 = 14
          necklaces.
        </p>
      </Example>
      <Example name="coloring a cube">
        <p>
          Color the faces of a cube with k colors, up to rotation. The identity fixes k⁶; the 6 quarter-turns about face axes
          fix k³ each; the 3 half-turns about face axes fix k⁴; the 8 turns about vertex diagonals fix k²; the 6 half-turns
          about edge axes fix k³. So there are (k⁶ + 3k⁴ + 12k³ + 8k²)/24 colorings: 10 for k = 2, 57 for k = 3.
        </p>
      </Example>
    </Section>

    <Section title="10.7 Acting on cosets">
      <Theorem>
        <p>
          Let H ≤ G with [G : H] = n. The action of G on the left cosets of H gives a homomorphism G → Sₙ whose kernel is
          contained in H.
        </p>
      </Theorem>
      <Proof>
        <p>If k is in the kernel, then k fixes every coset, in particular kH = H, so k ∈ H.</p>
      </Proof>
      <Theorem kind="Corollary">
        <p>
          If G is finite, H is a proper subgroup of index n, and |G| does not divide n!, then G has a normal subgroup K with{' '}
          {'{'}e{'}'} ≠ K ⊆ H. In particular G is not simple.
        </p>
      </Theorem>
      <Proof>
        <p>
          The kernel K is normal and lies in H, so K ≠ G. By the First Isomorphism Theorem G/K embeds in Sₙ, so |G/K| divides
          n!; since |G| does not, K ≠ {'{'}e{'}'}.
        </p>
      </Proof>
      <Theorem kind="Corollary">
        <p>If p is the smallest prime dividing |G| and [G : H] = p, then H ◁ G.</p>
      </Theorem>
      <Proof>
        <p>
          Let K be the kernel of the action on the p cosets of H. Then |G/K| divides p! and |G|. Every prime factor of |G| is
          at least p, so gcd(|G|, p!) = p, and |G/K| ∈ {'{'}1, p{'}'}. Since K ⊆ H ⊊ G, |G/K| = p = [G : H], forcing K = H.
          Kernels are normal.
        </p>
      </Proof>
      <Remark>
        <p>The case p = 2 recovers "index 2 implies normal".</p>
      </Remark>
    </Section>
  </>
)

export default Body
