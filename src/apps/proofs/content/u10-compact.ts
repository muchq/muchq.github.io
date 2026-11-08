import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'compact',
  n: 10,
  title: 'Compactness',
  track: 'Topology',
  prereqs: [8],
  why: md`Compactness turns local information into global: finitely many pieces suffice. Unit 14 uses it in
    one precise form — the Lebesgue number lemma — to lift paths. Watch where Hausdorff is needed, and where
    it is not.`,
  definitions: [
    {
      term: 'Compact',
      body: md`$X$ is **compact** if every open cover has a finite subcover. A subset is compact if it is
        compact in the subspace topology — equivalently, every cover of it by open sets of the ambient space
        has a finite subcover. Hausdorff is **not** part of "compact".`,
    },
    {
      term: 'Sequentially compact',
      body: md`Every sequence has a convergent subsequence.`,
    },
    {
      term: 'Diameter, Lebesgue number',
      body: md`In a metric space, $\operatorname{diam} A = \sup\{d(a, b) : a, b \in A\}$. A **Lebesgue number**
        for an open cover $\mathcal U$ is a $\delta > 0$ such that every subset of diameter less than $\delta$
        lies in some member of $\mathcal U$.`,
    },
  ],
  problems: [
    {
      id: '10.1',
      kind: 'prove',
      title: 'Closed subsets and continuous images',
      statement: md`Prove: (a) a closed subset of a compact space is compact; (b) a continuous image of a
        compact space is compact.`,
      hints: [
        md`(a) Extend a cover of $F$ to a cover of $X$ with one extra open set.`,
        md`(b) Pull a cover back along $f$.`,
      ],
      solution: md`(a) Let open sets $U_i$ of $X$ cover $F$. Adding $X \setminus F$ gives an open cover of $X$;
        take a finite subcover and discard $X \setminus F$, which contains no point of $F$. Finitely many $U_i$
        remain and cover $F$.

        (b) Let $f\colon X \to Y$ be continuous with $X$ compact, and let open $V_i$ cover $f(X)$. The
        $f^{-1}(V_i)$ are an open cover of $X$; finitely many, say for $i_1, \dots, i_n$, cover $X$, and then
        $V_{i_1}, \dots, V_{i_n}$ cover $f(X)$.`,
      checks: [
        md`(a) uses that $X \setminus F$ is open.`,
        md`(b) pulls the cover back and pushes the finite subcover forward.`,
      ],
    },
    {
      id: '10.2',
      kind: 'flaw',
      title: 'Compact implies closed?',
      statement: md`**Claim.** Every compact subset $K$ of a space $X$ is closed. Find the first line that is
        wrong or does not follow.`,
      lines: [
        md`Let $x \in X \setminus K$; we find an open set containing $x$ and disjoint from $K$.`,
        md`For each $k \in K$ choose disjoint open sets $U_k \ni x$ and $V_k \ni k$.`,
        md`The $V_k$ cover $K$, so by compactness $K \subseteq V_{k_1} \cup \dots \cup V_{k_n}$.`,
        md`Then $U = U_{k_1} \cap \dots \cap U_{k_n}$ is open, contains $x$, and is disjoint from $K$.`,
        md`So $X \setminus K$ is open and $K$ is closed. $\blacksquare$`,
      ],
      flawLine: 2,
      hints: [md`Which hypothesis would line 2 need?`, md`Try a two-point space with very few open sets.`],
      solution: md`**Line 2.** Disjoint neighborhoods of $x$ and $k$ exist when $X$ is Hausdorff, which was not
        assumed. The claim is false: in $\{a, b\}$ with only $\emptyset$ and $\{a, b\}$ open, $K = \{a\}$ is
        compact (a space with finitely many open sets is compact) but not closed. Lines 3–5 are sound — with
        Hausdorff added, this is a correct proof (10.3).`,
      checks: [
        md`Line 2 is identified as needing Hausdorff.`,
        md`A compact, non-closed subset is exhibited, both properties checked.`,
      ],
    },
    {
      id: '10.3',
      kind: 'prove',
      title: 'Compact sets in Hausdorff spaces',
      statement: md`Let $X$ be Hausdorff and $K \subseteq X$ compact. Prove that for each $x \notin K$ there are
        disjoint open sets $U \ni x$ and $V \supseteq K$; in particular $K$ is closed.`,
      hints: [md`Separate $x$ from each $k \in K$; take finitely many; intersect the right ones.`],
      solution: md`If $K = \emptyset$ take $U = X$, $V = \emptyset$. Otherwise, for each $k \in K$ pick disjoint
        open $U_k \ni x$ and $V_k \ni k$. The $V_k$ cover $K$, so $K \subseteq V = V_{k_1} \cup \dots \cup V_{k_n}$.
        $U = U_{k_1} \cap \dots \cap U_{k_n}$ is open (a finite intersection) and contains $x$, and
        $U \cap V_{k_j} \subseteq U_{k_j} \cap V_{k_j} = \emptyset$ for each $j$, so $U \cap V = \emptyset$.
        Hence $U \subseteq X \setminus K$, and $X \setminus K$ is open.`,
      checks: [
        md`The finite subcover is chosen before intersecting, so the intersection is open.`,
        md`Disjointness of $U$ and $V$ is verified.`,
      ],
    },
    {
      id: '10.4',
      kind: 'prove',
      title: 'The closed map lemma',
      statement: md`Let $f\colon K \to H$ be continuous with $K$ compact and $H$ Hausdorff. Prove $f$ maps closed
        sets to closed sets. Deduce that a continuous bijection from a compact space to a Hausdorff space is a
        homeomorphism.`,
      uses: ['10.1', '10.3', '7.5'],
      hints: [md`Closed ⇒ compact ⇒ compact image ⇒ closed. Cite each step.`],
      solution: md`If $F \subseteq K$ is closed, it is compact (10.1(a)), so $f(F)$ is compact (10.1(b)), so $f(F)$
        is closed in the Hausdorff space $H$ (10.3). If $f$ is bijective, then for closed $F$,
        $(f^{-1})^{-1}(F) = f(F)$ is closed, so $f^{-1}$ is continuous (7.5).`,
      checks: [
        md`Each of the three steps cites its justification.`,
        md`Continuity of the inverse is reduced to images of closed sets.`,
      ],
    },
    {
      id: '10.5',
      kind: 'prove',
      title: 'The interval is compact',
      statement: md`Prove that $[0, 1]$ is compact.`,
      hints: [
        md`Given an open cover $\mathcal U$, let $T$ be the set of $t$ such that $[0, t]$ is covered by finitely
          many members, and let $s = \sup T$.`,
        md`Some member $U$ contains $s$ — and with it an interval around $s$. Show $s \in T$ and $s = 1$.`,
      ],
      solution: md`Let $\mathcal U$ be a cover of $[0, 1]$ by sets open in $[0, 1]$, and let $T$ be the set of
        $t \in [0, 1]$ such that $[0, t]$ is covered by finitely many members. $0 \in T$, so $s = \sup T$ exists.
        Pick $U \in \mathcal U$ containing $s$ and $\varepsilon > 0$ with
        $(s - \varepsilon, s + \varepsilon) \cap [0, 1] \subseteq U$.

        If $s = 0$, $U$ alone covers $[0, s']$ for each $s' \in [0, \varepsilon) \cap [0, 1]$. If $s > 0$, pick
        $t \in T$ with $s - \varepsilon < t \le s$; finitely many members cover $[0, t]$, and adding $U$ covers
        $[0, s']$ for each $s' \in [s, s + \varepsilon) \cap [0, 1]$, since $(t, s'] \subseteq U$. Either way
        $s \in T$, and if $s < 1$ then $\min(s + \varepsilon/2, 1) \in T$ exceeds $s$ — impossible. So
        $s = 1 \in T$.`,
      checks: [
        md`$T$ and its supremum are defined, with existence justified.`,
        md`Both $s \in T$ and $s = 1$ are proved.`,
        md`Relative openness in $[0, 1]$ is respected.`,
      ],
    },
    {
      id: '10.6',
      kind: 'prove',
      title: 'Extreme values',
      statement: md`Prove that a continuous $f\colon K \to \R$ on a nonempty compact space attains a maximum and
        a minimum.`,
      uses: ['10.1', '10.3', '7.2', '7.12'],
      hints: [
        md`$f(K)$ is compact. Show compact subsets of $\R$ are bounded and closed.`,
        md`A nonempty closed bounded subset of $\R$ contains its supremum.`,
      ],
      solution: md`$f(K)$ is compact (10.1(b)) and nonempty. It is bounded: the intervals $(-n, n)$ cover it, so
        finitely many do, and it lies in the largest. It is closed (10.3; $\R$ is Hausdorff by 7.12(c)). Let
        $M = \sup f(K)$. Every interval $(M - \varepsilon, M + \varepsilon)$ meets $f(K)$, so
        $M \in \overline{f(K)} = f(K)$ (7.2): $M = f(k)$ is a maximum. Apply this to $-f$ for the minimum.`,
      checks: [
        md`Boundedness comes from a finite subcover.`,
        md`The supremum is shown to lie in $f(K)$ by closedness.`,
        md`The minimum is handled.`,
      ],
    },
    {
      id: '10.7',
      kind: 'decide',
      title: 'Closed and bounded',
      statement: md`**Prove or disprove:** every closed and bounded subset of a metric space is compact.`,
      verdict: false,
      hints: [md`True in $\R^n$. Look for a metric in which everything is bounded.`],
      solution: md`**False.** Give $\N$ the discrete metric. $\N$ is closed in itself and bounded, as
        $\N = B(0, 2)$. The open singletons $\{n\} = B(n, 1)$ cover $\N$, and no finite subfamily does, since a
        finite union of singletons is finite.`,
      checks: [
        md`The example is shown closed and bounded.`,
        md`An open cover without finite subcover is exhibited.`,
      ],
    },
    {
      id: '10.8',
      kind: 'prove',
      title: 'Products of compact spaces',
      statement: md`Prove that if $X$ and $Y$ are compact then $X \times Y$ is compact. Deduce that the closed
        disk $D^2 = \{v \in \R^2 : |v| \le 1\}$ and the square $[0, 1]^2$ are compact. (Use that the topology of
        $\R^2$ is the product topology of $\R \times \R$: by 6.6, the Euclidean metric and
        $\max(|u_1 - v_1|, |u_2 - v_2|)$ have the same open sets, and balls of the latter are boxes.)`,
      uses: ['10.1', '10.5', '6.6'],
      hints: [
        md`It suffices to cover by finitely many boxes, each inside a member of the given cover.`,
        md`Tube lemma: for fixed $x$, the slice $\{x\} \times Y$ is compact. Cover it by finitely many boxes
          $U_j \times V_j$ and let $U = \bigcap_j U_j$.`,
        md`Then cover $X$ by finitely many such $U$.`,
      ],
      solution: md`Let $\mathcal W$ be an open cover. Each point lies in a box $U \times V$ inside some member of
        $\mathcal W$, so it suffices to cover $X \times Y$ by finitely many such boxes.

        Fix $x \in X$. The slice $\{x\} \times Y$ is compact (the image of $Y$ under $y \mapsto (x, y)$), so
        finitely many such boxes $U_1 \times V_1, \dots, U_m \times V_m$ cover it, each with $x \in U_j$. Let
        $U_x = U_1 \cap \dots \cap U_m$, open and containing $x$. Then the tube $U_x \times Y$ is covered by
        these $m$ boxes: for $(x', y)$ with $x' \in U_x$, $y \in V_j$ for some $j$, and $x' \in U_j$.

        The $U_x$ cover $X$, so finitely many $U_{x_1}, \dots, U_{x_k}$ do; the finitely many boxes chosen for
        $x_1, \dots, x_k$ then cover $X \times Y$.

        **Disk and square.** $[0, 1]$ is compact (10.5) and so is $[-1, 1]$, its image under $t \mapsto 2t - 1$
        (10.1). So $[0, 1]^2$ and $[-1, 1]^2$ are compact in the product topology — which is also their subspace
        topology from $\R^2 = \R \times \R$, as the basic sets $(U \cap I) \times (V \cap I)$ are exactly
        $(U \times V) \cap I^2$. $D^2$ is the preimage of $(-\infty, 1]$ under the
        continuous $v \mapsto |v|$, so closed, and it lies in $[-1, 1]^2$; it is compact by 10.1(a).`,
      checks: [
        md`The tube step: a finite intersection of open sets, and its tube covered.`,
        md`Compactness is used twice — once on a slice, once on $X$.`,
        md`$D^2$ is shown closed inside a compact square.`,
      ],
    },
    {
      id: '10.9',
      kind: 'prove',
      title: 'The Lebesgue number lemma',
      statement: md`Let $X$ be a nonempty compact metric space and $\mathcal U$ an open cover. Prove that
        $\mathcal U$ has a Lebesgue number.`,
      hints: [
        md`For each $x$ choose $r_x > 0$ with $B(x, 2r_x)$ inside a member of $\mathcal U$. The balls
          $B(x, r_x)$ cover $X$.`,
        md`Take finitely many and let $\delta$ be the smallest radius.`,
        md`If $\operatorname{diam} A < \delta$ and $a \in A$, then $a \in B(x_i, r_i)$ for some $i$. Show
          $A \subseteq B(x_i, 2r_i)$.`,
      ],
      solution: md`For each $x$ choose $U_x \in \mathcal U$ containing $x$ and $r_x > 0$ with
        $B(x, 2r_x) \subseteq U_x$. The balls $B(x, r_x)$ cover $X$, so finitely many do:
        $X = B(x_1, r_1) \cup \dots \cup B(x_n, r_n)$ with $r_i = r_{x_i}$. Let $\delta = \min_i r_i > 0$.

        Let $\operatorname{diam} A < \delta$. If $A = \emptyset$ it lies in any member of $\mathcal U$ (one
        exists, as $X \ne \emptyset$). Otherwise pick $a \in A$, with $a \in B(x_i, r_i)$. For $b \in A$,
        $d(b, x_i) \le d(b, a) + d(a, x_i) < \delta + r_i \le 2r_i$. So
        $A \subseteq B(x_i, 2r_i) \subseteq U_{x_i}$.`,
      checks: [
        md`Radii are chosen with a factor of 2 to spare.`,
        md`Finitely many balls, so the minimum radius is positive.`,
        md`The triangle inequality puts all of $A$ in one doubled ball.`,
      ],
    },
    {
      id: '10.10',
      kind: 'decide',
      title: 'Compact metric spaces and sequences',
      statement: md`**Prove or disprove:** every compact metric space is sequentially compact.`,
      verdict: true,
      hints: [
        md`Suppose $(x_n)$ has no convergent subsequence. Then each point has a ball containing $x_n$ for only
          finitely many indices $n$. Why?`,
        md`Finitely many such balls cover $X$.`,
      ],
      solution: md`**True.** Let $(x_n)$ be a sequence in a compact metric space $X$.

        *Claim:* some $x$ has every ball $B(x, \varepsilon)$ containing $x_n$ for infinitely many $n$.
        Otherwise each $x$ has a ball $B_x$ with $x_n \in B_x$ for only finitely many $n$. Finitely many $B_x$
        cover $X$, and every index $n$ has $x_n$ in one of them, so there would be only finitely many indices.

        *Subsequence:* for such $x$, pick $n_1$ with $x_{n_1} \in B(x, 1)$ and, inductively, $n_{k+1} > n_k$
        with $x_{n_{k+1}} \in B(x, 1/(k + 1))$ — possible because infinitely many indices qualify. Then
        $x_{n_k} \to x$.`,
      checks: [
        md`The claim is proved by contradiction through a finite subcover.`,
        md`The counting is of indices $n$, not of points $x_n$, which may repeat.`,
        md`The subsequence has strictly increasing indices.`,
      ],
    },
    {
      id: '10.11',
      kind: 'prove',
      title: 'The circle as a quotient',
      statement: md`Let $\sim$ on $[0, 1]$ identify $0$ with $1$ and nothing else. Prove that $[0, 1]/{\sim}$ and
        $\R/\Z$ (cosets of $\Z$, quotient topology from $\R$) are both homeomorphic to
        $S^1 = \{z \in \C : |z| = 1\}$. (Take as known: $p(t) = e^{2\pi i t}$ is continuous and onto $S^1$,
        and $p(s) = p(t) \iff s - t \in \Z$.)`,
      uses: ['8.1', '10.1', '10.4', '10.5', '7.12'],
      hints: [
        md`$p$ restricted to $[0, 1]$ is constant on classes. Use 8.1(c), then 10.4.`,
        md`$\R/\Z$ is not obviously compact. Get a continuous bijection $\R/\Z \to S^1$ from $p$, and write its
          inverse using the first part.`,
      ],
      solution: md`**Part 1.** $g = p|_{[0, 1]}$ is continuous and onto $S^1$ (shift any $t$ into $[0, 1)$ by an
        integer). For $s, t \in [0, 1]$, $g(s) = g(t)$ iff $s - t \in \Z$ iff $s = t$ or $\{s, t\} = \{0, 1\}$.
        So $g$ is constant on classes and induces a continuous bijection $h\colon [0, 1]/{\sim} \to S^1$ (8.1).
        The quotient is compact, as the image of $[0, 1]$ under $q$ (10.5, 10.1), and $S^1$ is Hausdorff, being
        metric (7.12(c)). By 10.4, $h$ is a homeomorphism.

        **Part 2.** $p$ is constant on cosets of $\Z$, so induces a continuous $\bar p\colon \R/\Z \to S^1$
        (8.1), bijective since $p(s) = p(t) \iff s + \Z = t + \Z$. The composite $[0, 1] \to \R \to \R/\Z$ is
        continuous and identifies $0$ with $1$, so it induces a continuous
        $\iota\colon [0, 1]/{\sim} \to \R/\Z$, and $\bar p \circ \iota = h$. Then
        $\bar p \circ (\iota \circ h^{-1}) = \mathrm{id}$, and as $\bar p$ is bijective,
        $\bar p^{-1} = \iota \circ h^{-1}$ — continuous. So $\bar p$ is a homeomorphism.`,
      checks: [
        md`Injectivity of the induced map is checked against exactly the identifications made.`,
        md`Compactness of the quotient and Hausdorffness of $S^1$ are both justified.`,
        md`For $\R/\Z$, the inverse is written as a composite of maps known to be continuous.`,
      ],
    },
  ],
}

export default unit
