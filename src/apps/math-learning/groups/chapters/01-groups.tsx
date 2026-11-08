import { Definition, Example, Proof, Remark, Section, Theorem } from '../components/Blocks'
import GroupLab from '../components/GroupLab'

const Body = () => (
  <>
    <p>
      A group is the algebra of symmetry: a collection of reversible operations that can be combined, where combining is
      associative, doing nothing is one of the operations, and every operation can be undone. The definition is short. The
      rest of the course is about how much structure those three axioms force.
    </p>

    <Section title="1.1 The definition">
      <Definition name="binary operation">
        <p>
          A <em>binary operation</em> on a set G is a function G × G → G. We write the image of (a, b) as ab or a·b. Built
          into the definition is <em>closure</em>: ab is again in G.
        </p>
      </Definition>
      <Definition name="group">
        <p>A group is a set G with a binary operation such that</p>
        <ol>
          <li>
            <strong>associativity:</strong> (ab)c = a(bc) for all a, b, c ∈ G;
          </li>
          <li>
            <strong>identity:</strong> there is e ∈ G with ea = ae = a for every a ∈ G;
          </li>
          <li>
            <strong>inverses:</strong> for every a ∈ G there is b ∈ G with ab = ba = e.
          </li>
        </ol>
        <p>
          G is <em>abelian</em> if moreover ab = ba for all a, b. The <em>order</em> of G, written |G|, is its number of
          elements.
        </p>
      </Definition>
      <Remark kind="Notation">
        <p>
          In multiplicative notation the inverse of a is a⁻¹ and powers are aⁿ. Abelian groups are often written additively:
          a + b, identity 0, inverse −a, and na in place of aⁿ. The axioms are the same.
        </p>
      </Remark>
    </Section>

    <Section title="1.2 Examples">
      <ul>
        <li>
          <strong>Numbers under addition.</strong> ℤ, ℚ, ℝ, ℂ under + are infinite abelian groups. So is nℤ, the
          multiples of n.
        </li>
        <li>
          <strong>Nonzero numbers under multiplication.</strong> ℚ*, ℝ*, ℂ* (the nonzero elements) are abelian groups. But
          (ℤ, ·) is not a group: 2 has no inverse in ℤ.
        </li>
        <li>
          <strong>ℤₙ</strong> = {'{'}0, 1, …, n − 1{'}'} under addition mod n. Abelian, of order n.
        </li>
        <li>
          <strong>U(n)</strong> = {'{'}k ∈ ℤₙ : gcd(k, n) = 1{'}'} under multiplication mod n. It is closed because a
          product of numbers coprime to n is coprime to n. Inverses come from Bézout: if gcd(k, n) = 1 there are integers s,
          t with sk + tn = 1, so sk ≡ 1 (mod n). For example U(10) = {'{'}1, 3, 7, 9{'}'}, and 3⁻¹ = 7.
        </li>
        <li>
          <strong>Matrices.</strong> GLₙ(ℝ), the invertible n × n real matrices under matrix multiplication, is a group,
          non-abelian once n ≥ 2. Inside it sits SLₙ(ℝ), the matrices of determinant 1.
        </li>
        <li>
          <strong>Dₙ</strong>, the symmetries of a regular n-gon (n ≥ 3): n rotations e, r, r², …, rⁿ⁻¹, where r turns by
          360°/n, and n reflections. Writing s for one reflection, the reflections are s, sr, …, srⁿ⁻¹, so |Dₙ| = 2n and
          every element is uniquely sⁱrʲ with i ∈ {'{'}0, 1{'}'}, 0 ≤ j &lt; n. The multiplication follows from
          <span> rⁿ = e, s² = e, rs = sr⁻¹.</span>
        </li>
        <li>
          <strong>Sₙ</strong>, all bijections of {'{'}1, …, n{'}'} to itself under composition, of order n!. It gets its own
          chapter.
        </li>
        <li>
          <strong>Q₈</strong> = {'{'}±1, ±i, ±j, ±k{'}'}, the quaternion group, with i² = j² = k² = ijk = −1. From these,
          ij = k but ji = −k: non-abelian, of order 8.
        </li>
      </ul>
      <Remark kind="Warning">
        <p>
          Some books (Dummit &amp; Foote among them) call the group of order 2n D₂ₙ rather than Dₙ. Here the subscript is
          the number of sides.
        </p>
      </Remark>
      <Example name="not a group">
        <p>
          ℤ₆ ∖ {'{'}0{'}'} under multiplication mod 6 is not even closed: 2 · 3 = 6 ≡ 0. Compare U(6) = {'{'}1, 5{'}'}, which
          is a group.
        </p>
      </Example>
      <p>
        Explore some of these in the lab: switch between ℤ₆, D₃, U(8), and Q₈ and compare their tables. The full lab, with
        every group in the catalog, is on its own page.
      </p>
      <GroupLab initialGroup="D3" />
    </Section>

    <Section title="1.3 First consequences of the axioms">
      <Theorem name="basic properties">
        <p>In any group G:</p>
        <ol>
          <li>the identity is unique;</li>
          <li>every element has exactly one inverse;</li>
          <li>
            <em>cancellation</em> holds: ab = ac implies b = c, and ba = ca implies b = c;
          </li>
          <li>(a⁻¹)⁻¹ = a and (ab)⁻¹ = b⁻¹a⁻¹;</li>
          <li>ax = b and ya = b have the unique solutions x = a⁻¹b and y = ba⁻¹.</li>
        </ol>
      </Theorem>
      <Proof>
        <ol>
          <li>If e and e′ are both identities then e = ee′ = e′.</li>
          <li>If b and c are inverses of a then b = be = b(ac) = (ba)c = ec = c.</li>
          <li>Multiply ab = ac on the left by a⁻¹: b = (a⁻¹a)b = a⁻¹(ab) = a⁻¹(ac) = c. The other side is symmetric.</li>
          <li>
            a satisfies the defining property of an inverse of a⁻¹, so by (2) (a⁻¹)⁻¹ = a. And (ab)(b⁻¹a⁻¹) = a(bb⁻¹)a⁻¹ =
            aa⁻¹ = e, and likewise (b⁻¹a⁻¹)(ab) = e.
          </li>
          <li>a(a⁻¹b) = b, so a solution exists; if ax = ax′ then x = x′ by cancellation.</li>
        </ol>
      </Proof>
      <Remark>
        <p>
          (ab)⁻¹ = b⁻¹a⁻¹ is the "socks and shoes" rule: undo the last thing first. In a non-abelian group the order matters.
          In D₃, rs is a reflection, so (rs)⁻¹ = rs = sr⁻¹ = sr², while r⁻¹s⁻¹ = r²s = sr⁻² = sr.
        </p>
      </Remark>
      <p>
        Powers are defined by a⁰ = e, aⁿ⁺¹ = aⁿa, and a⁻ⁿ = (a⁻¹)ⁿ. The usual laws aᵐaⁿ = aᵐ⁺ⁿ and (aᵐ)ⁿ = aᵐⁿ hold, by
        induction. But (ab)ⁿ = aⁿbⁿ can fail unless ab = ba.
      </p>
    </Section>

    <Section title="1.4 The order of an element">
      <Definition name="order of an element">
        <p>
          The order |a| of a ∈ G is the least positive integer n with aⁿ = e. If there is none, a has infinite order.
        </p>
      </Definition>
      <Example>
        <p>
          In ℤ₁₂, |4| = 3 because 4 + 4 + 4 = 12 ≡ 0. In U(15), |2| = 4: 2, 4, 8, 16 ≡ 1. In Dₙ, |r| = n and every
          reflection has order 2. In ℤ, every nonzero element has infinite order.
        </p>
      </Example>
      <Theorem>
        <p>
          Suppose |a| = n. Then aᵏ = e if and only if n divides k. More generally, aⁱ = aʲ if and only if i ≡ j (mod n).
        </p>
      </Theorem>
      <Proof>
        <p>
          Divide: k = qn + r with 0 ≤ r &lt; n. Then aᵏ = (aⁿ)<sup>q</sup> · aʳ = aʳ. If aᵏ = e then aʳ = e with 0 ≤ r &lt; n, and by
          minimality of n, r = 0. Conversely if n | k then aᵏ = (aⁿ)<sup>k/n</sup> = e. For the second statement, aⁱ = aʲ if and only
          if aⁱ⁻ʲ = e.
        </p>
      </Proof>
      <Theorem kind="Corollary">
        <p>
          If |a| = n, the powers e, a, a², …, aⁿ⁻¹ are distinct, and every power of a is one of them. Also |a⁻¹| = |a|.
        </p>
      </Theorem>
      <Proof>
        <p>
          The first two claims are the theorem with 0 ≤ i, j &lt; n. For the last, (a⁻¹)ᵏ = (aᵏ)⁻¹, which is e exactly when
          aᵏ = e.
        </p>
      </Proof>
    </Section>

    <Section title="1.5 Cayley tables">
      <p>
        A finite group is completely described by its <em>Cayley table</em>: the entry in row a and column b is ab. The lab
        above draws them.
      </p>
      <Theorem name="Latin square property">
        <p>In the Cayley table of a group, every element appears exactly once in each row and exactly once in each column.</p>
      </Theorem>
      <Proof>
        <p>
          Row a lists ab as b runs over G. By cancellation these |G| products are distinct, so each element of G appears
          exactly once. Columns are the same with right cancellation.
        </p>
      </Proof>
      <Remark>
        <p>
          The converse fails: a Latin square need not be the table of a group, because associativity cannot be seen at a
          glance. A group is abelian exactly when its table is symmetric across the main diagonal.
        </p>
      </Remark>
    </Section>
  </>
)

export default Body
