import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'homotopy',
  n: 13,
  title: 'Homotopy and the fundamental group',
  track: 'Synthesis',
  prereqs: [9, 2],
  why: md`Paths up to deformation form a group. Each group axiom is a topological construction, and every
    verification rests on the pasting lemma (7.9) and products (7.10). Write the homotopies down explicitly —
    a picture is a hint, not a proof.`,
  definitions: [
    {
      term: 'Homotopy',
      body: md`Continuous $f, g\colon X \to Y$ are **homotopic** if some continuous $H\colon X \times I \to Y$,
        where $I = [0, 1]$, has $H(x, 0) = f(x)$ and $H(x, 1) = g(x)$.`,
    },
    {
      term: 'Path homotopy',
      body: md`Paths $\alpha, \beta$ from $x$ to $y$ are **path-homotopic**, $\alpha \simeq_p \beta$, via a
        continuous $H\colon I \times I \to X$ with $H(s, 0) = \alpha(s)$, $H(s, 1) = \beta(s)$, $H(0, t) = x$
        and $H(1, t) = y$. The class of $\alpha$ is $[\alpha]$.`,
    },
    {
      term: 'Concatenation, reverse, constant',
      body: md`If $\alpha(1) = \beta(0)$, $\alpha \cdot \beta$ is $\alpha(2s)$ on $[0, 1/2]$ and $\beta(2s - 1)$
        on $[1/2, 1]$ — first $\alpha$, then $\beta$. $\bar\alpha(s) = \alpha(1 - s)$. $c_x$ is the constant
        path at $x$.`,
    },
    {
      term: 'Fundamental group',
      body: md`$\pi_1(X, x_0)$ is the set of classes of loops at $x_0$ (paths from $x_0$ to $x_0$) with
        $[\alpha][\beta] = [\alpha \cdot \beta]$. $X$ is **simply connected** if it is path-connected with
        trivial $\pi_1$. For continuous $f\colon X \to Y$, $f_*[\alpha] = [f \circ \alpha]$ defines
        $f_*\colon \pi_1(X, x_0) \to \pi_1(Y, f(x_0))$.`,
    },
    {
      term: 'Retract',
      body: md`$A \subseteq X$ is a **retract** if some continuous $r\colon X \to A$ has $r(a) = a$ for all
        $a \in A$.`,
    },
  ],
  problems: [
    {
      id: '13.1',
      kind: 'prove',
      title: 'An equivalence relation',
      statement: md`Prove that $\simeq_p$ is an equivalence relation on the paths from $x$ to $y$.`,
      uses: ['7.9'],
      hints: [
        md`Reflexive: a homotopy that does not move. Symmetric: run time backwards.`,
        md`Transitive: one homotopy on $t \in [0, 1/2]$, the other on $[1/2, 1]$, at double speed.`,
      ],
      solution: md`*Reflexive:* $H(s, t) = \alpha(s)$. *Symmetric:* if $H$ runs from $\alpha$ to $\beta$, then
        $H(s, 1 - t)$ runs from $\beta$ to $\alpha$, with the endpoint conditions inherited. *Transitive:* given
        $H$ from $\alpha$ to $\beta$ and $K$ from $\beta$ to $\gamma$, let $L(s, t) = H(s, 2t)$ for $t \le 1/2$
        and $K(s, 2t - 1)$ for $t \ge 1/2$. At $t = 1/2$ both are $\beta(s)$, so $L$ is well defined, and it is
        continuous by pasting on the closed sets $I \times [0, 1/2]$ and $I \times [1/2, 1]$ (7.9). Then
        $L(s, 0) = \alpha(s)$, $L(s, 1) = \gamma(s)$, $L(0, t) = x$ and $L(1, t) = y$.`,
      checks: [
        md`Each of the three homotopies is written explicitly.`,
        md`Agreement on the overlap $t = 1/2$ is checked before pasting.`,
        md`Endpoint conditions are verified for each.`,
      ],
    },
    {
      id: '13.2',
      kind: 'prove',
      title: 'Concatenation respects homotopy',
      statement: md`Prove that if $\alpha \simeq_p \alpha'$ and $\beta \simeq_p \beta'$, with
        $\alpha(1) = \beta(0)$, then $\alpha \cdot \beta \simeq_p \alpha' \cdot \beta'$.`,
      uses: ['7.9'],
      hints: [md`Put one homotopy on the left half of the square and the other on the right half.`],
      solution: md`Let $H$ run from $\alpha$ to $\alpha'$ and $K$ from $\beta$ to $\beta'$. Define
        $L(s, t) = H(2s, t)$ for $s \le 1/2$ and $K(2s - 1, t)$ for $s \ge 1/2$. At $s = 1/2$,
        $H(1, t) = \alpha(1) = \beta(0) = K(0, t)$ — this is where fixed endpoints matter — so $L$ is well
        defined and continuous by pasting. $L(s, 0) = (\alpha \cdot \beta)(s)$, $L(s, 1) = (\alpha' \cdot
        \beta')(s)$, $L(0, t) = \alpha(0)$ and $L(1, t) = \beta(1)$.`,
      checks: [
        md`The two homotopies agree on $s = 1/2$ for every $t$, and the reason is named.`,
        md`The endpoint conditions of the new homotopy are verified.`,
      ],
    },
    {
      id: '13.3',
      kind: 'prove',
      title: 'Reparametrization',
      statement: md`Let $\alpha$ be a path and $\varphi\colon I \to I$ continuous with $\varphi(0) = 0$ and
        $\varphi(1) = 1$. Prove $\alpha \circ \varphi \simeq_p \alpha$. Deduce: (a)
        $(\alpha \cdot \beta) \cdot \gamma \simeq_p \alpha \cdot (\beta \cdot \gamma)$ whenever defined;
        (b) $c_x \cdot \alpha \simeq_p \alpha \simeq_p \alpha \cdot c_y$ for $\alpha$ from $x$ to $y$.`,
      hints: [
        md`Straight-line homotopy *inside $I$*: $(1 - t)\varphi(s) + ts$ never leaves $I$.`,
        md`(a) Find a piecewise linear $\varphi$ with
          $(\alpha \cdot \beta) \cdot \gamma = (\alpha \cdot (\beta \cdot \gamma)) \circ \varphi$. Where is each
          path traversed in the two products?`,
        md`(b) $c_x \cdot \alpha = \alpha \circ \varphi$ for $\varphi(s) = \max(0, 2s - 1)$.`,
      ],
      solution: md`$H(s, t) = \alpha((1 - t)\varphi(s) + ts)$ is defined because the argument is a convex
        combination of points of $I$; it is continuous, with $H(s, 0) = \alpha(\varphi(s))$,
        $H(s, 1) = \alpha(s)$, $H(0, t) = \alpha(0)$ and $H(1, t) = \alpha(1)$.

        (a) $(\alpha \cdot \beta) \cdot \gamma$ runs $\alpha$ on $[0, \frac14]$, $\beta$ on $[\frac14, \frac12]$,
        $\gamma$ on $[\frac12, 1]$; $\alpha \cdot (\beta \cdot \gamma)$ runs them on $[0, \frac12]$,
        $[\frac12, \frac34]$, $[\frac34, 1]$. Let $\varphi(s) = 2s$ on $[0, \frac14]$, $s + \frac14$ on
        $[\frac14, \frac12]$, $\frac{s + 1}{2}$ on $[\frac12, 1]$ — continuous, as the pieces agree at
        $\frac14$ and $\frac12$. Piece by piece, $(\alpha \cdot (\beta \cdot \gamma))(\varphi(s))$ is
        $\alpha(4s)$, $\beta(4s - 1)$, $\gamma(2s - 1)$, which is $((\alpha \cdot \beta) \cdot \gamma)(s)$.

        (b) With $\varphi(s) = \max(0, 2s - 1)$, $\alpha \circ \varphi$ is $x$ on $[0, \frac12]$ and
        $\alpha(2s - 1)$ after: that is $c_x \cdot \alpha$. With $\psi(s) = \min(2s, 1)$,
        $\alpha \circ \psi = \alpha \cdot c_y$.`,
      checks: [
        md`The straight-line homotopy stays inside $I$, and its four boundary conditions are checked.`,
        md`The reparametrization for associativity is explicit and verified on each piece.`,
        md`Both unit laws are handled.`,
      ],
    },
    {
      id: '13.4',
      kind: 'prove',
      title: 'The fundamental group is a group',
      statement: md`Prove that $\alpha \cdot \bar\alpha \simeq_p c_x$ for any path $\alpha$ starting at $x$.
        Conclude that $\pi_1(X, x_0)$ is a group with identity $[c_{x_0}]$ and $[\alpha]^{-1} = [\bar\alpha]$.`,
      uses: ['13.1', '13.2', '13.3', '7.9'],
      hints: [
        md`At time $t$, go out along $\alpha$ only as far as $\alpha(1 - t)$, then come back.`,
        md`The two halves of your homotopy should meet at $\alpha(1 - t)$ when $s = 1/2$.`,
      ],
      solution: md`Define $H(s, t) = \alpha(2s(1 - t))$ for $s \in [0, \frac12]$ and $\alpha((2 - 2s)(1 - t))$ for
        $s \in [\frac12, 1]$. Both give $\alpha(1 - t)$ at $s = \frac12$, so $H$ is continuous by pasting.
        $H(s, 0) = (\alpha \cdot \bar\alpha)(s)$, since $\bar\alpha(2s - 1) = \alpha(2 - 2s)$;
        $H(s, 1) = \alpha(0) = x$; and $H(0, t) = H(1, t) = \alpha(0) = x$. So $\alpha \cdot \bar\alpha \simeq_p
        c_x$, and applied to $\bar\alpha$ (as $\bar{\bar\alpha} = \alpha$), $\bar\alpha \cdot \alpha \simeq_p
        c_{\alpha(1)}$.

        The product on classes is well defined (13.1, 13.2), associative (13.3(a)), has identity $[c_{x_0}]$
        (13.3(b)), and $[\bar\alpha]$ is inverse to $[\alpha]$ by the above.`,
      checks: [
        md`The inverse homotopy is explicit, continuous by pasting, with its four boundary conditions checked.`,
        md`Well-definedness, associativity and identity are cited rather than re-proved.`,
      ],
    },
    {
      id: '13.5',
      kind: 'decide',
      title: 'Convex sets',
      statement: md`**Prove or disprove:** if $C \subseteq \R^n$ is convex, then any two paths in $C$ with the
        same endpoints are path-homotopic in $C$. (In particular $\pi_1(C, x_0)$ is trivial.)`,
      verdict: true,
      hints: [md`Straight-line homotopy. Why does it stay in $C$? Why is it continuous?`],
      solution: md`**True.** For paths $\alpha, \beta$ in $C$ from $x$ to $y$, let
        $H(s, t) = (1 - t)\alpha(s) + t\beta(s)$. It lies in $C$ by convexity and is continuous (vector
        operations are continuous on $\R^n$, and $C$ has the subspace topology).
        $H(s, 0) = \alpha(s)$, $H(s, 1) = \beta(s)$, $H(0, t) = (1 - t)x + tx = x$ and $H(1, t) = y$.`,
      checks: [md`Convexity keeps the homotopy inside $C$.`, md`The endpoint conditions are verified.`],
    },
    {
      id: '13.6',
      kind: 'flaw',
      title: 'Every loop contracts?',
      statement: md`**Claim.** For every space $X$ and $x_0 \in X$, $\pi_1(X, x_0)$ is trivial. Find the first
        line that is wrong or does not follow.`,
      lines: [
        md`Let $\alpha$ be a loop at $x_0$.`,
        md`Define $H\colon I \times I \to X$ by $H(s, t) = \alpha((1 - t)s)$.`,
        md`$H$ is continuous, as a composite of continuous maps.`,
        md`$H(s, 0) = \alpha(s)$ and $H(s, 1) = \alpha(0) = x_0$ for all $s$.`,
        md`So $H$ is a path homotopy from $\alpha$ to the constant loop $c_{x_0}$.`,
        md`Hence $[\alpha]$ is the identity, and $\pi_1(X, x_0)$ is trivial. $\blacksquare$`,
      ],
      flawLine: 5,
      hints: [md`Count the conditions in the definition of path homotopy.`, md`Compute $H(1, t)$.`],
      solution: md`**Line 5.** A path homotopy must also fix both endpoints for every $t$. $H(0, t) = x_0$ holds,
        but $H(1, t) = \alpha(1 - t)$ moves along the loop. $H$ is a homotopy of maps $I \to X$ — every path is
        homotopic to a constant *as a map*, because $I$ is convex — but not a path homotopy. The claim is in fact
        false: $\pi_1(S^1) \cong \Z$ (proved in Unit 14).`,
      checks: [md`Line 5 is identified, naming the endpoint condition that fails.`, md`$H(1, t)$ is computed.`],
    },
    {
      id: '13.7',
      kind: 'prove',
      title: 'Change of basepoint',
      statement: md`Let $h$ be a path from $x_0$ to $x_1$. Prove that $\Phi_h[\alpha] = [\bar h \cdot \alpha
        \cdot h]$ is a well-defined isomorphism $\pi_1(X, x_0) \to \pi_1(X, x_1)$.`,
      uses: ['13.2', '13.3', '13.4'],
      hints: [
        md`By 13.3(a), brackets inside classes can be dropped.`,
        md`Homomorphism: insert $[h][\bar h] = [c_{x_0}]$ in the middle. Inverse: $\Phi_{\bar h}$.`,
      ],
      solution: md`$\Phi_h$ is well defined by 13.2. Classes of paths multiply whenever endpoints match, and by
        13.3 and 13.4 this multiplication is associative, with the constant paths as units and $[\bar h]$ inverse
        to $[h]$; so we drop brackets. Then
        $\Phi_h([\alpha][\beta]) = [\bar h][\alpha][\beta][h] = [\bar h][\alpha][h][\bar h][\beta][h] =
        \Phi_h[\alpha]\,\Phi_h[\beta]$, inserting $[h][\bar h] = [c_{x_0}]$. And
        $\Phi_{\bar h}\Phi_h[\alpha] = [h][\bar h][\alpha][h][\bar h] = [\alpha]$; likewise
        $\Phi_h\Phi_{\bar h} = \mathrm{id}$. So $\Phi_h$ is a bijective homomorphism.`,
      checks: [
        md`Well-definedness on classes is cited.`,
        md`The homomorphism property inserts $h \cdot \bar h$ and justifies cancelling it.`,
        md`An explicit two-sided inverse is given.`,
      ],
    },
    {
      id: '13.8',
      kind: 'prove',
      title: 'Functoriality',
      statement: md`For continuous $f\colon X \to Y$, prove that $f_*$ is a well-defined homomorphism, that
        $(g \circ f)_* = g_* \circ f_*$, and that $(\mathrm{id}_X)_* = \mathrm{id}$. Deduce that a homeomorphism
        induces an isomorphism.`,
      hints: [
        md`Compose a path homotopy with $f$.`,
        md`$f \circ (\alpha \cdot \beta) = (f \circ \alpha) \cdot (f \circ \beta)$ exactly, not just up to homotopy.`,
      ],
      solution: md`If $H$ is a path homotopy from $\alpha$ to $\alpha'$, then $f \circ H$ is one from
        $f \circ \alpha$ to $f \circ \alpha'$: it is continuous and its ends stay at $f(x_0)$. So $f_*$ is well
        defined. $(f \circ (\alpha \cdot \beta))(s)$ is $f(\alpha(2s))$ or $f(\beta(2s - 1))$, i.e.
        $(f \circ \alpha) \cdot (f \circ \beta)$: a homomorphism. $(g \circ f)_*[\alpha] = [g \circ f \circ
        \alpha] = g_*f_*[\alpha]$ and $\mathrm{id}_*[\alpha] = [\alpha]$. For a homeomorphism $f$,
        $(f^{-1})_*f_* = (f^{-1} \circ f)_* = \mathrm{id}$ and $f_*(f^{-1})_* = \mathrm{id}$.`,
      checks: [
        md`Well-definedness by composing the homotopy with $f$.`,
        md`The homomorphism property is an equality of paths, checked piecewise.`,
        md`The deduction uses both composites.`,
      ],
    },
    {
      id: '13.9',
      kind: 'prove',
      title: 'Retracts',
      statement: md`Let $r\colon X \to A$ be a retraction and $i\colon A \to X$ the inclusion. Prove that
        $i_*\colon \pi_1(A, a) \to \pi_1(X, a)$ is injective for each $a \in A$.`,
      uses: ['13.8', '0.6'],
      hints: [md`$r \circ i = \mathrm{id}_A$. Apply functoriality.`],
      solution: md`$r \circ i = \mathrm{id}_A$ and $r(a) = a$, so $r_* \circ i_* = (r \circ i)_* = \mathrm{id}$ on
        $\pi_1(A, a)$ (13.8). A map with a left inverse is injective (0.6).`,
      checks: [md`Basepoints are tracked: $r(i(a)) = a$.`, md`Injectivity is deduced from the left inverse.`],
    },
    {
      id: '13.10',
      kind: 'prove',
      title: 'Products',
      statement: md`Prove that $\pi_1(X \times Y, (x_0, y_0)) \cong \pi_1(X, x_0) \times \pi_1(Y, y_0)$.`,
      uses: ['13.8', '7.10', '3.1'],
      hints: [
        md`The map is $[\gamma] \mapsto (\pi_{X*}[\gamma], \pi_{Y*}[\gamma])$.`,
        md`Injective: combine two path homotopies into one map to $X \times Y$ (7.10(b)).`,
      ],
      solution: md`$\Psi = (\pi_{X*}, \pi_{Y*})$ is a homomorphism by 13.8. *Onto:* for loops $\alpha, \beta$,
        $\gamma(s) = (\alpha(s), \beta(s))$ is continuous (7.10(b)) and $\Psi[\gamma] = ([\alpha], [\beta])$.
        *Trivial kernel:* if $\Psi[\gamma]$ is trivial, there are path homotopies $H$ from $\pi_X \circ \gamma$
        to $c_{x_0}$ and $K$ from $\pi_Y \circ \gamma$ to $c_{y_0}$; then $(H, K)\colon I \times I \to X \times Y$
        is continuous (7.10(b)) and is a path homotopy from $\gamma$ to $c_{(x_0, y_0)}$. By 3.1, $\Psi$ is
        injective.`,
      checks: [
        md`The homomorphism property is cited.`,
        md`Continuity of the combined path and homotopy uses the product's mapping property.`,
        md`Injectivity is proved via the kernel.`,
      ],
    },
    {
      id: '13.11',
      kind: 'decide',
      title: 'Null loops, null bigons',
      statement: md`**Prove or disprove:** if $X$ is path-connected and $\pi_1(X, x_0)$ is trivial, then any two
        paths in $X$ with the same endpoints are path-homotopic.`,
      verdict: true,
      uses: ['13.7', '13.3', '13.4'],
      hints: [
        md`For paths $\alpha, \beta$ from $x$ to $y$, $\alpha \cdot \bar\beta$ is a loop at $x$. Is
          $\pi_1(X, x)$ trivial?`,
        md`Multiply $[\alpha \cdot \bar\beta] = [c_x]$ on the right by $[\beta]$.`,
      ],
      solution: md`**True.** A path from $x_0$ to $x$ gives $\pi_1(X, x) \cong \pi_1(X, x_0)$ (13.7), so
        $[\alpha \cdot \bar\beta] = [c_x]$. Then, using 13.3 and 13.4 on classes of paths,
        $[\alpha] = [\alpha][\bar\beta][\beta] = [\alpha \cdot \bar\beta][\beta] = [c_x][\beta] = [\beta]$.`,
      checks: [
        md`Triviality is transferred to the basepoint $x$.`,
        md`The cancellation uses $\bar\beta \cdot \beta \simeq_p c_y$ and the unit laws.`,
      ],
    },
  ],
}

export default unit
