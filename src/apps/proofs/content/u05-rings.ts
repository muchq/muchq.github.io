import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'rings',
  n: 5,
  title: 'Rings and ideals',
  track: 'Algebra',
  prereqs: [3, 1],
  why: md`A ring has two operations, and the quotient construction of Unit 3 works again — with ideals in the
    role of normal subgroups. Which quotients are fields is decided by one property of the ideal, and that is
    how $\Z/p$ and $\C$ are built. Zorn's lemma returns to manufacture maximal ideals.`,
  definitions: [
    {
      term: 'Ring',
      body: md`Here a **ring** is a set $R$ with $+$ and $\cdot$ such that $(R, +)$ is an abelian group,
        multiplication is associative and commutative with an identity $1$, and $a(b + c) = ab + ac$. A **unit**
        has a multiplicative inverse. $R$ is a **field** if $1 \ne 0$ and every nonzero element is a unit, and an
        **integral domain** if $1 \ne 0$ and $ab = 0$ implies $a = 0$ or $b = 0$. $R \times S$ is a ring under
        componentwise operations.`,
    },
    {
      term: 'Ideal, quotient ring',
      body: md`An **ideal** is an additive subgroup $I \subseteq R$ with $ra \in I$ for all $r \in R$, $a \in I$. It
        is **proper** if $I \ne R$. $(a) = Ra$ is the **principal** ideal of $a$. The **quotient ring** $R/I$ is the
        set of cosets $a + I$ with $(a + I) + (b + I) = (a + b) + I$ and $(a + I)(b + I) = ab + I$.`,
    },
    {
      term: 'Ring homomorphism',
      body: md`$\varphi\colon R \to S$ with $\varphi(a + b) = \varphi(a) + \varphi(b)$, $\varphi(ab) =
        \varphi(a)\varphi(b)$ and $\varphi(1) = 1$. Its **kernel** is $\{a : \varphi(a) = 0\}$; an isomorphism
        is a bijective homomorphism.`,
    },
    {
      term: 'Prime and maximal ideals',
      body: md`A proper ideal $P$ is **prime** if $ab \in P$ implies $a \in P$ or $b \in P$. A proper ideal $M$ is
        **maximal** if no ideal $J$ has $M \subsetneq J \subsetneq R$.`,
    },
    {
      term: 'Polynomials over a field',
      body: md`For a field $F$, $F[x]$ is the ring of polynomials. Assumed: $\deg(fg) = \deg f + \deg g$ for nonzero
        $f, g$, and division with remainder — for $g \ne 0$, every $f$ is $qg + r$ with $r = 0$ or
        $\deg r < \deg g$. A polynomial $p$ of degree at least 1 is **irreducible** if $p = ab$ forces $a$ or $b$
        to be constant.`,
    },
  ],
  problems: [
    {
      id: '5.1',
      kind: 'prove',
      title: 'Quotient rings',
      statement: md`Let $I$ be an ideal of $R$. Prove that the operations on $R/I$ are well defined and make it a
        ring, and that $\pi(a) = a + I$ is a surjective ring homomorphism with kernel $I$. Prove also that the
        kernel of any ring homomorphism is an ideal.`,
      uses: ['3.1', '3.5'],
      hints: [
        md`The additive part is already done: which earlier problem?`,
        md`For multiplication, change both representatives: $a' = a + i$, $b' = b + j$. Expand $a'b'$.`,
      ],
      solution: md`$(R, +)$ is abelian, so $I$ is a normal subgroup and $R/I$ is an abelian group with $\pi$ an
        additive homomorphism of kernel $I$ (3.5). **Multiplication.** If $a' = a + i$ and $b' = b + j$ with
        $i, j \in I$, then $a'b' = ab + (aj + ib + ij)$, and each of $aj$, $ib$, $ij$ lies in $I$ because $I$
        absorbs multiplication; so $a'b' + I = ab + I$. Associativity, commutativity, distributivity and the
        identity $1 + I$ are inherited from $R$, since every operation is computed on representatives. $\pi$
        preserves products and $1$ by definition.

        **Kernels.** The kernel of $\varphi$ is an additive subgroup (3.1), and if $\varphi(a) = 0$ then
        $\varphi(ra) = \varphi(r) \cdot 0 = 0$.`,
      checks: [
        md`Well-definedness of the product changes both representatives.`,
        md`Absorption is used for each of the three cross terms.`,
        md`The kernel is shown to absorb multiplication, not only to be a subgroup.`,
      ],
    },
    {
      id: '5.2',
      kind: 'prove',
      title: 'The first isomorphism theorem for rings',
      statement: md`Let $\varphi\colon R \to S$ be a ring homomorphism with kernel $K$. Prove that $\varphi(R)$ is a
        ring under the operations of $S$ and that $a + K \mapsto \varphi(a)$ is a ring isomorphism
        $R/K \cong \varphi(R)$.`,
      uses: ['3.7', '5.1'],
      hints: [md`The additive group isomorphism exists already. What is left to check?`],
      solution: md`$\varphi(R)$ is an additive subgroup of $S$ (3.1(d)), contains $1 = \varphi(1)$, and is closed under
        products since $\varphi(a)\varphi(b) = \varphi(ab)$; so it is a ring. By 3.7 applied to the additive
        groups, $\bar\varphi(a + K) = \varphi(a)$ is a well-defined bijective additive homomorphism
        $R/K \to \varphi(R)$. It preserves products — $\bar\varphi((a + K)(b + K)) = \varphi(ab) =
        \varphi(a)\varphi(b)$ — and $\bar\varphi(1 + K) = 1$.`,
      checks: [
        md`The image is shown to be a ring.`,
        md`The group isomorphism theorem is reused, not re-proved.`,
        md`Products and the identity are checked.`,
      ],
    },
    {
      id: '5.3',
      kind: 'decide',
      title: 'Images of ideals',
      statement: md`**Prove or disprove:** the image of an ideal under a ring homomorphism is an ideal.`,
      verdict: false,
      hints: [
        md`Absorption must hold for every element of the *target*. What if the homomorphism misses most of it?`,
        md`Try an inclusion of a small ring in a large one.`,
      ],
      solution: md`**False.** The inclusion $\Z \to \Q$ is a ring homomorphism, and the image of the ideal $2\Z$ is
        $2\Z$, which is not an ideal of $\Q$: $\frac12 \cdot 2 = 1 \notin 2\Z$.

        **True for surjective $\varphi$.** $\varphi(I)$ is an additive subgroup, and for $s \in S$ and
        $\varphi(a) \in \varphi(I)$, write $s = \varphi(r)$; then $s\varphi(a) = \varphi(ra) \in \varphi(I)$.`,
      checks: [
        md`The counterexample names a homomorphism, an ideal, and an element that breaks absorption.`,
        md`The surjective case is proved (optional but expected).`,
      ],
    },
    {
      id: '5.4',
      kind: 'prove',
      title: 'Fields have no ideals',
      statement: md`Prove that a ring $R$ with $1 \ne 0$ is a field if and only if its only ideals are $\{0\}$ and $R$.`,
      hints: [
        md`An ideal that contains a unit contains what?`,
        md`Conversely, for $a \ne 0$ look at the ideal $(a)$.`,
      ],
      solution: md`(⇒) Let $I \ne \{0\}$ be an ideal and $0 \ne a \in I$. Then $1 = a^{-1}a \in I$, so $r = r \cdot 1 \in I$
        for every $r$: $I = R$. (⇐) Let $a \ne 0$. The ideal $(a) = Ra$ contains $a \ne 0$, so $(a) = R \ni 1$:
        $1 = ba$ for some $b$, and $a$ is a unit.`,
      checks: [
        md`An ideal containing a unit is shown to be everything.`,
        md`The converse produces an inverse from the principal ideal.`,
      ],
    },
    {
      id: '5.5',
      kind: 'prove',
      title: 'Prime and maximal',
      statement: md`Prove: (a) a proper ideal $P$ is prime if and only if $R/P$ is an integral domain; (b) a proper ideal
        $M$ is maximal if and only if $R/M$ is a field. Deduce that maximal ideals are prime.`,
      uses: ['5.1'],
      hints: [
        md`(a) is a translation: what does $(a + P)(b + P) = 0 + P$ say?`,
        md`(b, ⇒) For $a \notin M$, the ideal $M + Ra$ is strictly bigger than $M$.`,
        md`(b, ⇐) If $M \subsetneq J$, take $a \in J \setminus M$ and use an inverse of $a + M$.`,
      ],
      solution: md`In $R/I$, $a + I = 0 + I$ iff $a \in I$, and $1 + I \ne 0 + I$ iff $I$ is proper.

        (a) $(a + P)(b + P) = 0 + P$ iff $ab \in P$. So "a zero product forces a zero factor" in $R/P$ says exactly
        "$ab \in P$ forces $a \in P$ or $b \in P$".

        (b, ⇒) Let $a \notin M$. $M + Ra = \{m + ra\}$ is an ideal containing $M$ and $a$, so by maximality it is
        $R$: $1 = m + ra$, i.e. $(r + M)(a + M) = 1 + M$. (b, ⇐) Let $M \subsetneq J$ with $J$ an ideal, and
        $a \in J \setminus M$. Then $a + M \ne 0$, so $(b + M)(a + M) = 1 + M$ for some $b$: $1 - ba \in M
        \subseteq J$, and with $ba \in J$ this gives $1 \in J$, so $J = R$.

        A field is an integral domain (if $ab = 0$ and $a \ne 0$, then $b = a^{-1}ab = 0$), so maximal ideals are
        prime.`,
      checks: [
        md`Properness is matched with $1 \ne 0$ in the quotient.`,
        md`(b) constructs an inverse from maximality, and conversely forces $1 \in J$.`,
        md`"Fields are domains" is proved, not assumed.`,
      ],
    },
    {
      id: '5.6',
      kind: 'decide',
      title: 'Finite rings',
      statement: md`**Prove or disprove:** every prime ideal of a finite ring is maximal.`,
      verdict: true,
      uses: ['5.5'],
      hints: [
        md`What is $R/P$, by 5.5? Is it finite?`,
        md`In a finite integral domain, what can you say about $x \mapsto ax$ for $a \ne 0$?`,
      ],
      solution: md`**True.** By 5.5(a), $D = R/P$ is an integral domain, and it is finite. For $a \ne 0$ in $D$, the map
        $x \mapsto ax$ is injective — $ax = ay$ gives $a(x - y) = 0$, so $x = y$ — hence surjective, $D$ being
        finite; so $ab = 1$ for some $b$. Thus $D$ is a field, and $P$ is maximal by 5.5(b). (For infinite rings
        it fails: $\{0\}$ is prime in $\Z$, as $\Z$ is a domain, but not maximal, as $\{0\} \subsetneq 2\Z$.)`,
      checks: [
        md`The quotient is identified as a finite integral domain.`,
        md`Injective implies surjective is applied to a finite set.`,
      ],
    },
    {
      id: '5.7',
      kind: 'prove',
      title: 'The integers',
      statement: md`Prove that every ideal of $\Z$ is $n\Z$ for some $n \ge 0$, that $n\Z \subseteq d\Z$ if and only if
        $d \mid n$, and that for $n \ge 2$, $\Z/n$ is a field if and only if $n$ is prime.`,
      uses: ['2.7', '5.5'],
      hints: [
        md`Ideals of $\Z$ are in particular subgroups.`,
        md`$\Z/n$ is a field iff $n\Z$ is maximal. Which ideals contain $n\Z$?`,
      ],
      solution: md`An ideal of $\Z$ is a subgroup, hence $n\Z$ (2.7); conversely each $n\Z$ absorbs multiplication.
        $n\Z \subseteq d\Z$ iff $n \in d\Z$ iff $d \mid n$. By 5.5, $\Z/n$ is a field iff $n\Z$ is maximal, i.e. iff
        no $d\Z$ lies strictly between $n\Z$ and $\Z = 1\Z$, i.e. iff $n$ has no divisor $d$ with $1 < d < n$ —
        iff $n$ is prime. (Here $d\Z = n\Z$ for $d, n \ge 1$ only when $d = n$.)`,
      checks: [
        md`Ideals of $\Z$ are reduced to subgroups.`,
        md`Containment of ideals is translated into divisibility.`,
        md`Maximality is matched with primality through divisors.`,
      ],
    },
    {
      id: '5.8',
      kind: 'prove',
      title: 'Polynomials over a field',
      statement: md`Let $F$ be a field. Prove that every ideal of $F[x]$ is principal, and that if $p$ is irreducible
        then $F[x]/(p)$ is a field.`,
      uses: ['5.5'],
      hints: [
        md`In a nonzero ideal, take a nonzero element of least degree. Divide.`,
        md`If $(p) \subseteq (g)$, then $p = hg$. What does irreducibility say about $h$ and $g$?`,
      ],
      solution: md`Let $I \ne \{0\}$ (else $I = (0)$) and take $g \in I$ nonzero of least degree. For $f \in I$, write
        $f = qg + r$ with $r = 0$ or $\deg r < \deg g$; $r = f - qg \in I$, so $r = 0$ by minimality. So
        $I = (g)$.

        The units of $F[x]$ are the nonzero constants: if $fg = 1$, degrees add to 0. Let $p$ be irreducible.
        $(p)$ is proper: its nonzero elements have degree at least $\deg p \ge 1$, so $1 \notin (p)$. Let
        $(p) \subseteq J$ with $J$ an ideal; then $J = (g)$ and $p = hg$. If $g$ is constant, it is a nonzero
        constant — $g = 0$ would force $p = 0$ — hence a unit, and $J = F[x]$. Otherwise $h$ is a nonzero
        constant, $g = h^{-1}p \in (p)$, and $J = (p)$. So $(p)$ is maximal, and $F[x]/(p)$ is a field by 5.5.`,
      checks: [
        md`An element of least degree generates the ideal, via division with remainder.`,
        md`Units of $F[x]$ are identified using degrees.`,
        md`Both outcomes of irreducibility are followed to the end.`,
      ],
    },
    {
      id: '5.9',
      kind: 'prove',
      title: 'The complex numbers, constructed',
      statement: md`Prove that $\R[x]/(x^2 + 1) \cong \C$ as rings.`,
      uses: ['5.2', '5.8'],
      hints: [
        md`Find a surjective ring homomorphism $\R[x] \to \C$ that kills $x^2 + 1$.`,
        md`Its kernel is an ideal containing $x^2 + 1$. Why can it not be bigger than $(x^2 + 1)$?`,
      ],
      solution: md`Evaluation $\varepsilon(f) = f(i)$ is a ring homomorphism $\R[x] \to \C$ (polynomial arithmetic is
        arithmetic of values), onto since $a + bx \mapsto a + bi$. Its kernel $K$ contains $x^2 + 1$, so
        $(x^2 + 1) \subseteq K$, and $K \ne \R[x]$ since $\varepsilon(1) = 1$. $x^2 + 1$ is irreducible: a
        factorization into two factors of degree 1 would give a real root $r$ with $r^2 + 1 = 0$. So
        $(x^2 + 1)$ is maximal (5.8), forcing $K = (x^2 + 1)$, and $\R[x]/(x^2 + 1) \cong \C$ by 5.2.`,
      checks: [
        md`An explicit surjective homomorphism is given.`,
        md`The kernel is pinned down by maximality, not guessed.`,
        md`Irreducibility of $x^2 + 1$ over $\R$ is proved.`,
      ],
    },
    {
      id: '5.10',
      kind: 'flaw',
      title: 'Quotients of domains',
      statement: md`**Claim.** If $R$ is an integral domain and $I$ is an ideal, then $R/I$ is an integral domain. Find the
        first line that is wrong or does not follow.`,
      lines: [
        md`Suppose $(a + I)(b + I) = 0 + I$, that is, $ab \in I$.`,
        md`Since $R$ is an integral domain, $ab \in I$ gives $a \in I$ or $b \in I$.`,
        md`Hence $a + I = 0 + I$ or $b + I = 0 + I$.`,
        md`Also $1 + I \ne 0 + I$, since $1 \ne 0$ in $R$.`,
        md`So $R/I$ is an integral domain. $\blacksquare$`,
      ],
      flawLine: 2,
      hints: [md`What does "integral domain" say about products — and about which ideal?`, md`Try $\Z$ and $4\Z$.`],
      solution: md`**Line 2.** Being a domain says $ab = 0 \Rightarrow a = 0$ or $b = 0$: it is a statement about the ideal
        $\{0\}$. Line 2 needs $I$ to be *prime*. In $\Z$ with $I = 4\Z$: $2 \cdot 2 \in 4\Z$ but $2 \notin 4\Z$, so
        $\Z/4$ is not a domain. (Line 4 fails too, when $I = R$.) The truth is 5.5(a).`,
      checks: [
        md`Line 2 is identified, naming the property it silently assumes (primeness of $I$).`,
        md`A counterexample is checked.`,
      ],
    },
    {
      id: '5.11',
      kind: 'flaw',
      title: 'Maximal subgroups',
      statement: md`**Claim.** In an abelian group $G$, every proper subgroup $H$ lies in a maximal proper subgroup.
        Find the first line that is wrong or does not follow.`,
      uses: ['2.10'],
      lines: [
        md`Let $\mathcal P$ be the set of proper subgroups of $G$ containing $H$, ordered by $\subseteq$. The empty
          chain has $H$ as an upper bound.`,
        md`Let $\mathcal C$ be a nonempty chain in $\mathcal P$ and $U = \bigcup\mathcal C$.`,
        md`$U$ is a subgroup: any two of its elements lie in a common member of $\mathcal C$.`,
        md`$U$ contains $H$, and $U$ is proper because every member of $\mathcal C$ is proper.`,
        md`So every chain in $\mathcal P$ has an upper bound, and Zorn's lemma gives a maximal element. $\blacksquare$`,
      ],
      flawLine: 4,
      hints: [md`Can a union of proper subgroups be everything?`, md`Look inside $(\Q, +)$.`],
      solution: md`**Line 4.** A union of proper subgroups can be all of $G$. In $(\Q, +)$ the subgroups
        $\frac{1}{n!}\Z$ form a chain, each proper — $\frac{1}{n!}\Z$ is cyclic, and a cyclic $\langle q \rangle$
        with $q \ne 0$ misses $q/2$ — and their union is $\Q$.

        The claim is false: $\Q$ has **no** maximal proper subgroup. If $M$ were one, every subgroup of $\Q/M$
        would pull back to a subgroup between $M$ and $\Q$, so $\Q/M$ would have no subgroups but the trivial one
        and itself; by 2.10 it is cyclic of prime order $p$. Then $p(q + M) = M$, i.e. $pq \in M$, for every $q$;
        but every rational is $p \cdot \frac qp$, so $\Q \subseteq M$. Contrast 5.12: for ideals, "proper" means
        "does not contain 1", which a union cannot acquire.`,
      checks: [
        md`Line 4 is identified: properness is not preserved by unions.`,
        md`A chain of proper subgroups with union $G$ is exhibited.`,
        md`The claim itself is refuted (no maximal subgroup of $\Q$).`,
      ],
    },
    {
      id: '5.12',
      kind: 'prove',
      challenge: true,
      title: "Krull's theorem",
      statement: md`Prove that every proper ideal of a ring lies in a maximal ideal. Deduce that every ring with
        $1 \ne 0$ has a maximal ideal.`,
      uses: ['5.11'],
      hints: [
        md`Zorn's lemma, on the proper ideals containing $I$. What is an upper bound for a chain?`,
        md`Why is the union of a chain of proper ideals still proper? Compare 5.11.`,
      ],
      solution: md`Let $I$ be proper and $\mathcal P$ the set of proper ideals containing $I$, ordered by inclusion; the
        empty chain has upper bound $I \in \mathcal P$. For a nonempty chain $\mathcal C$, $U = \bigcup\mathcal C$ is an
        ideal (two elements lie in a common member, which is closed under the operations) containing $I$, and it
        is proper: $1 \in U$ would put $1$ in some member, which would then be $R$. So $U$ is an upper bound in
        $\mathcal P$, and Zorn's lemma gives a maximal $M \in \mathcal P$. $M$ is a maximal ideal: an ideal
        $J$ with $M \subsetneq J \subsetneq R$ would be in $\mathcal P$ and exceed $M$. If $1 \ne 0$, apply this to
        the proper ideal $\{0\}$.`,
      checks: [
        md`Zorn is applied with the empty chain handled.`,
        md`Properness of the union is proved through $1$.`,
        md`A maximal element of $\mathcal P$ is shown to be a maximal ideal.`,
      ],
    },
    {
      id: '5.13',
      kind: 'prove',
      title: 'The Chinese remainder theorem',
      statement: md`Let $I, J$ be ideals of $R$ with $I + J = R$. Prove $R/(I \cap J) \cong R/I \times R/J$. Deduce
        $\Z/6 \cong \Z/2 \times \Z/3$.`,
      uses: ['5.2', '5.7'],
      hints: [
        md`There is an obvious homomorphism $R \to R/I \times R/J$. What is its kernel?`,
        md`Surjectivity: write $1 = i + j$. Which element maps to $(1 + I, 0 + J)$?`,
      ],
      solution: md`$\varphi(r) = (r + I, r + J)$ is a ring homomorphism with kernel $I \cap J$. It is onto: write
        $1 = i + j$ with $i \in I$, $j \in J$. Given $(a + I, b + J)$, let $r = aj + bi$. Then
        $r - a = a(j - 1) + bi = (b - a)i \in I$ and $r - b = (a - b)j \in J$, so $\varphi(r) = (a + I, b + J)$. By
        5.2, $R/(I \cap J) \cong R/I \times R/J$.

        In $\Z$: $1 = 3 - 2$, so $2\Z + 3\Z = \Z$; and $2\Z \cap 3\Z = 6\Z$, since $2 \mid m$ and $3 \mid m$ give
        $6 \mid m$ by unique factorization.`,
      checks: [
        md`The kernel is computed as $I \cap J$.`,
        md`A preimage of an arbitrary pair is written down and checked in both coordinates.`,
        md`The example verifies both $I + J = R$ and $I \cap J$.`,
      ],
    },
  ],
}

export default unit
