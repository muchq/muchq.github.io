import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'countability',
  n: 13,
  title: 'Countability and metrization',
  track: 'Topology',
  prereqs: [12],
  why: md`When are sequences enough, and which spaces come from a metric? Countability answers both. Sequences
    detect closure exactly when points have countably many basic neighborhoods, and Urysohn's metrization theorem
    — the payoff of Units 11 and 12 — says a regular space with a countable basis is metrizable.`,
  definitions: [
    {
      term: 'Countability axioms',
      body: md`$X$ is **first countable** if each point $x$ has a countable family of neighborhoods such that every
        neighborhood of $x$ contains one of them; **second countable** if its topology has a countable basis;
        **separable** if it has a countable dense subset; **Lindelöf** if every open cover has a countable
        subcover.`,
    },
    {
      term: 'Metrizable',
      body: md`$X$ is **metrizable** if some metric on $X$ has exactly the open sets of $X$ as its open sets.`,
    },
    {
      term: 'The cocountable topology',
      body: md`On a set $X$, the open sets are $\emptyset$ and the complements of countable sets.`,
    },
  ],
  problems: [
    {
      id: '13.1',
      kind: 'prove',
      title: 'Countable bases',
      statement: md`Prove: (a) every metric space is first countable; (b) $\R^n$ is second countable; (c) every second
        countable space is separable and Lindelöf.`,
      uses: ['1.7', '7.2'],
      hints: [
        md`(b) Which balls have a countable description?`,
        md`(c) From each basis element pick a point; for a cover, pick a member for each basis element that fits
          inside one.`,
      ],
      solution: md`(a) The balls $B(x, \frac1n)$: every neighborhood of $x$ contains a ball around $x$, hence one of these.

        (b) The balls $B(q, r)$ with $q \in \Q^n$ and rational $r > 0$ form a countable family ($\Q^n \times \Q$ injects
        into $\N$, as in 1.7, with $n + 1$ primes). They form a basis: if $x \in U$ open, take $B(x, \varepsilon)
        \subseteq U$, rational $r < \frac\varepsilon2$, and $q \in \Q^n$ with $d(q, x) < r$ (approximate each coordinate);
        then $x \in B(q, r) \subseteq B(x, 2r) \subseteq U$.

        (c) Let $\{B_n\}$ be a countable basis. Choosing a point in each nonempty $B_n$ gives a countable set meeting
        every nonempty open set, which is dense (7.2). For an open cover $\mathcal U$: for each $n$ such that $B_n$ lies
        in some member, choose one such member. These are countably many, and they cover: each $x$ lies in some
        $U \in \mathcal U$, hence in some $B_n \subseteq U$, and the member chosen for $n$ contains $x$.`,
      checks: [
        md`The rational balls are shown countable and a basis.`,
        md`Density is checked through the neighborhood criterion.`,
        md`The Lindelöf argument chooses one member per basis element, not per point.`,
      ],
    },
    {
      id: '13.2',
      kind: 'prove',
      title: 'When sequences suffice',
      statement: md`Prove: (a) if some sequence in $A$ converges to $x$, then $x \in \overline A$; (b) in a first countable
        space the converse holds; (c) a continuous map preserves convergent sequences, and if $X$ is first countable,
        any $f\colon X \to Y$ that preserves convergent sequences is continuous.`,
      uses: ['7.2', '7.5'],
      hints: [
        md`(b) Make the countable neighborhood family shrink: intersect its first $n$ members.`,
        md`(c) Use 7.5(iii): continuity is $f(\overline A) \subseteq \overline{f(A)}$.`,
      ],
      solution: md`(a) Each neighborhood of $x$ contains $x_n \in A$ for large $n$, so meets $A$ (7.2).

        (b) Let $B_1, B_2, \dots$ be neighborhoods of $x$ such that every neighborhood contains one, and
        $V_n = B_1 \cap \dots \cap B_n$. If $x \in \overline A$, choose $x_n \in V_n \cap A$ (7.2). A neighborhood $U$
        of $x$ contains some $B_N \supseteq V_n$ for all $n \ge N$, so $x_n \in U$ for $n \ge N$: $x_n \to x$.

        (c) If $f$ is continuous and $x_n \to x$, a neighborhood $W$ of $f(x)$ pulls back to a neighborhood of $x$,
        which holds $x_n$ for large $n$; so $f(x_n) \in W$. Conversely, let $X$ be first countable and $f$ preserve
        convergent sequences. If $x \in \overline A$, by (b) some $x_n \in A$ converge to $x$; then $f(x_n) \to f(x)$
        with $f(x_n) \in f(A)$, so $f(x) \in \overline{f(A)}$ by (a). So $f(\overline A) \subseteq \overline{f(A)}$, and
        $f$ is continuous (7.5).`,
      checks: [
        md`The neighborhoods are made nested before choosing the sequence.`,
        md`(a) is proved for every space, and reused in (c).`,
        md`The converse in (c) goes through closures (7.5(iii)).`,
      ],
    },
    {
      id: '13.3',
      kind: 'prove',
      title: 'The reals are uncountable',
      statement: md`Prove that $[0, 1]$, and hence $\R$, is not countable.`,
      uses: ['10.5', '12.5'],
      hints: [
        md`Given a sequence $x_0, x_1, \dots$ in $[0, 1]$, find a point that is not one of its terms.`,
        md`Nested closed intervals, each avoiding one more term. What does compactness say about their
          intersection?`,
      ],
      solution: md`A countable nonempty set $S$ is the set of terms of a sequence: given an injection $j\colon S \to \N$,
        list $S$ in the order of $j$, repeating a term to fill gaps. So it suffices that no sequence $(x_n)$ has every
        point of $[0, 1]$ as a term.

        Put $I_0 = [0, 1]$. Given a closed interval $I_n$ of positive length, its closed left and right thirds are
        disjoint, so one of them misses $x_n$; let $I_{n+1}$ be that one. The $I_n$ are nested, nonempty and closed
        in the compact $[0, 1]$ (10.5), so they have the FIP and a common point $y$ (12.5). For every $n$,
        $y \in I_{n+1}$ and $x_n \notin I_{n+1}$, so $y \ne x_n$.`,
      checks: [
        md`Countable is converted into "the terms of a sequence".`,
        md`Each interval avoids the next term, and the intervals are nested and closed.`,
        md`Compactness gives a common point, which differs from every term.`,
      ],
    },
    {
      id: '13.4',
      kind: 'decide',
      title: 'Closure by sequences',
      statement: md`**Prove or disprove:** in every topological space, $x \in \overline A$ if and only if some sequence in
        $A$ converges to $x$.`,
      verdict: false,
      uses: ['13.2', '13.3'],
      hints: [
        md`By 13.2 a counterexample cannot be first countable. Try a topology with very large open sets.`,
        md`In the cocountable topology on $\R$, which sequences converge?`,
      ],
      solution: md`**False.** Give $\R$ the cocountable topology. It is a topology: $\R$ and $\emptyset$ are open; the
        complement of a union of nonempty open sets lies inside the countable complement of one of them; and for $U \cap V$, if
        either is empty so is the intersection, and otherwise its complement is the union of two countable sets,
        which is countable (with injections $f, g$ into
        $\N$, send $x$ to $2f(x)$ if it lies in the first set and to $2g(x) + 1$ otherwise).

        *Convergent sequences are eventually constant.* If $x_n \to x$, the set
        $U = \R \setminus \{x_n : x_n \ne x\}$ is open (its complement is countable) and contains $x$, so $x_n \in U$,
        i.e. $x_n = x$, for large $n$.

        Let $A = \R \setminus \{0\}$. The closed sets are $\R$ and the countable sets, and $A$ is uncountable (13.3), so
        $\overline A = \R \ni 0$. But a sequence in $A$ converging to $0$ would be eventually $0$, which is not in $A$.`,
      checks: [
        md`The cocountable topology is shown to be a topology.`,
        md`Convergent sequences are shown eventually constant.`,
        md`The closure of $A$ is computed using that $\R$ is uncountable.`,
      ],
    },
    {
      id: '13.5',
      kind: 'prove',
      challenge: true,
      title: 'Regular and second countable means normal',
      statement: md`Prove that every regular, second countable space is normal.`,
      uses: ['11.2'],
      hints: [
        md`Cover $A$ by countably many basis sets whose closures miss $B$, and $B$ likewise.`,
        md`The two covers may overlap. Trim them — each set by finitely many closures from the other cover — so that
          they still cover and no longer meet.`,
      ],
      solution: md`Let $A, B$ be disjoint closed sets (if either is empty, $\emptyset$ and $X$ separate them), and fix a
        countable basis. For $a \in A$, regularity (11.2, with $U = X \setminus B$) gives an open $V \ni a$ with
        $\overline V \cap B = \emptyset$, and a basis set $W$ with $a \in W \subseteq V$, so $\overline W \cap B = \emptyset$. The
        basis sets arising this way are countably many: $U_1, U_2, \dots$, covering $A$, each with closure missing $B$.
        Likewise $V_1, V_2, \dots$ cover $B$, each with closure missing $A$. (Repeat a set if there are finitely many.)
        Put
        $$U'_n = U_n \setminus \bigcup_{k \le n} \overline{V_k}, \qquad V'_n = V_n \setminus \bigcup_{k \le n} \overline{U_k},$$
        open as finite unions of closed sets are closed. $U' = \bigcup_n U'_n \supseteq A$: a point of $A$ lies in some
        $U_n$ and in no $\overline{V_k}$. Likewise $V' \supseteq B$. And $U'_j \cap V'_k = \emptyset$: if $j \le k$,
        $V'_k$ misses $\overline{U_j} \supseteq U'_j$; if $k \le j$, $U'_j$ misses $\overline{V_k} \supseteq V'_k$.`,
      checks: [
        md`The countable covers are built from basis sets with controlled closures.`,
        md`The trimmed sets are shown open, still covering, and disjoint in both cases $j \le k$, $k \le j$.`,
      ],
    },
    {
      id: '13.6',
      kind: 'prove',
      title: 'A metric for the cube',
      statement: md`Prove that $D(x, y) = \sup_{n \in \N} \frac{|x_n - y_n|}{n + 1}$ is a metric on $[0, 1]^{\N}$ whose open sets
        are exactly those of the product topology.`,
      uses: ['12.1'],
      hints: [
        md`A $D$-ball constrains every coordinate, but late coordinates only a little. Which product-open set fits
          inside $B_D(x, \varepsilon)$?`,
        md`Conversely, a basic product set constrains finitely many coordinates. How small must a $D$-ball be?`,
      ],
      solution: md`$D$ is a metric: the supremum exists (terms are at most 1), is 0 only when all coordinates agree, is
        symmetric, and $\frac{|x_n - z_n|}{n+1} \le \frac{|x_n - y_n|}{n+1} + \frac{|y_n - z_n|}{n+1} \le D(x, y) + D(y, z)$ for
        each $n$.

        *$D$-open ⇒ product-open.* Let $B_D(x, \varepsilon) \subseteq U$. Choose $N$ with $\frac1{N+1} < \varepsilon$, and let
        $V = \{y : |y_n - x_n| < \varepsilon \text{ for } n \le N\}$, a basic product-open set containing $x$. For $y \in V$,
        the terms with $n \le N$ are less than $\varepsilon$ (finitely many), and those with $n > N$ are at most
        $\frac1{N+2}$; so $D(x, y) < \varepsilon$ and $V \subseteq U$.

        *Product-open ⇒ $D$-open.* Let $x \in W$, $W$ product-open. A basic set $\prod_n U_n \ni x$ lies in $W$, with
        $U_n = [0, 1]$ except for $n$ in a finite set $F$; choose $\varepsilon_n > 0$ with
        $(x_n - \varepsilon_n, x_n + \varepsilon_n) \cap [0, 1] \subseteq U_n$ for $n \in F$, and
        $\varepsilon = \min_{n \in F} \frac{\varepsilon_n}{n + 1}$ (or $1$ if $F = \emptyset$). If $D(x, y) < \varepsilon$ then
        $|x_n - y_n| < (n + 1)\varepsilon \le \varepsilon_n$ for $n \in F$, so $y \in \prod_n U_n \subseteq W$.`,
      checks: [
        md`The triangle inequality is checked termwise, then for the supremum.`,
        md`A product-open set inside a $D$-ball uses the tail bound $\frac1{N+2}$.`,
        md`A $D$-ball inside a basic set uses finitely many radii.`,
      ],
    },
    {
      id: '13.7',
      kind: 'prove',
      title: 'Urysohn metrization',
      statement: md`Prove that every regular, second countable space is metrizable.`,
      uses: ['11.2', '11.7', '12.10', '13.5', '13.6'],
      hints: [
        md`Instead of building a metric, can you find a metric space that $X$ sits inside?`,
        md`You can already embed spaces in cubes (12.10). How many functions do you need here?`,
        md`For basis sets with $\overline{B_n} \subseteq B_m$, Urysohn gives $g_{n,m}$ equal to 1 on $\overline{B_n}$ and 0
          off $B_m$.`,
      ],
      solution: md`Let $X$ be regular with countable basis $\{B_n\}$; $X$ is normal (13.5). For each pair $(n, m)$ with
        $\overline{B_n} \subseteq B_m$, Urysohn (11.7) gives a continuous $g_{n,m}\colon X \to [0, 1]$ equal to 1 on
        $\overline{B_n}$ and 0 outside $B_m$. This is a countable family; index it by $\N$, repeating if needed (if
        $X = \emptyset$ there is nothing to prove).

        It satisfies the hypothesis of 12.10: given $x \in U$ open, pick $B_m$ with $x \in B_m \subseteq U$; regularity
        (11.2) gives open $V \ni x$ with $\overline V \subseteq B_m$, and some $B_n$ with $x \in B_n \subseteq V$. Then
        $\overline{B_n} \subseteq B_m$, $g_{n,m}(x) = 1 > 0$, and $g_{n,m} = 0$ outside $B_m$, hence outside $U$. So $X$ embeds in $[0, 1]^{\N}$ (12.10), which is metrizable (13.6). A
        subspace of a metric space is metrized by the restricted metric — its balls are the traces of balls — so $X$
        is metrizable.`,
      checks: [
        md`Normality is obtained from 13.5 before Urysohn is used.`,
        md`The countable family is shown to meet the hypothesis of the embedding theorem.`,
        md`Metrizability passes to the embedded copy through the restricted metric.`,
      ],
    },
    {
      id: '13.8',
      kind: 'decide',
      title: 'Big cubes',
      statement: md`**Prove or disprove:** every compact Hausdorff space is metrizable.`,
      verdict: false,
      uses: ['12.3', '12.8', '13.1', '13.3'],
      hints: [
        md`Metric spaces are first countable. Find a compact Hausdorff space that is not.`,
        md`A countable family of basic neighborhoods in a product restricts only countably many coordinates.`,
      ],
      solution: md`**False.** $X = [0, 1]^{\R}$ is compact (Tychonoff, 12.8) and Hausdorff (12.3). It is not first countable,
        so not metrizable (13.1). Let $x \in X$ and $N_1, N_2, \dots$ be neighborhoods of $x$; each contains a basic set
        restricting finitely many coordinates, so together they restrict only countably many, and as $\R$ is
        uncountable (13.3) some coordinate $\beta$ is restricted by none. The neighborhood
        $W = \pi_\beta^{-1}((x_\beta - \frac12, x_\beta + \frac12))$ contains no $N_k$: the point of $N_k$'s basic set that agrees
        with $x$ except for coordinate $\beta$, set to whichever of $0, 1$ is farther from $x_\beta$, lies outside $W$.`,
      checks: [
        md`The space is shown compact and Hausdorff with citations.`,
        md`Failure of first countability uses uncountably many coordinates.`,
        md`An explicit point of each candidate neighborhood outside $W$ is given.`,
      ],
    },
    {
      id: '13.9',
      kind: 'flaw',
      title: 'Separable implies second countable?',
      statement: md`**Claim.** Every separable space is second countable. Find the first line that is wrong or does not
        follow.`,
      uses: ['7.6', '13.3'],
      lines: [
        md`Let $D$ be a countable dense subset of $X$.`,
        md`For each $d \in D$ choose an open set $U_d \ni d$.`,
        md`The sets $U_d$ form a countable family.`,
        md`Every nonempty open set $W$ contains some $d \in D$, by density.`,
        md`So $W$ is a union of members of the family $\{U_d\}$.`,
        md`Hence $\{U_d\}$ is a countable basis. $\blacksquare$`,
      ],
      flawLine: 5,
      hints: [md`Is $U_d$ inside $W$?`, md`Try the lower limit line.`],
      solution: md`**Line 5.** $W$ contains $d$, but nothing makes $U_d \subseteq W$; and one set per point of $D$ cannot
        shrink to fit every $W$. The claim is false: $\R_\ell$ is separable ($\Q$ meets every $[a, b)$) but not second
        countable. Given any basis, for each $x$ choose a basis set $B_x$ with $x \in B_x \subseteq [x, x + 1)$; then
        $x = \min B_x$, so $x \mapsto B_x$ is injective, and the basis is uncountable (13.3). (For metric spaces the
        claim is true: use balls of rational radius around points of $D$.)`,
      checks: [
        md`Line 5 is identified: the chosen neighborhoods need not fit inside $W$.`,
        md`A separable space that is not second countable is given, with the injectivity argument.`,
      ],
    },
  ],
}

export default unit
