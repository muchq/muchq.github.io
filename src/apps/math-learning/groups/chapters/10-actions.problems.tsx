import { int, sum } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'ac-necklace6',
    kind: 'answer',
    prompt: <p>How many necklaces of 6 beads in 2 colors are there, up to rotation?</p>,
    answer: int(14),
    solution: <p>(64 + 2 + 4 + 8 + 4 + 2)/6 = 84/6 = 14 (§10.6).</p>,
  },
  {
    id: 'ac-bracelet6',
    kind: 'answer',
    prompt: <p>How many bracelets of 6 beads in 2 colors are there, up to rotation and reflection?</p>,
    answer: int(13),
    hint: <p>The group is D₆. A reflection of a hexagon passes either through two opposite beads or between beads.</p>,
    solution: (
      <p>
        Rotations contribute 84 as before. The 3 reflections through opposite beads fix those 2 beads and swap 2 pairs: 2⁴ =
        16 each. The 3 reflections through opposite edges swap 3 pairs: 2³ = 8 each. (84 + 48 + 24)/12 = 13.
      </p>
    ),
  },
  {
    id: 'ac-cube3',
    kind: 'answer',
    prompt: <p>In how many ways can the faces of a cube be colored with 3 colors, up to rotation?</p>,
    answer: int(57),
    solution: <p>(3⁶ + 3 · 3⁴ + 12 · 3³ + 8 · 3²)/24 = (729 + 243 + 324 + 72)/24 = 1368/24 = 57.</p>,
  },
  {
    id: 'ac-d5-class',
    kind: 'answer',
    prompt: <p>How many elements are in the conjugacy class of r in D₅?</p>,
    answer: int(2),
    solution: <p>srs⁻¹ = r⁻¹ and rotations commute with r, so cl(r) = {'{'}r, r⁴{'}'}. Check: |C(r)| = |⟨r⟩| = 5 and 10/5 = 2.</p>,
  },
  {
    id: 'ac-d4-classeq',
    kind: 'answer',
    prompt: <p>Give the class equation of D₄: the sizes of its conjugacy classes, as a sum.</p>,
    answer: sum(1, 1, 2, 2, 2),
    solution: <p>{'{'}e{'}'}, {'{'}r²{'}'}, {'{'}r, r³{'}'}, {'{'}s, sr²{'}'}, {'{'}sr, sr³{'}'}: 8 = 1 + 1 + 2 + 2 + 2.</p>,
  },
  {
    id: 'ac-a4-classeq',
    kind: 'answer',
    prompt: <p>Give the class equation of A₄.</p>,
    answer: sum(1, 3, 4, 4),
    solution: (
      <p>
        e; the three double transpositions; and the eight 3-cycles, which split into two classes of 4 in A₄ (the centralizer
        of (1 2 3) in A₄ is just ⟨(1 2 3)⟩, of index 4). 12 = 1 + 3 + 4 + 4.
      </p>
    ),
  },
  {
    id: 'ac-d6-stab',
    kind: 'answer',
    prompt: <p>D₆ acts on the 6 vertices of a regular hexagon. How many elements are in the stabilizer of a vertex?</p>,
    answer: int(2),
    solution: <p>The action is transitive, so |Stab| = 12/6 = 2: the identity and the reflection through that vertex.</p>,
  },
  {
    id: 'ac-s4-centralizer',
    kind: 'answer',
    prompt: <p>How many elements does the centralizer of (1 2 3) in S₄ have?</p>,
    answer: int(3),
    solution: <p>The class of (1 2 3) is the 8 three-cycles, so |C((1 2 3))| = 24/8 = 3: it is ⟨(1 2 3)⟩.</p>,
  },
  {
    id: 'ac-orbits',
    kind: 'answer',
    prompt: <p>How many orbits does ⟨(1 2 3)(4 5)⟩ have on {'{'}1, 2, 3, 4, 5, 6{'}'}?</p>,
    answer: int(3),
    solution: <p>{'{'}1, 2, 3{'}'}, {'{'}4, 5{'}'}, {'{'}6{'}'}.</p>,
  },
  {
    id: 'ac-tetrahedron',
    kind: 'answer',
    prompt: (
      <p>
        The rotations of a regular tetrahedron act transitively on its 4 vertices, and the stabilizer of a vertex is the 3
        rotations about the axis through it. How many rotations does the tetrahedron have?
      </p>
    ),
    answer: int(12),
    solution: <p>Orbit–stabilizer: 4 · 3 = 12. (The group is ≅ A₄.)</p>,
  },
  {
    id: 'ac-p3-center',
    kind: 'proof',
    prompt: <p>Let G be a non-abelian group of order p³. Prove that |Z(G)| = p.</p>,
    solution: (
      <p>
        Z(G) is nontrivial (§10.4), so |Z(G)| ∈ {'{'}p, p², p³{'}'}. Not p³, since G is non-abelian. If |Z(G)| = p², G/Z(G)
        has order p and is cyclic, so G is abelian — a contradiction. So |Z(G)| = p.
      </p>
    ),
  },
  {
    id: 'ac-fixed-points',
    kind: 'proof',
    prompt: (
      <p>
        Let a p-group G act on a finite set X, and let X<sup>G</sup> be the set of points fixed by every element of G. Prove
        that |X| ≡ |X<sup>G</sup>| (mod p).
      </p>
    ),
    solution: (
      <p>
        X is the disjoint union of orbits. Each orbit has size [G : Stab(x)], a power of p; it is 1 exactly when x ∈ X
        <sup>G</sup>. The other orbits have sizes divisible by p.
      </p>
    ),
  },
  {
    id: 'ac-conjugates',
    kind: 'proof',
    prompt: <p>Prove that the number of conjugates of a subgroup H of G is [G : N(H)], where N(H) = {'{'}g : gHg⁻¹ = H{'}'}.</p>,
    solution: (
      <p>
        G acts on its subgroups by conjugation. The orbit of H is the set of its conjugates, and its stabilizer is N(H).
        Apply orbit–stabilizer.
      </p>
    ),
  },
  {
    id: 'ac-union-of-conjugates',
    kind: 'proof',
    prompt: <p>Let H be a proper subgroup of a finite group G. Prove that G is not the union of the conjugates of H.</p>,
    solution: (
      <p>
        H ≤ N(H), so H has [G : N(H)] ≤ [G : H] conjugates, each of size |H|, all containing e. Their union has at most [G :
        H](|H| − 1) + 1 = |G| − [G : H] + 1 elements, which is less than |G| because [G : H] ≥ 2.
      </p>
    ),
  },
  {
    id: 'ac-index-two',
    kind: 'proof',
    prompt: <p>Let |G| = 2n with n odd. Prove that G has a normal subgroup of index 2.</p>,
    hint: <p>Use Cayley's embedding G → S₂ₙ and look at the sign of the image of an element of order 2.</p>,
    solution: (
      <p>
        G has an element t of order 2 (even order). Under λ: G → Sym(G) ≅ S₂ₙ, λ<sub>t</sub>(x) = tx has no fixed points (tx = x ⇒ t
        = e) and λ<sub>t</sub>² = e, so λ<sub>t</sub> is a product of n disjoint transpositions: an odd permutation, since n is odd. So sgn ∘ λ:
        G → {'{'}±1{'}'} is onto, and its kernel is a normal subgroup of index 2.
      </p>
    ),
  },
]
