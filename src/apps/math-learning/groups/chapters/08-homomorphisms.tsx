import { Definition, Example, Proof, Section, Theorem } from '../components/Blocks'

const Body = () => (
  <>
    <p>
      A homomorphism is a map that respects the operation without having to be a bijection. Its kernel measures what it
      forgets; the First Isomorphism Theorem says that what is left is exactly a quotient group.
    </p>

    <Section title="8.1 Homomorphisms and kernels">
      <Definition name="homomorphism">
        <p>
          A <em>homomorphism</em> φ: G → H is a map with φ(ab) = φ(a)φ(b) for all a, b ∈ G. Its <em>kernel</em> is ker φ ={' '}
          {'{'}g ∈ G : φ(g) = e{'}'} and its <em>image</em> is φ(G).
        </p>
      </Definition>
      <Example>
        <ul>
          <li>det: GLₙ(ℝ) → ℝ*, with kernel SLₙ(ℝ).</li>
          <li>sgn: Sₙ → {'{'}±1{'}'}, with kernel Aₙ.</li>
          <li>ℤ → ℤₙ, k ↦ k mod n, with kernel nℤ.</li>
          <li>ℝ → ℂ*, x ↦ e<sup>2πix</sup>, with kernel ℤ and image the unit circle.</li>
          <li>For an abelian group A and k ∈ ℤ, x ↦ xᵏ is a homomorphism A → A.</li>
          <li>The projection G × H → G, (g, h) ↦ g, with kernel {'{'}e{'}'} × H.</li>
          <li>For N ◁ G, the <em>natural projection</em> π: G → G/N, g ↦ gN, with kernel N.</li>
        </ul>
      </Example>
    </Section>

    <Section title="8.2 Properties">
      <Theorem>
        <p>Let φ: G → H be a homomorphism.</p>
        <ol>
          <li>φ(e) = e and φ(gⁿ) = φ(g)ⁿ for all n ∈ ℤ.</li>
          <li>If |g| is finite, |φ(g)| divides |g|.</li>
          <li>If K ≤ G then φ(K) ≤ H; if K is abelian or cyclic, so is φ(K).</li>
          <li>If L ≤ H then φ⁻¹(L) = {'{'}g : φ(g) ∈ L{'}'} ≤ G; if L ◁ H then φ⁻¹(L) ◁ G.</li>
          <li>ker φ ◁ G.</li>
          <li>φ(a) = φ(b) if and only if a ker φ = b ker φ. In particular φ is injective if and only if ker φ = {'{'}e{'}'}.</li>
        </ol>
      </Theorem>
      <Proof>
        <ol>
          <li>As for isomorphisms (§4.2); bijectivity was not used.</li>
          <li>φ(g)<sup>|g|</sup> = φ(g<sup>|g|</sup>) = φ(e) = e, so |φ(g)| divides |g| by §1.4.</li>
          <li>φ(a)φ(b)⁻¹ = φ(ab⁻¹), and φ(a)φ(b) = φ(ab) = φ(ba) = φ(b)φ(a) when ab = ba; if K = ⟨k⟩ then φ(K) = ⟨φ(k)⟩.</li>
          <li>
            If φ(a), φ(b) ∈ L then φ(ab⁻¹) = φ(a)φ(b)⁻¹ ∈ L. If L is normal and φ(x) ∈ L, then φ(gxg⁻¹) = φ(g)φ(x)φ(g)⁻¹ ∈ L.
          </li>
          <li>ker φ = φ⁻¹({'{'}e{'}'}), and {'{'}e{'}'} ◁ H.</li>
          <li>φ(a) = φ(b) ⟺ φ(a⁻¹b) = e ⟺ a⁻¹b ∈ ker φ ⟺ a ker φ = b ker φ.</li>
        </ol>
      </Proof>
      <p>
        Property 6 says the fibers of φ — the sets of elements with the same image — are exactly the cosets of the kernel.
        So φ is |ker φ|-to-one onto its image.
      </p>
    </Section>

    <Section title="8.3 The First Isomorphism Theorem">
      <Theorem name="First Isomorphism Theorem">
        <p>If φ: G → H is a homomorphism, then G/ker φ ≅ φ(G), via g ker φ ↦ φ(g).</p>
      </Theorem>
      <Proof>
        <p>
          Write K = ker φ, which is normal, and ψ(gK) = φ(g). By property 6, ψ is well defined (gK = g′K ⇒ φ(g) = φ(g′)) and
          injective (the converse). It is a homomorphism: ψ(gK · hK) = ψ(ghK) = φ(gh) = φ(g)φ(h). It is onto φ(G) by
          construction.
        </p>
      </Proof>
      <Theorem kind="Corollary">
        <p>
          |φ(G)| = [G : ker φ]. For finite G, |φ(G)| divides |G|; if H is finite too, it divides gcd(|G|, |H|).
        </p>
      </Theorem>
      <Theorem>
        <p>Every normal subgroup is a kernel: N is the kernel of the natural projection G → G/N.</p>
      </Theorem>
      <Example>
        <ul>
          <li>ℤ/nℤ ≅ ℤₙ, from k ↦ k mod n.</li>
          <li>Sₙ/Aₙ ≅ {'{'}±1{'}'} ≅ ℤ₂, from sgn (n ≥ 2).</li>
          <li>GLₙ(ℝ)/SLₙ(ℝ) ≅ ℝ*, from det.</li>
          <li>ℝ/ℤ is isomorphic to the circle group, from x ↦ e<sup>2πix</sup>.</li>
          <li>G/Z(G) ≅ Inn(G), from g ↦ φ<sub>g</sub> (a problem below).</li>
        </ul>
      </Example>
    </Section>

    <Section title="8.4 The Second and Third Isomorphism Theorems">
      <Theorem name="Second Isomorphism Theorem">
        <p>
          Let H ≤ G and N ◁ G. Then HN ≤ G, H ∩ N ◁ H, and H/(H ∩ N) ≅ HN/N.
        </p>
      </Theorem>
      <Proof>
        <p>
          HN is a subgroup (Chapter 7 problems), and N ◁ HN since N ◁ G. Define φ: H → HN/N by φ(h) = hN: a homomorphism
          (the natural projection, restricted). It is onto, because hnN = hN. Its kernel is {'{'}h ∈ H : hN = N{'}'} = H ∩ N,
          which is therefore normal in H. Apply the First Isomorphism Theorem.
        </p>
      </Proof>
      <Theorem name="Third Isomorphism Theorem">
        <p>Let N ≤ K be normal subgroups of G. Then K/N ◁ G/N and (G/N)/(K/N) ≅ G/K.</p>
      </Theorem>
      <Proof>
        <p>
          Define φ: G/N → G/K by gN ↦ gK. It is well defined because N ⊆ K: gN = g′N gives g⁻¹g′ ∈ N ⊆ K. It is a
          homomorphism and onto. Its kernel is {'{'}gN : gK = K{'}'} = {'{'}gN : g ∈ K{'}'} = K/N. Apply the First
          Isomorphism Theorem.
        </p>
      </Proof>
      <Example>
        <p>(ℤ/12ℤ)/(4ℤ/12ℤ) ≅ ℤ/4ℤ, i.e. ℤ₁₂/⟨4⟩ ≅ ℤ₄ — the "cancel the 12ℤ" rule for fractions of groups.</p>
      </Example>
    </Section>

    <Section title="8.5 The Correspondence Theorem">
      <Theorem name="Correspondence Theorem">
        <p>
          Let N ◁ G and π: G → G/N the projection. Then K ↦ K/N = π(K) is a bijection from the subgroups of G containing N
          to the subgroups of G/N, with inverse L ↦ π⁻¹(L). It preserves inclusion, index, and normality.
        </p>
      </Theorem>
      <Proof>
        <p>
          π(K) is a subgroup and π⁻¹(L) is a subgroup containing N = π⁻¹({'{'}N{'}'}) (§8.2). Since π is onto, π(π⁻¹(L)) =
          L. For K ⊇ N, π⁻¹(π(K)) = KN = K. So the two maps are inverse. Inclusions are clearly preserved. Normality is
          preserved in both directions by §8.2 (3, for π onto, and 4). For index, the cosets of K in G correspond to those
          of K/N in G/N by gK ↦ (gN)(K/N).
        </p>
      </Proof>
      <Example>
        <p>
          The subgroups of ℤₙ ≅ ℤ/nℤ correspond to the subgroups dℤ of ℤ containing nℤ, i.e. to the divisors d of n —
          recovering the fundamental theorem of cyclic groups.
        </p>
      </Example>
    </Section>

    <Section title="8.6 Homomorphisms between cyclic groups">
      <Theorem>
        <p>There are exactly gcd(m, n) homomorphisms ℤₘ → ℤₙ.</p>
      </Theorem>
      <Proof>
        <p>
          A homomorphism is determined by a = φ(1), since φ(k) = ka. The rule k ↦ ka mod n is well defined on ℤₘ exactly
          when ma ≡ 0 (mod n), and then it is a homomorphism. With d = gcd(m, n): n | ma ⟺ (n/d) | (m/d)a ⟺ (n/d) | a,
          because n/d and m/d are coprime. The multiples of n/d in ℤₙ number d.
        </p>
      </Proof>
      <Example>
        <p>
          There are gcd(12, 18) = 6 homomorphisms ℤ₁₂ → ℤ₁₈, given by φ(1) ∈ {'{'}0, 3, 6, 9, 12, 15{'}'}. None is
          injective: its image would have order 12, which does not divide 18.
        </p>
      </Example>
    </Section>
  </>
)

export default Body
