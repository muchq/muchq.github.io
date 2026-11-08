import { choice, int, set, text } from '../problems/answers'
import type { Problem } from '../problems/types'

export const problems: Problem[] = [
  {
    id: 'gr-u15',
    kind: 'answer',
    prompt: <p>List the elements of U(15).</p>,
    answer: set(1, 2, 4, 7, 8, 11, 13, 14),
    hint: <p>15 = 3 · 5. Which k between 1 and 14 share no factor with 15?</p>,
    solution: <p>Remove the multiples of 3 (3, 6, 9, 12) and of 5 (5, 10) from 1, …, 14. Eight elements remain.</p>,
  },
  {
    id: 'gr-u15-order',
    kind: 'answer',
    prompt: <p>Find the order of 7 in U(15).</p>,
    answer: int(4),
    solution: <p>7² = 49 ≡ 4, 7³ ≡ 4 · 7 = 28 ≡ 13, 7⁴ ≡ 13 · 7 = 91 ≡ 1 (mod 15). So |7| = 4.</p>,
  },
  {
    id: 'gr-u15-inverse',
    kind: 'answer',
    prompt: <p>Find the inverse of 7 in U(15).</p>,
    answer: int(13),
    hint: <p>You already know 7⁴ = 1. What is 7 · 7³?</p>,
    solution: <p>7 · 13 = 91 = 6 · 15 + 1, so 7⁻¹ = 13 (which is 7³, as the hint suggests).</p>,
  },
  {
    id: 'gr-d4-product',
    kind: 'answer',
    prompt: <p>In D₄, compute (sr)(sr²). Write the answer as e, rᵏ, or srᵏ.</p>,
    answer: text(['r'], 'e.g. sr² or sr^2'),
    hint: <p>Use rs = sr⁻¹ to move the middle r past s.</p>,
    solution: <p>(sr)(sr²) = s(rs)r² = s(sr⁻¹)r² = s²r = r.</p>,
  },
  {
    id: 'gr-d4-involutions',
    kind: 'answer',
    prompt: <p>How many elements of order 2 does D₄ have?</p>,
    answer: int(5),
    solution: <p>The four reflections s, sr, sr², sr³ and the half-turn r². The rotations r and r³ have order 4.</p>,
  },
  {
    id: 'gr-not-group',
    kind: 'answer',
    prompt: <p>Which of these is not a group?</p>,
    answer: choice(['(ℤ, +)', '(ℚ ∖ {0}, ·)', '(ℤ, ·)', '(ℤ₇ ∖ {0}, · mod 7)'], '(ℤ, ·)'),
    solution: (
      <p>
        In (ℤ, ·), 2 has no inverse: there is no integer b with 2b = 1. The last option is U(7), a group because 7 is prime.
      </p>
    ),
  },
  {
    id: 'gr-u8',
    kind: 'answer',
    prompt: <p>How many elements of U(8) have order 2?</p>,
    answer: int(3),
    solution: (
      <p>
        U(8) = {'{'}1, 3, 5, 7{'}'} and 3² = 9, 5² = 25, 7² = 49 are all ≡ 1 (mod 8). So all three non-identity elements
        have order 2. Unlike ℤ₄, U(8) has no element of order 4.
      </p>
    ),
  },
  {
    id: 'gr-q8',
    kind: 'answer',
    prompt: <p>How many elements of Q₈ have order 4?</p>,
    answer: int(6),
    solution: <p>±i, ±j, ±k each square to −1, so have order 4. Only −1 has order 2, and 1 has order 1.</p>,
  },
  {
    id: 'gr-matrix',
    kind: 'answer',
    prompt: (
      <p>
        Find the order of the matrix A with rows (0, −1) and (1, 0) in GL₂(ℝ).
      </p>
    ),
    answer: int(4),
    hint: <p>A rotates the plane. By how much?</p>,
    solution: <p>A is rotation by 90°. A² = −I and A⁴ = I, while A, A², A³ ≠ I. So |A| = 4.</p>,
  },
  {
    id: 'gr-exponent-two',
    kind: 'proof',
    prompt: <p>Prove that if x² = e for every x in a group G, then G is abelian.</p>,
    hint: <p>x² = e says x = x⁻¹. Apply that to a, to b, and to ab.</p>,
    solution: <p>Every element is its own inverse, so for any a, b: ab = (ab)⁻¹ = b⁻¹a⁻¹ = ba.</p>,
  },
  {
    id: 'gr-square-law',
    kind: 'proof',
    prompt: <p>Prove that G is abelian if and only if (ab)² = a²b² for all a, b ∈ G.</p>,
    solution: (
      <p>
        If G is abelian, (ab)² = abab = aabb = a²b². Conversely, if abab = aabb, cancel a on the left to get bab = abb, then
        cancel b on the right to get ba = ab.
      </p>
    ),
  },
  {
    id: 'gr-even-order',
    kind: 'proof',
    prompt: <p>Prove that a finite group of even order contains an element of order 2.</p>,
    hint: <p>Pair each element with its inverse. Which elements are left unpaired?</p>,
    solution: (
      <p>
        The elements g with g ≠ g⁻¹ come in pairs {'{'}g, g⁻¹{'}'}, so there are an even number of them. The rest satisfy g
        = g⁻¹, i.e. g² = e. Since |G| is even, the number of elements with g² = e is even too. It includes e, so it is at
        least 2: there is a ≠ e with a² = e, and |a| = 2.
      </p>
    ),
  },
  {
    id: 'gr-conjugate-order',
    kind: 'proof',
    prompt: <p>Prove that |gag⁻¹| = |a| for all a, g ∈ G (including the case of infinite order).</p>,
    hint: <p>Expand (gag⁻¹)ᵏ. Most of the factors cancel.</p>,
    solution: (
      <p>
        (gag⁻¹)ᵏ = (gag⁻¹)(gag⁻¹)⋯(gag⁻¹) = gaᵏg⁻¹, since each inner g⁻¹g cancels. And gaᵏg⁻¹ = e if and only if aᵏ =
        g⁻¹eg = e. So the same positive k satisfy (gag⁻¹)ᵏ = e and aᵏ = e; in particular the least such k agree, or neither
        exists.
      </p>
    ),
  },
  {
    id: 'gr-ab-ba',
    kind: 'proof',
    prompt: <p>Prove that |ab| = |ba| for all a, b ∈ G.</p>,
    hint: <p>Write ba as a conjugate of ab and use the previous problem.</p>,
    solution: <p>ba = a⁻¹(ab)a, a conjugate of ab by g = a⁻¹. Conjugates have the same order.</p>,
  },
  {
    id: 'gr-finite-order',
    kind: 'proof',
    prompt: <p>Prove that every element of a finite group has finite order.</p>,
    solution: (
      <p>
        The |G| + 1 powers a, a², …, a<sup>|G|+1</sup> cannot all be distinct, so aⁱ = aʲ for some i &lt; j. Multiplying by a⁻ⁱ
        gives aʲ⁻ⁱ = e with j − i ≥ 1.
      </p>
    ),
  },
]
