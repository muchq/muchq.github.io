import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'quotients',
  n: 3,
  title: 'Homomorphisms and quotient groups',
  track: 'Algebra',
  prereqs: [2],
  why: md`Homomorphisms compare groups; quotients collapse them. The first isomorphism theorem says these
    are one idea — and you have already proved its skeleton for sets (1.4). This is where well-definedness
    stops being a formality.`,
  definitions: [
    {
      term: 'Homomorphism',
      body: md`$\varphi\colon G \to H$ with $\varphi(ab) = \varphi(a)\varphi(b)$ for all $a, b$. Its **kernel**
        is $\ker\varphi = \{g : \varphi(g) = e_H\}$, its **image** $\varphi(G)$. An **isomorphism** is a
        bijective homomorphism; $G \cong H$ if one exists.`,
    },
    {
      term: 'Cosets and index',
      body: md`For $H \le G$ and $g \in G$, the **left coset** is $gH = \{gh : h \in H\}$ and the right coset
        $Hg = \{hg : h \in H\}$. The number of left cosets is the **index** $[G : H]$.`,
    },
    {
      term: 'Normal subgroup',
      body: md`$N \le G$ is **normal**, $N \trianglelefteq G$, if $gng^{-1} \in N$ for all $g \in G$ and
        $n \in N$.`,
    },
    {
      term: 'Quotient group',
      body: md`For $N \trianglelefteq G$, $G/N$ is the set of left cosets with $(aN)(bN) = abN$. That this is
        well defined is Problem 3.5.`,
    },
    {
      term: 'Center',
      body: md`$Z(G) = \{z \in G : zg = gz \text{ for all } g \in G\}$.`,
    },
  ],
  problems: [
    {
      id: '3.1',
      kind: 'prove',
      title: 'Kernels detect injectivity',
      statement: md`Let $\varphi\colon G \to H$ be a homomorphism. Prove: (a) $\varphi(e_G) = e_H$ and
        $\varphi(g^{-1}) = \varphi(g)^{-1}$; (b) $\ker\varphi$ is a normal subgroup of $G$; (c) $\varphi$ is
        injective if and only if $\ker\varphi = \{e_G\}$; (d) the image $\varphi(G)$ is a subgroup of $H$.`,
      uses: ['2.1', '2.4'],
      hints: [
        md`(a) $\varphi(e) = \varphi(ee) = \varphi(e)\varphi(e)$. Cancel — in which group?`,
        md`(c) $\varphi(a) = \varphi(b)$ if and only if $\varphi(ab^{-1}) = e$.`,
      ],
      solution: md`(a) $\varphi(e) = \varphi(e)\varphi(e)$; cancelling in $H$ gives $e_H = \varphi(e)$. Then
        $\varphi(g)\varphi(g^{-1}) = \varphi(e) = e_H$, so $\varphi(g^{-1}) = \varphi(g)^{-1}$ (one-sided inverses
        are inverses, by cancellation). (b) $e_G \in \ker\varphi$; for $a, b \in \ker\varphi$,
        $\varphi(ab^{-1}) = \varphi(a)\varphi(b)^{-1} = e$, so 2.4 applies. For $g \in G$ and $n \in \ker\varphi$:
        $\varphi(gng^{-1}) = \varphi(g)\,e\,\varphi(g)^{-1} = e$. (c) If $\varphi$ is injective and
        $\varphi(g) = e = \varphi(e)$, then $g = e$. Conversely, if the kernel is trivial and
        $\varphi(a) = \varphi(b)$, then $\varphi(ab^{-1}) = e$, so $ab^{-1} = e$ and $a = b$. (d)
        $e_H = \varphi(e) \in \varphi(G)$, and $\varphi(a)\varphi(b)^{-1} = \varphi(ab^{-1}) \in \varphi(G)$ by
        (a); apply 2.4 in $H$.`,
      checks: [
        md`(a) cancels in $H$, not in $G$.`,
        md`(b) checks normality, not only the subgroup property.`,
        md`(c) proves both directions; the substantial one passes through $ab^{-1}$.`,
        md`(d) checks the image with the subgroup test, in $H$.`,
      ],
    },
    {
      id: '3.2',
      kind: 'prove',
      title: "Cosets, and Lagrange's theorem",
      statement: md`Let $H$ be a subgroup of a group $G$. Prove that the left cosets of $H$ partition $G$, that
        $aH = bH$ if and only if $a^{-1}b \in H$, and that $h \mapsto ah$ is a bijection $H \to aH$. Deduce
        Lagrange's theorem: if $G$ is finite, $|G| = [G : H]\,|H|$.`,
      uses: ['1.1', '2.1'],
      hints: [
        md`Cosets are the classes of $a \sim b \iff a^{-1}b \in H$. Check the axioms and identify the class of $a$.`,
        md`Size: $h \mapsto ah$ is a bijection $H \to aH$.`,
      ],
      solution: md`Define $a \sim b$ iff $a^{-1}b \in H$. Reflexive: $a^{-1}a = e \in H$. Symmetric:
        $b^{-1}a = (a^{-1}b)^{-1} \in H$. Transitive: $a^{-1}c = (a^{-1}b)(b^{-1}c) \in H$. The class of $a$ is
        $\{b : a^{-1}b \in H\} = \{ah : h \in H\} = aH$. By 1.1 the cosets partition $G$, and $aH = bH$ iff
        $a \sim b$ iff $a^{-1}b \in H$. The map $H \to aH$, $h \mapsto ah$, is onto by definition and
        one-to-one by cancellation. None of this used finiteness. If $G$ is finite, each coset has $|H|$
        elements, and summing over the $[G : H]$ disjoint cosets gives $|G| = [G : H]\,|H|$.`,
      checks: [
        md`The cosets are shown to partition $G$.`,
        md`The bijection $H \to aH$ is checked in both directions.`,
        md`The count uses disjointness of distinct cosets.`,
      ],
    },
    {
      id: '3.3',
      kind: 'prove',
      title: 'Consequences, and Fermat',
      statement: md`Let $G$ be a finite group. Prove: (a) every element has finite order dividing $|G|$;
        (b) $g^{|G|} = e$ for every $g$; (c) every group of prime order is cyclic. (d) Deduce Fermat's little
        theorem: if $p$ is prime and $p \nmid a$, then $a^{p-1} \equiv 1 \pmod p$. (You may assume that the
        nonzero classes $(\Z/p)^\times$ form a group of order $p - 1$ under multiplication.)`,
      uses: ['2.6', '3.2'],
      hints: [
        md`(a) Apply Lagrange to $\langle g \rangle$. First: why is the order of $g$ finite?`,
        md`(c) Take $g \ne e$ and apply (a).`,
      ],
      solution: md`(a) The powers $g, g^2, \dots$ cannot all be distinct in a finite group, and $g^i = g^j$
        with $i < j$ gives $g^{j - i} = e$; so $g$ has some finite order $n$. Then $|\langle g \rangle| = n$
        (2.6), which divides $|G|$ by Lagrange (3.2). (b) With $|G| = nk$, $g^{|G|} = (g^n)^k = e$. (c) If
        $|G| = p$ is prime, take $g \ne e$: its order divides $p$ and is not 1, so it is $p$, and
        $\langle g \rangle$ has $p$ elements, so equals $G$. (d) If $p \nmid a$ then $[a] \in (\Z/p)^\times$,
        a group of order $p - 1$, so $[a]^{p-1} = [1]$ by (b): $a^{p-1} \equiv 1 \pmod p$.`,
      checks: [
        md`Finiteness of the order is justified.`,
        md`(c) excludes order 1 using $g \ne e$.`,
        md`(d) checks that $[a]$ lies in the group.`,
      ],
    },
    {
      id: '3.4',
      kind: 'decide',
      title: 'Coprime orders',
      statement: md`**Prove or disprove:** if $H$ and $K$ are subgroups of a finite group with
        $\gcd(|H|, |K|) = 1$, then $H \cap K = \{e\}$.`,
      verdict: true,
      uses: ['3.2'],
      hints: [md`$H \cap K$ is a subgroup of something. Of what?`],
      solution: md`**True.** $H \cap K$ contains $e$ and is closed under products and inverses (both $H$ and $K$
        are), so it is a subgroup of $H$ and of $K$. By Lagrange its order divides $|H|$ and $|K|$, hence
        divides their gcd, $1$. So $H \cap K = \{e\}$.`,
      checks: [md`$H \cap K$ is shown to be a subgroup.`, md`Lagrange is applied inside $H$ and inside $K$.`],
    },
    {
      id: '3.5',
      kind: 'prove',
      title: 'Why normality',
      statement: md`(a) Let $N \trianglelefteq G$. Prove that $(aN)(bN) := abN$ is well defined and makes $G/N$
        a group, and that $\pi\colon G \to G/N$, $\pi(g) = gN$, is a surjective homomorphism with kernel $N$.
        (b) In $S_3$ let $H = \{e, (1\,2)\}$. Show that the same rule on the left cosets of $H$ is **not**
        well defined.`,
      uses: ['3.2'],
      hints: [
        md`Well-defined: if $aN = a'N$ and $bN = b'N$, write $a' = an$, $b' = bm$ and show $a'b' \in abN$.`,
        md`You need to move $n$ past $b$: $nb = b(b^{-1}nb)$.`,
        md`(b) $e$ and $(1\,2)$ represent the same coset. Try multiplying each by $(1\,3)$.`,
      ],
      solution: md`(a) By 3.2, $aN = a'N$ iff $a' = an$ for some $n \in N$. So let $a' = an$, $b' = bm$ with
        $n, m \in N$. Then $a'b' = anbm = ab\,(b^{-1}nb)\,m$, and $b^{-1}nb \in N$ by normality, so
        $a'b' \in abN$ and $a'b'N = abN$. The axioms: $(aN)(bN)(cN) = abcN$ in either bracketing; $eN = N$ is
        an identity; $a^{-1}N$ is an inverse of $aN$. $\pi(ab) = abN = \pi(a)\pi(b)$, $\pi$ is onto, and
        $\pi(g) = N$ iff $g \in N$.

        (b) Composing right to left, $(1\,2)H = \{(1\,2), e\} = H = eH$. With $b = (1\,3)$:
        $ebH = \{(1\,3), (1\,3)(1\,2)\} = \{(1\,3), (1\,2\,3)\}$, while $(1\,2)(1\,3) = (1\,3\,2)$ and
        $(1\,3\,2)H = \{(1\,3\,2), (2\,3)\}$. Different cosets from representatives of the same coset: the rule
        is not a function.`,
      checks: [
        md`Well-definedness is proved for a change of **both** representatives.`,
        md`Normality is used exactly where an element of $N$ is moved past $b$.`,
        md`The kernel of $\pi$ is computed.`,
        md`(b) shows the permutation arithmetic and two distinct resulting cosets.`,
      ],
    },
    {
      id: '3.6',
      kind: 'prove',
      title: 'Index two',
      statement: md`Prove that every subgroup $H$ of index 2 in a group $G$ is normal.`,
      uses: ['3.2'],
      hints: [
        md`With two left cosets, what are they? Do the same for right cosets — but justify that there are two.`,
        md`For $g \notin H$, compare $gH$ and $Hg$.`,
      ],
      solution: md`The two left cosets partition $G$ and one is $eH = H$, so the other is $G \setminus H$. Right
        cosets also partition $G$: they are the classes of $a \sim b \iff ba^{-1} \in H$, whose axioms check
        exactly as in 3.2. Inversion maps left cosets to right cosets, since $(gh)^{-1} = h^{-1}g^{-1}$ gives
        $(gH)^{-1} = Hg^{-1}$, and every right coset $Hk$ is $(k^{-1}H)^{-1}$; distinct left cosets go to distinct
        right cosets because inversion is a bijection of $G$. So there are exactly two right cosets as well:
        $H$ and $G \setminus H$. Let $g \in G$. If $g \in H$, then $gH = H = Hg$. If $g \notin H$,
        then $gH$ and $Hg$ are each the coset containing $g$ other than $H$, so $gH = G \setminus H = Hg$.
        Either way $gH = Hg$. So for $h \in H$, $gh \in Hg$: $gh = h'g$ with $h' \in H$, i.e.
        $ghg^{-1} = h' \in H$.`,
      checks: [
        md`The number of right cosets is justified, not assumed equal to the number of left cosets.`,
        md`Both cases $g \in H$ and $g \notin H$ are handled.`,
        md`$gH = Hg$ is converted into $ghg^{-1} \in H$.`,
      ],
    },
    {
      id: '3.7',
      kind: 'prove',
      title: 'The first isomorphism theorem',
      statement: md`Let $\varphi\colon G \to H$ be a homomorphism with kernel $K$. Prove that
        $\bar\varphi\colon G/K \to \varphi(G)$, $\bar\varphi(gK) = \varphi(g)$, is a well-defined isomorphism.`,
      uses: ['1.4', '3.1', '3.2', '3.5'],
      hints: [
        md`Compare with 1.4. What is "same image under $\varphi$" in terms of $K$?`,
        md`$\varphi(a) = \varphi(b) \iff a^{-1}b \in K \iff aK = bK$.`,
      ],
      solution: md`$K$ is normal (3.1(b)), so $G/K$ is a group (3.5), and $\varphi(G)$ is a group (3.1(d)). For $a, b \in G$:
        $\varphi(a) = \varphi(b) \iff \varphi(a^{-1}b) = e \iff a^{-1}b \in K \iff aK = bK$ (3.2). So "same image"
        is "same coset", and 1.4 makes $\bar\varphi$ a well-defined bijection onto $\varphi(G)$. It is a
        homomorphism: $\bar\varphi(aK\,bK) = \bar\varphi(abK) = \varphi(ab) = \varphi(a)\varphi(b)$.`,
      checks: [
        md`Well-definedness and injectivity both come from the chain of equivalences.`,
        md`The homomorphism property uses the quotient operation.`,
        md`Normality of the kernel is cited, so $G/K$ is a group.`,
      ],
    },
    {
      id: '3.8',
      kind: 'prove',
      title: 'The circle group',
      statement: md`Let $S^1 = \{z \in \C : |z| = 1\}$ under multiplication. Prove $\R/\Z \cong S^1$, where $\R$
        is under addition. (Assume: $p(t) = e^{2\pi i t}$ satisfies $p(s + t) = p(s)p(t)$, maps $\R$ onto $S^1$,
        and $p(t) = 1 \iff t \in \Z$.)`,
      uses: ['3.7'],
      hints: [md`Find a surjective homomorphism $\R \to S^1$ and compute its kernel.`],
      solution: md`$S^1$ is a group: $|zw| = |z||w|$ and $|z^{-1}| = |z|^{-1}$. $p\colon (\R, +) \to (S^1, \cdot)$
        is a homomorphism by the exponent law, surjective by assumption, with kernel $\{t : p(t) = 1\} = \Z$.
        By the first isomorphism theorem (3.7), $\R/\Z \cong S^1$. Unit 10 upgrades this to a homeomorphism.`,
      checks: [
        md`Homomorphism, surjectivity and kernel are each verified.`,
        md`The first isomorphism theorem is applied with the right kernel.`,
      ],
    },
    {
      id: '3.9',
      kind: 'prove',
      title: 'Cyclic modulo the center',
      statement: md`Prove that $Z(G)$ is a normal subgroup of $G$, and that if $G/Z(G)$ is cyclic, then $G$ is
        abelian.`,
      hints: [
        md`First: $Z(G)$ is a normal subgroup. Then suppose $G/Z(G) = \langle gZ(G) \rangle$.`,
        md`Every element of $G$ is $g^k z$ with $z \in Z(G)$. Multiply two such elements in both orders.`,
      ],
      solution: md`Write $Z = Z(G)$. $e \in Z$; if $z, w \in Z$ then from $wg = gw$ we get $gw^{-1} = w^{-1}g$,
        so $zw^{-1}$ commutes with every $g$: $Z$ is a subgroup (2.4). It is normal: $gzg^{-1} = zgg^{-1} = z$.
        Let $G/Z = \langle gZ \rangle$. For $a \in G$, $aZ = (gZ)^k = g^kZ$ for some $k$, so $a = g^kz$ with
        $z \in Z$; likewise $b = g^lw$ with $w \in Z$. Then $ab = g^kzg^lw = g^{k+l}zw$ and
        $ba = g^lwg^kz = g^{k+l}wz = g^{k+l}zw$, using only that $z, w$ are central.`,
      uses: ['2.4'],
      checks: [
        md`$Z(G)$ is shown to be a normal subgroup.`,
        md`Each element is written as $g^kz$, justified from the coset equation.`,
        md`Commutativity is used only for elements of $Z(G)$.`,
      ],
    },
    {
      id: '3.10',
      kind: 'flaw',
      title: 'Maps out of ℤ/4',
      statement: md`**Claim.** $\varphi\colon \Z/4 \to \Z/6$, $\varphi([a]_4) = [a]_6$, is a homomorphism of
        additive groups. Find the first line that is wrong or does not follow.`,
      lines: [
        md`For $[a]_4 \in \Z/4$ define $\varphi([a]_4) = [a]_6$.`,
        md`For $[a]_4, [b]_4$: $\varphi([a]_4 + [b]_4) = \varphi([a + b]_4) = [a + b]_6$.`,
        md`And $[a + b]_6 = [a]_6 + [b]_6 = \varphi([a]_4) + \varphi([b]_4)$.`,
        md`So $\varphi$ preserves addition and is a homomorphism. $\blacksquare$`,
      ],
      flawLine: 1,
      hints: [md`Before the homomorphism property: is $\varphi$ a function at all?`],
      solution: md`**Line 1** defines no function: $[0]_4 = [4]_4$, but $[0]_6 \ne [4]_6$. The value depends on
        the representative. Lines 2–3 would be fine manipulations *if* $\varphi$ existed. (A rule
        $[a]_m \mapsto [ka]_n$ is well defined exactly when $n \mid km$.)`,
      checks: [
        md`Line 1 is identified as not well defined.`,
        md`Two representatives of one class with different images are exhibited.`,
      ],
    },
    {
      id: '3.11',
      kind: 'decide',
      challenge: true,
      title: 'The converse of Lagrange',
      statement: md`**Prove or disprove:** the alternating group $A_4$ has a subgroup of order 6. Here $A_4$ is
        the group of even permutations of $\{1, 2, 3, 4\}$: the identity, the three products of two disjoint
        transpositions, and the eight 3-cycles (each is even, as $(a\,b\,c) = (a\,c)(a\,b)$) — 12 elements.`,
      verdict: false,
      uses: ['2.12', '3.3', '3.5', '3.6'],
      hints: [
        md`List the elements of $A_4$ by cycle type. How many 3-cycles?`,
        md`A subgroup of order 6 has index 2. What does that force about $g^2$ for every $g \in A_4$?`,
        md`Every 3-cycle is a square of something.`,
      ],
      solution: md`**False.** Suppose $H \le A_4$ with $|H| = 6$. Then $[A_4 : H] = 2$, so $H$ is normal (3.6) and
        $A_4/H$ is a group of order 2 (3.5), in which every element squares to the identity (3.3(b)). So
        $g^2H = (gH)^2 = H$, i.e. $g^2 \in H$, for every $g \in A_4$. If $\sigma$ is a 3-cycle, then
        $\sigma^3 = e$ and $\sigma = \sigma^4 = (\sigma^2)^2$ with $\sigma^2 \in A_4$, so $\sigma \in H$. Then
        $H$ contains $e$ and eight 3-cycles — at least 9 elements, not 6.`,
      checks: [
        md`The size of $H$ is contradicted by counting the 3-cycles it must contain.`,
        md`"Index 2 ⇒ normal ⇒ all squares lie in $H$" is justified step by step.`,
        md`Each 3-cycle is exhibited as a square of an element of $A_4$.`,
      ],
    },
    {
      id: '3.12',
      kind: 'prove',
      title: 'The correspondence theorem',
      statement: md`Let $N \trianglelefteq G$ and $\pi\colon G \to G/N$. Prove that $K \mapsto \pi(K)$ is an inclusion-preserving
        bijection from the subgroups of $G$ containing $N$ to the subgroups of $G/N$, with inverse
        $\bar K \mapsto \pi^{-1}(\bar K)$; that $K \trianglelefteq G$ iff $\pi(K) \trianglelefteq G/N$; and that, for finite $G$,
        $|\pi^{-1}(\bar K)| = |\bar K|\,|N|$.`,
      uses: ['2.4', '3.2', '3.5'],
      hints: [
        md`Images and preimages of subgroups under a homomorphism are subgroups. Which composite is the identity
          for free, and which needs $N \subseteq K$?`,
        md`$\pi^{-1}(\pi(K)) = KN$.`,
      ],
      solution: md`Images and preimages of subgroups under the homomorphism $\pi$ are subgroups (2.4: they contain the
        identity, and $\pi(a)\pi(b)^{-1} = \pi(ab^{-1})$), and $\pi^{-1}(\bar K) \supseteq \pi^{-1}(\{N\}) = N$.
        $\pi(\pi^{-1}(\bar K)) = \bar K$ because $\pi$ is onto. And $x \in \pi^{-1}(\pi(K))$ iff $xN = kN$ for some
        $k \in K$ iff $x \in kN \subseteq K$ — using $N \subseteq K$ — so $\pi^{-1}(\pi(K)) = K$. Both maps clearly
        preserve inclusion.

        *Normality.* If $K \trianglelefteq G$, then $(gN)(kN)(gN)^{-1} = gkg^{-1}N \in \pi(K)$. Conversely, if $\pi(K)$ is
        normal, then $\pi(gkg^{-1}) \in \pi(K)$, so $gkg^{-1} \in \pi^{-1}(\pi(K)) = K$.

        *Size.* $\pi^{-1}(\bar K)$ is the union of the $|\bar K|$ cosets of $N$ that are elements of $\bar K$; they are
        disjoint and each has $|N|$ elements (3.2).`,
      checks: [
        md`Both composites are shown to be the identity, with $N \subseteq K$ used where it is needed.`,
        md`Normality is transferred in both directions.`,
        md`The size count uses disjoint cosets.`,
      ],
    },
    {
      id: '3.13',
      kind: 'prove',
      title: 'The second and third isomorphism theorems',
      statement: md`(a) Let $H \le G$ and $N \trianglelefteq G$. Prove that $HN = \{hn\}$ is a subgroup, that $H \cap N
        \trianglelefteq H$, and that $H/(H \cap N) \cong HN/N$. (b) Let $N \subseteq K$ be normal subgroups of $G$. Prove
        that $K/N \trianglelefteq G/N$ and $(G/N)/(K/N) \cong G/K$.`,
      uses: ['2.4', '3.1', '3.7'],
      hints: [
        md`Each isomorphism is a first isomorphism theorem in disguise. Find the homomorphism.`,
        md`(a) $h \mapsto hN$. (b) $gN \mapsto gK$ — check it is well defined.`,
      ],
      solution: md`(a) $HN$ is nonempty, and $(hn)(h'n')^{-1} = hh'^{-1} \cdot (h'nn'^{-1}h'^{-1}) \in HN$ by normality of $N$; so
        it is a subgroup (2.4), and it contains $N$, which is normal in it. $\varphi\colon H \to HN/N$, $h \mapsto hN$,
        is a homomorphism, onto since $hnN = hN$, with kernel $H \cap N$. So $H \cap N \trianglelefteq H$ (3.1) and
        $H/(H \cap N) \cong HN/N$ (3.7).

        (b) $\psi\colon G/N \to G/K$, $gN \mapsto gK$, is well defined: $gN = g'N$ gives $g^{-1}g' \in N \subseteq K$.
        It is a homomorphism, onto, with kernel $\{gN : g \in K\} = K/N$. So $K/N \trianglelefteq G/N$ (3.1) and
        $(G/N)/(K/N) \cong G/K$ (3.7).`,
      checks: [
        md`$HN$ is shown to be a subgroup using normality of $N$.`,
        md`Each homomorphism is checked to be well defined and onto, and its kernel computed.`,
      ],
    },
  ],
}

export default unit
