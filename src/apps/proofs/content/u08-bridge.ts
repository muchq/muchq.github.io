import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'bridge',
  n: 8,
  title: 'Quotient spaces and topological groups',
  track: 'Bridge',
  prereqs: [7, 3],
  why: md`The two strands touch. A quotient space is a quotient set (Unit 1) with the largest topology that
    keeps the quotient map continuous; a topological group is a group whose operations are continuous. The
    circle is both, as $\R/\Z$.`,
  definitions: [
    {
      term: 'Quotient topology',
      body: md`For an equivalence relation on a space $X$ with quotient map $q\colon X \to X/{\sim}$, a set
        $U \subseteq X/{\sim}$ is open iff $q^{-1}(U)$ is open in $X$. $S \subseteq X$ is **saturated** if
        $S = q^{-1}(q(S))$, i.e. $S$ is a union of classes.`,
    },
    {
      term: 'Collapsing a subset',
      body: md`For $A \subseteq X$, $X/A$ is the quotient by the relation whose classes are $A$ and the
        singletons $\{x\}$ with $x \notin A$.`,
    },
    {
      term: 'Topological group',
      body: md`A group $G$ with a topology in which multiplication $G \times G \to G$ and inversion $G \to G$
        are continuous. Examples: $(\R^n, +)$; $(S^1, \cdot)$; any group with the discrete topology.`,
    },
    {
      term: 'Coset space',
      body: md`For $H \le G$, $G/H$ is the set of left cosets with the quotient topology from $q(g) = gH$.`,
    },
    {
      term: 'Open map',
      body: md`$f$ is **open** if $f(U)$ is open for every open $U$.`,
    },
  ],
  problems: [
    {
      id: '8.1',
      kind: 'prove',
      title: 'The quotient topology works',
      statement: md`(a) Prove the quotient topology is a topology and $q$ is continuous. (b) Prove a function
        $g\colon X/{\sim} \to Z$ is continuous iff $g \circ q$ is. (c) Deduce: a continuous $h\colon X \to Z$
        that is constant on classes induces a unique continuous $\bar h$ with $\bar h \circ q = h$.`,
      uses: ['0.5', '1.5'],
      hints: [
        md`(a) Preimages commute with unions and intersections (0.5).`,
        md`(b) $(g \circ q)^{-1}(W) = q^{-1}(g^{-1}(W))$. Now read the definition of the quotient topology.`,
      ],
      solution: md`(a) $q^{-1}(\emptyset) = \emptyset$ and $q^{-1}(X/{\sim}) = X$; preimages of unions and
        intersections are unions and intersections of preimages (0.5), so the axioms transfer. $q$ is
        continuous by definition. (b) (⇒) A composite of continuous maps. (⇐) For open $W$,
        $q^{-1}(g^{-1}(W)) = (g \circ q)^{-1}(W)$ is open, which by definition means $g^{-1}(W)$ is open.
        (c) 1.5 gives a unique function $\bar h$ with $\bar h \circ q = h$; by (b) it is continuous.`,
      checks: [
        md`The topology axioms are derived from the preimage identities.`,
        md`(b, ⇐) uses the definition of the quotient topology, not continuity of $q$.`,
        md`(c) separates existence of the function (1.5) from its continuity.`,
      ],
    },
    {
      id: '8.2',
      kind: 'decide',
      title: 'Quotients of Hausdorff spaces',
      statement: md`**Prove or disprove:** every quotient of a Hausdorff space is Hausdorff.`,
      verdict: false,
      hints: [
        md`A neighborhood of a class must contain the whole class. When could that force it to contain a nearby
          point?`,
        md`Collapse a subset that is not closed — in $\R/(0, 1)$, try to separate the class $(0, 1)$ from $1$.`,
      ],
      solution: md`**False.** In $\R$ collapse $A = (0, 1)$; let $a = q(A)$ and $b = q(1)$, so $a \ne b$. Let $U$
        be open with $b \in U$. Then $q^{-1}(U)$ is open in $\R$ and contains $1$, so contains some
        $(1 - \varepsilon, 1 + \varepsilon)$, which meets $A$. A saturated set that meets a class contains it,
        so $A \subseteq q^{-1}(U)$ and $a \in U$. Every neighborhood of $b$ contains $a$: no disjoint
        neighborhoods.`,
      checks: [
        md`The quotient is specified precisely.`,
        md`Saturation of $q^{-1}(U)$ is used to pull in the whole class.`,
        md`The failure is shown for every neighborhood of $b$.`,
      ],
    },
    {
      id: '8.3',
      kind: 'prove',
      title: 'Translations and open subgroups',
      statement: md`Let $G$ be a topological group. Prove: (a) left translation $L_g(x) = gx$ is a homeomorphism,
        and so is right translation $R_g(x) = xg$; (b) if $U$ is open then $UV = \{uv : u \in U, v \in V\}$ is
        open for every $V \subseteq G$; (c) every open subgroup of $G$ is also closed.`,
      uses: ['7.10', '3.2'],
      hints: [
        md`(a) $x \mapsto gx$ is multiplication composed with $x \mapsto (g, x)$. Its inverse is $L_{g^{-1}}$.`,
        md`(b) $UV$ is a union of right translates of $U$.`,
        md`(c) The complement of $H$ is a union of cosets.`,
      ],
      solution: md`(a) $x \mapsto (g, x)$ is continuous $G \to G \times G$ (7.10: its components are constant and
        the identity), so $L_g$ = multiplication $\circ$ it is continuous. So is $L_{g^{-1}}$, and the two are
        mutually inverse. The same argument with $x \mapsto (x, g)$ handles $R_g$. (b) $Uv = R_v(U)$ is open,
        being the preimage of $U$ under the continuous $R_{v^{-1}}$; so $UV = \bigcup_{v \in V} Uv$ is open.
        (c) Cosets partition $G$ (3.2) and $gH = H$ iff $g \in H$, so $G \setminus H = \bigcup_{g \notin H} gH$,
        a union of open sets $L_g(H)$. So $H$ is closed.`,
      checks: [
        md`Continuity of $L_g$ is derived from continuity of multiplication through a map into $G \times G$.`,
        md`The inverse of $L_g$ is identified and shown continuous.`,
        md`(c) writes the complement of $H$ as a union of open cosets.`,
      ],
    },
    {
      id: '8.4',
      kind: 'decide',
      title: 'Closed points, separated points',
      statement: md`**Prove or disprove:** a topological group in which $\{e\}$ is closed is Hausdorff.`,
      verdict: true,
      uses: ['7.12', '7.10', '7.5'],
      hints: [
        md`Which description of "Hausdorff" from Unit 7 is about a closed set?`,
        md`7.12(b): the diagonal. Find a continuous map $G \times G \to G$ under which the diagonal is the
          preimage of $\{e\}$.`,
      ],
      solution: md`**True.** $\phi(x, y) = xy^{-1}$ is continuous: it is multiplication composed with
        $(x, y) \mapsto (x, y^{-1})$, continuous by 7.10 since its components are $\pi_1$ and inversion
        $\circ\, \pi_2$. And $\phi^{-1}(\{e\}) = \{(x, y) : x = y\} = \Delta$ is the preimage of a closed set,
        hence closed (7.5). By 7.12(b), $G$ is Hausdorff.`,
      checks: [
        md`$xy^{-1}$ is shown continuous on $G \times G$.`,
        md`The diagonal is identified as the preimage of $\{e\}$.`,
        md`7.12(b) is applied.`,
      ],
    },
    {
      id: '8.5',
      kind: 'flaw',
      title: 'Quotient maps are open?',
      statement: md`**Claim.** Every quotient map $q\colon X \to X/{\sim}$ is open. Find the first line that is
        wrong or does not follow.`,
      lines: [
        md`Let $U \subseteq X$ be open; we show $q(U)$ is open.`,
        md`By definition of the quotient topology, $q(U)$ is open iff $q^{-1}(q(U))$ is open in $X$.`,
        md`Now $q^{-1}(q(U)) = U$.`,
        md`Since $U$ is open, $q(U)$ is open. $\blacksquare$`,
      ],
      flawLine: 3,
      hints: [
        md`Which points of $X$ have the same image as some point of $U$?`,
        md`Collapse a closed interval in $\R$.`,
      ],
      solution: md`**Line 3.** $q^{-1}(q(U))$ is the union of all classes that meet $U$ — the saturation of $U$ —
        which is $U$ only when $U$ is saturated. In $\R/[0, 1]$ with $U = (-1, 1/2)$:
        $q^{-1}(q(U)) = (-1, 1]$, which is not open, so $q(U)$ is not open.`,
      checks: [
        md`Line 3 is identified and $q^{-1}(q(U))$ described as the saturation.`,
        md`A counterexample with $q(U)$ not open, verified through its preimage.`,
      ],
    },
    {
      id: '8.6',
      kind: 'prove',
      title: 'Coset spaces',
      statement: md`Let $H$ be a subgroup of a topological group $G$. Prove: (a) $q\colon G \to G/H$ is open;
        (b) points of $G/H$ are closed if and only if $H$ is closed in $G$.`,
      uses: ['8.3'],
      hints: [
        md`(a) Which points of $G$ have the same image under $q$ as some point of $U$?`,
        md`(a) $q^{-1}(q(U)) = UH$; then 8.3(b). (b) A point of $G/H$ is $gH$, and its preimage under $q$ is the
          coset $gH \subseteq G$.`,
      ],
      solution: md`(a) $g \in q^{-1}(q(U))$ iff $gH = uH$ for some $u \in U$ iff $g \in uH$ for some $u \in U$
        iff $g \in UH$. If $U$ is open, $UH$ is open (8.3(b)), so $q(U)$ is open.

        (b) $\{gH\}$ is closed iff its complement is open iff $q^{-1}$ of the complement — namely
        $G \setminus gH$ — is open iff $gH$ is closed in $G$. Since $gH = L_g(H)$ with $L_g$ a homeomorphism
        (8.3), $gH$ is closed iff $H$ is.`,
      checks: [
        md`The saturation of $U$ is computed as $UH$.`,
        md`(b) reduces closedness of a point to closedness of a coset via the quotient topology.`,
        md`Translation passes between $gH$ and $H$.`,
      ],
    },
    {
      id: '8.7',
      kind: 'prove',
      title: 'Closures of subgroups',
      statement: md`Let $H$ be a subgroup of a topological group $G$. Prove that $\overline H$ is a subgroup.`,
      uses: ['7.5', '7.10', '2.4', '8.4'],
      hints: [
        md`The subgroup test asks about $ab^{-1}$. Which continuous map produces it, and what do continuous maps
          do to closures?`,
        md`$\phi(x, y) = xy^{-1}$, 7.5(iii), and $\overline{H \times H} = \overline H \times \overline H$ (7.10(c)).`,
      ],
      solution: md`$e \in H \subseteq \overline H$, so $\overline H \ne \emptyset$. $\phi(x, y) = xy^{-1}$ is
        continuous (8.4) and $\phi(H \times H) \subseteq H$. By 7.10(c) and 7.5(iii),
        $\phi(\overline H \times \overline H) = \phi(\overline{H \times H}) \subseteq \overline{\phi(H \times H)}
        \subseteq \overline H$. So $a, b \in \overline H$ implies $ab^{-1} \in \overline H$, and 2.4 applies.`,
      checks: [
        md`$f(\overline A) \subseteq \overline{f(A)}$ is used for a continuous map on $G \times G$.`,
        md`The closure of the product is identified with the product of closures.`,
        md`The subgroup test is applied.`,
      ],
    },
  ],
}

export default unit
