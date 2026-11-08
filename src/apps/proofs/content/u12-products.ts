import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'products',
  n: 12,
  title: 'Products and Tychonoff',
  track: 'Topology',
  prereqs: [11, 1],
  why: md`Infinite products need a choice of topology, and the right one is decided by what you want to be true:
    continuous maps into a product should be continuous coordinatewise, and products of compact spaces should be
    compact. Proving the second is Tychonoff's theorem, and it costs Zorn's lemma. With Urysohn it puts every
    compact Hausdorff space inside a cube.`,
  definitions: [
    {
      term: 'Products',
      body: md`For a family $(X_\alpha)_{\alpha \in J}$, $\prod_\alpha X_\alpha$ is the set of $x = (x_\alpha)_{\alpha \in J}$
        with $x_\alpha \in X_\alpha$, and $\pi_\beta(x) = x_\beta$. The **product topology** has as basis the sets
        $\prod_\alpha U_\alpha$ with each $U_\alpha$ open and $U_\alpha = X_\alpha$ for all but finitely many $\alpha$.
        The **box topology** has as basis all $\prod_\alpha U_\alpha$ with every $U_\alpha$ open. Unless said
        otherwise, products carry the product topology. $X^J$ is the product of copies of $X$.`,
    },
    {
      term: 'Finite intersection property',
      body: md`A family of sets has the **finite intersection property** (FIP) if every finite subfamily has nonempty
        intersection.`,
    },
    {
      term: 'Embedding',
      body: md`A continuous injective $F\colon X \to Y$ that is a homeomorphism onto the subspace $F(X)$.`,
    },
    {
      term: 'Local compactness, one-point compactification',
      body: md`$X$ is **locally compact** if every point has a neighborhood contained in a compact subset. For a
        Hausdorff space $X$, the **one-point compactification** $X^+ = X \cup \{\infty\}$ has as open sets the open
        sets of $X$ and the sets $X^+ \setminus C$ with $C \subseteq X$ compact.`,
    },
  ],
  problems: [
    {
      id: '12.1',
      kind: 'prove',
      title: 'The product topology',
      statement: md`Prove that the sets in the definition form a basis; that every projection $\pi_\beta$ is continuous;
        and that $f\colon Z \to \prod_\alpha X_\alpha$ is continuous if and only if every $\pi_\alpha \circ f$ is.`,
      uses: ['7.1'],
      hints: [
        md`A basis set with proper factors at $\alpha_1, \dots, \alpha_n$ is $\bigcap_k \pi_{\alpha_k}^{-1}(U_{\alpha_k})$.`,
      ],
      solution: md`*Basis:* the whole product is a basis set, and the intersection of two basis sets is
        $\prod_\alpha (U_\alpha \cap V_\alpha)$, still with only finitely many proper factors. *Projections:*
        $\pi_\beta^{-1}(U)$ is the basis set with $U$ at $\beta$ and $X_\alpha$ elsewhere. *Maps:* (⇒) composites of
        continuous maps. (⇐) A basis set $B$ with proper factors at $\alpha_1, \dots, \alpha_n$ is
        $\bigcap_k \pi_{\alpha_k}^{-1}(U_{\alpha_k})$, so $f^{-1}(B) = \bigcap_k (\pi_{\alpha_k} \circ f)^{-1}(U_{\alpha_k})$
        is a finite intersection of open sets ($Z$ itself if $n = 0$). Every open set is a union of basis sets
        (7.1), so its preimage is open.`,
      checks: [
        md`The basis condition uses that a union of two finite sets of indices is finite.`,
        md`A basis set is written as a finite intersection of preimages under projections.`,
      ],
    },
    {
      id: '12.2',
      kind: 'decide',
      title: 'The diagonal in a box',
      statement: md`**Prove or disprove:** with the box topology on $\R^{\N}$, the diagonal map $t \mapsto (t, t, t, \dots)$ from
        $\R$ is continuous.`,
      verdict: false,
      hints: [md`Its coordinates are continuous. In which topology does that suffice?`, md`Shrink the factors.`],
      solution: md`**False.** $B = \prod_{n \in \N}(-\frac1{n+1}, \frac1{n+1})$ is open in the box topology, and its
        preimage is $\{t : |t| < \frac1{n+1} \text{ for all } n\} = \{0\}$, which is not open in $\R$. With the
        product topology the map is continuous, by 12.1.`,
      checks: [md`A specific box-open set is given whose preimage is not open.`, md`The preimage is computed exactly.`],
    },
    {
      id: '12.3',
      kind: 'prove',
      title: 'Hausdorff products, and slices',
      statement: md`Prove that a product of Hausdorff spaces is Hausdorff, and that when every $X_\alpha$ is nonempty, each
        $X_\beta$ embeds in $\prod_\alpha X_\alpha$.`,
      uses: ['12.1'],
      hints: [
        md`Two different points differ in some coordinate.`,
        md`Fix a point $a$ of the product and vary only coordinate $\beta$.`,
      ],
      solution: md`If $x \ne y$, then $x_\beta \ne y_\beta$ for some $\beta$; disjoint open $U \ni x_\beta$, $V \ni y_\beta$ give
        disjoint open $\pi_\beta^{-1}(U) \ni x$ and $\pi_\beta^{-1}(V) \ni y$.

        Fix $a$ in the product (it is nonempty: choose a point in each factor). $s(y) = $ the point with $\beta$
        coordinate $y$ and $\alpha$ coordinate $a_\alpha$ otherwise. Its coordinates are the identity and constants,
        so $s$ is continuous (12.1); it is injective; and $\pi_\beta$ restricted to $s(X_\beta)$ is a continuous inverse.
        So $s$ is an embedding.`,
      checks: [
        md`Separation in one coordinate is pulled back by a projection.`,
        md`The slice map is shown continuous, injective, with continuous inverse on its image.`,
      ],
    },
    {
      id: '12.4',
      kind: 'decide',
      title: 'Connected products',
      statement: md`**Prove or disprove:** an arbitrary product of connected spaces is connected.`,
      verdict: true,
      uses: ['9.4', '9.5', '12.1'],
      hints: [
        md`Fix a point $a$. Points that differ from $a$ in only finitely many coordinates — what do they form?`,
        md`Is that set dense?`,
      ],
      solution: md`**True.** If a factor is empty, so is the product; otherwise fix a point $a$. For a finite set
        $F \subseteq J$, let $Y_F$ be the points agreeing with $a$ outside $F$. $Y_F$ is homeomorphic to
        $\prod_{\alpha \in F} X_\alpha$ (as in 12.3, with 12.1 for continuity both ways), which is connected by 9.5 and
        induction. All $Y_F$ contain $a$, so $Y = \bigcup_F Y_F$ is connected (9.4(a)). $Y$ is dense: a nonempty
        basis set $\prod U_\alpha$, with $U_\alpha = X_\alpha$ outside a finite $F$, contains the point that agrees with
        a chosen point of $U_\alpha$ for $\alpha \in F$ and with $a$ elsewhere — a point of $Y_F$. By 9.4(b), the
        closure of $Y$, which is the whole product, is connected.`,
      checks: [
        md`The finite-support set is shown connected via finite products.`,
        md`Density is checked against an arbitrary basis set.`,
        md`9.4(b) closes the argument.`,
      ],
    },
    {
      id: '12.5',
      kind: 'prove',
      title: 'Compactness by closed sets',
      statement: md`Prove that $X$ is compact if and only if every family of closed subsets of $X$ with the FIP has
        nonempty intersection.`,
      hints: [md`Take complements: a family of closed sets with empty intersection is an open cover.`],
      solution: md`For a family $\mathcal F$ of closed sets, let $\mathcal U = \{X \setminus F : F \in \mathcal F\}$, a family of
        open sets. $\bigcap\mathcal F = \emptyset$ iff $\mathcal U$ covers $X$, and a finite subfamily of $\mathcal F$ has
        empty intersection iff the corresponding members of $\mathcal U$ cover $X$. So "every open cover has a
        finite subcover" says: every family of closed sets with empty intersection has a finite subfamily with
        empty intersection — the contrapositive of the FIP statement.`,
      checks: [md`The correspondence between covers and intersections is set up by complements.`, md`The contrapositive is stated correctly.`],
    },
    {
      id: '12.6',
      kind: 'prove',
      title: 'Maximal families',
      statement: md`Let $\mathcal A$ be a family of subsets of $X$ with the FIP. Prove there is a family $\mathcal D \supseteq \mathcal A$
        with the FIP that is maximal among such families, and that (a) every finite intersection of members of
        $\mathcal D$ is in $\mathcal D$; (b) every set that meets every member of $\mathcal D$ is in $\mathcal D$.`,
      hints: [
        md`Zorn's lemma on families with the FIP containing $\mathcal A$. Why does the union of a chain have the FIP?`,
        md`For (a) and (b): adding the set keeps the FIP, so maximality puts it in.`,
      ],
      solution: md`Let $\mathcal P$ be the set of families $\mathcal B \supseteq \mathcal A$ with the FIP, ordered by inclusion; the
        empty chain has upper bound $\mathcal A$. For a nonempty chain, its union contains $\mathcal A$ and has the
        FIP: finitely many of its members come from finitely many families of the chain, all inside the largest of
        them, which has the FIP. Zorn's lemma gives a maximal $\mathcal D$.

        (a) For $B = D_1 \cap \dots \cap D_n$ with $D_i \in \mathcal D$: any finite intersection from
        $\mathcal D \cup \{B\}$ is a finite intersection from $\mathcal D$, so nonempty; by maximality $B \in \mathcal D$.
        (b) If $A$ meets every member of $\mathcal D$: $A \cap E_1 \cap \dots \cap E_k$ is $A \cap E$ with
        $E = E_1 \cap \dots \cap E_k \in \mathcal D$ by (a), so nonempty. So $\mathcal D \cup \{A\}$ has the FIP, and
        $A \in \mathcal D$ by maximality.`,
      checks: [
        md`Zorn is applied with chains and the empty chain handled.`,
        md`(b) uses (a) to reduce to a single intersection.`,
      ],
    },
    {
      id: '12.7',
      kind: 'flaw',
      title: 'Tychonoff, too easily',
      statement: md`**Claim.** A product of compact spaces is compact. Find the first line of this proof that is wrong or
        does not follow.`,
      lines: [
        md`Let $\mathcal U$ be an open cover of $X = \prod_\alpha X_\alpha$; we may take its members to be basis sets.`,
        md`For each $\alpha$, the sets $\pi_\alpha(B)$, $B \in \mathcal U$, are open and cover $X_\alpha$.`,
        md`By compactness of $X_\alpha$, finitely many of them, $\pi_\alpha(B_{\alpha,1}), \dots, \pi_\alpha(B_{\alpha,n_\alpha})$,
          cover $X_\alpha$.`,
        md`Then the finitely many sets $B_{\alpha, i}$ together cover $X$.`,
        md`So $X$ is compact. $\blacksquare$`,
      ],
      flawLine: 4,
      hints: [md`How many sets $B_{\alpha, i}$ are there, over all $\alpha$?`, md`Even for a single $\alpha$: do they cover $X$?`],
      solution: md`**Line 4**, twice over. Over infinitely many $\alpha$ there are infinitely many sets. And even in
        $[0, 1]^2$, sets whose projections cover each factor need not cover the square: $[0, 0.6)^2$ and
        $(0.4, 1]^2$ project onto $[0, 1]$ in both coordinates but miss $(0, 1)$. (Lines 1–3 are fine.) The claim
        is true, but its proof needs more: 12.8.`,
      checks: [
        md`Line 4 is identified, with at least one of its two failures shown concretely.`,
        md`The earlier lines are recognized as valid.`,
      ],
    },
    {
      id: '12.8',
      kind: 'prove',
      challenge: true,
      title: "Tychonoff's theorem",
      statement: md`Prove that every product of compact spaces is compact.`,
      uses: ['7.2', '12.1', '12.5', '12.6'],
      hints: [
        md`By 12.5, take a family $\mathcal A$ of closed sets with the FIP and extend it to a maximal $\mathcal D$ (12.6).`,
        md`Project: in each $X_\alpha$, the closures of the sets $\pi_\alpha(D)$ have the FIP. Choose $x_\alpha$ in all of them.`,
        md`Show every basis neighborhood of $x = (x_\alpha)$ belongs to $\mathcal D$, using 12.6(a) and (b).`,
      ],
      solution: md`If some factor is empty the product is empty, hence compact. Let $X = \prod_\alpha X_\alpha$ and let
        $\mathcal A$ be a family of closed sets with the FIP; by 12.5 we need a point in all of them. Extend
        $\mathcal A$ to a maximal $\mathcal D$ with the FIP (12.6).

        Fix $\alpha$. The sets $\pi_\alpha(D)$, $D \in \mathcal D$, have the FIP, since
        $\pi_\alpha(D_1 \cap \dots \cap D_n) \subseteq \pi_\alpha(D_1) \cap \dots \cap \pi_\alpha(D_n)$; so do their closures, which
        are closed in the compact $X_\alpha$. By 12.5 choose $x_\alpha$ in every $\overline{\pi_\alpha(D)}$, and let
        $x = (x_\alpha)$.

        Let $U$ be open in $X_\beta$ with $x_\beta \in U$. Since $x_\beta \in \overline{\pi_\beta(D)}$, $U$ meets $\pi_\beta(D)$, so
        $\pi_\beta^{-1}(U)$ meets $D$ — for every $D \in \mathcal D$. By 12.6(b), $\pi_\beta^{-1}(U) \in \mathcal D$. A basis
        neighborhood of $x$ is a finite intersection of such sets (12.1), so it lies in $\mathcal D$ by 12.6(a), and
        therefore meets every $D \in \mathcal D$ (FIP). By 7.2, $x \in \overline D$ for every $D \in \mathcal D$; in
        particular $x \in \overline A = A$ for every $A \in \mathcal A$.`,
      checks: [
        md`The FIP reformulation (12.5) is used in both the product and the factors.`,
        md`The projected families are shown to have the FIP.`,
        md`Subbasic neighborhoods enter $\mathcal D$ via 12.6(b), basic ones via 12.6(a).`,
        md`The conclusion uses closedness of the members of $\mathcal A$.`,
      ],
    },
    {
      id: '12.9',
      kind: 'decide',
      title: 'Boxed cubes',
      statement: md`**Prove or disprove:** $[0, 1]^{\N}$ with the box topology is compact.`,
      verdict: false,
      uses: ['10.1'],
      hints: [md`Look at the points all of whose coordinates are 0 or 1. What topology does the box give them?`],
      solution: md`**False.** Let $S = \{0, 1\}^{\N} \subseteq [0, 1]^{\N}$. $S$ is closed: a point outside it has some
        coordinate in $(0, 1)$, and the box with factor $(0, 1)$ there and $[0, 1]$ elsewhere is a neighborhood
        missing $S$. Every point $y$ of $S$ is open in $S$: it is $S \cap \prod_n U_n$ with $U_n = [0, \frac12)$ if
        $y_n = 0$ and $(\frac12, 1]$ if $y_n = 1$. $S$ is infinite, so its cover by singletons has no finite
        subcover: $S$ is not compact. A closed subset of a compact space is compact (10.1), so the box cube is not.
        (With the product topology it is compact, by 12.8.)`,
      checks: [
        md`$S$ is shown closed.`,
        md`$S$ is shown discrete in the box topology, with an explicit box for each point.`,
        md`Non-compactness transfers back through 10.1.`,
      ],
    },
    {
      id: '12.10',
      kind: 'prove',
      challenge: true,
      title: 'Into a cube',
      statement: md`Let $X$ be T1 and $(f_\alpha)_{\alpha \in J}$ continuous maps $X \to [0, 1]$ such that for each point $x$ and
        open $U \ni x$, some $\alpha$ has $f_\alpha(x) > 0$ and $f_\alpha = 0$ outside $U$. Prove that
        $F(x) = (f_\alpha(x))_\alpha$ is an embedding $X \to [0, 1]^J$. Deduce that every compact Hausdorff space
        embeds in a product of copies of $[0, 1]$.`,
      uses: ['11.1', '11.3', '11.7', '12.1'],
      hints: [
        md`Injective: use the hypothesis with $U = X \setminus \{y\}$.`,
        md`To show $F(U)$ is open in $F(X)$, find around each of its points the set $\pi_\alpha^{-1}((0, 1]) \cap F(X)$.`,
        md`For the deduction, use Urysohn on $\{x\}$ and $X \setminus U$.`,
      ],
      solution: md`$F$ is continuous by 12.1. *Injective:* for $x \ne y$, $U = X \setminus \{y\}$ is open (T1) and contains
        $x$, so some $f_\alpha$ has $f_\alpha(x) > 0 = f_\alpha(y)$.

        *Open onto its image $Z = F(X)$:* let $U$ be open and $z_0 = F(x_0)$ with $x_0 \in U$. Choose $\alpha$ with
        $f_\alpha(x_0) > 0$ and $f_\alpha = 0$ off $U$. $W = \pi_\alpha^{-1}((0, 1]) \cap Z$ is open in $Z$ and contains
        $z_0$. If $z = F(x) \in W$, then $f_\alpha(x) > 0$, so $x \in U$ and $z \in F(U)$. So $F(U)$ is open in $Z$,
        and $F^{-1}\colon Z \to X$ is continuous.

        *Compact Hausdorff $X$:* it is normal (11.3) and T1 (11.1). For a point $x$ and open $U \ni x$, the sets
        $\{x\}$ and $X \setminus U$ are disjoint and closed; Urysohn (11.7) gives $f\colon X \to [0, 1]$ with
        $f(x) = 1$, $f = 0$ off $U$. Index these maps by the pairs $(x, U)$.`,
      checks: [
        md`Injectivity uses the T1 property.`,
        md`Openness onto the image is proved with an explicit neighborhood in the subspace.`,
        md`The deduction produces the required family through Urysohn.`,
      ],
    },
    {
      id: '12.11',
      kind: 'prove',
      challenge: true,
      title: 'The one-point compactification',
      statement: md`Let $X$ be Hausdorff. Prove that the open sets of $X^+$ form a topology, that $X$ is a subspace of
        $X^+$, and that $X^+$ is compact. Prove that $X^+$ is Hausdorff if and only if $X$ is locally compact.`,
      uses: ['10.1', '10.3'],
      hints: [
        md`Compact subsets of $X$ are closed (10.3). Check unions and intersections of the two kinds of open set.`,
        md`Compactness: whichever open set contains $\infty$ misses only a compact set.`,
      ],
      solution: md`Compact subsets of $X$ are closed in $X$ (10.3), so $X \setminus C$ is open. **Topology.** $\emptyset$ is
        open in $X$; $X^+ = X^+ \setminus \emptyset$. Intersections: two open sets of $X$ give one;
        $(X^+ \setminus C_1) \cap (X^+ \setminus C_2) = X^+ \setminus (C_1 \cup C_2)$, and a finite union of compact sets
        is compact; $U \cap (X^+ \setminus C) = U \cap (X \setminus C)$, open in $X$. Unions: of open sets of $X$, open
        in $X$; if some $X^+ \setminus C_i$ occur, the union is $X^+ \setminus K$ with
        $K = \bigl(\bigcap_i C_i\bigr) \setminus \bigcup_j U_j$, a closed subset of the compact $C_{i_0}$, hence compact
        (10.1). **Subspace:** each open set of $X^+$ meets $X$ in an open set of $X$ ($X^+ \setminus C$ gives
        $X \setminus C$), and every open set of $X$ is open in $X^+$.

        **Compact.** In an open cover, some member contains $\infty$, so it is $X^+ \setminus C$. The other members
        meet $X$ in open sets of $X$ covering the compact $C$; finitely many suffice.

        **Hausdorff.** (⇒) For $x \in X$, separate $x$ from $\infty$ by disjoint open $U \ni x$ and
        $X^+ \setminus C \ni \infty$. Then $U$ is an open set of $X$ inside the compact $C$. (⇐) Points of $X$ are
        separated in $X$, by sets open in $X^+$. For $x \in X$, take open $U \ni x$ inside a compact $C$; then $U$
        and $X^+ \setminus C$ are disjoint open sets around $x$ and $\infty$.`,
      checks: [
        md`Every case of union and intersection is checked, including mixed ones.`,
        md`The compactness argument uses the member containing $\infty$.`,
        md`Both directions of the Hausdorff criterion are proved.`,
      ],
    },
  ],
}

export default unit
