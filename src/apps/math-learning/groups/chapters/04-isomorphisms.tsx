import { Definition, Example, Proof, Remark, Section, Theorem } from '../components/Blocks'

const Body = () => (
  <>
    <p>
      U(10), the rotations of a square, and ℤ₄ are "the same group" with different names for the elements. Isomorphisms
      make that precise, and the question "are these two groups isomorphic?" drives much of the subject.
    </p>

    <Section title="4.1 Isomorphisms">
      <Definition name="isomorphism">
        <p>
          An <em>isomorphism</em> from G to H is a bijection φ: G → H with φ(ab) = φ(a)φ(b) for all a, b ∈ G. If one
          exists, G and H are <em>isomorphic</em>, written G ≅ H.
        </p>
      </Definition>
      <Example>
        <ul>
          <li>
            exp: (ℝ, +) → (ℝ⁺, ·), x ↦ eˣ, is an isomorphism: it is a bijection (its inverse is ln) and eˣ⁺ʸ = eˣeʸ.
          </li>
          <li>
            If G = ⟨a⟩ has order n, then aᵏ ↦ k mod n is an isomorphism G → ℤₙ. It is well defined and injective because aⁱ =
            aʲ exactly when i ≡ j (mod n) (§1.4). So every cyclic group of order n is ≅ ℤₙ, and every infinite cyclic group is
            ≅ ℤ.
          </li>
          <li>U(10) = ⟨3⟩ ≅ ℤ₄ by 3ᵏ ↦ k: 1 ↦ 0, 3 ↦ 1, 9 ↦ 2, 7 ↦ 3.</li>
          <li>S₃ ≅ D₃: a symmetry of a triangle is determined by how it permutes the vertices, and every permutation occurs.</li>
        </ul>
      </Example>
    </Section>

    <Section title="4.2 What isomorphisms preserve">
      <Theorem>
        <p>Let φ: G → H be an isomorphism. Then</p>
        <ol>
          <li>φ(e) = e, φ(a⁻¹) = φ(a)⁻¹, and φ(aⁿ) = φ(a)ⁿ for all n ∈ ℤ;</li>
          <li>|φ(a)| = |a| for every a;</li>
          <li>G is abelian if and only if H is, and cyclic if and only if H is;</li>
          <li>φ⁻¹: H → G is an isomorphism;</li>
          <li>for each k, G and H have the same number of elements of order k.</li>
        </ol>
      </Theorem>
      <Proof>
        <ol>
          <li>
            φ(e) = φ(ee) = φ(e)φ(e); cancel to get φ(e) = e. Then φ(a)φ(a⁻¹) = φ(aa⁻¹) = e, so φ(a⁻¹) = φ(a)⁻¹. The power rule
            follows by induction for n ≥ 0 and from the inverse rule for n &lt; 0.
          </li>
          <li>φ(a)ⁿ = e ⟺ φ(aⁿ) = φ(e) ⟺ aⁿ = e, using injectivity. So the same n work.</li>
          <li>
            If G is abelian and x = φ(a), y = φ(b) ∈ H (φ is onto), then xy = φ(ab) = φ(ba) = yx. If G = ⟨a⟩ then every
            element of H is φ(aⁿ) = φ(a)ⁿ, so H = ⟨φ(a)⟩. The converses follow from (4).
          </li>
          <li>For x, y ∈ H, φ(φ⁻¹(x)φ⁻¹(y)) = xy, so φ⁻¹(xy) = φ⁻¹(x)φ⁻¹(y).</li>
          <li>By (2), φ maps the elements of order k bijectively onto the elements of order k.</li>
        </ol>
      </Proof>
    </Section>

    <Section title="4.3 Proving two groups are not isomorphic">
      <p>
        To show G ≇ H, find a property preserved by isomorphisms that one has and the other lacks: the order, being abelian
        or cyclic, the number of elements of each order, the size of the center, the number of subgroups of each order.
      </p>
      <Example>
        <ul>
          <li>ℤ₄ ≇ U(8): ℤ₄ has an element of order 4, U(8) does not.</li>
          <li>D₄ ≇ Q₈: D₄ has five elements of order 2 and Q₈ has one.</li>
          <li>ℤ₆ ≇ S₃: one is abelian and the other is not.</li>
          <li>(ℝ*, ·) ≇ (ℝ, +): −1 has order 2, but the only element of finite order in (ℝ, +) is 0.</li>
        </ul>
      </Example>
      <Remark kind="Warning">
        <p>
          Agreeing on every invariant you check does not prove isomorphism — you must exhibit a map. ℤ₄ × ℤ₄ and ℤ₂ × Q₈
          (Chapter 6) both have one element of order 1, three of order 2, and twelve of order 4, but the first is abelian
          and the second is not.
        </p>
      </Remark>
    </Section>

    <Section title="4.4 Cayley's theorem">
      <Theorem name="Cayley">
        <p>
          Every group G is isomorphic to a group of permutations: a subgroup of the symmetric group on the set G. If |G| =
          n, G is isomorphic to a subgroup of Sₙ.
        </p>
      </Theorem>
      <Proof>
        <p>
          For g ∈ G let λ<sub>g</sub>: G → G be left multiplication, λ<sub>g</sub>(x) = gx. It is a bijection, with inverse λ<sub>g⁻¹</sub>. Moreover
          λ<sub>g</sub>(λ<sub>h</sub>(x)) = ghx = λ<sub>gh</sub>(x), so λ<sub>g</sub> ∘ λ<sub>h</sub> = λ<sub>gh</sub>. Hence {'{'}λ<sub>g</sub> : g ∈ G{'}'} is closed under composition and
          inverses — a subgroup of Sym(G) — and g ↦ λ<sub>g</sub> is a bijection onto it (it is injective since λ<sub>g</sub>(e) = g) that
          respects products.
        </p>
      </Proof>
      <Example>
        <p>
          For ℤ₃ = {'{'}0, 1, 2{'}'}: λ₀ = e, λ₁ = (0 1 2), λ₂ = (0 2 1). In general the permutation λ<sub>g</sub> is the row of g in the
          Cayley table, read as a rearrangement of the column headings.
        </p>
      </Example>
      <Remark>
        <p>
          Cayley's theorem is conceptually important but computationally wasteful: it embeds a group of order n in a group of
          order n!. Often a much smaller symmetric group suffices — D₄ sits inside S₄, not just S₈.
        </p>
      </Remark>
    </Section>

    <Section title="4.5 Automorphisms">
      <Definition name="automorphism">
        <p>
          An <em>automorphism</em> of G is an isomorphism G → G. Under composition the automorphisms form a group Aut(G).
          For g ∈ G, <em>conjugation</em> φ<sub>g</sub>(x) = gxg⁻¹ is an automorphism, called <em>inner</em>; the inner automorphisms
          form Inn(G).
        </p>
      </Definition>
      <Theorem>
        <p>
          φ<sub>g</sub> ∘ φ<sub>h</sub> = φ<sub>gh</sub>, so Inn(G) is a subgroup of Aut(G). Moreover φ<sub>g</sub> = φ<sub>h</sub> if and only if h⁻¹g ∈ Z(G); for finite G,
          |Inn(G)| = |G| / |Z(G)|.
        </p>
      </Theorem>
      <Proof>
        <p>
          φ<sub>g</sub> preserves products since gxyg⁻¹ = (gxg⁻¹)(gyg⁻¹), and a bijection with inverse φ<sub>g⁻¹</sub>. Then φ<sub>g</sub>(φ<sub>h</sub>(x)) =
          ghxh⁻¹g⁻¹ = (gh)x(gh)⁻¹. Next, φ<sub>g</sub> = φ<sub>h</sub> ⟺ gxg⁻¹ = hxh⁻¹ for all x ⟺ (h⁻¹g)x = x(h⁻¹g) for all x ⟺ h⁻¹g ∈ Z(G).
          So the g giving the same inner automorphism as h are exactly those in hZ(G) = {'{'}hz : z ∈ Z(G){'}'}, a set of
          |Z(G)| elements, and the |G| elements of G fall into |G|/|Z(G)| such sets.
        </p>
      </Proof>
      <Theorem>
        <p>Aut(ℤₙ) ≅ U(n).</p>
      </Theorem>
      <Proof>
        <p>
          An automorphism α of ℤₙ satisfies α(k) = kα(1), so it is determined by a = α(1), which must have order n, i.e. a ∈
          U(n). Conversely, for a ∈ U(n), αₐ(x) = ax preserves sums, and is a bijection because a is invertible mod n. Since
          αₐ ∘ α<sub>b</sub> = α<sub>ab</sub>, the map a ↦ αₐ is an isomorphism U(n) → Aut(ℤₙ).
        </p>
      </Proof>
      <Example>
        <p>
          Aut(ℤ₅) ≅ U(5) ≅ ℤ₄, but Aut(ℤ₈) ≅ U(8) is not cyclic. Inn(D₄) has 8/2 = 4 elements; Inn(G) is trivial exactly
          when G is abelian.
        </p>
      </Example>
    </Section>
  </>
)

export default Body
