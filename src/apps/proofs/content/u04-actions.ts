import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'actions',
  n: 4,
  title: 'Group actions',
  track: 'Algebra',
  prereqs: [3],
  why: md`Groups matter because they act. One counting principle — orbit–stabilizer — and one congruence
    about $p$-groups yield every structure theorem in this unit. The same pattern returns in Unit 11, where
    $\Z$ acts on $\R$ and the orbit space is the circle.`,
  definitions: [
    {
      term: 'Action',
      body: md`An action of $G$ on a set $X$ is a map $G \times X \to X$, $(g, x) \mapsto g \cdot x$, with
        $e \cdot x = x$ and $g \cdot (h \cdot x) = (gh) \cdot x$.`,
    },
    {
      term: 'Orbit, stabilizer, fixed points',
      body: md`$G \cdot x = \{g \cdot x : g \in G\}$; $G_x = \{g : g \cdot x = x\}$;
        $X^G = \{x : g \cdot x = x \text{ for all } g\}$; $\mathrm{Fix}(g) = \{x : g \cdot x = x\}$.`,
    },
    {
      term: 'Conjugation',
      body: md`$G$ acts on itself by $g \cdot x = gxg^{-1}$. Its orbits are the conjugacy classes.`,
    },
    {
      term: 'p-group',
      body: md`For a prime $p$, a $p$-group is a finite group of order $p^k$ for some $k \ge 0$.`,
    },
  ],
  problems: [
    {
      id: '4.1',
      kind: 'prove',
      title: 'Orbits and stabilizers',
      statement: md`For an action of $G$ on $X$, prove: (a) the orbits partition $X$; (b) each stabilizer $G_x$
        is a subgroup; (c) $G_{g \cdot x} = gG_xg^{-1}$.`,
      uses: ['1.1', '2.4'],
      hints: [
        md`(a) Orbits are the classes of $x \sim y \iff y = g \cdot x$ for some $g$.`,
        md`(c) Prove $\supseteq$ directly; then apply that to $g^{-1}$ and the point $g \cdot x$.`,
      ],
      solution: md`(a) Put $x \sim y$ iff $y = g \cdot x$ for some $g$. Reflexive: $e \cdot x = x$. Symmetric:
        if $y = g \cdot x$ then $g^{-1} \cdot y = (g^{-1}g) \cdot x = x$. Transitive: $y = g \cdot x$ and
        $z = h \cdot y$ give $z = (hg) \cdot x$. The class of $x$ is $G \cdot x$; apply 1.1. (b) $e \in G_x$. If
        $g, h \in G_x$ then $h^{-1} \cdot x = h^{-1} \cdot (h \cdot x) = x$, so
        $(gh^{-1}) \cdot x = g \cdot x = x$; apply 2.4. (c) If $h \in G_x$ then
        $(ghg^{-1}) \cdot (g \cdot x) = g \cdot (h \cdot x) = g \cdot x$, so $gG_xg^{-1} \subseteq G_{g \cdot x}$.
        Applied to $g^{-1}$ and $g \cdot x$: $g^{-1}G_{g \cdot x}\,g \subseteq G_x$, i.e.
        $G_{g \cdot x} \subseteq gG_xg^{-1}$.`,
      checks: [
        md`Each axiom of the relation comes from an axiom of the action.`,
        md`(c) proves both inclusions.`,
      ],
    },
    {
      id: '4.2',
      kind: 'prove',
      title: 'Orbit–stabilizer',
      statement: md`For an action of a finite group $G$ on $X$ and $x \in X$, prove that $gG_x \mapsto g \cdot x$
        is a well-defined bijection from the left cosets of $G_x$ to $G \cdot x$. Conclude
        $|G \cdot x| = [G : G_x]$, which divides $|G|$.`,
      uses: ['3.2', '4.1'],
      hints: [md`$g \cdot x = h \cdot x \iff g^{-1}h \in G_x \iff gG_x = hG_x$. Read it both ways.`],
      solution: md`$g \cdot x = h \cdot x \iff (g^{-1}h) \cdot x = x \iff g^{-1}h \in G_x \iff gG_x = hG_x$ — the
        first step acts by $g^{-1}$ (or by $g$ to return), the last is 3.2. Right to left is well-definedness,
        left to right is injectivity, and surjectivity is the definition of the orbit. So
        $|G \cdot x| = [G : G_x] = |G|/|G_x|$ by Lagrange.`,
      checks: [
        md`Well-definedness and injectivity are both proved.`,
        md`Lagrange is cited to make the index a divisor of $|G|$.`,
      ],
    },
    {
      id: '4.3',
      kind: 'prove',
      title: 'Counting orbits',
      statement: md`Let a finite group $G$ act on a finite set $X$. Prove that the number of orbits is
        $\frac{1}{|G|}\sum_{g \in G}|\mathrm{Fix}(g)|$. Use it to count the necklaces of 6 beads, each black or
        white, up to rotation.`,
      uses: ['4.2'],
      hints: [
        md`Count the pairs $\{(g, x) : g \cdot x = x\}$ two ways.`,
        md`Summing over $x$ gives $\sum_x |G_x|$. Rewrite with 4.2 and group by orbit.`,
        md`Rotation by $k$ steps fixes a coloring iff the coloring is constant on each cycle of the rotation.
          How many cycles?`,
      ],
      solution: md`Let $S = \{(g, x) : g \cdot x = x\}$. By $g$: $|S| = \sum_g |\mathrm{Fix}(g)|$. By $x$:
        $|S| = \sum_x |G_x| = \sum_x |G|/|G \cdot x|$ (4.2). An orbit $O$ contributes
        $\sum_{x \in O}|G|/|O| = |G|$, so $|S| = |G| \cdot (\text{number of orbits})$.

        **Necklaces.** $\Z/6$ acts on the $2^6$ colorings $c$ of the positions $\Z/6$ by rotation,
        $([k] \cdot c)(i) = c(i - k)$. The cycles of rotation by $k$ are the cosets of the subgroup
        $\langle [k] \rangle$, and these subgroups are $\langle 0 \rangle = \{0\}$,
        $\langle 1 \rangle = \langle 5 \rangle = \Z/6$, $\langle 2 \rangle = \langle 4 \rangle = \{0, 2, 4\}$ and
        $\langle 3 \rangle = \{0, 3\}$. So for $k = 0, \dots, 5$ there are $6, 1, 2, 3, 2, 1$ cycles, and a
        coloring is fixed iff it is constant on each cycle: $64 + 2 + 4 + 8 + 4 + 2 = 84$ fixed pairs, and
        $84/6 = 14$ necklaces.`,
      checks: [
        md`The double count is set up on an explicit set of pairs.`,
        md`Orbit–stabilizer replaces $|G_x|$, and the sum is regrouped by orbit.`,
        md`The necklace count lists each rotation's fixed colorings and divides by $|G|$.`,
      ],
    },
    {
      id: '4.4',
      kind: 'prove',
      title: 'The fixed-point congruence',
      statement: md`Let $G$ be a $p$-group acting on a finite set $X$. Prove $|X| \equiv |X^G| \pmod p$.`,
      uses: ['4.1', '4.2'],
      hints: [
        md`Split $X$ into orbits. Which orbits are the fixed points?`,
        md`What sizes can the other orbits have?`,
      ],
      solution: md`$X$ is the disjoint union of its orbits (4.1), and $x \in X^G$ iff $G \cdot x = \{x\}$. So
        $|X| = |X^G| + \sum |O|$ over the orbits with more than one element. Each $|O|$ divides $|G| = p^k$
        (4.2), so by unique factorization $|O| = p^j$, and $|O| > 1$ forces $j \ge 1$. So $p$ divides
        $|X| - |X^G|$.`,
      checks: [
        md`Fixed points are identified with the one-point orbits.`,
        md`Divisors of $p^k$ larger than 1 are shown to be multiples of $p$.`,
      ],
    },
    {
      id: '4.5',
      kind: 'decide',
      title: 'Forced fixed points (i)',
      statement: md`**Prove or disprove:** whenever a group of order 25 acts on a set with 11 elements, some
        point is fixed by every element of the group.`,
      verdict: true,
      uses: ['4.4'],
      hints: [md`Is 25 a prime power?`],
      solution: md`**True.** $25 = 5^2$, so by 4.4, $|X^G| \equiv 11 \equiv 1 \pmod 5$. In particular
        $|X^G| \ne 0$.`,
      checks: [md`The congruence is applied with $p = 5$.`, md`Nonemptiness is read off the residue.`],
    },
    {
      id: '4.6',
      kind: 'decide',
      title: 'Forced fixed points (ii)',
      statement: md`**Prove or disprove:** whenever a group of order 12 acts on a set with 5 elements, some
        point is fixed by every element of the group.`,
      verdict: false,
      hints: [
        md`What constrains the sizes of orbits?`,
        md`Orbit sizes divide 12. Can they add up to 5 without using 1? If so, build such an action.`,
      ],
      solution: md`**False.** Let $\Z/12$ act on $X = \{a_0, a_1\} \cup \{b_0, b_1, b_2\}$ by
        $[k] \cdot a_i = a_{(i + k) \bmod 2}$ and $[k] \cdot b_j = b_{(j + k) \bmod 3}$. This is well defined
        because $2 \mid 12$ and $3 \mid 12$: changing $k$ by a multiple of 12 changes $i + k$ by a multiple of 2
        and $j + k$ by a multiple of 3. The axioms hold because addition is associative and $[0]$ acts
        trivially. $[1]$ moves every point, so nothing is fixed by the whole group.`,
      checks: [
        md`The action is checked to be well defined on classes mod 12.`,
        md`The action axioms are verified.`,
        md`Every point is shown to be moved by some group element.`,
      ],
    },
    {
      id: '4.7',
      kind: 'prove',
      title: 'p-groups have centers',
      statement: md`Prove that a nontrivial $p$-group $G$ has nontrivial center. Deduce that every group of
        order $p^2$ is abelian.`,
      uses: ['4.4', '3.3', '3.9'],
      hints: [
        md`Let $G$ act on itself by conjugation. What is $X^G$?`,
        md`For order $p^2$: $|Z(G)|$ is $p$ or $p^2$. If $p$, what is $G/Z(G)$? Use 3.9.`,
      ],
      solution: md`Under conjugation $x$ is fixed iff $gxg^{-1} = x$ for all $g$: $X^G = Z(G)$. By 4.4,
        $|Z(G)| \equiv |G| \equiv 0 \pmod p$. Since $e \in Z(G)$, $|Z(G)| \ge 1$, hence $|Z(G)| \ge p$.

        **Order $p^2$.** $Z(G)$ is a normal subgroup (3.9), so its order divides $p^2$ and, by the above, is $p$
        or $p^2$. If $p^2$, $G = Z(G)$ is abelian. If $p$, then $G/Z(G)$ has prime order $p$, so is cyclic
        (3.3(c)),
        so $G$ is abelian (3.9) — whence $Z(G) = G$, contradicting $|Z(G)| = p$. So $G$ is abelian.`,
      checks: [
        md`The fixed points of conjugation are identified as the center.`,
        md`The congruence plus $e \in Z(G)$ gives $|Z(G)| \ge p$.`,
        md`Both possible orders of the center are handled.`,
      ],
    },
    {
      id: '4.8',
      kind: 'flaw',
      title: 'Stabilizers along an orbit',
      statement: md`**Claim.** If $x$ and $y$ lie in the same orbit, then $G_x = G_y$. Find the first line that
        is wrong or does not follow.`,
      lines: [
        md`Since $x$ and $y$ lie in one orbit, $y = h \cdot x$ for some $h \in G$.`,
        md`Let $g \in G_x$, so $g \cdot x = x$.`,
        md`Then $g \cdot y = g \cdot (h \cdot x) = (gh) \cdot x$.`,
        md`Also $(hg) \cdot x = h \cdot (g \cdot x) = h \cdot x = y$.`,
        md`As $g$ fixes $x$, it does not matter in which order $g$ and $h$ are applied to $x$, so
          $(gh) \cdot x = (hg) \cdot x = y$.`,
        md`Hence $g \in G_y$, so $G_x \subseteq G_y$, and by symmetry $G_x = G_y$. $\blacksquare$`,
      ],
      flawLine: 5,
      hints: [
        md`Which line uses a property of the group that was never assumed?`,
        md`Test the claim on $S_3$ acting on $\{1, 2, 3\}$.`,
      ],
      solution: md`**Line 5.** $(gh) \cdot x = (hg) \cdot x$ would follow from $gh = hg$, which need not hold.
        In $S_3$ acting on $\{1, 2, 3\}$, $G_3 = \{e, (1\,2)\}$, and $1 = (1\,3) \cdot 3$ is in the same orbit,
        but $G_1 = \{e, (2\,3)\}$. The truth is 4.1(c): stabilizers along an orbit are *conjugate*,
        $G_{h \cdot x} = hG_xh^{-1}$ — equal when $G$ is abelian.`,
      checks: [
        md`Line 5 is identified and the hidden assumption (commutativity) named.`,
        md`A counterexample is given with both stabilizers computed.`,
      ],
    },
    {
      id: '4.9',
      kind: 'prove',
      challenge: true,
      title: "Cauchy's theorem",
      statement: md`Let $G$ be a finite group and $p$ a prime dividing $|G|$. Prove that $G$ has an element of
        order $p$. (Consider $X = \{(g_1, \dots, g_p) \in G^p : g_1g_2\cdots g_p = e\}$, with $\Z/p$ acting by
        cyclically rotating the entries.)`,
      uses: ['4.4', '2.6'],
      hints: [
        md`How large is $X$? The first $p - 1$ entries can be anything.`,
        md`Rotation keeps the product $e$: if $g_1(g_2\cdots g_p) = e$, then $(g_2\cdots g_p)g_1 = e$. Why?`,
        md`Apply 4.4. Which tuples are fixed? One fixed tuple is obvious.`,
      ],
      solution: md`$|X| = |G|^{p-1}$: choose $g_1, \dots, g_{p-1}$ freely, and then
        $g_p = (g_1\cdots g_{p-1})^{-1}$ is forced. If $g_1(g_2\cdots g_p) = e$ then $g_2\cdots g_p = g_1^{-1}$,
        so $g_2\cdots g_p\,g_1 = e$: one-step rotation $\rho$ maps $X$ to $X$, and $[k] \cdot t = \rho^k(t)$ is
        an action of $\Z/p$ since $\rho^p = \mathrm{id}$. A tuple is fixed by every rotation iff it is fixed by
        $\rho$ iff all its entries are equal: $(g, \dots, g)$ with $g^p = e$. By 4.4,
        $|X^{\Z/p}| \equiv |G|^{p-1} \equiv 0 \pmod p$. As $(e, \dots, e)$ is fixed, there are at least
        $p \ge 2$ fixed tuples, so some $g \ne e$ has $g^p = e$; its order divides $p$ (2.6) and is not 1, so
        it is $p$.`,
      checks: [
        md`$|X|$ is computed and shown divisible by $p$.`,
        md`Rotation is shown to preserve $X$ and to define an action of $\Z/p$.`,
        md`The fixed tuples are identified as $(g, \dots, g)$ with $g^p = e$.`,
        md`The count of fixed tuples — at least $p$ — produces an element $g \ne e$.`,
      ],
    },
  ],
}

export default unit
