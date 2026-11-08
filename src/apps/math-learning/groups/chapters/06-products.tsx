import { Definition, Example, Proof, Section, Theorem } from '../components/Blocks'
import GroupLab from '../components/GroupLab'

const Body = () => (
  <>
    <p>
      The direct product glues groups together side by side. It builds new groups from old, and — run backwards — it is how
      we will take finite abelian groups apart in Chapter 9.
    </p>

    <Section title="6.1 External direct products">
      <Definition name="direct product">
        <p>
          For groups G₁, …, Gₙ, the <em>(external) direct product</em> G₁ × ⋯ × Gₙ is the set of n-tuples (g₁, …, gₙ) with
          gᵢ ∈ Gᵢ, multiplied componentwise: (g₁, …, gₙ)(h₁, …, hₙ) = (g₁h₁, …, gₙhₙ). The identity is (e, …, e), the inverse
          of (g₁, …, gₙ) is (g₁⁻¹, …, gₙ⁻¹), and the order is |G₁| ⋯ |Gₙ|.
        </p>
      </Definition>
      <Example>
        <p>
          ℤ₂ × ℤ₂ = {'{'}(0, 0), (1, 0), (0, 1), (1, 1){'}'} is the Klein four-group. ℝ × ℝ under + is the plane with vector
          addition. In ℤ₂ × ℤ₃, (1, 1) has order 6, so ℤ₂ × ℤ₃ is cyclic.
        </p>
      </Example>
    </Section>

    <Section title="6.2 Orders in a direct product">
      <Theorem>
        <p>The order of (g₁, …, gₙ) in G₁ × ⋯ × Gₙ is lcm(|g₁|, …, |gₙ|).</p>
      </Theorem>
      <Proof>
        <p>
          (g₁, …, gₙ)ᵏ = (g₁ᵏ, …, gₙᵏ) is the identity exactly when every gᵢᵏ = e, i.e. when every |gᵢ| divides k. The least
          such k is the lcm.
        </p>
      </Proof>
      <Example name="counting elements of order 5 in ℤ₂₅ × ℤ₅">
        <p>
          (a, b) has order 5 when lcm(|a|, |b|) = 5, i.e. |a|, |b| ∈ {'{'}1, 5{'}'} and not both 1. ℤ₂₅ has 5 elements of
          order dividing 5 and ℤ₅ has 5, so there are 5 · 5 − 1 = 24 elements of order 5. Each cyclic subgroup of order 5
          contains φ(5) = 4 of them, so there are 24/4 = 6 such subgroups.
        </p>
      </Example>
    </Section>

    <Section title="6.3 When is a product cyclic?">
      <Theorem>
        <p>ℤₘ × ℤₙ is cyclic — and then ≅ ℤₘₙ — if and only if gcd(m, n) = 1.</p>
      </Theorem>
      <Proof>
        <p>
          If gcd(m, n) = 1, then |(1, 1)| = lcm(m, n) = mn, so (1, 1) generates. If d = gcd(m, n) &gt; 1, then for every (a,
          b), (mn/d)·(a, b) = ((n/d)·ma, (m/d)·nb) = (0, 0). So every element has order at most mn/d &lt; mn, and nothing
          generates.
        </p>
      </Proof>
      <Theorem kind="Corollary">
        <p>
          ℤ<sub>n₁</sub> × ⋯ × ℤ<sub>nₖ</sub> ≅ ℤ<sub>n₁⋯nₖ</sub> if and only if the nᵢ are pairwise coprime. In particular, if n = p₁<sup>a₁</sup> ⋯
          pₖ<sup>aₖ</sup> with distinct primes pᵢ, then ℤₙ ≅ ℤ<sub>p₁<sup>a₁</sup></sub> × ⋯ × ℤ<sub>pₖ<sup>aₖ</sup></sub>.
        </p>
      </Theorem>
      <Proof>
        <p>
          Induct on k using the theorem, noting that n₁⋯nₖ₋₁ is coprime to nₖ when the nᵢ are pairwise coprime. Conversely
          if two of them share a factor d &gt; 1, the lcm of all of them is less than their product, which bounds every
          element order.
        </p>
      </Proof>
      <Example>
        <p>
          ℤ₂ × ℤ₃ × ℤ₅ ≅ ℤ₃₀. But ℤ₂ × ℤ₂ × ℤ₃ ≇ ℤ₁₂: it is ≅ ℤ₂ × ℤ₆, with three elements of order 2. Compare ℤ₂ × ℤ₄ and
          ℤ₈ in the lab.
        </p>
      </Example>
      <GroupLab initialGroup="Z2xZ4" />
    </Section>

    <Section title="6.4 U(n) as a direct product">
      <Theorem>
        <p>If gcd(s, t) = 1 then U(st) ≅ U(s) × U(t), by x ↦ (x mod s, x mod t).</p>
      </Theorem>
      <Proof>
        <p>
          By the Chinese remainder theorem, x ↦ (x mod s, x mod t) is a bijection ℤₛₜ → ℤₛ × ℤₜ, and it respects
          multiplication. x is coprime to st exactly when it is coprime to both s and t, so the bijection restricts to U(st)
          → U(s) × U(t).
        </p>
      </Proof>
      <Theorem name="Gauss">
        <p>
          U(2) is trivial and U(4) ≅ ℤ₂. For k ≥ 3, U(2ᵏ) ≅ ℤ₂ × ℤ<sub>2ᵏ⁻²</sub>. For an odd prime p, U(pᵏ) is cyclic of
          order pᵏ − pᵏ⁻¹.
        </p>
      </Theorem>
      <p>
        We omit the proof (it is number theory: the existence of primitive roots mod pᵏ). Combined with the previous theorem
        it computes every U(n).
      </p>
      <Example>
        <p>
          U(105) ≅ U(3) × U(5) × U(7) ≅ ℤ₂ × ℤ₄ × ℤ₆. U(720) ≅ U(16) × U(9) × U(5) ≅ ℤ₂ × ℤ₄ × ℤ₆ × ℤ₄. And U(n) is cyclic
          exactly when n is 1, 2, 4, pᵏ, or 2pᵏ for an odd prime p.
        </p>
      </Example>
    </Section>
  </>
)

export default Body
