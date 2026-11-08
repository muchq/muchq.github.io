import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'connected',
  n: 8,
  title: 'Connectedness',
  track: 'Topology',
  prereqs: [7],
  why: md`The first invariant that does real work: it proves the intermediate value theorem, tells $\R$ from
    $\R^2$, and in Unit 11 makes lifts unique. The technique is nearly always the same — a continuous map to
    $\{0, 1\}$ must be constant. The least upper bound property of $\R$ is assumed.`,
  definitions: [
    {
      term: 'Connected',
      body: md`$X$ is **connected** if it is not the union of two disjoint nonempty open sets. A subset is
        connected if it is connected in the subspace topology. $\{0, 1\}$ always carries the discrete topology.`,
    },
    {
      term: 'Paths',
      body: md`A **path** is a continuous $\alpha\colon [0, 1] \to X$, from $\alpha(0)$ to $\alpha(1)$. $X$ is
        **path-connected** if any two points are joined by a path. A subset $C \subseteq \R^n$ is **convex**
        if it contains the segment $\{(1 - t)u + tv : t \in [0, 1]\}$ for all $u, v \in C$.`,
    },
    {
      term: "Topologist's sine curve",
      body: md`$S = \{(x, \sin(1/x)) : 0 < x \le 1\} \cup (\{0\} \times [-1, 1]) \subseteq \R^2$.`,
    },
  ],
  problems: [
    {
      id: '8.1',
      kind: 'prove',
      title: 'The two-point test',
      statement: md`Prove that $X$ is connected if and only if every continuous $f\colon X \to \{0, 1\}$ is
        constant.`,
      hints: [md`A separation of $X$ and a non-constant continuous map to $\{0, 1\}$ are the same data.`],
      solution: md`If $X = U \cup V$ with $U, V$ disjoint, nonempty and open, then $f = 0$ on $U$, $1$ on $V$ is
        continuous — the preimages of $\emptyset, \{0\}, \{1\}, \{0, 1\}$ are $\emptyset, U, V, X$ — and not
        constant. Conversely if $f$ is continuous and not constant, $f^{-1}(0)$ and $f^{-1}(1)$ are disjoint,
        nonempty, open, and cover $X$. These are the two contrapositives.`,
      checks: [
        md`Continuity of the indicator map is checked on all four open sets.`,
        md`Both directions are proved.`,
      ],
    },
    {
      id: '8.2',
      kind: 'prove',
      title: 'The interval is connected',
      statement: md`Prove that $[0, 1]$ is connected.`,
      hints: [
        md`Suppose $[0, 1] = U \cup V$, disjoint, nonempty, open in $[0, 1]$, with $0 \in U$. Let
          $s = \sup\{t : [0, t] \subseteq U\}$.`,
        md`Show $s \in V$ is impossible, and $s \in U$ forces $s = 1$.`,
        md`"Open in $[0, 1]$" means: contains an interval around each point, intersected with $[0, 1]$.`,
      ],
      solution: md`Suppose $[0, 1] = U \cup V$ with $U, V$ disjoint, nonempty and open in $[0, 1]$; say
        $0 \in U$. Let $T = \{t \in [0, 1] : [0, t] \subseteq U\}$. $0 \in T$ and $T$ is bounded, so
        $s = \sup T \in [0, 1]$ exists, and $[0, t] \subseteq U$ for every $t < s$ (some member of $T$ exceeds
        $t$).

        *$s \in V$ is impossible.* Then $s > 0$, as $0 \in U$. Openness gives $\varepsilon \in (0, s]$ with
        $(s - \varepsilon, s] \subseteq V$. A point $t \in (s - \varepsilon, s)$ has $[0, t] \subseteq U$, so
        $t \in U \cap V$.

        *So $s \in U$*, and with $[0, t] \subseteq U$ for $t < s$ we get $[0, s] \subseteq U$, i.e. $s \in T$.
        If $s < 1$, openness gives $\varepsilon > 0$ with $s + \varepsilon \le 1$ and
        $[s, s + \varepsilon) \subseteq U$; then $s + \varepsilon/2 \in T$, contradicting $s = \sup T$. So
        $s = 1$, $[0, 1] \subseteq U$, and $V = \emptyset$ — a contradiction.`,
      checks: [
        md`The supremum is of a nonempty bounded set.`,
        md`Both cases, $s \in U$ and $s \in V$, are eliminated.`,
        md`Openness in the subspace $[0, 1]$ is handled at the endpoints.`,
      ],
    },
    {
      id: '8.3',
      kind: 'prove',
      title: 'Images, and the intermediate value theorem',
      statement: md`(a) Prove that a continuous image of a connected space is connected. (b) Deduce the
        intermediate value theorem: if $f\colon [a, b] \to \R$ is continuous and $y$ lies between $f(a)$ and
        $f(b)$, then $y = f(c)$ for some $c$. (c) Deduce that every continuous $f\colon [0, 1] \to [0, 1]$ has a
        fixed point.`,
      uses: ['8.1', '8.2'],
      hints: [
        md`(a) Use 8.1: compose with a map to $\{0, 1\}$.`,
        md`(b) If $y$ is missed, split $f([a, b])$ by the two sides of $y$.`,
        md`(c) Apply (b) to $f(x) - x$.`,
      ],
      solution: md`(a) Let $f\colon X \to Y$ be continuous, $X$ connected. $f$ is continuous as a map onto the
        subspace $f(X)$, since $f^{-1}(W \cap f(X)) = f^{-1}(W)$. If $g\colon f(X) \to \{0, 1\}$ is continuous,
        $g \circ f$ is constant (8.1), and as $f$ maps onto $f(X)$, $g$ is constant. By 8.1, $f(X)$ is connected.

        (b) $t \mapsto a + t(b - a)$ is a homeomorphism $[0, 1] \to [a, b]$, so $[a, b]$ is connected by (a) and
        8.2. If $y = f(a)$ or $y = f(b)$ we are done. Otherwise say $f(a) < y < f(b)$ (the other order is the
        same) and suppose $y \notin f([a, b])$. Then $f([a, b]) \cap (-\infty, y)$ and
        $f([a, b]) \cap (y, \infty)$ are disjoint, open in $f([a, b])$, nonempty (containing $f(a)$ and $f(b)$),
        and cover $f([a, b])$ — contradicting (a).

        (c) $g(x) = f(x) - x$ is continuous with $g(0) \ge 0 \ge g(1)$, so $g(c) = 0$ for some $c$ by (b).`,
      checks: [
        md`(a) restricts the codomain to the image and checks continuity there.`,
        md`(b) handles the endpoint values and both orders.`,
        md`(c) uses an auxiliary function with a sign change.`,
      ],
    },
    {
      id: '8.4',
      kind: 'prove',
      title: 'Gluing connected sets',
      statement: md`Prove: (a) if connected subsets $A_i$ of $X$ share a common point, then $\bigcup_i A_i$ is
        connected; (b) if $A$ is connected and $A \subseteq B \subseteq \overline A$, then $B$ is connected;
        (c) path-connected spaces are connected; in particular convex subsets of $\R^n$ are connected.`,
      uses: ['8.1', '8.2', '8.3'],
      hints: [
        md`In each part, take a continuous $f$ to $\{0, 1\}$ on the big set and show it is constant.`,
        md`(b) If $f$ is constant $c$ on $A$, then $f^{-1}(c)$ is closed in $B$ and contains $A$. What is the
          closure of $A$ inside the subspace $B$?`,
        md`(c) Fix $x_0$ and use (a) with images of paths from $x_0$.`,
      ],
      solution: md`(a) Let $p$ be the common point and $f\colon \bigcup_i A_i \to \{0, 1\}$ continuous. Each
        restriction to $A_i$ is continuous, hence constant (8.1), with value $f(p)$. So $f$ is constant.

        (b) Let $f\colon B \to \{0, 1\}$ be continuous. If $A = \emptyset$ then $B = \emptyset$. Otherwise $f$ is
        constant on $A$, say $c$. $f^{-1}(c)$ is closed in $B$ and contains $A$. The closed sets of $B$ are the
        $C \cap B$ with $C$ closed in $X$, so the closure of $A$ in $B$ is $\overline A \cap B = B$; hence
        $f^{-1}(c) = B$.

        (c) If $X = \emptyset$ there is nothing to prove; fix $x_0$. For each $x$ choose a path $\alpha_x$ from
        $x_0$ to $x$. Each $\alpha_x([0, 1])$ is connected (8.2, 8.3) and contains $x_0$, and their union is
        $X$; apply (a). Convex sets are path-connected by straight segments.`,
      checks: [
        md`Each part reduces to the two-point test.`,
        md`(b) identifies the closure of $A$ within the subspace $B$.`,
        md`(c) uses images of $[0, 1]$, all through one common point.`,
      ],
    },
    {
      id: '8.5',
      kind: 'decide',
      title: 'Connected products',
      statement: md`**Prove or disprove:** if $X$ and $Y$ are connected, then $X \times Y$ is connected.`,
      verdict: true,
      uses: ['8.3', '8.4', '6.10'],
      hints: [
        md`The slices $X \times \{y\}$ and $\{x\} \times Y$ are images of $X$ and $Y$.`,
        md`Fix $b \in Y$. For each $x$, find one connected set containing $X \times \{b\}$ and $\{x\} \times Y$.`,
      ],
      solution: md`**True.** If either factor is empty the product is empty. Otherwise fix $b \in Y$. The slice
        $X \times \{b\}$ is the image of $X$ under the continuous $x' \mapsto (x', b)$ (6.10), so it is connected
        (8.3); likewise $\{x\} \times Y$. They share $(x, b)$, so $C_x = (X \times \{b\}) \cup (\{x\} \times Y)$ is
        connected (8.4(a)). Every $C_x$ contains the point $(a, b)$ for a fixed $a \in X$, and
        $\bigcup_x C_x = X \times Y$ since $(x, y) \in C_x$. By 8.4(a) again, $X \times Y$ is connected.`,
      checks: [
        md`Slices are shown connected as continuous images.`,
        md`8.4(a) is applied twice, naming the common point each time.`,
        md`The union of the $C_x$ is shown to be all of $X \times Y$.`,
      ],
    },
    {
      id: '8.6',
      kind: 'prove',
      title: 'Telling spaces apart',
      statement: md`Prove that $\R$ is not homeomorphic to $\R^2$, and that $[0, 1]$ is not homeomorphic to the
        circle $S^1 = \{(x, y) : x^2 + y^2 = 1\}$.`,
      uses: ['8.3', '8.4', '6.9'],
      hints: [
        md`A homeomorphism $h\colon X \to Y$ restricts to a homeomorphism $X \setminus \{x\} \to Y \setminus \{h(x)\}$.`,
        md`Removing a point disconnects $\R$. Show $\R^2$ minus a point is path-connected.`,
        md`For $S^1$: what happens when you remove a point from $[0, 1]$, and from $S^1$?`,
      ],
      solution: md`A homeomorphism $h\colon X \to Y$ restricts to a homeomorphism
        $X \setminus \{x\} \to Y \setminus \{h(x)\}$: the restrictions of $h$ and $h^{-1}$ to subspaces are
        continuous and mutually inverse.

        **$\R$ vs $\R^2$.** $\R \setminus \{0\}$ is the union of the disjoint nonempty open sets
        $(-\infty, 0)$ and $(0, \infty)$, so is disconnected. But $\R^2 \setminus \{p\}$ is path-connected: for
        $u, v \ne p$, if the segment from $u$ to $v$ misses $p$, use it; otherwise $u$, $v$, $p$ are collinear,
        and choosing $w$ off that line, the segments $[u, w]$ and $[w, v]$ miss $p$ (the line through $u$ and
        $w$ meets the line through $u$ and $v$ only at $u \ne p$; likewise for $v$). Concatenating the two
        segments gives a path (pasting, 6.9). So $\R^2 \setminus \{h(0)\}$ is connected (8.4(c)) while
        $\R \setminus \{0\}$ is not.

        **$[0, 1]$ vs $S^1$.** $[0, 1] \setminus \{1/2\}$ is disconnected (split at $1/2$). Identify $\R^2$ with
        $\C$, so $S^1$ is the image of $p(t) = e^{2\pi i t}$. Any $q \in S^1$ is $p(s)$ for some $s$, and since
        $p$ is onto with $p(t) = p(s) \iff t - s \in \Z$, $p$ maps the interval $(s, s + 1)$ onto
        $S^1 \setminus \{q\}$. The interval is connected, being convex (8.4(c)), so $S^1 \setminus \{q\}$ is
        connected (8.3). A homeomorphism $h\colon [0, 1] \to S^1$ would make $S^1 \setminus \{h(1/2)\}$ disconnected.`,
      checks: [
        md`Restricting a homeomorphism to punctured spaces is justified.`,
        md`$\R^2$ minus a point is shown path-connected with an explicit path avoiding the point.`,
        md`The circle minus *any* point is shown connected.`,
      ],
    },
    {
      id: '8.7',
      kind: 'prove',
      title: 'Open connected sets in ℝⁿ',
      statement: md`Let $U \subseteq \R^n$ be open and connected. Prove that $U$ is path-connected.`,
      uses: ['6.9'],
      hints: [
        md`Fix $x_0 \in U$; let $P$ be the points of $U$ reachable from $x_0$ by a path in $U$. Show $P$ and
          $U \setminus P$ are both open.`,
        md`Balls are convex. Concatenate paths with the pasting lemma.`,
      ],
      solution: md`If $U = \emptyset$ we are done. Fix $x_0 \in U$ and let $P$ be the set of $x \in U$ joined to
        $x_0$ by a path in $U$; $x_0 \in P$ by the constant path. Concatenation of a path from $a$ to $b$ with
        one from $b$ to $c$ (first at double speed on $[0, 1/2]$, then the second on $[1/2, 1]$) is a path,
        by pasting (6.9).

        *$P$ is open:* for $x \in P$ take $B(x, r) \subseteq U$. Each $y$ in the ball is joined to $x$ by the
        segment $t \mapsto (1 - t)x + ty$, which stays in the convex ball; concatenating, $y \in P$.
        *$U \setminus P$ is open:* if $x \in U \setminus P$ and $B(x, r) \subseteq U$, no $y$ in the ball is in
        $P$, since otherwise concatenating with the segment from $y$ to $x$ would put $x$ in $P$.

        $U$ is connected and $P \ne \emptyset$, so $U \setminus P = \emptyset$.`,
      checks: [
        md`Both $P$ and $U \setminus P$ are shown open.`,
        md`Concatenation is justified by the pasting lemma.`,
        md`Convexity of balls supplies the local paths.`,
      ],
    },
    {
      id: '8.8',
      kind: 'flaw',
      title: 'Intersections of connected sets',
      statement: md`**Claim.** If $A$ and $B$ are connected subsets of $X$ and $A \cap B \ne \emptyset$, then
        $A \cap B$ is connected. Find the first line that is wrong or does not follow.`,
      lines: [
        md`Let $f\colon A \cap B \to \{0, 1\}$ be continuous; by 8.1 it suffices to show $f$ is constant.`,
        md`Extend $f$ to a continuous function $F\colon A \to \{0, 1\}$.`,
        md`Since $A$ is connected, $F$ is constant, so $f = F|_{A \cap B}$ is constant.`,
        md`Hence $A \cap B$ is connected. $\blacksquare$`,
      ],
      flawLine: 2,
      hints: [md`Which line asserts that something exists without constructing it?`, md`Two arcs of a circle.`],
      solution: md`**Line 2.** Nothing says a continuous function on $A \cap B$ extends continuously to $A$, and
        the claim is false: let $A$ and $B$ be the upper and lower closed half-circles of $S^1 \subseteq \R^2$.
        Each is connected (a continuous image of an interval), but $A \cap B = \{(1, 0), (-1, 0)\}$ is a
        two-point discrete space, which is disconnected. (A warning sign: the argument never used $B$.)`,
      checks: [
        md`Line 2 is identified as an unjustified extension.`,
        md`A counterexample with $A \cap B$ disconnected is checked.`,
      ],
    },
    {
      id: '8.9',
      kind: 'prove',
      title: 'Connected groups',
      statement: md`Let $G$ be a connected topological group and $U$ an open set containing $e$. Prove that the
        subgroup generated by $U$ — all finite products $u_1^{\pm 1}\cdots u_k^{\pm 1}$ with $u_i \in U$,
        including the empty product $e$ — is all of $G$.`,
      uses: ['7.3'],
      hints: [md`Call it $H$. Show $H$ is open: it contains a translate of $U$ around each of its points.`],
      solution: md`$H$ is a subgroup: products of such words are such words, and the inverse of a word is the
        reversed word with exponents negated. For $h \in H$, $hU = L_h(U)$ is open (7.3), contains $h$, and lies
        in $H$. So $H = \bigcup_{h \in H} hU$ is open, hence also closed (7.3(c)). As $e \in H$ and $G$ is
        connected, $H = G$ — otherwise $H$ and $G \setminus H$ would separate $G$.`,
      checks: [
        md`$H$ is shown to be a subgroup.`,
        md`$H$ is shown open by covering it with translates of $U$.`,
        md`Connectedness is applied to the nonempty, open and closed $H$.`,
      ],
    },
    {
      id: '8.10',
      kind: 'decide',
      challenge: true,
      title: 'Connected versus path-connected',
      statement: md`**Prove or disprove:** every connected space is path-connected.`,
      verdict: false,
      uses: ['8.3', '8.4', '6.2'],
      hints: [
        md`The topologist's sine curve $S$. For connectedness: what is the closure of the graph part?`,
        md`Suppose $\alpha$ is a path in $S$ from $(0, 0)$ to $(1, \sin 1)$. Consider the last time $t_0$ that
          $\alpha$ is on the segment $\{0\} \times [-1, 1]$.`,
        md`Just after $t_0$, the first coordinate is positive and tends to 0, so $\sin(1/x)$ hits $\pm 1$
          arbitrarily close to $t_0$. Contradict continuity of the second coordinate.`,
      ],
      solution: md`**False:** the topologist's sine curve $S$.

        **Connected.** The graph $G = \{(x, \sin(1/x)) : 0 < x \le 1\}$ is the image of the connected $(0, 1]$
        under a continuous map, so connected. Each $(0, y)$ with $|y| \le 1$ is in $\overline G$: pick $\theta$
        with $\sin\theta = y$; then $x_k = 1/(\theta + 2\pi k)$ lies in $(0, 1]$ for large $k$, and
        $(x_k, y) \in G$ converges to $(0, y)$. So $G \subseteq S \subseteq \overline G$, and $S$ is connected
        by 8.4(b).

        **Not path-connected.** Let $\alpha = (\alpha_1, \alpha_2)\colon [0, 1] \to S$ be a path from $(0, 0)$
        to $(1, \sin 1)$. $Z = \alpha^{-1}(\{0\} \times [-1, 1])$ is closed, contains 0 and not 1. Its supremum
        $t_0$ exists, and every interval around $t_0$ meets $Z$, so $t_0 \in \overline Z = Z$ (6.2); hence
        $t_0 = \max Z < 1$. For $t > t_0$, $\alpha(t) \in G$: $\alpha_1(t) > 0$ and
        $\alpha_2(t) = \sin(1/\alpha_1(t))$. By continuity of $\alpha_2$ at $t_0$ choose $\delta > 0$, with
        $t_0 + \delta \le 1$, such that $|\alpha_2(t) - \alpha_2(t_0)| < 1$ for $|t - t_0| < \delta$. Let
        $a = \alpha_1(t_0 + \delta/2) > 0$. By the intermediate value theorem (8.3), $\alpha_1$ takes every value
        in $(0, a)$ on $(t_0, t_0 + \delta/2)$. For large $k$, $1/(\pi/2 + 2\pi k)$ and $1/(3\pi/2 + 2\pi k)$
        are in $(0, a)$, giving times $t, t'$ within $\delta$ of $t_0$ with $\alpha_2(t) = 1$ and
        $\alpha_2(t') = -1$. Both lie within 1 of $\alpha_2(t_0)$, so $2 = |\alpha_2(t) - \alpha_2(t')| < 2$.
        Contradiction.`,
      checks: [
        md`Connectedness via $G \subseteq S \subseteq \overline G$, each point of the segment shown to be a
          limit of graph points.`,
        md`The last time $t_0$ on the segment is defined and shown to exist.`,
        md`The IVT yields times near $t_0$ where the second coordinate is $1$ and $-1$.`,
        md`The contradiction with continuity is made quantitative.`,
      ],
    },
  ],
}

export default unit
