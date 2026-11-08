import { Definition, Example, Proof, Remark, Section, Theorem } from '../components/Blocks'

const Body = () => (
  <>
    <p>
      Lagrange says subgroup orders divide |G|; Cauchy gives subgroups of each prime order. Sylow's theorems go much further:
      subgroups of the largest possible prime-power order always exist, they are all conjugate, and their number is tightly
      constrained. With them you can classify groups of many orders by arithmetic alone.
    </p>

    <Section title="11.1 The theorems">
      <Definition name="Sylow subgroup">
        <p>
          Let p be prime and |G| = pᵏm with p ∤ m. A <em>Sylow p-subgroup</em> of G is a subgroup of order pᵏ. Write nₚ for
          the number of Sylow p-subgroups.
        </p>
      </Definition>
      <Theorem name="Sylow I">
        <p>G has a Sylow p-subgroup.</p>
      </Theorem>
      <Theorem name="Sylow II">
        <p>
          Any two Sylow p-subgroups are conjugate, and every p-subgroup of G is contained in some Sylow p-subgroup.
        </p>
      </Theorem>
      <Theorem name="Sylow III">
        <p>nₚ ≡ 1 (mod p) and nₚ divides m.</p>
      </Theorem>
      <Theorem kind="Corollary">
        <p>A Sylow p-subgroup is normal if and only if nₚ = 1.</p>
      </Theorem>
      <Proof>
        <p>The conjugates of a Sylow p-subgroup P are all the Sylow p-subgroups (Sylow II); P is normal iff it is its only conjugate.</p>
      </Proof>
    </Section>

    <Section title="11.2 Proofs">
      <Proof label="Proof of Sylow I">
        <p>
          Strong induction on |G|; the case k = 0 is trivial. Suppose first that p divides |Z(G)|. By Cauchy's theorem for
          abelian groups (§7.3), Z(G) has an element z of order p. N = ⟨z⟩ is normal (it is central), and |G/N| = pᵏ⁻¹m. By
          induction G/N has a subgroup of order pᵏ⁻¹; by the Correspondence Theorem it is K/N for some K ≤ G, and |K| = pᵏ.
        </p>
        <p>
          Otherwise p ∤ |Z(G)|. In the class equation |G| = |Z(G)| + Σ [G : C(xᵢ)], p divides |G| but not |Z(G)|, so some
          [G : C(xᵢ)] is not divisible by p. Then |C(xᵢ)| = |G| / [G : C(xᵢ)] is divisible by pᵏ, and C(xᵢ) is a proper
          subgroup (xᵢ ∉ Z(G)). By induction C(xᵢ) has a subgroup of order pᵏ.
        </p>
      </Proof>
      <Theorem kind="Lemma">
        <p>
          Let P be a Sylow p-subgroup and Q a p-subgroup with Q ≤ N(P) = {'{'}g : gPg⁻¹ = P{'}'}. Then Q ≤ P.
        </p>
      </Theorem>
      <Proof>
        <p>
          Since Q normalizes P, PQ = QP is a subgroup, of order |P||Q| / |P ∩ Q| — a power of p. It contains P, whose order is
          the largest power of p dividing |G|, so PQ = P and Q ≤ P.
        </p>
      </Proof>
      <Proof label="Proof of Sylow II and III">
        <p>
          Let P be a Sylow p-subgroup and S = {'{'}gPg⁻¹ : g ∈ G{'}'} its set of conjugates. By orbit–stabilizer for the
          conjugation action, |S| = [G : N(P)], which divides [G : P] = m since P ≤ N(P).
        </p>
        <p>
          Let P act on S by conjugation. A conjugate P′ is fixed exactly when P ≤ N(P′), which by the lemma means P ≤ P′, i.e.
          P = P′. So P is the only fixed point, every other orbit has size a positive power of p, and |S| ≡ 1 (mod p).
        </p>
        <p>
          Now let Q be any p-subgroup and let it act on S by conjugation. The orbit sizes are powers of p and sum to |S| ≢ 0
          (mod p), so some orbit has size 1: a conjugate P′ with Q ≤ N(P′), hence Q ≤ P′. This proves the second half of
          Sylow II. If Q is itself a Sylow p-subgroup, |Q| = |P′| forces Q = P′ ∈ S: every Sylow p-subgroup is conjugate to
          P. So nₚ = |S|, which is ≡ 1 (mod p) and divides m.
        </p>
      </Proof>
    </Section>

    <Section title="11.3 Using Sylow: groups of order pq and 2p">
      <Example name="order 15">
        <p>
          n₃ divides 5 and is ≡ 1 (mod 3): n₃ = 1. n₅ divides 3 and is ≡ 1 (mod 5): n₅ = 1. So G has normal subgroups P₃,
          P₅ of orders 3 and 5, meeting trivially, with |P₃P₅| = 15. G is their internal direct product: G ≅ ℤ₃ × ℤ₅ ≅ ℤ₁₅.
        </p>
      </Example>
      <Theorem>
        <p>If |G| = pq for primes p &lt; q with p ∤ q − 1, then G is cyclic.</p>
      </Theorem>
      <Proof>
        <p>
          n<sub>q</sub> divides p and is ≡ 1 (mod q); since p &lt; q, n<sub>q</sub> = 1. n<sub>p</sub> divides q and is ≡ 1 (mod p); n<sub>p</sub> = q would need p
          | q − 1, so n<sub>p</sub> = 1. As in the example, G ≅ ℤₚ × ℤ<sub>q</sub> ≅ ℤ<sub>pq</sub>.
        </p>
      </Proof>
      <p>
        So every group of order 15, 33, 35, 51, 65, 77, 85, 91, … is cyclic. When p | q − 1 there is also a non-abelian group
        of order pq: S₃ for 6, D₅ for 10, a group of order 21 inside S₇.
      </p>
      <Theorem>
        <p>If p is an odd prime, every group of order 2p is ≅ ℤ₂ₚ or Dₚ.</p>
      </Theorem>
      <Proof>
        <p>
          n<sub>p</sub> divides 2 and is ≡ 1 (mod p), so n<sub>p</sub> = 1 and P = ⟨a⟩ ◁ G with |a| = p. By Cauchy there is b of order 2, and b ∉
          P. Normality gives bab⁻¹ = aʳ for some r, and then a = b²ab⁻² = b aʳ b⁻¹ = (aʳ)ʳ = a<sup>r²</sup>, so r² ≡ 1 (mod p),
          i.e. r ≡ ±1. G = ⟨a, b⟩ (it has more than p elements). If r = 1, a and b commute and ab has order 2p: G ≅ ℤ₂ₚ. If
          r = −1, a and b satisfy the relations of r and s in Dₚ, and G ≅ Dₚ.
        </p>
      </Proof>
    </Section>

    <Section title="11.4 Using Sylow: no simple groups of these orders">
      <Example name="order 12">
        <p>
          n₃ ∈ {'{'}1, 4{'}'}. If n₃ = 4, the four subgroups of order 3 meet pairwise trivially, giving 4 · 2 = 8 elements of
          order 3. A Sylow 2-subgroup has order 4 and contains none of them, so it consists of exactly the remaining 4
          elements: n₂ = 1. Either way some Sylow subgroup is normal. (A₄ is the case n₃ = 4, n₂ = 1.)
        </p>
      </Example>
      <p>The same element-counting handles many orders; the action on Sylow subgroups (§10.7) handles more.</p>
      <Remark>
        <p>
          The method: list the allowed nₚ for each p; assume none is 1; then either count elements of prime order until there
          are more than |G|, or let G act on the nₚ Sylow p-subgroups and use |G| ∤ nₚ!.
        </p>
      </Remark>
    </Section>

    <Section title="11.5 The groups of order at most 15">
      <p>Putting the course together, here is every group of order up to 15, up to isomorphism.</p>
      <ul>
        <li>Prime orders 2, 3, 5, 7, 11, 13: only ℤₚ (Lagrange).</li>
        <li>4: ℤ₄, ℤ₂ × ℤ₂ (§5.3). 9: ℤ₉, ℤ₃ × ℤ₃ (order p², §10.4).</li>
        <li>6: ℤ₆, S₃ ≅ D₃. 10: ℤ₁₀, D₅. 14: ℤ₁₄, D₇ (order 2p).</li>
        <li>15: ℤ₁₅ (order pq).</li>
        <li>8: the abelian ℤ₈, ℤ₄ × ℤ₂, ℤ₂ × ℤ₂ × ℤ₂ and the non-abelian D₄, Q₈.</li>
        <li>
          12: the abelian ℤ₁₂, ℤ₂ × ℤ₆ and the non-abelian A₄, D₆, and the dicyclic group Dic₃ = ⟨a, b : a⁶ = e, b² = a³,
          bab⁻¹ = a⁻¹⟩.
        </li>
      </ul>
      <p>The proofs for orders 8 and 12 are longer case analyses of the same kind; see the references on the overview page.</p>
    </Section>
  </>
)

export default Body
