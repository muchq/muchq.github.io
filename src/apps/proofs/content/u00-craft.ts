import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'craft',
  n: 0,
  title: 'Proof craft',
  track: 'Foundations',
  prereqs: [],
  why: md`Every later proof is quantifier bookkeeping plus a handful of moves. Learn to read the logical
    shape of a statement and let it dictate the skeleton of the proof.`,
  definitions: [
    {
      term: 'Reading a statement',
      body: md`$\forall x\, P(x)$ opens with *let $x$ be arbitrary*. $\exists x\, P(x)$ is proved by
        producing an $x$ and checking it. $P \Rightarrow Q$ opens with *assume $P$*. $P \iff Q$ is two
        proofs. $A \subseteq B$ opens with *let $a \in A$*; $A = B$ is two inclusions.

        Negation swaps quantifiers: $\neg\forall x\,P$ is $\exists x\,\neg P$, and $\neg(P \Rightarrow Q)$ is
        $P \wedge \neg Q$. The contrapositive $\neg Q \Rightarrow \neg P$ is the same statement as
        $P \Rightarrow Q$; the converse $Q \Rightarrow P$ is a different one.`,
    },
    {
      term: 'Image and preimage',
      body: md`For $f\colon X \to Y$, $A \subseteq X$ and $B \subseteq Y$: $f(A) = \{f(a) : a \in A\}$ and
        $f^{-1}(B) = \{x \in X : f(x) \in B\}$. The preimage exists for every $f$, invertible or not.`,
    },
    {
      term: 'Injective, surjective, bijective',
      body: md`$f\colon X \to Y$ is **injective** if $f(a) = f(b)$ implies $a = b$; **surjective** if every
        $y \in Y$ is $f(x)$ for some $x \in X$; **bijective** if both.`,
    },
    {
      term: 'Divisibility',
      body: md`For integers $a, b$: $a \mid b$ means $b = ak$ for some integer $k$. Division algorithm
        (assumed): for $n \ge 1$, every integer $m$ is $qn + r$ for unique integers $q, r$ with $0 \le r < n$.`,
    },
    {
      term: 'Induction',
      body: md`If $S$ contains $n_0$, and $n \in S \Rightarrow n + 1 \in S$ for all $n \ge n_0$, then $S$
        contains every integer $n \ge n_0$. **Strong induction:** if, for every $n \ge n_0$, membership of all
        $k$ with $n_0 \le k < n$ implies $n \in S$, then $S$ contains every $n \ge n_0$.`,
    },
  ],
  problems: [
    {
      id: '0.1',
      kind: 'prove',
      title: 'Negating continuity',
      statement: md`Write out the negation of
        $$\forall \varepsilon > 0\ \exists \delta > 0\ \forall x \in \R:\ |x| < \delta \Rightarrow |f(x) - f(0)| < \varepsilon$$
        with no $\neg$ in front of any quantifier or implication. Then prove that $f(x) = 1$ for $x > 0$,
        $f(x) = 0$ for $x \le 0$, satisfies your negation.`,
      hints: [
        md`Push the negation inward one quantifier at a time. What does $\neg(P \Rightarrow Q)$ become?`,
        md`Your negation begins $\exists \varepsilon > 0$. You choose $\varepsilon$ once; then *every*
          $\delta$ must be answered with an $x$.`,
        md`Fix $\varepsilon = 1$. Given $\delta$, which $x \in (-\delta, \delta)$ has $f(x)$ far from $f(0)$?`,
      ],
      solution: md`**Negation.**
        $$\exists \varepsilon > 0\ \forall \delta > 0\ \exists x \in \R:\ |x| < \delta \ \text{and}\ |f(x) - f(0)| \ge \varepsilon.$$

        **Verification.** Take $\varepsilon = 1$. Let $\delta > 0$ be arbitrary and put $x = \delta/2$. Then
        $|x| < \delta$, and since $x > 0$ we have $f(x) = 1$ while $f(0) = 0$, so $|f(x) - f(0)| = 1 \ge
        \varepsilon$. As $\delta$ was arbitrary, the negation holds.`,
      checks: [
        md`The negation has quantifier order $\exists\varepsilon\,\forall\delta\,\exists x$, with "and" and
          "$\ge$" in the body.`,
        md`$\varepsilon$ is fixed before $\delta$ appears and does not depend on it.`,
        md`$x$ is chosen in terms of $\delta$, and both conditions on $x$ are checked.`,
      ],
    },
    {
      id: '0.2',
      kind: 'prove',
      title: 'Squares modulo 3',
      statement: md`Let $a, b$ be integers. Prove that if $3 \mid a^2 + b^2$, then $3 \mid a$ and $3 \mid b$.`,
      hints: [
        md`Experiment: what remainders do $0^2, 1^2, 2^2, 3^2, 4^2, 5^2$ leave on division by 3?`,
        md`Every integer is $3k$, $3k + 1$ or $3k + 2$. Show $a^2$ leaves remainder $0$ or $1$, and $0$ exactly
          when $3 \mid a$. Then argue by contrapositive.`,
      ],
      solution: md`**Lemma.** If $3 \mid n$ then $n^2 = 3m$ for an integer $m$; otherwise $n^2 = 3m + 1$.
        *Proof.* Write $n = 3k + r$ with $r \in \{0, 1, 2\}$, so $n^2 = 3(3k^2 + 2kr) + r^2$. For $r = 0$ this
        is $3(3k^2)$; for $r = 1$ it is $3(3k^2 + 2k) + 1$; for $r = 2$, $r^2 = 3 + 1$ gives
        $n^2 = 3(3k^2 + 4k + 1) + 1$. $\square$

        **Claim, by contrapositive.** Suppose $3 \nmid a$ or $3 \nmid b$. By the lemma $a^2 = 3m_1 + r_1$ and
        $b^2 = 3m_2 + r_2$ with $r_1, r_2 \in \{0, 1\}$, not both $0$. Then
        $a^2 + b^2 = 3(m_1 + m_2) + (r_1 + r_2)$ with $r_1 + r_2 \in \{1, 2\}$. By uniqueness of the remainder
        in the division algorithm, $a^2 + b^2$ is not a multiple of 3.`,
      checks: [
        md`The cases cover every integer — remainders $0$, $1$ and $2$.`,
        md`The contrapositive is set up correctly: "not both divisible" means at least one is not.`,
        md`Non-divisibility is concluded from uniqueness of remainders.`,
      ],
    },
    {
      id: '0.3',
      kind: 'prove',
      title: 'Postage',
      statement: md`Prove that every integer $n \ge 12$ can be written $n = 4a + 5b$ with integers $a, b \ge 0$.`,
      hints: [
        md`If you can make $n - 4$, how do you make $n$?`,
        md`That step needs $n - 4 \ge 12$. Which values of $n$ must therefore be handled directly?`,
      ],
      solution: md`Strong induction on $n \ge 12$. **Base cases:** $12 = 4 \cdot 3$, $13 = 4 \cdot 2 + 5$,
        $14 = 4 + 5 \cdot 2$, $15 = 5 \cdot 3$. **Step:** let $n \ge 16$ and assume the claim for every $m$
        with $12 \le m < n$. Then $12 \le n - 4 < n$, so $n - 4 = 4a + 5b$ with $a, b \ge 0$, and
        $n = 4(a + 1) + 5b$ with $a + 1, b \ge 0$.`,
      checks: [
        md`Four base cases are verified explicitly, not one.`,
        md`The hypothesis is invoked only for $n \ge 16$, where $n - 4 \ge 12$ is in its range.`,
        md`The new coefficients are checked to be non-negative integers.`,
      ],
    },
    {
      id: '0.4',
      kind: 'prove',
      title: 'Images and intersections',
      statement: md`Let $f\colon X \to Y$. (a) Prove $f(A \cap B) \subseteq f(A) \cap f(B)$ for all
        $A, B \subseteq X$. (b) Prove that $f(A \cap B) = f(A) \cap f(B)$ holds for **all** $A, B \subseteq X$
        if and only if $f$ is injective.`,
      hints: [
        md`(a) is an element chase: take $y \in f(A \cap B)$ and name its witness.`,
        md`(b, ⇐) An element of $f(A) \cap f(B)$ has two witnesses, $a \in A$ and $b \in B$. What does
          injectivity say about them?`,
        md`(b, ⇒) To show $f(x) = f(x')$ forces $x = x'$, use the hypothesis on $A = \{x\}$, $B = \{x'\}$.`,
      ],
      solution: md`**(a)** Let $y \in f(A \cap B)$, so $y = f(x)$ with $x \in A \cap B$. As $x \in A$,
        $y \in f(A)$; as $x \in B$, $y \in f(B)$.

        **(b, ⇐)** Assume $f$ injective; by (a) only $\supseteq$ remains. If $y \in f(A) \cap f(B)$, there are
        $a \in A$, $b \in B$ with $f(a) = y = f(b)$. Injectivity gives $a = b \in A \cap B$, so
        $y \in f(A \cap B)$.

        **(b, ⇒)** Assume the equality for all $A, B$, and let $f(x) = f(x')$. If $x \ne x'$, then with
        $A = \{x\}$, $B = \{x'\}$ we get $f(A \cap B) = f(\emptyset) = \emptyset$ but
        $f(A) \cap f(B) = \{f(x)\} \ne \emptyset$. So $x = x'$.`,
      checks: [
        md`(a) starts from an arbitrary element and names its witness.`,
        md`(b, ⇐) treats the two witnesses separately and uses injectivity to identify them.`,
        md`(b, ⇒) applies the hypothesis to a specific, well-chosen pair of sets.`,
        md`Both directions of the "if and only if" are proved.`,
      ],
    },
    {
      id: '0.5',
      kind: 'prove',
      title: 'Preimages respect everything',
      statement: md`Let $f\colon X \to Y$, let $(B_i)_{i \in I}$ be a family of subsets of $Y$ with
        $I \ne \emptyset$, and let $B \subseteq Y$. Prove
        $$f^{-1}\Big(\bigcup_i B_i\Big) = \bigcup_i f^{-1}(B_i), \quad f^{-1}\Big(\bigcap_i B_i\Big) = \bigcap_i f^{-1}(B_i), \quad f^{-1}(Y \setminus B) = X \setminus f^{-1}(B).$$
        Topology will use these constantly.`,
      hints: [
        md`$x \in f^{-1}(C)$ iff $f(x) \in C$. Each identity becomes a statement about the single point $f(x)$.`,
        md`Each identity is one chain of "iff"s — but every link needs a reason.`,
      ],
      solution: md`Let $x \in X$. Then
        $x \in f^{-1}(\bigcup_i B_i) \iff f(x) \in \bigcup_i B_i \iff \exists i:\ f(x) \in B_i \iff \exists i:\
        x \in f^{-1}(B_i) \iff x \in \bigcup_i f^{-1}(B_i)$. The same chain with $\forall i$ in place of
        $\exists i$ proves the intersection identity. Finally, since $f(x) \in Y$,
        $x \in f^{-1}(Y \setminus B) \iff f(x) \notin B \iff x \notin f^{-1}(B) \iff x \in X \setminus f^{-1}(B)$.`,
      checks: [
        md`Each identity is proved for an arbitrary element, every step justified.`,
        md`The family is arbitrary — nothing assumes $I$ finite or countable.`,
        md`The complement identity uses that $f(x)$ lies in $Y$.`,
      ],
    },
    {
      id: '0.6',
      kind: 'decide',
      title: 'Composites and injectivity',
      statement: md`**Prove or disprove:** if $f\colon X \to Y$ and $g\colon Y \to Z$ are functions and
        $g \circ f$ is injective, then $f$ is injective.`,
      verdict: true,
      hints: [
        md`Before deciding, test it on a tiny example in which $g$ is as non-injective as possible.`,
        md`Start from $f(a) = f(b)$. What can you apply to both sides?`,
      ],
      solution: md`**True.** Suppose $f(a) = f(b)$. Applying $g$, $(g \circ f)(a) = (g \circ f)(b)$, and
        injectivity of $g \circ f$ gives $a = b$.

        What is *not* true is that $g$ must be injective: with $X = Z = \{0\}$, $Y = \{0, 1\}$ and $f(0) = 0$,
        the composite is injective (its domain has one point) though $g(0) = g(1)$.`,
      checks: [
        md`The argument starts from $f(a) = f(b)$ and ends with $a = b$.`,
        md`Injectivity of $g \circ f$ is applied to the right pair of points.`,
      ],
    },
    {
      id: '0.7',
      kind: 'decide',
      title: 'Composites and surjectivity',
      statement: md`**Prove or disprove:** if $f\colon X \to Y$ and $g\colon Y \to Z$ are functions and
        $g \circ f$ is surjective, then $f$ is surjective.`,
      verdict: false,
      hints: [
        md`Which of $f$, $g$ does surjectivity of $g \circ f$ really constrain? Prove what you can about it.`,
        md`Look for an example where $Y$ is larger than $X$ and $Z$ is tiny.`,
      ],
      solution: md`**False.** Let $X = Z = \{0\}$, $Y = \{0, 1\}$, $f(0) = 0$ and $g(0) = g(1) = 0$. Then
        $g \circ f\colon \{0\} \to \{0\}$ is surjective, but $1 \notin f(X)$.

        What *is* true: $g$ is surjective, since each $z \in Z$ is $g(f(x))$ for some $x$.`,
      checks: [
        md`The counterexample specifies every set and every value of both functions.`,
        md`Both halves are verified: $g \circ f$ is surjective **and** $f$ is not.`,
      ],
    },
    {
      id: '0.8',
      kind: 'flaw',
      title: 'A left inverse is an inverse?',
      statement: md`**Claim.** If $f\colon X \to Y$ and $g\colon Y \to X$ satisfy $g \circ f = \mathrm{id}_X$,
        then $f$ is a bijection. Find the first line of this proof that is wrong or does not follow.`,
      lines: [
        md`Suppose $f(a) = f(b)$ for some $a, b \in X$.`,
        md`Applying $g$ gives $g(f(a)) = g(f(b))$, that is, $a = b$. So $f$ is injective.`,
        md`Now let $y \in Y$ and put $x = g(y) \in X$.`,
        md`Then $f(x) = f(g(y)) = y$, because $g$ undoes $f$.`,
        md`So every $y \in Y$ is in the image of $f$, and $f$ is a bijection. $\blacksquare$`,
      ],
      flawLine: 4,
      hints: [
        md`Lines 1–2 use $g \circ f = \mathrm{id}_X$. Which composite does each later line use?`,
        md`Test the claim with $X = \{0\}$ and $Y = \{0, 1\}$.`,
      ],
      solution: md`**Line 4.** The hypothesis says $g(f(x)) = x$ for $x \in X$. Line 4 needs $f(g(y)) = y$ for
        $y \in Y$, that is $f \circ g = \mathrm{id}_Y$, which was never assumed. The claim is false:
        $X = \{0\}$, $Y = \{0, 1\}$, $f(0) = 0$, $g(0) = g(1) = 0$ gives $g \circ f = \mathrm{id}_X$ with $f$
        not surjective. Lines 1–2 are correct: a function with a left inverse is injective.`,
      checks: [
        md`The broken line is named, with the identity it silently assumes ($f \circ g = \mathrm{id}_Y$).`,
        md`A counterexample to the claim is given and checked.`,
        md`The valid part of the argument (injectivity) is recognized as valid.`,
      ],
    },
    {
      id: '0.9',
      kind: 'prove',
      challenge: true,
      title: 'Divisors by pigeonhole',
      statement: md`Let $n \ge 1$. Prove that among any $n + 1$ distinct integers chosen from
        $\{1, 2, \dots, 2n\}$, one of them divides another.`,
      hints: [
        md`Every positive integer is $2^k m$ with $k \ge 0$ and $m$ odd. How many odd $m$ are available?`,
        md`$n + 1$ numbers, $n$ boxes. What do two numbers in the same box look like?`,
      ],
      solution: md`Write each chosen $x$ as $2^k m(x)$ with $k \ge 0$ and $m(x)$ odd — divide out factors of
        2; the odd part is unique by unique factorization. Since $1 \le m(x) \le x \le 2n$ and $m(x)$ is odd,
        $m(x) \in \{1, 3, \dots, 2n - 1\}$, a set of $n$ elements. There are $n + 1$ chosen numbers, so by the
        pigeonhole principle two distinct ones, $x \ne y$, have the same odd part $m$. Write $x = 2^k m$ and
        $y = 2^l m$; as $x \ne y$, $k \ne l$, say $k < l$. Then $y = 2^{l - k} x$, so $x \mid y$.`,
      checks: [
        md`The odd-part map is defined and its possible values are counted: exactly $n$.`,
        md`Pigeonhole is applied with the counts stated.`,
        md`Distinctness gives $k \ne l$, and the divisibility is verified.`,
      ],
    },
  ],
}

export default unit
