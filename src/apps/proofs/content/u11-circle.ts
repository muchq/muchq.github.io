import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'circle',
  n: 11,
  title: 'The circle',
  track: 'Synthesis',
  prereqs: [10, 9],
  why: md`Everything converges. Lifting paths takes compactness (Lebesgue numbers) and connectedness
    (uniqueness); the answer is a group isomorphism $\pi_1(S^1) \cong \Z$; and its consequences — Brouwer's
    fixed point theorem, the fundamental theorem of algebra — are facts about the plane that neither algebra
    nor epsilons reach alone.`,
  definitions: [
    {
      term: 'The exponential map',
      body: md`$p\colon \R \to S^1 \subseteq \C$, $p(t) = e^{2\pi i t}$. Assumed: $p$ is a continuous
        surjective homomorphism $(\R, +) \to (S^1, \cdot)$ with kernel $\Z$; so $p(s) = p(t) \iff s - t \in \Z$.
        The basepoint is $1 = p(0)$.`,
    },
    {
      term: 'Lift',
      body: md`A **lift** of a continuous $f\colon Y \to S^1$ is a continuous $\tilde f\colon Y \to \R$ with
        $p \circ \tilde f = f$.`,
    },
    {
      term: 'Degree',
      body: md`For a loop $\alpha$ at $1$, $\deg\alpha = \tilde\alpha(1)$, where $\tilde\alpha$ is the lift
        with $\tilde\alpha(0) = 0$ (it exists and is unique: 11.2–11.3). For a continuous
        $f\colon S^1 \to S^1$, $\deg f = \ell(1) - \ell(0)$ for any lift $\ell$ of $s \mapsto f(p(s))$ on
        $[0, 1]$.`,
    },
  ],
  problems: [
    {
      id: '11.1',
      kind: 'prove',
      title: 'Local inverses of the exponential',
      statement: md`For $a \in \R$ let $U_a = S^1 \setminus \{p(a)\}$. Prove: (a) $p^{-1}(U_a)$ is the disjoint
        union of the open intervals $J_n = (a + n, a + n + 1)$, $n \in \Z$; (b) each restriction
        $p|_{J_n}\colon J_n \to U_a$ is a homeomorphism.`,
      uses: ['9.1', '9.3', '9.5'],
      hints: [
        md`(a) $p(t) = p(a)$ iff $t - a \in \Z$.`,
        md`(b) For the inverse, show $p|_{J_n}$ is open: for open $V \subseteq J_n$,
          $p(V) = S^1 \setminus p(\bar J_n \setminus V)$ with $\bar J_n = [a + n, a + n + 1]$. Why is the removed
          set closed?`,
      ],
      solution: md`(a) $p(t) \ne p(a) \iff t - a \notin \Z \iff t \in \bigcup_n J_n$, and the $J_n$ are pairwise
        disjoint.

        (b) Fix $n$; write $J = J_n$ and $\bar J = [a + n, a + n + 1]$. By (a), $p(J) \subseteq U_a$. *Injective:*
        $p(s) = p(t)$ with $s, t \in J$ gives $s - t \in \Z$ and $|s - t| < 1$, so $s = t$. *Onto $U_a$:* for
        $z \in U_a$, $z = p(t)$, and shifting $t$ by an integer puts it in $[a + n, a + n + 1)$, but not at
        $a + n$ since $z \ne p(a)$. *Open:* let $V \subseteq J$ be open and $C = \bar J \setminus V$. $C$ is
        closed in the compact $\bar J$ (9.1, 9.5), so $p(C)$ is compact, hence closed in the Hausdorff $S^1$
        (9.3). Now $p(\bar J) = S^1$, and $p(V) \cap p(C) = \emptyset$: $C$ contains the two endpoints, which map
        to $p(a) \notin p(V)$, and points of $J \setminus V$, whose images differ from those of $V$ by
        injectivity on $J$. So $p(V) = S^1 \setminus p(C)$ is open in $S^1$, hence in $U_a$. Thus
        $(p|_J)^{-1}$ is continuous.`,
      checks: [
        md`(a) uses exactly the kernel of $p$.`,
        md`Bijectivity onto $U_a$ is checked, including that the image avoids $p(a)$.`,
        md`Openness is proved through compactness of a closed interval and Hausdorffness of $S^1$.`,
      ],
    },
    {
      id: '11.2',
      kind: 'prove',
      title: 'Lifts are unique',
      statement: md`Let $Y$ be connected and $f\colon Y \to S^1$ continuous. Prove that two lifts of $f$ that
        agree at one point are equal.`,
      uses: ['8.3'],
      hints: [
        md`$p(\tilde f_1(y)) = p(\tilde f_2(y))$ says something about $\tilde f_1(y) - \tilde f_2(y)$.`,
        md`What are the connected subsets of $\Z \subseteq \R$?`,
      ],
      solution: md`$g = \tilde f_1 - \tilde f_2$ is continuous $Y \to \R$, and $p(\tilde f_1(y)) =
        p(\tilde f_2(y))$ gives $g(y) \in \Z$. $g(Y)$ is connected (8.3) and lies in $\Z$; a subset of $\Z$
        containing $m < n$ is split by $(-\infty, m + \frac12)$ and $(m + \frac12, \infty)$, so $g(Y)$ is a single
        point. As $g$ vanishes somewhere, $g \equiv 0$.`,
      checks: [
        md`Uses that $p(s) = p(t)$ iff $s - t \in \Z$.`,
        md`Shows a connected subset of $\Z$ has at most one point.`,
        md`Uses the point of agreement to make the constant 0.`,
      ],
    },
    {
      id: '11.3',
      kind: 'prove',
      title: 'Path lifting',
      statement: md`Let $\alpha\colon I \to S^1$ be a path and $t_0 \in \R$ with $p(t_0) = \alpha(0)$. Prove that
        there is a unique lift $\tilde\alpha$ of $\alpha$ with $\tilde\alpha(0) = t_0$.`,
      uses: ['11.1', '11.2', '9.9', '6.9', '8.2'],
      hints: [
        md`Uniqueness is 11.2. For existence cover $S^1$ by $U_0$ and $U_{1/2}$ (notation of 11.1).`,
        md`A Lebesgue number for $\{\alpha^{-1}(U_0), \alpha^{-1}(U_{1/2})\}$ subdivides $I$ into pieces each
          mapped into one of the two sets.`,
        md`Lift piece by piece, using the interval over $U_a$ that contains the value already reached.`,
      ],
      solution: md`Uniqueness: $I$ is connected (8.2), so 11.2 applies.

        Existence: $U_0 = S^1 \setminus \{1\}$ and $U_{1/2} = S^1 \setminus \{-1\}$ cover $S^1$, so their
        preimages under $\alpha$ form an open cover of the compact metric space $I$. Let $\delta$ be a Lebesgue
        number (9.9) and $0 = s_0 < s_1 < \dots < s_N = 1$ with $s_k - s_{k-1} < \delta$; then each
        $\alpha([s_{k-1}, s_k])$ lies in some $U_{a_k}$, $a_k \in \{0, \frac12\}$.

        By induction on $k$ we define a continuous $\tilde\alpha$ on $[0, s_k]$ with $p \circ \tilde\alpha =
        \alpha$ and $\tilde\alpha(0) = t_0$. Start with $\tilde\alpha(0) = t_0$. For the step,
        $p(\tilde\alpha(s_{k-1})) = \alpha(s_{k-1}) \in U_{a_k}$, so $\tilde\alpha(s_{k-1})$ lies in exactly one
        interval $J$ over $U_{a_k}$ (11.1(a)). Put $\tilde\alpha = (p|_J)^{-1} \circ \alpha$ on
        $[s_{k-1}, s_k]$ — continuous by 11.1(b), and agreeing with the old value at $s_{k-1}$, as both are the
        unique point of $J$ over $\alpha(s_{k-1})$. Pasting (6.9) gives continuity on $[0, s_k]$. After $N$
        steps, $\tilde\alpha$ is defined on $I$.`,
      checks: [
        md`A Lebesgue number yields a subdivision with each piece inside one evenly covered set.`,
        md`Each extension uses the interval containing the previous value, so the pieces agree.`,
        md`The assembled lift is continuous by pasting.`,
      ],
    },
    {
      id: '11.4',
      kind: 'prove',
      challenge: true,
      title: 'Homotopy lifting',
      statement: md`Let $F\colon I \times I \to S^1$ be continuous and $t_0 \in \R$ with $p(t_0) = F(0, 0)$.
        Prove there is a unique continuous $\tilde F\colon I \times I \to \R$ with $p \circ \tilde F = F$ and
        $\tilde F(0, 0) = t_0$. Deduce: if $\alpha \simeq_p \beta$ in $S^1$, their lifts from a common starting
        point end at a common point.`,
      uses: ['11.1', '11.2', '11.3', '9.8', '9.9', '8.4', '8.5', '6.9'],
      hints: [
        md`As in 11.3: a Lebesgue number for $\{F^{-1}(U_0), F^{-1}(U_{1/2})\}$ on the compact square, and a
          grid of small squares.`,
        md`Lift square by square, row by row. Where a new square meets what is already lifted — its bottom
          edge, its left edge, or both — is connected and contains its lower-left corner. Choose the interval
          over $U_a$ containing the lift of that corner. Why do the two definitions agree on the *whole*
          overlap?`,
        md`Deduction: lift a path homotopy. Its side edges map to single points, so their lifts are constant.`,
      ],
      solution: md`**Uniqueness:** $I \times I$ is connected (8.5); apply 11.2.

        **Existence.** $I \times I$ is a compact metric space (9.8). Let $\delta$ be a Lebesgue number for
        $\{F^{-1}(U_0), F^{-1}(U_{1/2})\}$ and pick $N$ with $\sqrt2/N < \delta$. Each square
        $Q_{jk} = [\frac{j-1}{N}, \frac jN] \times [\frac{k-1}{N}, \frac kN]$ has diameter less than $\delta$,
        so $F(Q_{jk}) \subseteq U_{a_{jk}}$ for some $a_{jk}$. Take the squares in the order
        $Q_{11}, Q_{21}, \dots, Q_{N1}, Q_{12}, \dots$ — left to right, bottom to top.

        Suppose $\tilde F$ is defined, continuous and a lift on the union $R$ of the squares before $Q = Q_{jk}$.
        $A = Q \cap R$ is empty (only for $Q_{11}$), or the bottom edge of $Q$, or its left edge, or both. Each
        edge is a continuous image of an interval, hence connected (8.2, 8.3), and both contain the corner
        $c = (\frac{j-1}N, \frac{k-1}N)$, so $A$ is connected (8.4(a)) and contains $c$. Let $J$ be the interval
        over $U_{a_{jk}}$ containing $\tilde F(c)$ (for $Q_{11}$, containing $t_0$) and put
        $G = (p|_J)^{-1} \circ F$ on $Q$. On $A$, $G$ and $\tilde F$ are lifts of $F|_A$ that agree at $c$, so
        they agree on all of $A$ (11.2). $R$ and $Q$ are closed, so pasting (6.9) extends $\tilde F$
        continuously to $R \cup Q$. After $N^2$ steps, $\tilde F$ is defined on $I \times I$.

        **Deduction.** Let $H$ be a path homotopy from $\alpha$ to $\beta$ (from $x$ to $y$) and $\tilde H$ its
        lift with $\tilde H(0, 0) = \tilde\alpha(0)$. $t \mapsto \tilde H(0, t)$ and the constant path at
        $\tilde H(0, 0)$ both lift the constant path at $x$ and agree at $t = 0$, so they are equal (11.2);
        likewise $t \mapsto \tilde H(1, t)$ is constant. $s \mapsto \tilde H(s, 0)$ lifts $\alpha$ from
        $\tilde\alpha(0)$, so it is $\tilde\alpha$; $s \mapsto \tilde H(s, 1)$ lifts $\beta$ from
        $\tilde H(0, 1) = \tilde\alpha(0)$, so it is $\tilde\beta$. Hence
        $\tilde\beta(1) = \tilde H(1, 1) = \tilde H(1, 0) = \tilde\alpha(1)$.`,
      checks: [
        md`A Lebesgue number gives a grid of squares, each mapping into one evenly covered set.`,
        md`The overlap of each new square with the lifted region is shown connected, containing the corner
          where the interval is chosen.`,
        md`Agreement on the whole overlap comes from uniqueness of lifts.`,
        md`The deduction shows the side edges lift to constants.`,
      ],
    },
    {
      id: '11.5',
      kind: 'prove',
      title: 'Degree is a homomorphism',
      statement: md`Prove that $\deg\alpha$ is an integer, that it depends only on $[\alpha]$, and that
        $\deg\colon \pi_1(S^1, 1) \to \Z$ is a homomorphism.`,
      uses: ['11.3', '11.4', '6.9'],
      hints: [
        md`Integer: $p(\tilde\alpha(1)) = 1$. Well defined: 11.4.`,
        md`The lift of $\alpha \cdot \beta$: first $\tilde\alpha$, then $\tilde\beta$ shifted by $\deg\alpha$. Why
          is $m + \tilde\beta$ a lift of $\beta$ when $m \in \Z$?`,
      ],
      solution: md`$p(\tilde\alpha(1)) = \alpha(1) = 1$, so $\tilde\alpha(1) \in \ker p = \Z$. If
        $\alpha \simeq_p \alpha'$, their lifts from 0 end together (11.4), so $\deg$ is well defined on classes.
        Let $m = \deg\alpha$ and $\gamma(s) = \tilde\alpha(2s)$ for $s \le \frac12$, $m + \tilde\beta(2s - 1)$ for
        $s \ge \frac12$. Both give $m$ at $s = \frac12$, so $\gamma$ is continuous (6.9). As $p$ is a
        homomorphism with $p(m) = 1$, $p(m + t) = p(t)$, so $p \circ \gamma = \alpha \cdot \beta$; and
        $\gamma(0) = 0$. By uniqueness (11.3), $\gamma$ is the lift of $\alpha \cdot \beta$, and
        $\deg(\alpha \cdot \beta) = \gamma(1) = m + \deg\beta$.`,
      checks: [
        md`Integrality uses the kernel of $p$.`,
        md`Well-definedness cites homotopy lifting.`,
        md`The lift of the concatenation is built explicitly and identified by uniqueness.`,
      ],
    },
    {
      id: '11.6',
      kind: 'prove',
      title: 'The fundamental group of the circle',
      statement: md`Prove that $\deg\colon \pi_1(S^1, 1) \to \Z$ is an isomorphism.`,
      uses: ['11.5', '10.5', '3.1'],
      hints: [
        md`Onto: which loop has degree $n$? Its lift is obvious.`,
        md`Injective: if $\deg\alpha = 0$, $\tilde\alpha$ is a loop in $\R$. Contract it there and push down by $p$.`,
      ],
      solution: md`*Onto:* $\omega_n(s) = p(ns)$ is a loop at $1$ lifted by $s \mapsto ns$, so
        $\deg\omega_n = n$. *Injective:* by 3.1 it is enough that the kernel is trivial. If $\deg\alpha = 0$,
        $\tilde\alpha$ is a loop at $0$ in the convex set $\R$, so there is a path homotopy $\tilde H$ from
        $\tilde\alpha$ to $c_0$ (10.5), and $p \circ \tilde H$ is a path homotopy from $\alpha$ to $c_1$.`,
      checks: [
        md`An explicit loop of each degree, with its lift.`,
        md`Injectivity via the kernel, pushing a homotopy in $\R$ down by $p$.`,
      ],
    },
    {
      id: '11.7',
      kind: 'prove',
      title: 'Degree of a map of the circle',
      statement: md`For continuous $f\colon S^1 \to S^1$ prove: (a) $\deg f$ is a well-defined integer; (b) if
        $H\colon S^1 \times I \to S^1$ is a homotopy from $f$ to $g$, then $\deg f = \deg g$; (c) the identity
        has degree 1 and a constant map has degree 0.`,
      uses: ['11.2', '11.3', '11.4'],
      hints: [
        md`(a) Two lifts differ by a constant integer — that is the proof of 11.2.`,
        md`(b) Lift $F(s, t) = H(p(s), t)$ on $I \times I$ (11.4). Then $t \mapsto \tilde F(1, t) - \tilde F(0, t)$
          is continuous and integer-valued.`,
      ],
      solution: md`(a) A lift $\ell$ exists by 11.3. $p(\ell(1)) = f(p(1)) = f(p(0)) = p(\ell(0))$, so
        $\ell(1) - \ell(0) \in \Z$. Two lifts differ by a continuous integer-valued function on the connected
        $I$, which is constant (proof of 11.2), so $\ell(1) - \ell(0)$ does not depend on the lift.

        (b) $F(s, t) = H(p(s), t)$ is continuous on $I \times I$; let $\tilde F$ lift it (11.4). For each $t$,
        $s \mapsto \tilde F(s, t)$ lifts $s \mapsto H(p(s), t)$, so $d(t) = \tilde F(1, t) - \tilde F(0, t)$ is
        the degree of $H(\cdot, t)$, an integer by (a). $d$ is continuous and integer-valued on the connected
        $I$, hence constant: $\deg f = d(0) = d(1) = \deg g$.

        (c) $s \mapsto s$ lifts $p$, giving degree 1. For the constant map with value $p(c)$, the constant $c$
        is a lift, giving degree 0.`,
      checks: [
        md`Independence of the chosen lift is proved.`,
        md`(b) lifts the whole homotopy at once and shows $d$ is continuous and integer-valued.`,
        md`(c) exhibits explicit lifts.`,
      ],
    },
    {
      id: '11.8',
      kind: 'decide',
      title: 'Shrinking the circle',
      statement: md`**Prove or disprove:** the identity map of $S^1$ is homotopic to a constant map.`,
      verdict: false,
      uses: ['11.7'],
      hints: [md`Compute two degrees.`],
      solution: md`**False.** $\deg(\mathrm{id}) = 1$ and a constant map has degree $0$ (11.7(c)), while
        homotopic maps have equal degree (11.7(b)).`,
      checks: [md`Both degrees are cited, and homotopy invariance is applied.`],
    },
    {
      id: '11.9',
      kind: 'prove',
      title: 'No retraction of the disk',
      statement: md`Prove that there is no retraction $r\colon D^2 \to S^1$.`,
      uses: ['10.9', '11.6', '10.5'],
      hints: [
        md`If $r$ existed, $i_*\colon \pi_1(S^1) \to \pi_1(D^2)$ would be injective (10.9). What is $\pi_1(D^2)$?`,
        md`Alternatively: $H(z, t) = r(tz)$.`,
      ],
      solution: md`Suppose $r$ is a retraction. By 10.9, $i_*\colon \pi_1(S^1, 1) \to \pi_1(D^2, 1)$ is
        injective. But $\pi_1(S^1, 1) \cong \Z$ (11.6), while $\pi_1(D^2, 1)$ is trivial because $D^2$ is convex
        (10.5). An infinite group does not inject into the trivial group.

        (Alternatively, $H(z, t) = r(tz)$ is a homotopy $S^1 \times I \to S^1$ from the constant map $r(0)$ to
        $r|_{S^1} = \mathrm{id}$, contradicting 11.8.)`,
      checks: [
        md`Convexity of $D^2$ gives trivial $\pi_1$.`,
        md`The contradiction is with injectivity of $i_*$, or with 11.8 via an explicit homotopy.`,
      ],
    },
    {
      id: '11.10',
      kind: 'prove',
      title: "Brouwer's fixed point theorem",
      statement: md`Prove that every continuous $f\colon D^2 \to D^2$ has a fixed point.`,
      uses: ['11.9'],
      hints: [
        md`If $f(x) \ne x$ everywhere, send $x$ to where the ray from $f(x)$ through $x$ leaves the disk. That
          would be a retraction.`,
        md`Write it as $r(x) = x + \lambda(x)(x - f(x))$ with $\lambda(x) \ge 0$ and $|r(x)| = 1$. Solve the
          quadratic for $\lambda$ and read continuity off the formula.`,
        md`Check $r(x) = x$ when $|x| = 1$: which root does your formula pick there?`,
      ],
      solution: md`Suppose $f(x) \ne x$ for all $x$, and put $u(x) = x - f(x) \ne 0$. For $\lambda \ge 0$,
        $|x + \lambda u|^2 = 1$ reads $|u|^2\lambda^2 + 2(x \cdot u)\lambda + (|x|^2 - 1) = 0$. Since
        $|x|^2 \le 1$, the larger root
        $$\lambda(x) = \frac{-(x \cdot u) + \sqrt{(x \cdot u)^2 + |u|^2(1 - |x|^2)}}{|u|^2}$$
        is real and $\ge 0$, because the square root is at least $|x \cdot u|$. It is continuous in $x$ — built
        from continuous functions, with $|u|^2 > 0$ — so $r(x) = x + \lambda(x)u(x)$ is continuous
        $D^2 \to S^1$. If $|x| = 1$, then $x \cdot u = 1 - x \cdot f(x) \ge 0$ by Cauchy–Schwarz, as
        $|f(x)| \le 1$; so $\lambda(x) = (-(x \cdot u) + |x \cdot u|)/|u|^2 = 0$ and $r(x) = x$. Thus $r$ is a
        retraction, contradicting 11.9.`,
      checks: [
        md`$r$ is given by an explicit formula and shown continuous, with nonzero denominator.`,
        md`$|r(x)| = 1$ is verified.`,
        md`$r$ fixes $S^1$ pointwise, with the root choice justified there.`,
      ],
    },
    {
      id: '11.11',
      kind: 'prove',
      challenge: true,
      title: 'The fundamental theorem of algebra',
      statement: md`Prove that every polynomial $P(z) = z^n + a_{n-1}z^{n-1} + \dots + a_0$ with complex
        coefficients and $n \ge 1$ has a root in $\C$.`,
      uses: ['11.7'],
      hints: [
        md`Suppose $P$ has no root. For $R > 0$, $(z, t) \mapsto P(tRz)/|P(tRz)|$ is a homotopy of maps
          $S^1 \to S^1$. Between which two maps?`,
        md`For large $R$, deform $P$ to $z^n$ through $P_t(z) = z^n + t(a_{n-1}z^{n-1} + \dots + a_0)$. Show
          $P_t$ has no zero on $|z| = R$ when $R > \max(1, \sum_k |a_k|)$.`,
        md`The degree of $z \mapsto z^n$: lift $s \mapsto p(s)^n = p(ns)$.`,
      ],
      solution: md`Suppose $P(z) \ne 0$ for all $z$.

        **Step 1.** For $R > 0$, $H(z, t) = P(tRz)/|P(tRz)|$ is a continuous homotopy $S^1 \times I \to S^1$
        (continuous because $P$ is, and never zero) from the constant map $P(0)/|P(0)|$ to
        $f_R(z) = P(Rz)/|P(Rz)|$. So $\deg f_R = 0$ (11.7).

        **Step 2.** Fix $R > \max(1, \sum_k |a_k|)$. For $|z| = 1$ and $t \in I$,
        $$\Big|t\sum_{k < n} a_k(Rz)^k\Big| \le \sum_{k < n}|a_k|R^k \le R^{n-1}\sum_k|a_k| < R^n = |(Rz)^n|,$$
        using $R \ge 1$. So $P_t(Rz) \ne 0$, and $K(z, t) = P_t(Rz)/|P_t(Rz)|$ is a homotopy from $z \mapsto z^n$
        to $f_R$.

        **Step 3.** $g(z) = z^n$ has $g(p(s)) = p(ns)$, lifted by $s \mapsto ns$, so $\deg g = n$. By 11.7(b),
        $n = \deg g = \deg f_R = 0$, contradicting $n \ge 1$.`,
      checks: [
        md`The no-root assumption is what makes the normalized maps continuous.`,
        md`The radius homotopy shows $\deg f_R = 0$.`,
        md`The estimate that $P_t$ has no zero on $|z| = R$ is explicit.`,
        md`The degree of $z \mapsto z^n$ is computed with an explicit lift.`,
      ],
    },
    {
      id: '11.12',
      kind: 'prove',
      challenge: true,
      title: 'Deck transformations',
      statement: md`A **deck transformation** of $p$ is a homeomorphism $h\colon \R \to \R$ with $p \circ h = p$.
        Prove that the deck transformations are exactly the translations $t \mapsto t + n$, $n \in \Z$, and that
        they form a group isomorphic to $\Z$ — the same group as $\pi_1(S^1)$ — whose orbits on $\R$ are the
        cosets $t + \Z$, so that the orbit space is $\R/\Z \cong S^1$ (9.11).`,
      uses: ['11.2', '9.11', '4.1'],
      hints: [
        md`Integer translations work because $\ker p = \Z$.`,
        md`Conversely, $h$ and $t \mapsto t + h(0)$ are both lifts of $p\colon \R \to S^1$. Do they agree somewhere?`,
      ],
      solution: md`For $n \in \Z$, $\tau_n(t) = t + n$ is a homeomorphism with inverse $\tau_{-n}$, and
        $p(t + n) = p(t)p(n) = p(t)$. Conversely let $h$ be a deck transformation. Then $p(h(0)) = p(0) = 1$, so
        $n = h(0) \in \Z$. Both $h$ and $\tau_n$ are lifts of $p\colon \R \to S^1$ — continuous maps
        $\R \to \R$ whose composite with $p$ is $p$ — and they agree at $0$; $\R$ is connected (convex, 8.4), so
        $h = \tau_n$ (11.2). The map $n \mapsto \tau_n$ is a homomorphism ($\tau_m \circ \tau_n = \tau_{m+n}$),
        injective ($\tau_n = \mathrm{id}$ forces $n = 0$), and onto the deck group by the above. So $\Z$ acts
        on $\R$ by $n \cdot t = t + n$; the orbit of $t$ is $t + \Z$, the orbits partition $\R$ (4.1), and the
        orbit space is $\R/\Z$.`,
      checks: [
        md`Integer translations are verified to be deck transformations.`,
        md`An arbitrary deck transformation is identified with a translation by uniqueness of lifts.`,
        md`The isomorphism with $\Z$ is checked: homomorphism, injective, onto.`,
      ],
    },
  ],
}

export default unit
