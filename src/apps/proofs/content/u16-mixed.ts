import type { Unit } from '../types'
import { md } from './md'

// No `uses` here on purpose: nothing on the page says which tools apply.
const unit: Unit = {
  id: 'mixed',
  n: 16,
  title: 'Mixed problems',
  track: 'Mixed',
  prereqs: [15, 13, 5, 4],
  why: md`No topic, and no list of results to cite: problems from across the course in no particular order,
    several asking you to *determine* the answer rather than prove one you are given. Deciding which tools
    apply is the problem.`,
  definitions: [],
  problems: [
    {
      id: '16.1',
      kind: 'prove',
      challenge: true,
      title: 'Groups of order six',
      statement: md`Determine all groups of order 6 up to isomorphism. Prove that your list is complete and that no
        two groups on it are isomorphic.`,
      hints: [
        md`What orders can elements have? Must there be an element of order 2? Of order 3?`,
        md`Take $a$ of order 3 and $b$ of order 2. What can $bab^{-1}$ be?`,
        md`If $bab^{-1} = a$, find the order of $ab$. If $bab^{-1} = a^2$, compare with $S_3$, where
          $(1\,2)(1\,2\,3)(1\,2) = (1\,3\,2)$.`,
      ],
      solution: md`**Answer:** $\Z/6$ and $S_3$. They are not isomorphic: $\Z/6$ is abelian and $S_3$ is not, as
        $(1\,2)(1\,3) = (1\,3\,2) \ne (1\,2\,3) = (1\,3)(1\,2)$.

        Let $|G| = 6$. By Cauchy's theorem (4.9) there are $a$ of order 3 and $b$ of order 2. $N = \langle a
        \rangle = \{e, a, a^2\}$ has index 2, so it is normal (3.6), and $b \notin N$, whose elements have order 1
        or 3. So $G = N \cup bN = \{e, a, a^2, b, ba, ba^2\}$. Since $(bab^{-1})^k = ba^kb^{-1}$, the element
        $bab^{-1} \in N$ has order 3, so it is $a$ or $a^2$.

        *Case $bab^{-1} = a$.* Then $ab = ba$ and $(ab)^k = a^kb^k$. If $(ab)^k = e$ then
        $a^k = b^{-k} \in N \cap \{e, b\} = \{e\}$, so $3 \mid k$ and $2 \mid k$. So $ab$ has order 6, and
        $G = \langle ab \rangle$. A cyclic group $\langle g \rangle$ of order 6 is isomorphic to $\Z/6$ via
        $g^k \mapsto [k]$, well defined and injective because $g^k = g^l \iff 6 \mid k - l$ (2.6).

        *Case $bab^{-1} = a^2 = a^{-1}$.* Then $ba = a^{-1}b$, so $b^ja^k = a^{(-1)^jk}b^j$, and
        $(a^ib^j)(a^kb^l) = a^{i + (-1)^jk}b^{j+l}$ — exponents of $a$ mod 3, of $b$ mod 2. The six elements
        $a^ib^j$ ($0 \le i < 3$, $0 \le j < 2$) are distinct, since $ba = a^2b$ and $ba^2 = ab$ rewrite the list
        above. In $S_3$, $\sigma = (1\,2\,3)$ has order 3, $\tau = (1\,2)$ has order 2, and
        $\tau\sigma\tau^{-1} = (1\,3\,2) = \sigma^{-1}$, so the same rule holds and the six $\sigma^i\tau^j$ are
        all of $S_3$. Then $a^ib^j \mapsto \sigma^i\tau^j$ is a bijection respecting the multiplication rule: an
        isomorphism $G \cong S_3$.`,
      checks: [
        md`Elements of orders 2 and 3 are produced with a reason.`,
        md`The conjugate $bab^{-1}$ is pinned to $a$ or $a^{-1}$, with the reason.`,
        md`Each case ends in an explicit isomorphism, checked.`,
        md`The two answers are shown to be non-isomorphic.`,
      ],
    },
    {
      id: '16.2',
      kind: 'decide',
      title: 'The circle in the line',
      statement: md`**Prove or disprove:** there is a continuous injective map $S^1 \to \R$.`,
      verdict: false,
      hints: [
        md`What do you know about $S^1$ that every continuous image inherits?`,
        md`Remove one point from $S^1$ — which point?`,
      ],
      solution: md`**False.** Suppose $f\colon S^1 \to \R$ is continuous and injective. $S^1 = p([0, 1])$ is compact
        (10.5, 10.1), so $f$ attains a minimum $m = f(z_1)$ and a maximum $M = f(z_2)$ (10.6). $S^1$ has a third
        point $z$, and by injectivity $m < c < M$ for $c = f(z)$. $S^1 \setminus \{z\}$ is connected (9.6), so its
        image is connected (9.3). But that image contains $m$ and $M$ and, by injectivity, not $c$; its parts
        below and above $c$ are disjoint, nonempty, and open in it. Contradiction.`,
      checks: [
        md`Compactness gives attained extremes.`,
        md`A point whose value lies strictly between them is removed, with injectivity used twice.`,
        md`Connectedness of the punctured circle gives the contradiction.`,
      ],
    },
    {
      id: '16.3',
      kind: 'prove',
      title: 'Five spaces',
      statement: md`Sort $[0, 1)$, $(0, 1)$, $[0, 1]$, $\R$ and $S^1$ into homeomorphism classes, and prove your
        answer.`,
      hints: [
        md`Which properties survive a homeomorphism? You have at least three.`,
        md`Exactly two of the five are homeomorphic. For every other pair, find a property one has and the other
          lacks.`,
        md`Try $u \mapsto u/(1 - |u|)$ on $(-1, 1)$.`,
      ],
      solution: md`**Classes:** $\{(0, 1), \R\}$; $\{[0, 1)\}$; $\{[0, 1]\}$; $\{S^1\}$.

        *$(0, 1) \cong \R$.* $t \mapsto 2t - 1$ is a homeomorphism $(0, 1) \to (-1, 1)$, and $g(u) = u/(1 - |u|)$
        maps $(-1, 1)$ to $\R$ with inverse $h(x) = x/(1 + |x|)$: if $x = g(u)$ then $1 + |x| = 1/(1 - |u|)$, so
        $h(x) = u$; and $h$ maps into $(-1, 1)$ with $g(h(x)) = x$ likewise. Both are continuous.

        *Compact or not.* $[0, 1]$ and $S^1 = p([0, 1])$ are compact (10.5, 10.1). The others are not: $[0, 1)$ is
        covered by the open sets $[0, 1 - \frac1n)$, $(0, 1)$ by $(\frac1n, 1)$ and $\R$ by $(-n, n)$, and in each
        case finitely many lie in the largest of them, which misses points. A homeomorphism carries compact to
        compact (10.1), so no compact space here is homeomorphic to a non-compact one.

        *$[0, 1]$ and $S^1$* are not homeomorphic (9.6).

        *$[0, 1)$ and $\R$.* Removing $0$ from $[0, 1)$ leaves the connected $(0, 1)$; removing any $x$ from $\R$
        leaves $(-\infty, x) \cup (x, \infty)$, disconnected. A homeomorphism $h\colon [0, 1) \to \R$ would restrict
        to one from $[0, 1) \setminus \{0\}$ onto $\R \setminus \{h(0)\}$ (as in 9.6). So $[0, 1)$ is not
        homeomorphic to $\R$, nor therefore to $(0, 1)$.`,
      checks: [
        md`An explicit homeomorphism $(0, 1) \to \R$ is given, with its inverse.`,
        md`Non-compactness is shown with explicit covers.`,
        md`Every pair in different classes is separated by a named invariant, checked on both spaces.`,
      ],
    },
    {
      id: '16.4',
      kind: 'decide',
      title: 'Normal subgroups inside a subgroup',
      statement: md`**Prove or disprove:** if $H$ is a subgroup of finite index in a group $G$, then $H$ contains a
        normal subgroup of $G$ that also has finite index.`,
      verdict: true,
      hints: [
        md`$H$ has finitely many cosets. Can $G$ do something to them?`,
        md`Left multiplication permutes the cosets. That is a homomorphism to a finite group — with what kernel?`,
      ],
      solution: md`**True.** Let $n = [G : H]$ and let $G$ act on the set $G/H$ of left cosets by $g \cdot xH = gxH$ —
        well defined, since $xH = yH$ gives $(gx)^{-1}gy = x^{-1}y \in H$. Each $g$ acts by a bijection (inverse:
        the action of $g^{-1}$), and $\rho(g) = (xH \mapsto gxH)$ is a homomorphism $G \to \mathrm{Sym}(G/H)$, a
        group with $n!$ elements. Its kernel $N$ is normal (3.1). If $g \in N$ then $gH = H$, so $g \in H$:
        $N \subseteq H$. By the first isomorphism theorem (3.7), $G/N \cong \rho(G)$, so $[G : N] \le n!$.`,
      checks: [
        md`The action on cosets is checked to be well defined.`,
        md`The kernel is shown normal and contained in $H$.`,
        md`Its index is bounded through the first isomorphism theorem.`,
      ],
    },
    {
      id: '16.5',
      kind: 'prove',
      title: 'Maps that miss a point',
      statement: md`Prove that a continuous map $f\colon S^1 \to S^1$ that is not surjective has degree 0. Deduce
        that $z \mapsto z^n$ is surjective for every $n \ne 0$.`,
      hints: [
        md`Suppose $f$ misses $p(a)$. Where can a lift of $s \mapsto f(p(s))$ take its values?`,
        md`Those values lie in a disjoint union of open intervals of length 1. Can the lift jump between them?`,
      ],
      solution: md`Suppose $f$ misses $p(a)$ and let $\ell$ lift $s \mapsto f(p(s))$ on $[0, 1]$ (15.3). Its values
        lie in $p^{-1}(S^1 \setminus \{p(a)\}) = \bigcup_n (a + n, a + n + 1)$ (15.1). $\ell([0, 1])$ is connected
        (9.2, 9.3), so it lies in one of these disjoint open intervals — otherwise they would separate it. So
        $|\ell(1) - \ell(0)| < 1$, and the integer $\deg f = \ell(1) - \ell(0)$ (15.7) is $0$. The map
        $z \mapsto z^n$ has degree $n$ (lift $s \mapsto ns$), so for $n \ne 0$ it is onto.`,
      checks: [
        md`A lift is taken and its values located in the preimage of the complement of the missed point.`,
        md`Connectedness confines the lift to a single interval.`,
        md`An integer of absolute value below 1 is 0.`,
      ],
    },
    {
      id: '16.6',
      kind: 'decide',
      title: 'Antipodes',
      statement: md`**Prove or disprove:** every continuous $f\colon S^1 \to \R$ takes the same value at some pair
        of antipodal points $z$ and $-z$.`,
      verdict: true,
      hints: [
        md`Compare $f(z)$ with $f(-z)$ as one function of $z$. What happens when $z$ is replaced by $-z$?`,
        md`Walk halfway round the circle.`,
      ],
      solution: md`**True.** $g(z) = f(z) - f(-z)$ is continuous and $g(-z) = -g(z)$. Let $h(t) = g(p(t))$ for
        $t \in [0, \frac12]$. As $p(\frac12) = -1 = -p(0)$, $h(\frac12) = -h(0)$. If $h(0) = 0$, take $z = 1$.
        Otherwise $h(0)$ and $h(\frac12)$ have opposite signs, and the intermediate value theorem (9.3) gives $t$
        with $h(t) = 0$; then $z = p(t)$ has $f(z) = f(-z)$.`,
      checks: [
        md`The odd function $g$ is introduced and $g(-z) = -g(z)$ verified.`,
        md`The intermediate value theorem is applied along an explicit path from $z$ to $-z$.`,
        md`The case $g(1) = 0$ is handled.`,
      ],
    },
    {
      id: '16.7',
      kind: 'prove',
      title: 'Unions of conjugates',
      statement: md`Let $H$ be a proper subgroup of a finite group $G$. Prove that $G$ is not the union of the
        conjugates $gHg^{-1}$, $g \in G$.`,
      hints: [
        md`How many different conjugates of $H$ can there be? What acts on what?`,
        md`Count elements, remembering what every conjugate has in common.`,
      ],
      solution: md`$G$ acts on its subgroups by $g \cdot K = gKg^{-1}$. The conjugates of $H$ form the orbit of $H$,
        and $H$ lies in the stabilizer $G_H$, since $hHh^{-1} = H$ for $h \in H$. By orbit–stabilizer and
        Lagrange (4.2, 3.2), the number of conjugates is $|G|/|G_H| \le |G|/|H| = n$, where $n = [G : H]$. Each
        conjugate has $|H|$ elements (conjugation is a bijection) and contains $e$. So their union has at most
        $n(|H| - 1) + 1 = |G| - n + 1$ elements, fewer than $|G|$ because $n \ge 2$ for a proper subgroup.`,
      checks: [
        md`The number of conjugates is bounded by $[G : H]$ through orbit–stabilizer.`,
        md`The shared identity is used in the count.`,
        md`Properness gives $n \ge 2$.`,
      ],
    },
    {
      id: '16.8',
      kind: 'flaw',
      title: 'A true claim, a wrong proof',
      statement: md`**Claim** (true). A continuous bijection $f\colon [0, 1] \to [0, 1]$ is a homeomorphism. Find the
        first line of this proof that is wrong or does not follow — then prove the claim correctly.`,
      lines: [
        md`$f$ is a continuous bijection, so $f^{-1}$ exists; we show it is continuous.`,
        md`By 7.5, $f^{-1}$ is continuous iff $(f^{-1})^{-1}(F)$ is closed for every closed $F \subseteq [0, 1]$.`,
        md`Since $f$ is a bijection, $(f^{-1})^{-1}(F) = f(F)$.`,
        md`$f(F)$ is closed, because continuous maps send closed sets to closed sets.`,
        md`So $f^{-1}$ is continuous, and $f$ is a homeomorphism. $\blacksquare$`,
      ],
      flawLine: 4,
      hints: [
        md`Every line may be *true* here. Is every line true *for the reason given*?`,
        md`Is the reason in line 4 true of all continuous maps?`,
      ],
      solution: md`**Line 4.** Its reason is false: the inclusion $(0, 1) \to \R$ is continuous and sends the set
        $(0, 1)$, closed in its own space, to a set that is not closed in $\R$. The claim is still true, for a
        reason that uses the spaces: $[0, 1]$ is compact and Hausdorff, so the closed map lemma (10.4) makes line
        4's conclusion hold for this $f$, and the rest of the argument goes through. A true conclusion does not
        make an argument valid.`,
      checks: [
        md`Line 4 is identified, with a counterexample to its stated reason.`,
        md`A correct proof of the claim is given, through the closed map lemma.`,
      ],
    },
    {
      id: '16.9',
      kind: 'prove',
      title: 'The torus',
      statement: md`Prove that the torus $T = S^1 \times S^1$ is homeomorphic neither to $S^1$ nor to $D^2$.`,
      hints: [md`Find an invariant you can compute for all three.`, md`Is $\Z \times \Z$ cyclic?`],
      solution: md`$T$ is path-connected: paths in the two factors combine into a path in the product (7.10). So
        its fundamental group does not depend on the basepoint up to isomorphism (14.7), and the same holds for
        $S^1$ and $D^2$; a homeomorphism would induce an isomorphism (14.8). Now
        $\pi_1(T) \cong \Z \times \Z$ (14.10, 15.6), $\pi_1(S^1) \cong \Z$ (15.6), and $\pi_1(D^2)$ is trivial
        (14.5). $\Z \times \Z$ is not trivial, and not cyclic: if $(a, b)$ generated it, then $(1, 0) = k(a, b)$
        and $(0, 1) = l(a, b)$; $ka = 1$ forces $k \ne 0$, so $kb = 0$ gives $b = 0$, contradicting $lb = 1$.`,
      checks: [
        md`Basepoint independence and functoriality are cited.`,
        md`$\pi_1(T)$ is computed from the product formula.`,
        md`$\Z \times \Z$ is shown not cyclic, and not trivial.`,
      ],
    },
    {
      id: '16.10',
      kind: 'prove',
      title: 'Connected compact spaces are big',
      statement: md`Prove that a connected compact Hausdorff space with at least two points is uncountable.`,
      hints: [
        md`Can you map the space continuously onto something you know is uncountable?`,
        md`A continuous real function that takes two values on a connected space takes every value in between.`,
      ],
      solution: md`Let $x \ne y$. $X$ is normal (11.3) and its points are closed (11.1), so Urysohn (11.7) gives a
        continuous $f\colon X \to [0, 1]$ with $f(x) = 0$, $f(y) = 1$. $f(X)$ is connected (9.3) and contains 0 and 1,
        so it contains every point between them — otherwise the parts below and above a missed point would separate
        it, as in 9.3(b). So $f(X) = [0, 1]$, which is uncountable (13.3). If $X$ were countable, choosing one
        preimage of each point of $[0, 1]$ would inject $[0, 1]$ into $X$, making $[0, 1]$ countable.`,
      checks: [
        md`Urysohn is applied after normality and closed points are established.`,
        md`The image is shown to be all of $[0, 1]$ by connectedness.`,
        md`Countability of $X$ is shown to pass to $[0, 1]$.`,
      ],
    },
    {
      id: '16.11',
      kind: 'decide',
      title: 'Maximal ideals of ℤ/n',
      statement: md`**Prove or disprove:** for every $n \ge 2$, the number of maximal ideals of $\Z/n$ equals the number of
        distinct primes dividing $n$.`,
      verdict: true,
      hints: [
        md`Compare the ideals of $\Z/n$ with ideals of $\Z$. Which ones?`,
        md`Pull back along $\Z \to \Z/n$, and check that this is a bijection that respects inclusion.`,
      ],
      solution: md`**True.** Let $\pi\colon \Z \to \Z/n$. For an ideal $M$ of $\Z/n$, $\pi^{-1}(M)$ is an ideal of $\Z$ containing
        $n\Z$ (preimages of ideals under ring homomorphisms are ideals, directly from the definitions), and
        $\pi(\pi^{-1}(M)) = M$ since $\pi$ is onto. For an ideal $J \supseteq n\Z$ of $\Z$, $\pi(J)$ is an ideal, as
        $\pi$ is onto: $\pi(r)\pi(a) = \pi(ra)$. And $\pi^{-1}(\pi(J)) = J + n\Z = J$. So $M \mapsto \pi^{-1}(M)$ is a
        bijection, preserving inclusion both ways, from ideals of $\Z/n$ to ideals of $\Z$ containing $n\Z$; $M$ is
        proper iff $1 \notin \pi^{-1}(M)$. So $M$ is maximal iff $\pi^{-1}(M)$ is maximal among ideals containing
        $n\Z$ — which is maximality in $\Z$, since any ideal containing $\pi^{-1}(M)$ contains $n\Z$. The ideals
        containing $n\Z$ are the $d\Z$ with $d \ge 1$, $d \mid n$, distinct for distinct $d$, and $d\Z$ is maximal
        iff $d$ is prime (5.7). So the maximal ideals of $\Z/n$ match the prime divisors of $n$.`,
      checks: [
        md`The correspondence of ideals is proved, in both directions, with inclusion preserved.`,
        md`Properness, hence maximality, is shown to correspond.`,
        md`Maximal ideals of $\Z$ are identified with primes.`,
      ],
    },
    {
      id: '16.12',
      kind: 'decide',
      title: 'A big product, locally',
      statement: md`**Prove or disprove:** $\R^{\N}$, with the product topology, is locally compact.`,
      verdict: false,
      hints: [
        md`What does a basic neighborhood of a point look like in most coordinates?`,
        md`Project a compact set to one coordinate.`,
      ],
      solution: md`**False.** Suppose a compact $C$ contains a neighborhood of $0$, hence a basic set $\prod_n U_n$ with
        $U_n = \R$ for $n$ outside a finite set $F$. For $m \notin F$, $\pi_m(C) \supseteq \pi_m(\prod_n U_n) = \R$, and
        $\pi_m(C)$ is compact (10.1, 12.1). So $\R$ would be compact — but $(-k, k)$, $k \ge 1$, cover it with no finite
        subcover.`,
      checks: [
        md`A basic neighborhood is shown to be unrestricted in some coordinate.`,
        md`Projection and continuous images of compact sets give the contradiction.`,
      ],
    },
    {
      id: '16.13',
      kind: 'decide',
      title: 'Non-units',
      statement: md`**Prove or disprove:** in every ring with $1 \ne 0$, the set of non-units is the union of the maximal
        ideals.`,
      verdict: true,
      hints: [md`What ideal does a single non-unit generate?`, md`Can a maximal ideal contain a unit?`],
      solution: md`**True.** If $a$ is a non-unit, $(a) = Ra$ does not contain 1 (else $ra = 1$), so it is proper and lies
        in a maximal ideal by Krull's theorem (5.13); hence $a$ lies in a maximal ideal. Conversely, a maximal ideal
        contains no unit: $u \in M$ would give $1 = u^{-1}u \in M$, so $M = R$.`,
      checks: [
        md`A non-unit is shown to generate a proper ideal.`,
        md`Krull's theorem places it in a maximal ideal.`,
        md`Maximal ideals are shown to contain no units.`,
      ],
    },
    {
      id: '16.14',
      kind: 'decide',
      title: 'Order twenty-one',
      statement: md`**Prove or disprove:** every group of order 21 is abelian.`,
      verdict: false,
      hints: [
        md`Order 15 forced commuting elements. What is different about $3$ and $7$?`,
        md`Look among the maps $x \mapsto ax + b$ of $\Z/7$.`,
      ],
      solution: md`**False.** Let $G$ be the set of maps $\Z/7 \to \Z/7$ of the form $x \mapsto ax + b$ with $a \in \{1, 2, 4\}$
        and $b \in \Z/7$. Composition gives $a(cx + d) + b = acx + (ad + b)$, and $\{1, 2, 4\}$ is closed under
        multiplication mod 7 ($2 \cdot 2 = 4$, $2 \cdot 4 \equiv 1$, $4 \cdot 4 \equiv 2$) and contains inverses, so
        $G$ is a subgroup of $\mathrm{Sym}(\Z/7)$ (the maps are bijections, with inverses of the same form). Its 21
        elements are distinct, since $b = f(0)$ and $a = f(1) - f(0)$. It is not abelian: for $f(x) = 2x$ and
        $g(x) = x + 1$, $f(g(x)) = 2x + 2$ but $g(f(x)) = 2x + 1$.`,
      checks: [
        md`Closure under composition and inverses is checked.`,
        md`The 21 elements are shown distinct.`,
        md`Two explicit non-commuting elements are given.`,
      ],
    },
  ],
}

export default unit
