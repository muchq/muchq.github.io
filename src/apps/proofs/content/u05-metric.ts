import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'metric',
  n: 5,
  title: 'Metric spaces',
  track: 'Topology',
  prereqs: [0],
  why: md`Here "near" comes with a number. Every topological idea that follows is a metric one with the
    numbers deleted — so prove these carefully, and notice which arguments only ever used open sets.`,
  definitions: [
    {
      term: 'Metric',
      body: md`A metric on $X$ is $d\colon X \times X \to [0, \infty)$ with $d(x, y) = 0 \iff x = y$,
        $d(x, y) = d(y, x)$, and $d(x, z) \le d(x, y) + d(y, z)$. The **discrete metric** is $d(x, y) = 1$
        for $x \ne y$.`,
    },
    {
      term: 'Balls, open and closed sets',
      body: md`$B(x, r) = \{y : d(x, y) < r\}$ for $r > 0$. $U \subseteq X$ is **open** if each $x \in U$ has
        some $B(x, r) \subseteq U$. $F$ is **closed** if $X \setminus F$ is open.`,
    },
    {
      term: 'Convergence, Cauchy, complete',
      body: md`$x_n \to x$ if for every $\varepsilon > 0$ there is $N$ with $d(x_n, x) < \varepsilon$ for all
        $n \ge N$. $(x_n)$ is **Cauchy** if for every $\varepsilon > 0$ there is $N$ with
        $d(x_m, x_n) < \varepsilon$ for all $m, n \ge N$. $X$ is **complete** if every Cauchy sequence
        converges.`,
    },
    {
      term: 'Bounded',
      body: md`A subset of a metric space is **bounded** if it lies in some ball.`,
    },
    {
      term: 'Continuity',
      body: md`$f\colon X \to Y$ is continuous at $a$ if for every $\varepsilon > 0$ there is $\delta > 0$ with
        $d(x, a) < \delta \Rightarrow d(f(x), f(a)) < \varepsilon$; continuous if continuous at every point.`,
    },
  ],
  problems: [
    {
      id: '5.1',
      kind: 'prove',
      title: 'Open sets in a metric space',
      statement: md`Prove: (a) every open ball is open; (b) $\emptyset$ and $X$ are open, any union of open sets
        is open, and any finite intersection of open sets is open. (c) Give countably many open subsets of
        $\R$ whose intersection is not open.`,
      hints: [
        md`(a) For $y \in B(x, r)$, which radius $s$ makes $B(y, s) \subseteq B(x, r)$? Draw it.`,
        md`(b) For two sets, take the smaller radius, then induct.`,
      ],
      solution: md`(a) Let $y \in B(x, r)$ and $s = r - d(x, y) > 0$. If $d(y, z) < s$ then
        $d(x, z) \le d(x, y) + d(y, z) < r$; so $B(y, s) \subseteq B(x, r)$.

        (b) $\emptyset$ is open vacuously, $X$ because every ball lies in $X$. If $x \in \bigcup_i U_i$ then
        $x \in U_j$ for some $j$, and a ball around $x$ inside $U_j$ lies in the union. If $x \in U \cap V$ with
        $B(x, r) \subseteq U$ and $B(x, s) \subseteq V$, then $B(x, \min(r, s)) \subseteq U \cap V$; finitely
        many sets by induction.

        (c) $U_n = (-1/n, 1/n)$, $n \ge 1$. $\bigcap_n U_n = \{0\}$, since $x \ne 0$ lies outside $U_n$ once
        $n > 1/|x|$; and $\{0\}$ contains no interval $(-r, r)$.`,
      checks: [
        md`(a) chooses the radius $r - d(x, y)$ and verifies containment with the triangle inequality.`,
        md`Finite intersections use a minimum of finitely many positive radii.`,
        md`(c) verifies both that the intersection is $\{0\}$ and that $\{0\}$ is not open.`,
      ],
    },
    {
      id: '5.2',
      kind: 'prove',
      title: 'Closed means closed under limits',
      statement: md`In a metric space, prove that $F$ is closed if and only if every limit of a convergent
        sequence of points of $F$ lies in $F$.`,
      hints: [
        md`(⇒) If the limit $x$ were outside $F$, some ball around $x$ would miss $F$.`,
        md`(⇐) Contrapositive. If $X \setminus F$ is not open, find $x \notin F$ every ball around which meets
          $F$; use radii $1/n$.`,
      ],
      solution: md`(⇒) Let $F$ be closed, $x_n \in F$, $x_n \to x$, and suppose $x \notin F$. Since
        $X \setminus F$ is open, $B(x, r) \subseteq X \setminus F$ for some $r > 0$. For large $n$,
        $d(x_n, x) < r$, so $x_n \notin F$ — a contradiction.

        (⇐) Suppose $F$ is not closed: there is $x \notin F$ such that no ball around $x$ lies in
        $X \setminus F$, so every $B(x, 1/n)$ meets $F$. Choose $x_n \in F \cap B(x, 1/n)$. Then $x_n \to x$:
        given $\varepsilon > 0$, take $N > 1/\varepsilon$, so $d(x_n, x) < 1/n \le 1/N < \varepsilon$ for
        $n \ge N$. As $x \notin F$, the sequence condition fails.`,
      checks: [
        md`(⇒) derives a contradiction from a ball that avoids $F$.`,
        md`(⇐) negates "open" correctly and builds the sequence from shrinking balls.`,
        md`The convergence of the constructed sequence is verified.`,
      ],
    },
    {
      id: '5.3',
      kind: 'prove',
      title: 'Continuity without epsilons',
      statement: md`Prove that $f\colon X \to Y$ between metric spaces is continuous if and only if
        $f^{-1}(V)$ is open for every open $V \subseteq Y$.`,
      uses: ['5.1'],
      hints: [
        md`(⇒) For $a \in f^{-1}(V)$, $V$ contains a ball around $f(a)$. Continuity at $a$ turns it into a ball around $a$.`,
        md`(⇐) Given $a$ and $\varepsilon$, the ball $B(f(a), \varepsilon)$ is open.`,
      ],
      solution: md`(⇒) Let $V$ be open and $a \in f^{-1}(V)$. Choose $\varepsilon$ with
        $B(f(a), \varepsilon) \subseteq V$, then $\delta$ from continuity at $a$. If $d(x, a) < \delta$, then
        $f(x) \in B(f(a), \varepsilon) \subseteq V$. So $B(a, \delta) \subseteq f^{-1}(V)$.

        (⇐) Let $a \in X$ and $\varepsilon > 0$. $B(f(a), \varepsilon)$ is open (5.1), so its preimage is open
        and contains $a$: some $B(a, \delta)$ lies in it. That is,
        $d(x, a) < \delta \Rightarrow d(f(x), f(a)) < \varepsilon$.`,
      checks: [
        md`Both directions are proved.`,
        md`(⇒) works at an arbitrary point of $f^{-1}(V)$.`,
        md`(⇐) uses that balls are open.`,
      ],
    },
    {
      id: '5.4',
      kind: 'decide',
      title: 'Closures of balls',
      statement: md`**Prove or disprove:** in every metric space, the smallest closed set containing $B(x, r)$
        is $\{y : d(x, y) \le r\}$.`,
      verdict: false,
      hints: [
        md`In $\R^n$ it is true. Try a metric in which very few distances occur.`,
        md`Discrete metric, $r = 1$.`,
      ],
      solution: md`**False.** Let $X$ have at least two points and the discrete metric. Every $\{x\} = B(x, 1)$
        is open, so every subset is open (a union of singletons) and hence every subset is closed. Then
        $B(x, 1) = \{x\}$ is already closed — it is the smallest closed set containing itself — while
        $\{y : d(x, y) \le 1\} = X \ne \{x\}$.`,
      checks: [
        md`A specific metric space and radius are given.`,
        md`That $\{x\}$ is closed is justified.`,
        md`Both sets are computed and shown to differ.`,
      ],
    },
    {
      id: '5.5',
      kind: 'decide',
      title: 'Square roots of metrics',
      statement: md`**Prove or disprove:** if $d$ is a metric on $X$, then so is $\sqrt{d}$, defined by
        $\sqrt{d}(x, y) = \sqrt{d(x, y)}$.`,
      verdict: true,
      hints: [md`Only the triangle inequality is in question.`, md`Is $\sqrt{a + b} \le \sqrt a + \sqrt b$ for $a, b \ge 0$?`],
      solution: md`**True.** Positivity, $\sqrt{d(x, y)} = 0 \iff x = y$, and symmetry are inherited. For
        $a, b \ge 0$, $(\sqrt a + \sqrt b)^2 = a + b + 2\sqrt{ab} \ge a + b$, so $\sqrt{a + b} \le \sqrt a +
        \sqrt b$. As the square root is increasing,
        $\sqrt{d(x, z)} \le \sqrt{d(x, y) + d(y, z)} \le \sqrt{d(x, y)} + \sqrt{d(y, z)}$.

        (By contrast $d^2$ is not a metric in general: on $\R$, $d(0, 2)^2 = 4 > 1 + 1$.)`,
      checks: [
        md`All three axioms are addressed, the triangle inequality with proof.`,
        md`Monotonicity of the square root is used to pass from $d$ to $\sqrt d$.`,
      ],
    },
    {
      id: '5.6',
      kind: 'prove',
      title: 'Same open sets, different metrics',
      statement: md`(a) Let $d, d'$ be metrics on $X$ with constants $c, C > 0$ such that
        $c\,d \le d' \le C\,d$. Prove they have the same open sets. (b) Prove $\bar d = \min(d, 1)$ is a metric
        with the same open sets as $d$ — though no such constants need exist — and conclude that "bounded" is
        not determined by the open sets.`,
      hints: [
        md`(a) A $d'$-ball of radius $cr$ sits inside the $d$-ball of radius $r$.`,
        md`(b) Balls of radius at most 1 are the same for $d$ and $\bar d$. Why is that enough?`,
      ],
      solution: md`(a) If $d'(x, y) < cr$ then $d(x, y) \le d'(x, y)/c < r$: $B_{d'}(x, cr) \subseteq B_d(x, r)$.
        Likewise $B_d(x, r/C) \subseteq B_{d'}(x, r)$. So a ball of either kind around $x$ inside $U$ yields one
        of the other kind inside $U$, and the open sets agree.

        (b) Only the triangle inequality for $\bar d$ needs care. If $d(x, y) \ge 1$ or $d(y, z) \ge 1$, the
        right side of $\bar d(x, z) \le \bar d(x, y) + \bar d(y, z)$ is at least $1 \ge \bar d(x, z)$; otherwise
        it equals $d(x, y) + d(y, z) \ge d(x, z) \ge \bar d(x, z)$. For $r \le 1$, $B_{\bar d}(x, r) = B_d(x, r)$.
        Openness asks for *some* ball around each point inside the set, and a smaller ball still fits, so it
        is enough to use radii $r \le 1$: the open sets agree. On $\R$, $\bar d \le 1$ makes $\R$ bounded and
        $|x - y|$ does not, with the same open sets. (No constant $c > 0$ has $c|x - y| \le \min(|x - y|, 1)$:
        it fails once $|x - y| > 1/c$.)`,
      checks: [
        md`(a) proves containment of balls in both directions.`,
        md`(b) verifies the triangle inequality for $\min(d, 1)$ by cases.`,
        md`The reduction to radii $\le 1$ is justified.`,
      ],
    },
    {
      id: '5.7',
      kind: 'flaw',
      title: 'Continuous images of Cauchy sequences',
      statement: md`**Claim.** If $f\colon X \to Y$ is continuous and $(x_n)$ is Cauchy, then $(f(x_n))$ is
        Cauchy. Find the first line that is wrong or does not follow.`,
      lines: [
        md`Let $(x_n)$ be Cauchy in $X$, and let $\varepsilon > 0$.`,
        md`By continuity of $f$ there is $\delta > 0$ such that $d(a, b) < \delta$ implies
          $d(f(a), f(b)) < \varepsilon$.`,
        md`Since $(x_n)$ is Cauchy, there is $N$ with $d(x_m, x_n) < \delta$ for all $m, n \ge N$.`,
        md`Then $d(f(x_m), f(x_n)) < \varepsilon$ for all $m, n \ge N$.`,
        md`So $(f(x_n))$ is Cauchy. $\blacksquare$`,
      ],
      flawLine: 2,
      hints: [md`Compare line 2 with the definition of continuity. Where are the quantifiers?`, md`Try $1/x$ on $(0, 1)$.`],
      solution: md`**Line 2.** Continuity gives, for each point $a$, a $\delta$ that may depend on $a$; line 2
        claims one $\delta$ for all pairs at once — *uniform* continuity. The claim is false: $f(x) = 1/x$ on
        $(0, 1)$ is continuous, $x_n = 1/(n + 2)$ is Cauchy, and $f(x_n) = n + 2$ is not (consecutive terms are
        1 apart). With uniform continuity in place of continuity, the argument is correct.`,
      checks: [
        md`Line 2 is identified and the quantifier swap named (pointwise vs uniform).`,
        md`A counterexample: a Cauchy sequence with non-Cauchy image.`,
      ],
    },
    {
      id: '5.8',
      kind: 'prove',
      title: 'Complete and closed',
      statement: md`Let $Y \subseteq X$ carry the restricted metric. Prove: (a) if $X$ is complete and $Y$ is
        closed, then $Y$ is complete; (b) if $Y$ is complete, then $Y$ is closed in $X$.`,
      uses: ['5.2'],
      hints: [
        md`5.2, in both directions. Limits in a metric space are unique — prove it if you use it.`,
        md`(b) A sequence in $Y$ converging in $X$ is Cauchy. Why?`,
      ],
      solution: md`Two facts first. *Limits are unique:* if $x_n \to x$ and $x_n \to x'$, then
        $d(x, x') \le d(x, x_n) + d(x_n, x')$ is less than every $\varepsilon > 0$, so $x = x'$. *Convergent
        sequences are Cauchy:* $d(x_m, x_n) \le d(x_m, x) + d(x, x_n)$.

        (a) A Cauchy sequence in $Y$ is Cauchy in $X$, so converges to some $x \in X$; as $Y$ is closed,
        $x \in Y$ (5.2). (b) Let $y_n \in Y$ with $y_n \to x \in X$. Then $(y_n)$ is Cauchy, so it converges in
        $Y$ to some $y$ — also a limit in $X$. By uniqueness $x = y \in Y$. By 5.2, $Y$ is closed.`,
      checks: [
        md`Uniqueness of limits is proved or properly cited.`,
        md`(b) uses explicitly that convergent sequences are Cauchy.`,
        md`Closedness is concluded through the sequential criterion.`,
      ],
    },
    {
      id: '5.9',
      kind: 'prove',
      challenge: true,
      title: 'Contractions have fixed points',
      statement: md`Let $X$ be a nonempty complete metric space and $f\colon X \to X$ satisfy
        $d(f(x), f(y)) \le k\,d(x, y)$ for all $x, y$, where $0 \le k < 1$. Prove $f$ has exactly one fixed point.`,
      uses: ['5.8'],
      hints: [
        md`Uniqueness is one line.`,
        md`Existence: start anywhere, $x_{n+1} = f(x_n)$. Bound $d(x_{n+1}, x_n)$ by $k^n d(x_1, x_0)$.`,
        md`Telescoping plus a geometric series gives Cauchy. Then pass $f$ through the limit.`,
      ],
      solution: md`**Uniqueness.** If $f(x) = x$ and $f(y) = y$, then $d(x, y) \le k\,d(x, y)$, so
        $(1 - k)\,d(x, y) \le 0$ and $x = y$.

        **Existence.** Fix $x_0$ and put $x_{n+1} = f(x_n)$. By induction $d(x_{n+1}, x_n) \le k^n d(x_1, x_0)$.
        For $m > n$,
        $$d(x_m, x_n) \le \sum_{j=n}^{m-1} d(x_{j+1}, x_j) \le d(x_1, x_0)\sum_{j \ge n} k^j = \frac{k^n}{1 - k}\,d(x_1, x_0),$$
        which tends to 0. So $(x_n)$ is Cauchy and converges to some $x$. Then
        $d(f(x_n), f(x)) \le k\,d(x_n, x) \to 0$, so $x_{n+1} = f(x_n) \to f(x)$; but also $x_{n+1} \to x$. By
        uniqueness of limits (5.8), $f(x) = x$.`,
      checks: [
        md`Uniqueness uses $k < 1$.`,
        md`The Cauchy estimate sums a geometric series with an explicit bound.`,
        md`The limit is shown to be fixed via the Lipschitz bound and uniqueness of limits.`,
      ],
    },
  ],
}

export default unit
