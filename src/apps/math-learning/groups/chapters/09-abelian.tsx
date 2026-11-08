import { Definition, Example, Proof, Remark, Section, Theorem } from '../components/Blocks'

const Body = () => (
  <>
    <p>
      Finite abelian groups are completely classified: each is a direct product of cyclic groups in an essentially unique
      way. This chapter is about using that theorem — listing all abelian groups of a given order, and recognizing which
      one you are holding.
    </p>

    <Section title="9.1 The fundamental theorem">
      <Theorem name="fundamental theorem of finite abelian groups">
        <p>
          Every finite abelian group is isomorphic to a direct product of cyclic groups of prime-power order,
        </p>
        <p>
          ℤ<sub>p₁<sup>a₁</sup></sub> × ℤ<sub>p₂<sup>a₂</sup></sub> × ⋯ × ℤ<sub>pₖ<sup>aₖ</sup></sub>,
        </p>
        <p>
          where the primes pᵢ need not be distinct. The prime powers pᵢ<sup>aᵢ</sup> — the <em>elementary divisors</em> — are
          uniquely determined by the group, up to order.
        </p>
      </Theorem>
      <p>
        Grouping factors by prime: for each prime p dividing |G|, with p<sup>e</sup> the largest power of p dividing |G|, the factors for p have orders p
        <sup>λ₁</sup>, p<sup>λ₂</sup>, … with λ₁ ≥ λ₂ ≥ ⋯ and λ₁ + λ₂ + ⋯ = e — a partition of e. Every partition occurs,
        and different partitions give non-isomorphic groups.
      </p>
      <Theorem kind="Corollary">
        <p>
          If n = p₁<sup>e₁</sup> ⋯ pₖ<sup>eₖ</sup>, the number of abelian groups of order n, up to isomorphism, is p(e₁) ⋯
          p(eₖ), where p(e) is the number of partitions of e.
        </p>
      </Theorem>
      <Example name="the abelian groups of order 72 = 2³ · 3²">
        <p>
          p(3) · p(2) = 3 · 2 = 6. The partitions 3, 2 + 1, 1 + 1 + 1 of 3 and 2, 1 + 1 of 2 give
        </p>
        <ul>
          <li>ℤ₈ × ℤ₉, ℤ₄ × ℤ₂ × ℤ₉, ℤ₂ × ℤ₂ × ℤ₂ × ℤ₉,</li>
          <li>ℤ₈ × ℤ₃ × ℤ₃, ℤ₄ × ℤ₂ × ℤ₃ × ℤ₃, ℤ₂ × ℤ₂ × ℤ₂ × ℤ₃ × ℤ₃.</li>
        </ul>
      </Example>
    </Section>

    <Section title="9.2 Invariant factors">
      <Theorem>
        <p>
          Every finite abelian group is isomorphic to exactly one group ℤ<sub>n₁</sub> × ℤ<sub>n₂</sub> × ⋯ × ℤ<sub>nₜ</sub>{' '}
          with 1 &lt; n₁ and n₁ | n₂ | ⋯ | nₜ. The nᵢ are the <em>invariant factors</em>.
        </p>
      </Theorem>
      <p>
        To convert from elementary divisors: let nₜ be the product of the largest power of each prime, nₜ₋₁ the product of
        the next largest of each, and so on; combine each group of coprime factors using ℤ<sub>a</sub> × ℤ<sub>b</sub> ≅ ℤ<sub>ab</sub> for gcd(a, b) = 1
        (Chapter 6).
      </p>
      <Example>
        <p>
          ℤ₂ × ℤ₄ × ℤ₃ × ℤ₉ × ℤ₅ has elementary divisors 2, 4 (for 2), 3, 9 (for 3), and 5. So nₜ = 4 · 9 · 5 = 180 and
          nₜ₋₁ = 2 · 3 = 6: the group is ℤ₆ × ℤ₁₈₀.
        </p>
      </Example>
      <Remark>
        <p>
          The last invariant factor nₜ is the largest order of any element (the <em>exponent</em> of G). G is cyclic exactly
          when there is a single invariant factor.
        </p>
      </Remark>
    </Section>

    <Section title="9.3 Recognizing a group">
      <p>
        Isomorphic groups have the same number of elements of each order, and for finite abelian groups the converse holds:
        those counts determine the elementary divisors. The most useful single count: in ℤ<sub>p<sup>a₁</sup></sub> × ⋯ × ℤ<sub>p<sup>aᵣ</sup></sub>,
        px = 0 has exactly pʳ solutions (p in each factor). So the number of elements of order p is pʳ − 1, which tells you
        the number r of factors for the prime p.
      </p>
      <Example name="U(32)">
        <p>
          |U(32)| = 16 = 2⁴. x² ≡ 1 (mod 32) has the solutions 1, 15, 17, 31, so there are 3 = 2² − 1 elements of order 2:
          two factors. And 3 has order 8 (3² = 9, 3⁴ = 81 ≡ 17, 3⁸ ≡ 17² = 289 ≡ 1). Two factors of total exponent 4, one of
          them at least 8: U(32) ≅ ℤ₂ × ℤ₈.
        </p>
      </Example>
    </Section>

    <Section title="9.4 Why the theorem holds">
      <Definition name="p-group">
        <p>
          For a prime p, a <em>p-group</em> is a group whose order is a power of p. In an abelian group G, write G(k) ={' '}
          {'{'}x ∈ G : xᵏ = e{'}'}, a subgroup.
        </p>
      </Definition>
      <Theorem kind="Lemma" name="primary decomposition">
        <p>
          Let G be abelian with |G| = mn and gcd(m, n) = 1. Then G is the internal direct product of G(m) and G(n), and
          |G(m)| = m, |G(n)| = n.
        </p>
      </Theorem>
      <Proof>
        <p>
          If x ∈ G(m) ∩ G(n), |x| divides gcd(m, n) = 1, so x = e. Write 1 = sm + tn. For x ∈ G, x = x<sup>tn</sup> x
          <sup>sm</sup>, and (x<sup>tn</sup>)<sup>m</sup> = (x<sup>mn</sup>)<sup>t</sup> = e (Lagrange), so x<sup>tn</sup> ∈
          G(m); likewise x<sup>sm</sup> ∈ G(n). Both are normal since G is abelian, so G is their internal direct product and
          |G(m)||G(n)| = mn.
        </p>
        <p>
          If a prime q dividing n also divided |G(m)|, Cauchy's theorem (§7.3) would give x ∈ G(m) of order q; but |x|
          divides m, and q ∤ m. So |G(m)| is coprime to n, and from |G(m)||G(n)| = mn it divides m. Likewise |G(n)| divides
          n. Hence |G(m)| = m and |G(n)| = n.
        </p>
      </Proof>
      <p>
        Applying the lemma repeatedly, G ≅ G(p₁<sup>e₁</sup>) × ⋯ × G(pₖ<sup>eₖ</sup>), a product of abelian p-groups. For
        those:
      </p>
      <Theorem kind="Lemma">
        <p>
          If G is an abelian p-group and a ∈ G has maximal order, then G = ⟨a⟩ × K for some subgroup K.
        </p>
      </Theorem>
      <Proof label="Proof sketch">
        <p>
          Induct on |G|. If G = ⟨a⟩ take K = {'{'}e{'}'}. Otherwise choose b ∉ ⟨a⟩ of least possible order; then bᵖ ∈ ⟨a⟩,
          say bᵖ = aⁱ. If |a| = pᵐ, then e = b<sup>pᵐ</sup> = a<sup>ipᵐ⁻¹</sup> (as |b| ≤ |a|), so p | i, and c = a<sup>−i/p</sup>b
          is an element of order p outside ⟨a⟩. So ⟨a⟩ ∩ ⟨c⟩ = {'{'}e{'}'}. In G/⟨c⟩ the image of a still has maximal order, so by induction G/⟨c⟩ = ⟨a⟨c⟩⟩ × K̄; the preimage K of
          K̄ satisfies G = ⟨a⟩ × K.
        </p>
      </Proof>
      <p>
        Peeling off ⟨a⟩ and inducting on K writes every abelian p-group as a product of cyclic p-groups. For uniqueness, the
        number of solutions of p<sup>j</sup>x = 0 in ℤ<sub>p<sup>λ₁</sup></sub> × ⋯ is p raised to Σᵢ min(λᵢ, j), and these counts for
        j = 1, 2, … recover the partition λ.
      </p>
    </Section>
  </>
)

export default Body
