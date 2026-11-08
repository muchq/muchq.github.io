import type { Unit } from '../types'
import { md } from './md'

const unit: Unit = {
  id: 'relations',
  n: 1,
  title: 'Relations, quotients, size',
  track: 'Foundations',
  prereqs: [0],
  why: md`Quotients are the one construction behind $\Z/n$, $G/N$ and the circle as $\R/\Z$. The skill to
    master here is *well-definedness*: a rule on equivalence classes is a function only if it ignores the
    choice of representative.`,
  definitions: [
    {
      term: 'Equivalence relation',
      body: md`A relation $\sim$ on $X$ that is reflexive ($x \sim x$), symmetric ($x \sim y \Rightarrow
        y \sim x$) and transitive ($x \sim y$ and $y \sim z$ $\Rightarrow x \sim z$). The **class** of $x$ is
        $[x] = \{y \in X : y \sim x\}$. $X/{\sim}$ is the set of classes, and $q\colon X \to X/{\sim}$,
        $q(x) = [x]$, is the **quotient map**.`,
    },
    {
      term: 'Partition',
      body: md`A set of nonempty subsets of $X$ such that every $x \in X$ lies in exactly one of them.`,
    },
    {
      term: 'Well-defined',
      body: md`A rule assigning to each class $[x]$ the value $F(x)$ defines a function on $X/{\sim}$ exactly
        when $x \sim x' \Rightarrow F(x) = F(x')$. Checking this is part of every proof that uses such a rule.`,
    },
    {
      term: 'Congruence',
      body: md`For a fixed integer $n \ge 1$, $a \equiv b \pmod n$ means $n \mid a - b$. This is an
        equivalence relation on $\Z$; its set of classes is $\Z/n$.`,
    },
    {
      term: 'Countable',
      body: md`A set $S$ is **countable** if there is an injection $S \to \N$, where $\N = \{0, 1, 2, \dots\}$.
        Finite sets are countable.`,
    },
  ],
  problems: [
    {
      id: '1.1',
      kind: 'prove',
      title: 'Classes partition',
      statement: md`Let $\sim$ be an equivalence relation on $X$. Prove that the classes form a partition of
        $X$: each class is nonempty, every $x$ lies in some class, and two classes are equal or disjoint.
        Deduce that $[x] = [y]$ if and only if $x \sim y$.`,
      hints: [
        md`Which axiom gives nonemptiness and covering at once?`,
        md`Suppose $z \in [x] \cap [y]$ and show $[x] \subseteq [y]$. Every axiom is needed somewhere.`,
      ],
      solution: md`By reflexivity $x \in [x]$: classes are nonempty and cover $X$. Suppose $z \in [x] \cap [y]$,
        so $z \sim x$ and $z \sim y$. Let $w \in [x]$, i.e. $w \sim x$. By symmetry $x \sim z$, so $w \sim z$
        by transitivity, and then $w \sim y$ by transitivity again: $w \in [y]$. So $[x] \subseteq [y]$, and the
        same argument with $x$ and $y$ exchanged gives equality. Classes that meet are equal.

        **Deduction.** If $x \sim y$ then $x \in [y]$ and $x \in [x]$, so the classes meet and are equal.
        Conversely if $[x] = [y]$ then $x \in [x] = [y]$, i.e. $x \sim y$.`,
      checks: [
        md`Reflexivity is used for nonemptiness and covering.`,
        md`Equality of classes that meet is proved by two inclusions (or one, with the symmetry of the argument stated).`,
        md`Each use of symmetry and transitivity points the right way.`,
      ],
    },
    {
      id: '1.2',
      kind: 'flaw',
      title: 'Reflexivity for free',
      statement: md`**Claim.** A relation that is symmetric and transitive is automatically reflexive. Find the
        first line that is wrong or does not follow.`,
      lines: [
        md`Let $\sim$ be symmetric and transitive on $X$, and let $x \in X$.`,
        md`Choose $y \in X$ with $x \sim y$.`,
        md`By symmetry, $y \sim x$.`,
        md`By transitivity, from $x \sim y$ and $y \sim x$ we get $x \sim x$.`,
        md`As $x$ was arbitrary, $\sim$ is reflexive. $\blacksquare$`,
      ],
      flawLine: 2,
      hints: [
        md`Which line asserts that something exists?`,
        md`Try the empty relation on a nonempty set.`,
      ],
      solution: md`**Line 2.** Nothing guarantees that $x$ is related to anything. The empty relation on a
        nonempty set is symmetric and transitive (vacuously) but not reflexive. Lines 3–4 are fine: *if* $x$ is
        related to something, then $x \sim x$.`,
      checks: [
        md`Line 2 is identified as an unjustified existence claim.`,
        md`A counterexample is checked for symmetry, transitivity, and failure of reflexivity.`,
      ],
    },
    {
      id: '1.3',
      kind: 'decide',
      title: 'Exponents modulo 5',
      statement: md`**Prove or disprove:** if $a \equiv a' \pmod 5$ and $b \equiv b' \pmod 5$ with
        $b, b' \in \N$, then $a^b \equiv (a')^{b'} \pmod 5$. (That is: exponentiation is well defined on
        classes mod 5.)`,
      verdict: false,
      hints: [
        md`Before trying to prove it, compute $2^b$ modulo 5 for $b = 0, 1, \dots, 6$.`,
        md`Representatives of one exponent class: $1$ and $6$.`,
      ],
      solution: md`**False.** Take $a = a' = 2$, $b = 1$, $b' = 6$. Then $b \equiv b' \pmod 5$, but $2^1 = 2$ and
        $2^6 = 64 = 5 \cdot 12 + 4$, and $5 \nmid 4 - 2$. So exponents cannot be reduced mod 5.

        The base can be: if $a \equiv a'$ then $a^b \equiv (a')^b$, by induction on $b$, since congruence
        respects products. (For $5 \nmid a$, exponents may be reduced mod 4 — Fermat's little theorem, Unit 3.)`,
      checks: [
        md`A specific pair of congruent exponents is given with incongruent powers.`,
        md`The incongruence is verified by explicit arithmetic.`,
      ],
    },
    {
      id: '1.4',
      kind: 'prove',
      title: 'The first isomorphism theorem for sets',
      statement: md`Let $f\colon X \to Y$ be any function and put $x \sim x'$ iff $f(x) = f(x')$. Prove that
        $\sim$ is an equivalence relation, and that $\bar f\colon X/{\sim} \to f(X)$, $\bar f([x]) = f(x)$, is a
        well-defined bijection with $\bar f(q(x)) = f(x)$.`,
      uses: ['1.1'],
      hints: [
        md`Each axiom of $\sim$ is inherited from a property of $=$.`,
        md`Well-defined and injective are the *same* equivalence read in opposite directions.`,
      ],
      solution: md`Reflexivity, symmetry and transitivity of $\sim$ are those of equality in $Y$. By 1.1,
        $[x] = [x'] \iff x \sim x' \iff f(x) = f(x')$. Read left to right this says $\bar f$ is well defined;
        right to left, that $\bar f$ is injective. Surjective: each $y \in f(X)$ is $f(x) = \bar f([x])$ for some
        $x$. And $\bar f(q(x)) = \bar f([x]) = f(x)$.`,
      checks: [
        md`Well-definedness is checked before the map is used.`,
        md`Injectivity and well-definedness are both proved (they are converse implications).`,
        md`Surjectivity is onto $f(X)$, not onto $Y$.`,
      ],
    },
    {
      id: '1.5',
      kind: 'prove',
      title: 'Factoring through a quotient',
      statement: md`Let $\sim$ be an equivalence relation on $X$ with quotient map $q$, and let $g\colon X \to Z$
        satisfy $x \sim x' \Rightarrow g(x) = g(x')$. Prove there is exactly one function
        $\bar g\colon X/{\sim} \to Z$ with $\bar g \circ q = g$. Then show by example that the hypothesis on $g$
        cannot be dropped.`,
      uses: ['1.1'],
      hints: [
        md`Existence: there is only one sensible formula. Check it is well defined.`,
        md`Uniqueness: $q$ is surjective. Why does that pin $\bar g$ down?`,
        md`For the example, let $g$ separate two related points.`,
      ],
      solution: md`**Existence.** Define $\bar g([x]) = g(x)$. If $[x] = [x']$ then $x \sim x'$ (1.1), so
        $g(x) = g(x')$: well defined, and $\bar g(q(x)) = g(x)$ by construction. **Uniqueness.** If
        $h \circ q = g$, every class is $q(x)$ for some $x$, and $h(q(x)) = g(x) = \bar g(q(x))$. **The
        hypothesis is needed:** on $X = \{0, 1\}$ with $0 \sim 1$ and $g = \mathrm{id}$, a $\bar g$ would need
        $\bar g([0]) = 0$ and $\bar g([1]) = 1$, but $[0] = [1]$.`,
      checks: [
        md`Well-definedness of $\bar g$ uses the hypothesis on $g$.`,
        md`Uniqueness uses surjectivity of $q$.`,
        md`The counterexample shows that no $\bar g$ exists, not merely that one formula fails.`,
      ],
    },
    {
      id: '1.6',
      kind: 'prove',
      title: "Cantor's theorem",
      statement: md`Prove that for every set $X$ there is no surjection $X \to \mathcal{P}(X)$. Deduce that
        $\mathcal{P}(\N)$ is not countable.`,
      hints: [
        md`Given $f\colon X \to \mathcal{P}(X)$, build a subset of $X$ that disagrees with each $f(x)$ about
          the element $x$.`,
        md`For the deduction: turn an injection $\mathcal{P}(\N) \to \N$ into a surjection $\N \to \mathcal{P}(\N)$.`,
      ],
      solution: md`Let $f\colon X \to \mathcal{P}(X)$ and $D = \{x \in X : x \notin f(x)\}$. If $D = f(d)$, then
        $d \in D \iff d \notin f(d) \iff d \notin D$ — a contradiction. So $D$ is not in the image.

        **Deduction.** Suppose $j\colon \mathcal{P}(\N) \to \N$ is injective. Define $f\colon \N \to
        \mathcal{P}(\N)$ by $f(n) = A$ if $n = j(A)$ (such $A$ is unique by injectivity) and $f(n) = \emptyset$
        if $n$ is not in the image of $j$. Then $f(j(A)) = A$ for every $A$, so $f$ is surjective,
        contradicting the first part.`,
      checks: [
        md`The diagonal set is defined from $f$, and both directions of the "iff" are used.`,
        md`The deduction turns the injection into a surjection explicitly, handling numbers outside its image.`,
      ],
    },
    {
      id: '1.7',
      kind: 'prove',
      title: 'Pairs and fractions',
      statement: md`Prove that $\N \times \N$ is countable, and deduce from it that $\Q$ is countable. (Unique
        prime factorization may be assumed.)`,
      hints: [
        md`You need an injection $\N \times \N \to \N$. Primes help.`,
        md`For $\Q$, use a *unique* representation of each rational. How can a pair of natural numbers also
          remember a sign?`,
      ],
      solution: md`$\phi(m, n) = 2^m 3^n$ is injective: if $2^m 3^n = 2^{m'} 3^{n'}$, unique factorization gives
        $m = m'$ and $n = n'$.

        Each $r \in \Q$ has a unique expression $r = s\,a/b$ with $s \in \{1, -1\}$, $a, b \in \N$, $b \ge 1$,
        $\gcd(a, b) = 1$, and $s = 1$ when $a = 0$. Put $\psi(r) = \phi(a, 2b + (1 - s)/2)$. Distinct rationals
        have distinct triples $(a, b, s)$, and $(b, s)$ can be read back from $m = 2b + (1 - s)/2$ — $s$ from the
        parity of $m$, then $b$ — so distinct rationals give distinct pairs. As $\phi$ is injective, so is
        $\psi\colon \Q \to \N$.`,
      checks: [
        md`Injectivity comes from unique factorization, not from assertion.`,
        md`The representation of rationals is unique: lowest terms, a sign convention, and zero handled.`,
      ],
    },
    {
      id: '1.8',
      kind: 'decide',
      title: 'Finite subsets',
      statement: md`**Prove or disprove:** the set of all *finite* subsets of $\N$ is countable.`,
      verdict: true,
      hints: [
        md`Compare with 1.6. What makes finite subsets different from arbitrary ones?`,
        md`Binary: a finite set of exponents determines a natural number.`,
      ],
      solution: md`**True.** Define $\beta(A) = \sum_{a \in A} 2^a$, with $\beta(\emptyset) = 0$. It is injective:
        if $A \ne B$, let $m$ be the largest element of the symmetric difference, say $m \in A \setminus B$.
        Elements above $m$ lie in both or neither, so they contribute equally, while the rest gives
        $\sum_{b \in B,\, b < m} 2^b \le 2^m - 1 < 2^m \le \sum_{a \in A,\, a \le m} 2^a$. Hence
        $\beta(A) > \beta(B)$.`,
      checks: [
        md`An explicit map to $\N$ is given.`,
        md`Injectivity is proved — uniqueness of binary expansion, or an equivalent argument.`,
      ],
    },
  ],
}

export default unit
