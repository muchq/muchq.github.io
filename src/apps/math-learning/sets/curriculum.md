# Jech Set Theory: A Problem Book (Ch. 1–20)

Nov 9, 2026 · @Andy

500 problems, 25 per chapter, covering Jech's *Set Theory* (3rd Millennium ed.) from the axioms through supercompact cardinals. The problems are the curriculum: the theory is developed by solving them in order.

## How to use this book

Scope is Jech Part I (Ch. 1–12) and Part II through Ch. 20, where supercompact cardinals live. Ch. 21–26 are out of scope.

- Every problem is a statement to prove unless it says "find", "decide" or "give an example".
- Work in order. Any earlier problem may be used in a later one; that is the design, as in Tkachuk.
- Each chapter opens with the Jech sections to read and the definitions you need. Read after attempting the first five problems, not before.
- From Ch. 5 on the base theory is ZFC. Problems marked (ZF) must avoid choice.
- No mark: routine, under 30 minutes. ★: needs an idea. ★★: a named theorem; budget an evening, and read Jech's proof only after a real attempt.
- Write every solution out. A problem you can only do in your head is not done.
- Solutions are not included. The last section says where each chapter's solutions can be checked.

| Stage | Chapters | Weeks at 8–10 h | You are done when you can prove, cold |
| --- | --- | --- | --- |
| I. Foundations | 1–6 | 8 | König's theorem; every set is in some Vα; ℵω^ℵ₀ computations under GCH |
| II. Combinatorics | 7–9 | 6 | Fodor, Solovay splitting, Silver's theorem, Erdős–Rado |
| III. Measures, reals, models | 10–12 | 6 | Measurable implies inaccessible with a normal measure; perfect set theorem for analytic sets; reflection; Mostowski collapse |
| IV. L | 13 | 3 | L satisfies ZFC + GCH via condensation |
| V. Forcing | 14–16 | 10 | Forcing theorem; Con(¬CH); Lévy collapse; MA from a ccc finite-support iteration |
| VI. Large cardinals and L | 17–18 | 6 | Weakly compact equivalences; Kunen inconsistency; Ramsey implies 0# exists; consequences of covering |
| VII. Inner models, very large cardinals | 19–20 | 7 | Uniqueness of L\[U\]; supercompactness via normal fine measures; SCH above a strongly compact |

Total is about 46 weeks. Stages II and III can be swapped, and Ch. 11 can be delayed until just before Ch. 14.

## 1. Axioms of set theory

Read: Jech Ch. 1. Chapters 1–4 use no Choice unless stated, and Ch. 1 uses no Regularity unless stated. N denotes the least inductive set once you have built it; X is T-finite if every nonempty family of subsets of X has a ⊆-maximal element; X is D-infinite if it injects onto a proper subset of itself.

**1.1.** Extensionality makes each of these unique when it exists: ∅, {a, b}, ⋃X, P(X), {x ∈ X : φ(x)}.

**1.2.** With (a, b) = {{a}, {a, b}}: (a, b) = (c, d) iff a = c and b = d. Do not assume a ≠ b.

**1.3.** Assuming Regularity, the short pair ⟨a, b⟩ = {a, {a, b}} also has the pair property. Mark the line that uses Regularity.

**1.4.** There is no set of all sets. More generally, for every set X there is y ∉ X definable from X.

**1.5.** X × Y is a set. Give one proof using Power Set and one using Replacement and Union only.

**1.6.** Each instance of Separation follows from Replacement and the existence of ∅.

**1.7.** Pairing follows from Power Set, Replacement and the existence of ∅.

**1.8.** ⋂X is a set when X ≠ ∅. The class ⋂∅ is proper.

**1.9.** The class of all singletons is proper. So is the class of all sets equinumerous with a fixed nonempty set.

**1.10.** If R is a set of ordered pairs, then dom R and ran R are sets, both included in ⋃⋃R.

**1.11.** The collection of all functions from Y to X is a set.

**1.12.** Equivalence relations on X and partitions of X correspond bijectively; write the two maps and check they are inverse.

**1.13.** Replacement is equivalent to: for every class function F and set X, the restriction F↾X is a set.

**1.14.** N is inductive, and any inductive subset of N equals N (induction).

**1.15.** Every n ∈ N is transitive, and N is transitive.

**1.16.** Without Regularity: n ∉ n for n ∈ N, and ∈ is a strict linear order on N in which m < n iff m ⊊ n.

**1.17.** Every nonempty subset of N has an ∈-least element.

**1.18.** Recursion on N: given a ∈ A and g: A × N → A there is a unique f: N → A with f(0) = a and f(n+1) = g(f(n), n).

**1.19.** Each n ∈ N is T-finite, and N is T-infinite.

**1.20.** ★ X is finite (bijective with some n ∈ N) iff X is T-finite.

**1.21.** ★ Over the other axioms, Infinity is equivalent to the existence of a T-infinite set.

**1.22.** D-infinite implies infinite; N is D-infinite; X is D-infinite iff N injects into X.

**1.23.** (Cantor) No map X → P(X) is onto. Deduce there is no set X with P(X) ⊆ X.

**1.24.** ★ On N define m E n iff the m-th binary digit of n is 1. The structure (N, E) satisfies Extensionality, Pairing, Union, Power Set and Separation.

**1.25.** ★ (N, E) also satisfies Replacement and Regularity, every element is finite in the sense of the model, and Infinity fails. Conclude that Infinity is independent of the remaining axioms.

## 2. Ordinal numbers

Read: Jech Ch. 2. Needed: well-ordering, ordinal, successor and limit, transfinite recursion, ordinal sum, product and power, normal function (increasing and continuous), Cantor normal form (CNF), well-founded relation and rank.

**2.1.** If (W, <) is well-ordered and f: W → W is increasing, then f(x) ≥ x for all x. The only automorphism of W is the identity.

**2.2.** No well-ordered set is isomorphic to a proper initial segment of itself. Any two well-ordered sets are comparable: one is isomorphic to an initial segment of the other, uniquely.

**2.3.** Every element of an ordinal is an ordinal; α = {β : β < α}; any two ordinals are comparable under ∈.

**2.4.** Ord is a proper class. If X is a set of ordinals, ⋃X is an ordinal and equals sup X.

**2.5.** Every well-ordered set is isomorphic to a unique ordinal. Mark where Replacement is used.

**2.6.** Prove the transfinite recursion theorem: for every class function G there is a unique F on Ord with F(α) = G(F↾α).

**2.7.** α is a limit or 0 iff α = ⋃α; α is a successor iff ⋃α < α.

**2.8.** The recursive definition of α + β gives the order type of α followed by β. Addition is associative, not commutative; α + β = α + γ implies β = γ, and the mirror statement fails.

**2.9.** α ≤ β iff there is δ with α + δ = β, and δ is then unique.

**2.10.** α·β is the order type of β copies of α. Prove α(β + γ) = αβ + αγ and give a counterexample to (α + β)γ = αγ + βγ.

**2.11.** Division: for α > 0 and any β there are unique γ and ρ < α with β = α·γ + ρ.

**2.12.** α^(β+γ) = α^β · α^γ and (α^β)^γ = α^(βγ).

**2.13.** ★ α^β is the order type of the functions β → α with finite support, ordered by the last difference.

**2.14.** Every α > 0 has a unique CNF: α = ω^β₁·k₁ + … + ω^βₙ·kₙ with β₁ > … > βₙ and 0 < kᵢ < ω.

**2.15.** Find the CNF of: (ω + 1)·2, 2·(ω + 1), (ω + 1)², 2^ω, (ω + 1)^ω, (ω·2)^(ω+1), and the sum over n < ω of ω^n.

**2.16.** For α > 0 the following are equivalent: β + γ < α whenever β, γ < α; β + α = α for all β < α; α = ω^δ for some δ.

**2.17.** ★ For α > 2: α is closed under ordinal multiplication iff α = ω^(ω^δ) for some δ.

**2.18.** A normal function has arbitrarily large fixed points, and the increasing enumeration of its fixed points is again normal.

**2.19.** ★ Let ε₀ be the least α with ω^α = α. Then ε₀ = sup{ω, ω^ω, ω^ω^ω, …}, and ε₀ is countable; give an explicit injection into N.

**2.20.** If α and β are countable, so are α + β, α·β and α^β. Use no Choice.

**2.21.** ★★ α + β = β + α iff there are γ and m, n < ω with α = γ·m and β = γ·n.

**2.22.** Define the natural sum α ⊕ β by adding CNF coefficients. It is commutative, associative, strictly increasing in each argument, and α + β ≤ α ⊕ β.

**2.23.** Every countable ordinal embeds order-preservingly into the rationals. Every subset of the reals that is well-ordered by the usual order is countable.

**2.24.** ★ (Goodstein) Write n in hereditary base b, replace every b by b + 1, subtract 1, increase b, repeat. Starting from any n at base 2 the sequence reaches 0. Use 2.14.

**2.25.** If E is a well-founded relation on a set P, there is a unique ρ: P → Ord with ρ(x) = sup{ρ(y) + 1 : y E x}, and its range is an ordinal. Deduce induction and recursion along E.

## 3. Cardinal numbers

Read: Jech Ch. 3. Needed: |X| ≤ |Y| (injection), |X| ≤\* |Y| (X empty or Y maps onto X), alephs, Hartogs number h(X) (least ordinal not injecting into X), the canonical well-ordering Γ of Ord × Ord, cofinality, regular and singular, weakly inaccessible, the beth numbers ℶα. Everything here is in ZF except 3.9.

**3.1.** (Cantor–Bernstein) |X| ≤ |Y| and |Y| ≤ |X| imply |X| = |Y|.

**3.2.** |P(X)| = 2^|X|, and for arbitrary cardinals (κ^λ)^μ = κ^(λμ), κ^(λ+μ) = κ^λ · κ^μ, (κλ)^μ = κ^μ · λ^μ.

**3.3.** (Hartogs) h(X) exists for every set X and is an initial ordinal.

**3.4.** Every infinite initial ordinal is ωα for a unique α; the function α ↦ ωα is normal; there is α with ωα = α.

**3.5.** ★ Γ maps ωα × ωα onto ωα. Hence ℵα · ℵα = ℵα.

**3.6.** ℵα + ℵβ = ℵα · ℵβ = max(ℵα, ℵβ).

**3.7.** The set of finite sequences in ωα and the set of finite subsets of ωα both have cardinality ℵα.

**3.8.** ★ Γ(α × α) ≤ ω^α (ordinal power) for every α.

**3.9.** (AC, this problem only) ℵα₊₁ is regular. Mark each use of Choice.

**3.10.** cf(cf α) = cf α, and cf α is a regular initial ordinal for every limit α.

**3.11.** For limit α there is a strictly increasing continuous sequence of length cf α with limit α.

**3.12.** cf(ωα) = cf α for limit α. Find cf of ℵω, ℵω₁, ℵ(ω·2), ℵ(ω₁ + ω), ℵ(ℵω).

**3.13.** An infinite cardinal κ is singular iff κ is the union of fewer than κ subsets of κ, each of cardinality less than κ.

**3.14.** ★ ω₂ is not a countable union of countable sets.

**3.15.** If 2 ≤ κ ≤ λ are alephs, then κ^λ = 2^λ as cardinalities.

**3.16.** P(ωα) maps onto ωα₊₁, so ℵα₊₁ ≤\* 2^ℵα, and ℵα₊₁ injects into P(P(ωα)).

**3.17.** ★ For every set X, h(X) injects into P(P(P(X))).

**3.18.** ★ If X is infinite, then P(P(X)) is D-infinite.

**3.19.** ★ Let m be any cardinal and ℵ an aleph. If m + ℵ = m · ℵ, then m ≤ ℵ or ℵ ≤ m.

**3.20.** The ordinals of cardinality ℵβ form the interval \[ωβ, ωβ₊₁), of order type ωβ₊₁. Ordinal 2^ω is countable; cardinal 2^ℵ₀ is not.

**3.21.** There are 2^ℵ₀ well-orderings of ω, and their isomorphism types correspond to the ordinals in \[ω, ω₁).

**3.22.** A weakly inaccessible κ satisfies κ = ℵκ. The least fixed point of the aleph function has cofinality ω.

**3.23.** Define ℶ₀ = ℵ₀, ℶα₊₁ = 2^ℶα (assume each P(V) here is well-orderable, or read ℶ as a cardinality), limits by sup. A limit cardinal of the form ℶβ with β limit is a strong limit, and ℶω is singular.

**3.24.** For limit β, cf(ℵβ) = cf β, and the same for ℶβ when the beths are alephs.

**3.25.** ★ Let C be the class of κ with κ = ℵκ. C is closed and unbounded in Ord; its α-th element has cofinality cf α for limit α; a weakly inaccessible cardinal is a fixed point of the enumeration of C.

## 4. Real numbers

Read: Jech Ch. 4. Countable Choice is allowed in this chapter; full AC only where marked. Needed: dense linear order, separable, complete, countable chain condition (ccc), perfect set, Cantor–Bendixson derivative, nowhere dense and meager, Baire space 𝒩 = ω^ω, Cantor space 2^ω, tree T ⊆ ω^<ω and its body \[T\], Polish space, Borel sets, Lebesgue measure, property of Baire.

**4.1.** |R| = |P(ω)| = |R^ω| = 2^ℵ₀. The sets of open subsets of R and of continuous functions R → R also have cardinality 2^ℵ₀.

**4.2.** Prove R is uncountable by nested intervals, without decimals or diagonalising P(ω).

**4.3.** (Cantor) Any two countable dense linear orders without endpoints are isomorphic.

**4.4.** Every countable linear order embeds in Q.

**4.5.** Any complete, separable, dense linear order without endpoints is isomorphic to R.

**4.6.** A separable linear order is ccc: every family of disjoint open intervals is countable. State Suslin's problem and say exactly which hypothesis of 4.5 it weakens.

**4.7.** Every nonempty perfect subset of R has cardinality 2^ℵ₀.

**4.8.** (Cantor–Bendixson) Every closed F ⊆ R is uniquely P ∪ S with P perfect, S countable, P ∩ S = ∅.

**4.9.** ★ Iterate the derivative: F₀ = F, Fα₊₁ = limit points of Fα, intersections at limits. The sequence stabilises at a countable ordinal. For each countable α build a countable closed set whose sequence stabilises exactly at α + 1 with empty kernel.

**4.10.** There are exactly 2^ℵ₀ closed sets and 2^ℵ₀ perfect sets. Every uncountable closed set has cardinality 2^ℵ₀.

**4.11.** (Baire) In a complete metric space the intersection of countably many dense open sets is dense.

**4.12.** Q is not a Gδ subset of R. There is no function R → R continuous exactly at the rationals.

**4.13.** ★ 𝒩 with the product topology is completely metrisable, separable, and homeomorphic to the irrationals.

**4.14.** The closed subsets of 𝒩 are exactly the sets \[T\] for trees T. \[T\] is perfect iff every node of the pruned T has two incomparable extensions.

**4.15.** 𝒩 is homeomorphic to 𝒩 × 𝒩 and to 𝒩^ω. 2^ω is homeomorphic to the Cantor ternary set. 𝒩 is not σ-compact.

**4.16.** ★ Every compact metric space is a continuous image of 2^ω.

**4.17.** ★ Every Polish space is a continuous image of 𝒩. Every uncountable Polish space contains a homeomorph of 2^ω.

**4.18.** Define Σ⁰α and Π⁰α for 1 ≤ α < ω₁. Their union is the Borel σ-algebra, and there are exactly 2^ℵ₀ Borel sets.

**4.19.** The Cantor set is null. Hence there are 2^(2^ℵ₀) Lebesgue measurable sets, and not all are Borel.

**4.20.** Every measurable set is an Fσ set plus a null set and a Gδ set minus a null set.

**4.21.** A has the Baire property iff A = G △ M with G open and M meager. Such sets form a σ-algebra containing the Borel sets.

**4.22.** R is the union of a meager set and a null set.

**4.23.** ★ (Steinhaus) If A has positive measure, A − A contains an interval around 0. State and prove the Baire category analogue.

**4.24.** (AC) A set of representatives for R/Q is neither measurable nor has the Baire property. Use 4.23.

**4.25.** ★★ (Alexandrov) A subspace of a Polish space is Polish iff it is Gδ.

## 5. The Axiom of Choice and cardinal arithmetic

Read: Jech Ch. 5. ZFC from here on unless a problem says (ZF). Needed: AC, Zorn's lemma, countable choice, dependent choices (DC), infinite sums and products, the gimel function ℷ(κ) = κ^cf κ, 2^<κ, GCH, SCH (if 2^cf κ < κ then κ^cf κ = κ⁺).

**5.1.** (ZF) AC, the well-ordering theorem and Zorn's lemma are equivalent.

**5.2.** (ZF) AC is equivalent to each of: every surjection has a right inverse; any two sets are comparable in cardinality; Hausdorff's maximal chain principle.

**5.3.** ★ (ZF, Tarski) If m² = m for every infinite cardinal m, then AC. Use 3.19.

**5.4.** (ZF + countable choice) A countable union of countable sets is countable; every infinite set is D-infinite; ω₁ is regular.

**5.5.** (ZF) DC is equivalent to: every nonempty pruned tree of finite sequences has an infinite branch. DC implies countable choice.

**5.6.** (ZF + DC) A relation is well-founded iff it has no infinite descending sequence. A linear order is a well-order iff it has no descending ω-sequence.

**5.7.** ★ (Bernstein) There is B ⊆ R such that B and R ∖ B both meet every uncountable closed set. B is not measurable and lacks the Baire property.

**5.8.** R has a basis over Q. There is a discontinuous additive f: R → R, and its graph is dense in the plane.

**5.9.** If λ is infinite and 0 < κᵢ for i < λ, then the sum of the κᵢ equals λ · sup κᵢ.

**5.10.** (König) If κᵢ < λᵢ for all i ∈ I, then the sum of the κᵢ is less than the product of the λᵢ.

**5.11.** Deduce from 5.10: κ < 2^κ; cf(2^κ) > κ; κ^cf κ > κ; cf(κ^λ) > λ. Hence 2^ℵ₀ ≠ ℵω.

**5.12.** The product of n over 0 < n < ω is 2^ℵ₀. The product of ℵₙ over n < ω is ℵω^ℵ₀. The product of ℵα over α < ω₁ + ω is ℵ(ω₁+ω)^ℵ₁.

**5.13.** (Hausdorff) ℵα₊₁^ℵβ = ℵα^ℵβ · ℵα₊₁.

**5.14.** ℵₙ^ℵ₀ = ℵₙ · 2^ℵ₀ for n < ω, and ℵα^ℵ₁ = ℵα^ℵ₀ · 2^ℵ₁ for α < ω₁.

**5.15.** For λ ≤ κ infinite, the set of subsets of κ of size λ has cardinality κ^λ.

**5.16.** Assume GCH. Compute κ^λ in the three cases λ < cf κ, cf κ ≤ λ < κ, κ ≤ λ.

**5.17.** κ^<κ = κ iff κ is regular and 2^<κ = κ.

**5.18.** For a limit cardinal κ, 2^κ = (2^<κ)^cf κ. For a strong limit κ, 2^κ = κ^cf κ.

**5.19.** ★ (Bukovský–Hechler) If κ is singular and 2^μ = ν for all sufficiently large μ < κ, then 2^κ = ν.

**5.20.** ★ For infinite κ, λ: if κ ≤ λ then κ^λ = 2^λ; if μ^λ ≥ κ for some μ < κ then κ^λ = μ^λ; otherwise κ^λ = κ when cf κ > λ and κ^λ = κ^cf κ when cf κ ≤ λ.

**5.21.** ★ Assume SCH. For singular κ: 2^κ = 2^<κ if the continuum function is eventually constant below κ, and 2^κ = (2^<κ)⁺ otherwise. State and prove the matching formula for κ^λ.

**5.22.** If 2^ℵ₀ > ℵω then ℵω^ℵ₀ = 2^ℵ₀.

**5.23.** ★ If 2^ℵ₁ = ℵ₂ and ℵω^ℵ₀ > ℵω₁, then ℵω₁^ℵ₁ = ℵω^ℵ₀.

**5.24.** Let κ be weakly inaccessible with 2^<κ = κ. Decide whether ZFC proves κ is strongly inaccessible (you may quote any consistency result). Then show a strongly inaccessible κ satisfies κ^<κ = κ and κ = ℶκ.

**5.25.** ★ For each scenario, refute it or check that monotonicity, König and 5.18–5.19 do not exclude it: (a) 2^ℵ₀ = ℵω; (b) 2^ℵ₀ = ℵω₁; (c) 2^ℵ₁ = ℵω; (d) 2^ℵₙ = ℵω₊₁ for all n and 2^ℵω = ℵω₊₂; (e) 2^ℵₙ = ℵₙ₊₂ for all n and 2^ℵω = ℵω₊₁; (f) 2^ℵₙ = ℵₙ₊₁ for all n and 2^ℵω = ℵω₊₂.

## 6. The Axiom of Regularity

Read: Jech Ch. 6. Needed: transitive closure TC(x), the hierarchy Vα, rank, ∈-induction and ∈-recursion, Hκ = {x : |TC(x)| < κ}, extensional and set-like relations, the Mostowski collapse. Problems 6.1–6.4, 6.12 and 6.25 work in ZF without Regularity.

**6.1.** Every set x has a transitive closure: a least transitive set including x.

**6.2.** Regularity is equivalent to: every nonempty class has an ∈-minimal element.

**6.3.** Each Vα is transitive, α < β implies Vα ⊆ Vβ, and Vα ∩ Ord = α.

**6.4.** Regularity is equivalent to: every set belongs to some Vα.

**6.5.** rank(x) = sup{rank(y) + 1 : y ∈ x}, rank(α) = α, and rank(x) = rank(TC(x)). In terms of rank x and rank y, compute the ranks of {x, y}, (x, y), ⋃x, P(x), x × y.

**6.6.** Find the rank of: ω × ω, a function ω → ω, the set ω^ω, and R built as Dedekind cuts in Q (fix your coding of Z and Q and say what it is).

**6.7.** Prove ∈-induction and ∈-recursion: for every class function G there is a unique F with F(x) = G(F↾x).

**6.8.** A class is a set iff the ranks of its elements are bounded.

**6.9.** (ZF) Collection holds: if every x ∈ X has some y with φ(x, y), there is a set Y containing such a y for every x ∈ X. (Scott's trick) Define |X| as a set without AC so that |X| = |Y| iff X and Y are equinumerous.

**6.10.** |Vω₊α| = ℶα.

**6.11.** Vω = Hω, and (Vω, ∈) is isomorphic to the structure (N, E) of 1.24. Write the isomorphism.

**6.12.** ★ (ZF without Regularity) Let WF be the union of the Vα. WF is transitive and satisfies every axiom of ZF. Conclude Con(ZF − Regularity) implies Con(ZF).

**6.13.** For limit λ > ω, Vλ satisfies every axiom of ZFC except possibly Replacement. Exhibit an instance of Replacement failing in Vω₊ω.

**6.14.** Hκ is a set, Hκ ⊆ Vκ for every infinite cardinal κ, and |Hω₁| = 2^ℵ₀.

**6.15.** Hκ = Vκ iff κ = ω or κ = ℶκ.

**6.16.** If κ is inaccessible then |Vκ| = κ, and x ⊆ Vκ belongs to Vκ iff |x| < κ.

**6.17.** ★ For regular uncountable κ, Hκ satisfies every axiom of ZFC except possibly Power Set. Power Set holds in Hκ iff κ is a strong limit.

**6.18.** (Mostowski) If E is a well-founded, set-like, extensional relation on a class P, there are a unique transitive class M and a unique isomorphism π: (P, E) → (M, ∈).

**6.19.** An ∈-isomorphism between transitive classes is the identity. In particular (V, ∈) has no nontrivial automorphism.

**6.20.** Compute the transitive collapse of X = {0, 2, {2}, {0, {2}}}. Then give a three-element X on which ∈ is not extensional and say what the collapsing map does to it.

**6.21.** If X is extensional and T ⊆ X is transitive, the collapse of X is the identity on T.

**6.22.** If M is a countable set with (M, ∈) extensional, its collapse is a countable transitive set. Every x ⊆ ω in M collapses to a subset of ω; give an example where it is not fixed.

**6.23.** ★★ (ZF) If P(α) can be well-ordered for every ordinal α, then AC holds.

**6.24.** (ZF) AC holds iff every Vα can be well-ordered.

**6.25.** ★ (ZF without Regularity) Let F be a definable bijection of V and put x E y iff x ∈ F(y). (V, E) satisfies all axioms except possibly Regularity. Choose F so that some x has x E x and nothing else E x. Conclude Regularity is independent.

## 7. Filters, ultrafilters and Boolean algebras

Read: Jech Ch. 7. Needed: filter, ideal, ultrafilter, principal, uniform, κ-complete, independent family, p-point, Ramsey ultrafilter, Boolean algebra, atom, homomorphism, quotient, Stone space, complete Boolean algebra, regular open set, separative partial order, antichain, κ-saturated, sat(B).

**7.1.** A family with the finite intersection property generates a filter. The Fréchet filter on an infinite set is not principal and is not an ultrafilter.

**7.2.** For a filter F on S the following are equivalent: F is an ultrafilter; F is maximal; X ∪ Y ∈ F implies X ∈ F or Y ∈ F.

**7.3.** (Tarski) Every filter extends to an ultrafilter.

**7.4.** An ultrafilter is nonprincipal iff it extends the Fréchet filter. No nonprincipal ultrafilter on ω is closed under countable intersections.

**7.5.** ★ On every infinite κ there is an independent family of 2^κ subsets.

**7.6.** ★ (Pospíšil) There are 2^(2^κ) ultrafilters on κ, and that many uniform ones.

**7.7.** ★ A nonprincipal ultrafilter on ω, viewed as a subset of 2^ω, is not Lebesgue measurable and lacks the Baire property.

**7.8.** For f: S → T and an ultrafilter U on S, f⁎(U) = {X ⊆ T : f⁻¹(X) ∈ U} is an ultrafilter. Define the Rudin–Keisler order and show it is a preorder.

**7.9.** ★ Assume CH. There is a Ramsey ultrafilter on ω.

**7.10.** Every Ramsey ultrafilter is a p-point. U is Ramsey iff every f: ω → ω is constant or injective on a set in U.

**7.11.** In a Boolean algebra, a ≤ b defined by a·b = a is a partial order making B a complemented distributive lattice; prove the De Morgan laws from the axioms.

**7.12.** Every finite Boolean algebra is isomorphic to P(n) for some n.

**7.13.** The kernel of a homomorphism is an ideal and every ideal is a kernel. I is a prime ideal iff B/I has two elements.

**7.14.** (Stone) Every Boolean algebra is isomorphic to a field of sets.

**7.15.** The Stone space of B is compact, Hausdorff and zero-dimensional, and B is isomorphic to its algebra of clopen sets.

**7.16.** Any two countable atomless Boolean algebras are isomorphic.

**7.17.** RO(X), the regular open subsets of a topological space, is a complete Boolean algebra. Write the formulas for sum, product and complement.

**7.18.** ★ P(ω)/fin is not σ-complete, has an antichain of size 2^ℵ₀, and every countable descending sequence of nonzero elements has a nonzero lower bound.

**7.19.** For any partial order P define the separative quotient and show it is separative with the same compatibility structure.

**7.20.** ★ Every separative partial order embeds densely in a complete Boolean algebra, unique up to isomorphism over P.

**7.21.** If B is complete and ccc, every X ⊆ B has a countable subset with the same supremum.

**7.22.** ★ Borel sets modulo meager sets is a complete ccc algebra isomorphic to RO(R). Borel sets modulo null sets is complete and ccc. The two are not isomorphic.

**7.23.** ★★ (Erdős–Tarski) For an infinite complete Boolean algebra B, sat(B) is a regular uncountable cardinal.

**7.24.** A κ-complete ideal I on S makes P(S)/I a κ-complete algebra. If I is also κ⁺-saturated then P(S)/I is complete.

**7.25.** ★ A complete Boolean algebra is isomorphic to some P(X) iff it is atomic, iff it is completely distributive.

## 8. Stationary sets

Read: Jech Ch. 8. κ is regular uncountable unless stated. Needed: closed unbounded (club), stationary, diagonal intersection, regressive function, normal filter, Mahlo cardinal, the trace Tr(S) = {α : cf α > ω and S ∩ α is stationary in α}, clubs and stationary sets in Pκ(A), almost disjoint functions. E(κ, λ) denotes {α < κ : cf α = λ}.

**8.1.** The intersection of fewer than κ clubs in κ is club. If cf λ = ω there are two disjoint clubs in λ.

**8.2.** The diagonal intersection of κ clubs is club.

**8.3.** For f: \[κ\]^<ω → κ the set of α closed under f is club. Conversely, for every club C there is f: κ → κ all of whose nonzero closure points lie in C.

**8.4.** C ⊆ κ is club iff it is the range of a normal function κ → κ. The limit points of a club form a club.

**8.5.** E(κ, λ) is stationary for each regular λ < κ, and the intersection of a stationary set with a club is stationary.

**8.6.** (Fodor) A regressive function on a stationary set is constant on a stationary subset.

**8.7.** A filter on κ is closed under diagonal intersections iff every regressive function on a positive set is constant on a positive subset. A normal κ-complete filter containing all final segments contains every club.

**8.8.** X ⊆ κ is nonstationary iff there is a regressive f on X ∖ {0} with every fibre bounded in κ.

**8.9.** ★ (Ulam) There are sets A(n, α) ⊆ ω₁ for n < ω and α < ω₁ such that A(n, α) and A(n, β) are disjoint for α ≠ β, and for each α the union over n of A(n, α) is co-countable. Deduce that every stationary subset of ω₁ splits into ℵ₁ disjoint stationary sets.

**8.10.** ★ If S ⊆ κ is stationary, then so is the set of α ∈ S such that cf α = ω or S ∩ α is not stationary in α.

**8.11.** ★★ (Solovay) Every stationary subset of κ is the disjoint union of κ stationary sets.

**8.12.** The club filter on κ is not an ultrafilter. There are 2^κ sets that are both stationary and co-stationary.

**8.13.** ★ Every stationary S ⊆ ω₁ includes a closed subset of order type α + 1 for each α < ω₁.

**8.14.** If κ is Mahlo, the inaccessibles below κ are stationary and κ is the κ-th inaccessible. The least inaccessible limit of inaccessibles is not Mahlo.

**8.15.** ★ For stationary S, T put S < T iff T ⊆ Tr(S) modulo a club. This relation is transitive and well-founded.

**8.16.** For regular λ, the stationary set E(λ⁺, λ) does not reflect: Tr of it is empty.

**8.17.** The club filter on Pκ(A) is κ-complete and normal (closed under diagonal intersections indexed by A).

**8.18.** ★ (Jech) If f is defined on a stationary S ⊆ Pκ(A) with f(x) ∈ x for nonempty x, then f is constant on a stationary set.

**8.19.** ω₁ is a club subset of Pω₁(ω₁), and S ⊆ ω₁ is stationary in ω₁ iff it is stationary in Pω₁(ω₁).

**8.20.** ★★ (Kueker) For every club C ⊆ Pω₁(A) there is F: \[A\]^<ω → A such that every countable x closed under F is in C.

**8.21.** ★ Let A ⊆ B. If C is club in Pκ(B), then {x ∩ A : x ∈ C} includes a club of Pκ(A); if C is club in Pκ(A), then {x : x ∩ A ∈ C} is club in Pκ(B). Same for stationary sets, suitably stated.

**8.22.** ★ On functions ω₁ → Ord put f < g iff f(α) < g(α) on a club. This is well-founded; in the resulting rank, the constant function γ has rank γ for γ < ω₁ and the identity has rank ω₁.

**8.23.** ★ Let κ be singular of uncountable cofinality λ with μ^λ < κ for all μ < κ, let κα (α < λ) be normal and cofinal in κ, and let F be a family of pairwise almost disjoint functions on λ with f(α) < κα for stationary many α. Then |F| ≤ κ.

**8.24.** ★★ (Silver) Let κ be singular of uncountable cofinality λ and κα (α < λ) a normal cofinal sequence of cardinals. If 2^κα = κα⁺ for stationary many α, then 2^κ = κ⁺.

**8.25.** ★★ (Silver) If SCH fails, the least cardinal at which it fails has cofinality ω.

## 9. Combinatorial set theory

Read: Jech Ch. 9. Needed: the arrow κ → (λ)^n\_m and its unbalanced form κ → (λ, μ)², homogeneous set, weakly compact (uncountable κ with κ → (κ)²), tree, level, branch, antichain, κ-tree, Aronszajn tree, Suslin tree, special tree, tree property, almost disjoint family, Δ-system.

**9.1.** (Ramsey) ω → (ω)^n\_k for all n, k < ω.

**9.2.** Derive the finite Ramsey theorem from 9.1 by a König's lemma argument.

**9.3.** 2^κ ↛ (3)²\_κ.

**9.4.** The lexicographically ordered set 2^κ has no increasing or decreasing sequence of length κ⁺.

**9.5.** (Sierpiński) 2^κ ↛ (κ⁺)². In particular 2^ℵ₀ ↛ (ω₁)².

**9.6.** (AC) ω ↛ (ω)^ω\_2: there is a 2-colouring of the infinite subsets of ω with no infinite homogeneous set.

**9.7.** ★★ (Erdős–Dushnik–Miller) κ → (κ, ω)² for every infinite κ. Do regular κ first.

**9.8.** ★ ω₁ → (ω₁, ω + 1)².

**9.9.** ★★ (Erdős–Rado) (2^κ)⁺ → (κ⁺)²\_κ.

**9.10.** ★★ With ℶ₀(κ) = κ and ℶₙ₊₁(κ) = 2^ℶₙ(κ): ℶₙ(κ)⁺ → (κ⁺)^(n+1)\_κ.

**9.11.** ★ A weakly compact cardinal is regular and a strong limit.

**9.12.** (König) Every infinite finitely branching tree has an infinite branch. So ω has the tree property.

**9.13.** ★★ (Aronszajn) There is an Aronszajn tree: height ω₁, countable levels, no uncountable branch.

**9.14.** ★ The tree you built in 9.13 can be taken special (a countable union of antichains). A special Aronszajn tree is not Suslin.

**9.15.** If a tree of height ω₁ has no uncountable antichain and every node has two incomparable successors, then it has no uncountable branch. If a Suslin tree exists, a normal one exists.

**9.16.** ★★ A Suslin line exists iff a Suslin tree exists.

**9.17.** ★ A weakly compact cardinal has the tree property.

**9.18.** ★ If κ is inaccessible with the tree property, then κ → (κ)²\_λ for every λ < κ.

**9.19.** ★★ (Specker) If κ^<κ = κ there is a κ⁺-Aronszajn tree. So under CH, ℵ₂ lacks the tree property.

**9.20.** There is an almost disjoint family of 2^ℵ₀ infinite subsets of ω, and for regular κ a family of κ⁺ pairwise almost disjoint functions κ → κ.

**9.21.** ★ (Δ-system lemma) Let λ be regular, κ < λ, and α^<κ < λ for all α < λ. Any λ sets of size less than κ include a Δ-system of size λ. State the case κ = ω, λ = ω₁ separately and prove it directly first.

**9.22.** The family of all countable ordinals is ℵ₁ countable sets with no Δ-subsystem of size 3. Which hypothesis of 9.21 fails?

**9.23.** ★ (Sierpiński) CH holds iff the plane is A ∪ B with every vertical section of A countable and every horizontal section of B countable.

**9.24.** ★ An ultrafilter U on ω is Ramsey iff every 2-colouring of \[ω\]² has a homogeneous set in U.

**9.25.** ★★ If κ is weakly compact then κ → (κ)^n\_λ for all n < ω and λ < κ.

## 10. Measurable cardinals

Read: Jech Ch. 10. Needed: nontrivial σ-additive probability measure on P(S) vanishing on points, κ-additive, atom, real-valued measurable (RVM), measurable cardinal, normal measure. No ultrapowers yet; this chapter is combinatorial on purpose.

**10.1.** If some set carries a nontrivial σ-additive measure, the least cardinal κ carrying one carries a κ-additive one.

**10.2.** ★ (Ulam) An RVM cardinal is regular and is not a successor. Use an Ulam matrix on λ⁺.

**10.3.** The null sets of a κ-additive measure on κ form a κ-complete ideal I such that every family of pairwise disjoint non-null sets is countable.

**10.4.** ★ Let μ be a κ-additive measure on κ. If μ has an atom, κ is measurable. If μ is atomless, κ ≤ 2^ℵ₀.

**10.5.** If some κ ≤ 2^ℵ₀ is RVM, then CH fails and there is a weakly inaccessible cardinal ≤ 2^ℵ₀.

**10.6.** The least cardinal carrying a nonprincipal σ-complete ultrafilter is measurable. More generally, the largest κ such that a given nonprincipal σ-complete ultrafilter is κ-complete is measurable.

**10.7.** If U is a κ-complete nonprincipal ultrafilter on κ, every member of U has cardinality κ.

**10.8.** A measurable cardinal is inaccessible.

**10.9.** No set of cardinality below the least weakly inaccessible carries a nontrivial σ-additive measure. In particular none on ℵ₁, ℵω or ℵω₁.

**10.10.** For a κ-complete nonprincipal ultrafilter U on κ: U is closed under diagonal intersections iff every function regressive on a set in U is constant on a set in U.

**10.11.** ★ Every measurable cardinal carries a normal measure. Take f least, in the order of domination on a set in U, among functions not constant on any set in U, and push U forward along f.

**10.12.** A normal measure contains every club. Hence each of its members is stationary, and E(κ, ω) is not in it.

**10.13.** A measurable κ is Mahlo, and every normal measure on κ contains the set of inaccessibles and the set of Mahlo cardinals below κ.

**10.14.** Prove directly from a κ-complete ultrafilter that a measurable κ has the tree property.

**10.15.** ★★ (Rowbottom) If U is a normal measure on κ and F: \[κ\]^<ω → λ with λ < κ, there is H ∈ U such that F is constant on \[H\]^n for each n.

**10.16.** If U is normal, every f: κ → κ is constant or injective on a set in U.

**10.17.** ★ Define U ⊗ U on κ × κ by: X is in it iff the set of α with {β : (α, β) ∈ X} ∈ U is in U. It is a κ-complete ultrafilter. If U is normal, X ⊆ \[κ\]² belongs to it iff X ⊇ \[H\]² for some H ∈ U.

**10.18.** ★ If U is normal and X(s) ∈ U for each finite s ⊆ κ, there is H ∈ U such that for every finite s ⊆ H, all elements of H above max s lie in X(s).

**10.19.** If κ is measurable, every linear order of size κ has a subset of size κ that is well-ordered or conversely well-ordered.

**10.20.** ★ Let U be a normal measure on κ. If 2^α = α⁺ for a set of α in U, then 2^κ = κ⁺. Do this without ultrapowers.

**10.21.** κ is measurable iff V(κ+2) satisfies "κ is measurable". If κ is the least measurable, Vκ satisfies "there is no measurable cardinal".

**10.22.** There are stationary subsets of a measurable κ that belong to no normal measure, and every normal measure contains the set of regular cardinals below κ.

**10.23.** The least inaccessible, the least Mahlo and the least weakly compact cardinal are not measurable. For weakly compact you may use 10.15 and 9.18; say what extra fact you would need and return to it in Ch. 17.

**10.24.** ★ If an atomless κ-additive measure exists on κ, there is a σ-additive probability measure defined on every subset of \[0, 1\] and vanishing on points.

**10.25.** ★★ (Banach) Some κ ≤ 2^ℵ₀ is RVM iff Lebesgue measure extends to a σ-additive measure on all subsets of R.

## 11. Borel and analytic sets

Read: Jech Ch. 11. Work in 𝒩 or any Polish space. Needed: Σ⁰α, Π⁰α, universal set, analytic (Σ¹₁), coanalytic (Π¹₁), the Suslin operation, projective classes Σ¹ₙ, Π¹ₙ, Δ¹ₙ, tree on ω × κ, projection p\[T\], κ-Suslin set, well-founded tree and its height, Kleene–Brouwer order, WO (the set of reals coding well-orderings of ω), Borel code.

**11.1.** Σ⁰α ∪ Π⁰α ⊆ Δ⁰β for α < β. Each Σ⁰α is closed under countable unions, finite intersections and continuous preimages.

**11.2.** ★ For each α there is a Σ⁰α subset of 𝒩 × 𝒩 universal for Σ⁰α subsets of 𝒩. Hence Σ⁰α ≠ Π⁰α for every α < ω₁.

**11.3.** ★★ Every Borel set is the image of a closed subset of 𝒩 under a continuous injection.

**11.4.** The following are equivalent for A in a Polish space X: A is a continuous image of 𝒩 or empty; A is the projection of a closed subset of X × 𝒩; A is the projection of a Borel subset of X × 𝒩; A is a continuous image of a Borel set.

**11.5.** The analytic sets are closed under countable unions, countable intersections, continuous images and continuous preimages.

**11.6.** ★ A set is analytic iff it results from the Suslin operation applied to a family of closed sets indexed by finite sequences.

**11.7.** There is a universal Σ¹₁ set, and so an analytic set that is not Borel.

**11.8.** ★ (Lusin) Disjoint analytic sets are separated by a Borel set. (Suslin) Δ¹₁ equals Borel.

**11.9.** A function between Polish spaces is Borel iff its graph is Borel iff its graph is analytic.

**11.10.** ★★ (Lusin–Suslin) An injective Borel image of a Borel set is Borel.

**11.11.** ★★ Every uncountable analytic set includes a perfect set.

**11.12.** ★★ Every analytic set is Lebesgue measurable and has the Baire property.

**11.13.** A ⊆ 𝒩 is Σ¹₁ iff A = p\[T\] for a tree T on ω × ω; equivalently x ∈ A iff the section tree T(x) is ill-founded.

**11.14.** A tree on ω is well-founded iff it admits a rank function into ω₁, iff its Kleene–Brouwer order is a well-order.

**11.15.** The set of codes of linear orders of ω is closed; WO is Π¹₁; for each α < ω₁ the set of codes of order type less than α is Borel.

**11.16.** ★ (Boundedness) Every Σ¹₁ subset of WO has order types bounded below ω₁. Hence WO is not Σ¹₁, and every Π¹₁ set is a continuous preimage of WO.

**11.17.** ★ Every Π¹₁ set is a union of ℵ₁ Borel sets, and every Σ¹₁ set is an intersection of ℵ₁ Borel sets. A Π¹₁ set has cardinality at most ℵ₁ or exactly 2^ℵ₀.

**11.18.** ★★ (Kunen–Martin for Σ¹₁) A well-founded analytic relation on 𝒩 has rank below ω₁.

**11.19.** ★ Define Borel codes so that every Borel set has one. The set of Borel codes is Π¹₁, and "x belongs to the set coded by c" is both Σ¹₁ and Π¹₁ on codes.

**11.20.** Each Σ¹ₙ is closed under countable unions and intersections, continuous preimages and projection along 𝒩; there are universal Σ¹ₙ sets; the projective hierarchy is strict.

**11.21.** ★★ (Reduction) For Π¹₁ sets A, B there are disjoint Π¹₁ sets A' ⊆ A, B' ⊆ B with A' ∪ B' = A ∪ B. Rederive 11.8 from this.

**11.22.** ★ If A = p\[T\] for a tree T on ω × κ, then |A| ≤ κ or A includes a perfect set.

**11.23.** ★★ (Shoenfield) Every Σ¹₂ set is ℵ₁-Suslin.

**11.24.** Every Σ¹₂ set is a union of ℵ₁ Borel sets, and has cardinality at most ℵ₁ or includes a perfect set.

**11.25.** ★ A Bernstein set (5.7) is neither Σ¹₁ nor Π¹₁. If some Bernstein set is Σ¹₂, then CH holds.

## 12. Models of set theory

Read: Jech Ch. 12. Needed: elementary submodel, Skolem function and hull, ultraproduct and ultrapower, relativisation φ^M, absoluteness, Δ₀, Σ₁ and Π₁ formulas, reflection, elementary embedding and its critical point.

**12.1.** (Tarski–Vaught) B ⊆ A is an elementary submodel iff every formula with parameters in B that has a witness in A has one in B.

**12.2.** (Löwenheim–Skolem) Every infinite model in a countable language has an elementary submodel of each infinite size up to its own, including any prescribed subset of that size.

**12.3.** (Łoś) An ultraproduct satisfies φ at \[f\] iff φ holds at f(i) for U-almost all i. Mark the use of Choice.

**12.4.** ★ Prove the compactness theorem from 12.3.

**12.5.** The ultrapower of (ω, <) by a nonprincipal ultrafilter on ω is ill-founded. An ultrapower of a well-founded model by a σ-complete ultrafilter is well-founded.

**12.6.** ★ The ultrapower of ω by a nonprincipal ultrafilter on ω has cardinality 2^ℵ₀.

**12.7.** Δ₀ formulas are absolute for transitive classes. Σ₁ formulas go up and Π₁ formulas go down between transitive classes.

**12.8.** Write Δ₀ definitions of: x is an ordered pair; x is a function; x is transitive; x is an ordinal; x is a limit ordinal; x = ω; f is a bijection from a onto b.

**12.9.** "x is countable" is Σ₁ and "x is a cardinal" is Π₁. Give transitive M ⊆ N where each fails to be absolute, assuming such models of enough set theory exist.

**12.10.** For transitive M: Extensionality and Regularity hold; Pairing and Union hold iff M is closed under them; state and prove the criteria for Power Set, Separation and Replacement.

**12.11.** For a transitive model M of ZF: P(x)^M = P(x) ∩ M, (Vα)^M = Vα ∩ M, and "R is a well-founded relation on x" is absolute.

**12.12.** If κ is inaccessible, Vκ is a model of ZFC. Hence if ZFC is consistent it does not prove that an inaccessible exists.

**12.13.** ★ If some Vκ is a model of ZFC, the least such κ has cofinality ω. So Vκ being a model of ZFC does not make κ inaccessible.

**12.14.** ★★ (Reflection) For each formula φ and each α there is β > α such that φ is absolute between Vβ and V; the class of such β is closed unbounded.

**12.15.** ★ If ZF is consistent it is not finitely axiomatisable. The same holds for every consistent extension of ZF in the same language.

**12.16.** ★ (Tarski) There is no formula T(n) such that for every sentence σ, ZF proves σ ↔ T(⌜σ⌝). Explain why 12.14 does not contradict this.

**12.17.** ZFC proves each finite fragment of ZFC has a countable transitive model. Explain why this does not prove Con(ZFC) inside ZFC.

**12.18.** If there is a transitive set model of ZFC there is a countable one M. In it ω₁^M is a countable ordinal and P(ω)^M is countable; resolve the apparent paradox.

**12.19.** ★ If there is a transitive set model of ZFC, there is one satisfying "there is no transitive set model of ZFC".

**12.20.** ★ If ZFC is consistent it has a model whose ω is nonstandard, and such a model is not isomorphic to any transitive model.

**12.21.** The union of an elementary chain is an elementary extension of each member. Define the direct limit of a directed system of elementary embeddings and show the limit maps are elementary.

**12.22.** ★★ (Lévy) For every uncountable cardinal κ, Σ₁ formulas with parameters in Hκ are absolute between Hκ and V.

**12.23.** ★ If M is a countable elementary submodel of Hθ for regular θ > ω₁, then M ∩ ω₁ is a countable ordinal δ, every countable element of M is a subset of M, and the collapse of M sends ω₁ to δ.

**12.24.** ★ Let j: M → N be elementary between transitive models of ZFC. Then j(α) ≥ α for all ordinals α ∈ M, and if j is the identity on ordinals it is the identity.

**12.25.** ★ Let U be a κ-complete nonprincipal ultrafilter on κ. Define the ultrapower of V by U using Scott's trick; it is well-founded and set-like, so collapses to a transitive class M with an elementary j: V → M. Show j(α) = α for α < κ and j(κ) > κ.

## 13. Constructible sets

Read: Jech Ch. 13. Needed: def(M), the hierarchy Lα, Gödel operations, inner model, almost universal class, the canonical well-order of L, condensation, L\[A\] and L(A), ordinal definable (OD) and hereditarily ordinal definable (HOD) sets.

**13.1.** M ∈ def(M) ⊆ P(M); every finite subset of M is in def(M); if M is infinite and well-orderable then |def(M)| = |M|.

**13.2.** Each Lα is transitive, Lα ⊆ Lβ for α < β, Lα ∩ Ord = α, Lₙ = Vₙ for n ≤ ω, and |Lα| = |α| for infinite α.

**13.3.** L(ω+1) ≠ V(ω+1). Which subsets of ω lie in L(ω+1)?

**13.4.** ★★ Every Δ₀ formula defines a class obtainable by composing the Gödel operations (normal form theorem).

**13.5.** ★★ A transitive class that is closed under the Gödel operations and almost universal is a model of ZF.

**13.6.** ★ L is a model of ZF. Give the proof by reflection inside the Lα hierarchy as well as via 13.5.

**13.7.** The function α ↦ Lα is absolute for inner models, so L^M = L for every inner model M and L is the least inner model.

**13.8.** L satisfies V = L. Say precisely what is being asserted and why it is not trivial.

**13.9.** There is a definable well-ordering of L whose restriction to each Lα is an initial segment and is uniformly definable over Lα for limit α. Hence L satisfies AC.

**13.10.** ★★ (Condensation) There is a sentence σ such that a transitive set M satisfies σ iff M = Lδ for a limit δ. Hence if M is an elementary submodel of Lδ, δ limit, the collapse of M is some Lγ.

**13.11.** ★ If V = L then P(ωα) ⊆ L(ωα₊₁) for all α. So L satisfies GCH.

**13.12.** ★ If V = L then Hκ = Lκ for every infinite cardinal κ.

**13.13.** If κ is regular, weakly inaccessible or weakly Mahlo, then it is regular, strongly inaccessible or strongly Mahlo in L. Conclude that weak and strong inaccessibles are equiconsistent.

**13.14.** ★ If there is a transitive set model of ZFC, there is a least α with Lα a model of ZFC. Lα is countable, is included in every transitive model of ZFC, and has no proper transitive submodel of ZF.

**13.15.** Use 13.14 to explain why no inner-model argument can establish the consistency of V ≠ L.

**13.16.** ★ Either ω₁ is inaccessible in L, or there is A ⊆ ω with ω₁ of L\[A\] equal to ω₁.

**13.17.** L\[A\] is the least inner model M with A ∩ M ∈ M; it satisfies AC and V = L\[A ∩ L\[A\]\].

**13.18.** L(A) is the least inner model containing A. Every element of L(A) is definable in L(A) from ordinals, A and finitely many elements of TC({A}). L(A) satisfies AC iff TC({A}) is well-orderable in L(A).

**13.19.** L\[x\] = L(x) when x is a set of ordinals. Give A with L\[A\] ≠ L(A).

**13.20.** ★ If V = L\[A\] with A ⊆ κ, then 2^λ = λ⁺ for all λ ≥ κ. ★★ If V = L\[A\] with A ⊆ ω₁, then also 2^ℵ₀ = ℵ₁.

**13.21.** ★★ The class OD is definable by a single formula, and HOD is an inner model of ZFC.

**13.22.** ★ V = OD iff V has a well-ordering definable without parameters. Show V = HOD iff V = OD.

**13.23.** ★ (Mostowski) Σ¹₁ and Π¹₁ statements with real parameters in M are absolute between a transitive model M of ZF and V. Use 11.13 and 12.11.

**13.24.** ★★ (Shoenfield) Σ¹₂ statements with parameters in M are absolute for inner models M. Use 11.23 with the tree built inside M.

**13.25.** ★★ If V = L, the reals have a Σ¹₂ well-ordering of type ω₁, so there is a Δ¹₂ set that is not Lebesgue measurable and an uncountable Π¹₁ set with no perfect subset.

## 14. Forcing

Read: Jech Ch. 14. M is a countable transitive model of ZFC, P ∈ M a notion of forcing, B a complete Boolean algebra in M. Needed: dense, predense, generic filter, P-name and its interpretation, Boolean-valued model V^B, forcing relation, ccc, κ-closed, κ-distributive, Fn(I, J, κ) (partial functions of size less than κ), Col(κ, λ), symmetric submodel.

**14.1.** (Rasiowa–Sikorski) For countably many dense subsets of P and any p there is a filter containing p that meets them all.

**14.2.** If every condition has two incompatible extensions and G is P-generic over M, then G ∉ M.

**14.3.** A filter G is generic iff it meets every dense open set of M, iff every maximal antichain, iff every predense set.

**14.4.** If p ∈ G and D ∈ M is dense below p, then G meets D.

**14.5.** M\[G\] is transitive, contains M ∪ {G}, has the same ordinals as M, and is included in every transitive model of ZF that contains M ∪ {G}.

**14.6.** Define the canonical names for elements of M and for G and verify their interpretations.

**14.7.** ★ In V^B: ‖x = x‖ = 1, ‖x = y‖ = ‖y = x‖, ‖x = y‖·‖y = z‖ ≤ ‖x = z‖, and ‖x = y‖·‖φ(x)‖ ≤ ‖φ(y)‖.

**14.8.** ★ (Mixing and fullness) For an antichain W and names a(u), u ∈ W, some name a has u ≤ ‖a = a(u)‖ for all u. Hence for every φ there is a name a with ‖∃x φ(x)‖ = ‖φ(a)‖.

**14.9.** ★★ Every axiom of ZFC has Boolean value 1 in V^B.

**14.10.** With p ⊩ φ meaning p ≤ ‖φ‖: forcing is preserved by extension; no p forces both φ and ¬φ; every p has an extension deciding φ; p ⊩ ¬φ iff no extension forces φ; state and prove the clauses for ∧, ∨, →, ∃, ∀.

**14.11.** ★★ (Forcing theorem) M\[G\] satisfies φ iff some p ∈ G forces φ.

**14.12.** ★ M\[G\] is a model of ZFC. Do Separation, Power Set and Replacement directly from names and 14.11.

**14.13.** ★ A dense embedding of P into Q yields the same generic extensions. Apply this to P and its separative quotient, and to P and its completion.

**14.14.** ★ Every countable separative partial order in which each condition has incompatible extensions has the same completion as Fn(ω, 2, ω).

**14.15.** A Cohen real over M is not in M. In L\[G\] with G Cohen over L, V ≠ L holds. Conclude Con(ZFC) implies Con(ZFC + V ≠ L).

**14.16.** ★ If P is ccc in M and f: α → M lies in M\[G\], there is F ∈ M with f(ξ) ∈ F(ξ) and F(ξ) countable in M for all ξ. Hence ccc forcing preserves cofinalities and cardinals.

**14.17.** Fn(κ × ω, 2, ω) is ccc.

**14.18.** ★ If κ^ℵ₀ = κ in M, then forcing with Fn(κ × ω, 2, ω) gives 2^ℵ₀ = κ. Conclude Con(ZFC + 2^ℵ₀ = ℵ₂) and Con(ZFC + 2^ℵ₀ = ℵ(ω+1)), and explain the failure for ℵω.

**14.19.** If P is κ-closed, M\[G\] has no new sequences of length less than κ of elements of M, so cardinals up to κ are preserved.

**14.20.** Fn(ω₁, 2, ω₁) adds no reals and forces CH.

**14.21.** Col(ω, κ) makes κ countable and preserves all cardinals above κ when κ is infinite. What is ℵ₁ of the extension?

**14.22.** ★ For complete B the following are equivalent: B is κ-distributive; the intersection of κ open dense sets is dense; forcing with B adds no new function from κ to the ordinals.

**14.23.** ★ If π is an automorphism of P then p ⊩ φ(a) iff πp ⊩ φ(πa). If P is weakly homogeneous, every statement about elements of M has Boolean value 0 or 1, and every set of ordinals definable in M\[G\] from parameters in M lies in M.

**14.24.** ★ Write the metamathematical argument: from 12.17 and the forcing theorem, a proof of a contradiction in ZFC + ¬CH converts into one in ZFC. No countable transitive model of all of ZFC may be assumed.

**14.25.** ★★ (Cohen) Add ω Cohen reals and take the symmetric submodel for finite-support permutations of ω. It satisfies ZF, and the set of the Cohen reals is infinite but D-finite, so AC fails.

## 15. Applications of forcing

Read: Jech Ch. 15. This is the hardest chapter of the book to do by problems; expect it to take a third of Stage V. Needed: Add(κ, λ) = Fn(λ × κ, 2, κ), product forcing, Easton function and Easton product, Lévy collapse Col(λ, <κ), random forcing, Sacks (perfect tree) forcing and fusion, complete subalgebra.

**15.1.** Assume κ^<κ = κ and λ^κ = λ. Add(κ, λ) is κ-closed and κ⁺-cc, preserves all cardinals, and forces 2^κ = λ.

**15.2.** ★ (Product lemma) G × H is P × Q-generic over M iff G is P-generic over M and H is Q-generic over M\[G\].

**15.3.** ★★ If G × H is P × Q-generic over M, then M\[G\] ∩ M\[H\] = M.

**15.4.** A product of κ-closed forcings is κ-closed. The finite-support product of countably many copies of Cohen forcing is equivalent to Cohen forcing. If T is a Suslin tree (as a forcing, reversed), then T is ccc but T × T is not.

**15.5.** ★★ (Easton's lemma) If P is κ⁺-cc and Q is κ⁺-closed, then every function from κ to M in M\[G × H\] lies in M\[G\].

**15.6.** ★ From GCH, force 2^ℵ₀ = ℵ₂ together with 2^ℵ₁ = ℵ₅, preserving cardinals.

**15.7.** ★★ From GCH, force 2^ℵₙ = ℵₙ₊₂ for all n < ω with the Easton product. Then compute 2^ℵω in the extension.

**15.8.** ★ If κ is inaccessible, Col(ω, <κ) is κ-cc and forces κ = ℵ₁.

**15.9.** For regular λ < κ with κ inaccessible, Col(λ, <κ) preserves cardinals up to λ and from κ on, and forces κ = λ⁺.

**15.10.** Col(ω, <κ) factors as Col(ω, <α) × Col(ω, \[α, κ)), and every real of M\[G\] lies in M\[G↾α\] for some α < κ.

**15.11.** ★ After the Lévy collapse of an inaccessible over L, ω₁ is inaccessible in L\[x\] for every real x. Compare 13.16.

**15.12.** ★★ Forcing with countable trees ordered by end-extension adds a Suslin tree.

**15.13.** ★★ Add(ω₁, 1) forces ◇: there are Aα ⊆ α such that for every X ⊆ ω₁ the set of α with X ∩ α = Aα is stationary. Show ◇ implies CH.

**15.14.** ★ Random forcing (Borel sets of positive measure) is ccc. The generic real lies in every measure-one Borel set coded in M and in no null one.

**15.15.** ★★ A Cohen real yields a function in ω^ω not dominated by any ground-model function. After adding a random real, every function in ω^ω is dominated by a ground-model one. Conclude the two forcings are not equivalent.

**15.16.** ★★ After adding a Cohen real, the set of ground-model reals has measure zero.

**15.17.** ★★ (Sacks) State and prove the fusion lemma for perfect trees. Deduce that perfect-tree forcing preserves ω₁.

**15.18.** ★★ If s is Sacks-generic over M and x ∈ M\[s\] is a set of ordinals not in M, then s ∈ M\[x\].

**15.19.** ★★ If M ⊆ N ⊆ M\[G\] with N a model of ZFC, then N = M\[G ∩ D\] for some complete subalgebra D of B. If A ∈ M\[G\] is a set of ordinals, M\[A\] is a generic extension of M.

**15.20.** ★ A Cohen real c splits into two mutually generic Cohen reals. So the models between M and M\[c\] are not linearly ordered by inclusion. Contrast 15.18.

**15.21.** ★ Any function F giving 2^κ = F(κ) on regular cardinals is nondecreasing with cf F(κ) > κ. In an Easton product extension of a model of GCH, SCH holds.

**15.22.** Every countable transitive model has generic extensions satisfying CH and ones satisfying ¬CH, with the same reals in the first case.

**15.23.** ★ If P is ccc, every club subset of ω₁ in M\[G\] includes a club in M. If P is ω₁-closed, stationary subsets of ω₁ in M remain stationary. Find a forcing that destroys a given stationary co-stationary set while preserving ω₁, or see 15.24.

**15.24.** ★★ For stationary S ⊆ ω₁, the closed countable subsets of S ordered by end-extension add a club inside S, add no new countable sequences of ordinals, and preserve ω₁.

**15.25.** ★★ (Easton) In a model of GCH let F be a set function on regular cardinals, nondecreasing with cf F(κ) > κ. The Easton product preserves cardinals and forces 2^κ = F(κ) on dom F. List what must be added to handle a proper class of cardinals.

## 16. Iterated forcing and Martin's Axiom

Read: Jech Ch. 16. Needed: two-step iteration P ∗ Q, complete embedding, finite-support (FS) iteration, direct limit, Knaster property (every uncountable set of conditions has an uncountable pairwise compatible subset), MA(κ): for every ccc P and κ dense sets there is a filter meeting them all; MA means MA(κ) for all κ < 2^ℵ₀.

**16.1.** P ∗ Q is a partial order, and p ↦ (p, 1) embeds P completely.

**16.2.** ★ If G is P-generic over M and H is Q^G-generic over M\[G\], then G ∗ H is P ∗ Q-generic over M, and every P ∗ Q-generic filter has this form.

**16.3.** ★ P ∗ Q is ccc iff P is ccc and P forces that Q is ccc.

**16.4.** If P is κ-closed and forces Q to be κ-closed, then P ∗ Q is κ-closed.

**16.5.** P × Q is isomorphic to a dense subset of P ∗ Q̌. Give ccc P, Q in M such that Q is not ccc in M\[G\], assuming a Suslin tree in M.

**16.6.** ★★ If D is a complete subalgebra of B, then B is isomorphic to D ∗ (B : G), the iteration of D with the quotient of B by the generic filter on D.

**16.7.** In an FS iteration, Pα embeds completely in Pβ for α < β, and Pβ is the direct limit of the earlier stages at limit β.

**16.8.** ★★ An FS iteration of ccc forcings is ccc.

**16.9.** ★ In a ccc FS iteration of length λ with cf λ > ω, every real of the final model appears at an earlier stage. ★★ At limit stages of cofinality ω an FS iteration of nontrivial forcings adds a Cohen real.

**16.10.** ★ The finite-support product of ω copies of Fn(ω₁, 2, ω₁) collapses ω₁. Why does this not contradict 16.8?

**16.11.** MA(ℵ₀) is a theorem. MA(2^ℵ₀) is false. MA(κ) implies κ < 2^ℵ₀.

**16.12.** The statement of MA(ℵ₁) with "ccc" deleted is false.

**16.13.** ★ MA(κ) is equivalent to its restriction to ccc partial orders of cardinality at most κ.

**16.14.** ★ MA(ℵ₁) implies every ccc partial order has the Knaster property. Hence under MA(ℵ₁) a product of ccc partial orders is ccc.

**16.15.** ★ MA(ℵ₁) implies there is no Suslin tree.

**16.16.** ★ Assume MA. Every family of fewer than 2^ℵ₀ infinite subsets of ω with the strong finite intersection property has an infinite pseudo-intersection, and every family of fewer than 2^ℵ₀ functions in ω^ω is eventually dominated by one function.

**16.17.** ★★ Assume MA. Then 2^κ = 2^ℵ₀ for every infinite κ < 2^ℵ₀, so 2^ℵ₀ is regular. Use almost disjoint coding.

**16.18.** ★★ Assume MA. The union of fewer than 2^ℵ₀ null sets is null, and the union of fewer than 2^ℵ₀ meager sets is meager.

**16.19.** ★ MA(ℵ₁) implies every Σ¹₂ set is Lebesgue measurable and has the Baire property. Use 11.24.

**16.20.** ★ MA implies there is a Ramsey ultrafilter on ω. Compare 7.9.

**16.21.** ★★ MA(ℵ₁) implies every Aronszajn tree is special.

**16.22.** ★★ Let κ be regular uncountable and (Pα : α ≤ κ) an iteration in which each Pα, α < κ, is κ-cc and direct limits are taken at stationary many α < κ and at κ. Then Pκ is κ-cc.

**16.23.** ★ After adding ℵ₂ Cohen reals to a model of CH, there is a non-meager set of reals of size ℵ₁, so MA(ℵ₁) fails although CH fails.

**16.24.** Assemble from 15.12, 16.15 and 16.25: Suslin's hypothesis is independent of ZFC, and of ZFC + ¬CH.

**16.25.** ★★ (Solovay–Tennenbaum) If κ > ℵ₁ is regular and 2^<κ = κ, there is a ccc forcing of size κ forcing MA and 2^ℵ₀ = κ. Write out the bookkeeping.

## 17. Large cardinals

Read: Jech Ch. 17. Needed: the ultrapower embedding j: V → M = Ult(V, U), the infinitary language L(κ, κ), Π^m\_n-indescribable, the arrow κ → (α)^<ω, Erdős, Ramsey, Rowbottom and Jónsson cardinals, indiscernibles, the Mitchell order. U is a κ-complete nonprincipal ultrafilter on κ.

**17.1.** For j: V → M = Ult(V, U): the critical point is κ; M is closed under κ-sequences; U ∉ M; 2^κ ≤ (2^κ)^M < j(κ) < (2^κ)⁺.

**17.2.** U is normal iff the identity represents κ. For normal U, M = {j(f)(κ) : f a function on κ}, and M satisfies φ(κ) iff {α : φ(α)} ∈ U.

**17.3.** If j: V → N is elementary with critical point κ, then D = {X ⊆ κ : κ ∈ j(X)} is a normal measure, and j factors as k ∘ j\_D with k elementary and k(κ) = κ.

**17.4.** If U is normal then the weakly compact cardinals below κ form a set in U. This completes 10.23.

**17.5.** ★ (Scott) If there is a measurable cardinal then V ≠ L.

**17.6.** If κ is measurable and 2^κ > κ⁺, then 2^α > α⁺ for a set of α in every normal measure. Redo 10.20 this way.

**17.7.** ★ For j = j\_U and a cardinal λ > κ: j(λ) > λ if cf λ = κ; j(λ) = λ if λ is a strong limit with cf λ ≠ κ. What can you say about j(κ⁺)?

**17.8.** ★ j(U) is a normal measure on j(κ) in M. The ultrapower of M by j(U), composed with j, equals the ultrapower of V by U ⊗ U of 10.17.

**17.9.** ★★ (Mitchell) For normal measures on κ put U ◁ W iff U ∈ Ult(V, W). This relation is well-founded, and each W has at most 2^κ predecessors.

**17.10.** ★★ If κ is inaccessible with the tree property, then L(κ, κ) is weakly compact: a set of at most κ sentences has a model if every subset of size less than κ does. Prove the converse too.

**17.11.** ★ κ is weakly compact iff κ is inaccessible and for every A ⊆ Vκ the structure (Vκ, ∈, A) has a transitive elementary extension (X, ∈, A') with κ ∈ X.

**17.12.** ★★ (Hanf–Scott) κ is weakly compact iff it is Π¹₁-indescribable.

**17.13.** If κ is weakly compact, every stationary subset of κ reflects, and the Mahlo cardinals below κ are stationary.

**17.14.** ★ κ is inaccessible iff it is Π¹₀-indescribable iff it is Σ¹₁-indescribable.

**17.15.** ★ Every measurable cardinal is Π²₁-indescribable. The least measurable is Σ²₁-describable.

**17.16.** ★ If κ → (α)^<ω with α a limit ordinal, then κ → (α)^<ω with 2^ℵ₀ colours. Hence such κ exceeds 2^ℵ₀.

**17.17.** ★★ (Silver) If κ → (α)^<ω with α < ω₁ of L, then the same holds in L.

**17.18.** Measurable implies Ramsey implies weakly compact, and a normal measure on κ contains the set of Ramsey cardinals below κ.

**17.19.** If κ is Ramsey, every structure in a countable language whose universe includes κ has a set of indiscernibles of size κ.

**17.20.** ★★ A Ramsey cardinal is Rowbottom: every structure of size κ in a countable language with a distinguished predicate of size less than κ has an elementary substructure of size κ meeting the predicate in a countable set. A Rowbottom cardinal is Jónsson.

**17.21.** ★★ (Rowbottom) If there is a Rowbottom cardinal, then only countably many reals are constructible.

**17.22.** ★★ ℵₙ is not Jónsson for any n < ω.

**17.23.** ★★ κ is weakly compact iff κ^<κ = κ and every transitive model M of ZFC minus Power Set with |M| = κ, κ ∈ M and M closed under sequences shorter than κ admits an elementary j: M → N with critical point κ, N transitive.

**17.24.** ★★ (Erdős–Hajnal) For every infinite λ there is F: \[λ\]^ω → λ such that F maps \[A\]^ω onto λ for every A ⊆ λ of size λ.

**17.25.** ★★ (Kunen) There is no nontrivial elementary j: V → V. More precisely, if j: V → M has critical point κ and λ is the supremum of the iterates jⁿ(κ), then the pointwise image {j(α) : α < λ} is not in M.

## 18. Large cardinals and L

Read: Jech Ch. 18. Needed: Ehrenfeucht–Mostowski (EM) set, the (Σ, α)-model, well-founded and remarkable EM sets, Silver indiscernibles, 0# and x#, Jensen's covering theorem (statement), Chang's conjecture. The covering theorem itself is quoted, not proved.

**18.1.** ★ For an EM set Σ and each ordinal α there is, up to isomorphism, a unique model of Σ generated by a set of indiscernibles of order type α.

**18.2.** ★ The (Σ, α)-model is well-founded for all α iff it is well-founded for all α < ω₁.

**18.3.** ★★ If Σ is well-founded and remarkable, then for every uncountable cardinal κ the (Σ, κ)-model is Lκ and its generating indiscernibles are closed unbounded in κ.

**18.4.** ★★ There is at most one well-founded remarkable EM set. Call it 0# when it exists.

**18.5.** ★★ If κ → (ω₁)^<ω, in particular if there is a Ramsey cardinal, then 0# exists.

**18.6.** ★ Assume 0# exists. Every uncountable cardinal is a Silver indiscernible, and Lκ is an elementary submodel of Lλ and of L for uncountable cardinals κ < λ.

**18.7.** Assume 0# exists. Every constructible set is definable in L from finitely many Silver indiscernibles, every constructible real is definable in L(ℵω) from finitely many ℵₙ, and only countably many reals are constructible.

**18.8.** ★ Assume 0# exists. Every uncountable cardinal of V is inaccessible, Mahlo and weakly compact in L.

**18.9.** ★ Assume 0# exists. Then |Vα ∩ L| ≤ |α| for infinite α, and the successor of κ in L is below κ⁺ for every infinite cardinal κ.

**18.10.** ★ 0#, coded as a subset of ω, is not in L, and from it one defines truth in L. Reconcile with 12.16.

**18.11.** ★★ The singleton {0#} is a Π¹₂ set of reals.

**18.12.** ★ 0# exists iff for some limit δ the structure Lδ has an uncountable set of indiscernibles.

**18.13.** ★ Assume 0# exists. Every order-preserving map of the Silver indiscernibles into themselves extends uniquely to an elementary j: L → L, and every Silver indiscernible is the critical point of such a j.

**18.14.** If j: L → L is elementary and nontrivial, its critical point is inaccessible in L and is not definable in L without parameters.

**18.15.** ★★ (Kunen) If j: Lα → Lβ is elementary with α, β limit and critical point below |α|, then 0# exists. Hence 0# exists iff there is a nontrivial elementary j: L → L.

**18.16.** ★ Set forcing cannot add 0#: if 0# is in M\[G\] it is in M. Use 15.3 and 18.4.

**18.17.** Relativise: define x# for x ⊆ ω. If a Ramsey cardinal exists, x# exists for every real x, and then ω₁ is inaccessible in every L\[x\].

**18.18.** ★★ If there is a Jónsson cardinal, then 0# exists.

**18.19.** ★★ Chang's conjecture (every model of type (ℵ₂, ℵ₁) in a countable language has an elementary submodel of type (ℵ₁, ℵ₀)) implies 0# exists.

**18.20.** ★ Assume 0# does not exist and quote covering. If λ is a singular cardinal then λ is singular in L and the successor of λ in L is λ⁺.

**18.21.** ★ If 0# does not exist then SCH holds.

**18.22.** ★ If 0# does not exist and κ ≥ ω₂ is a regular cardinal of L, then cf κ = |κ|.

**18.23.** Assume 0# does not exist. Any set forcing that preserves cardinals preserves the regularity of every regular cardinal κ ≥ ω₂.

**18.24.** Assume 0# exists. For every forcing P ∈ L that is countable in V there is a filter in V that is P-generic over L. Give three examples of such P.

**18.25.** ★ Assemble: the following are equivalent. (a) 0# exists. (b) ℵω is regular in L. (c) Some uncountable set of ordinals is not covered by a constructible set of the same cardinality. (d) There is a nontrivial elementary j: L → L.

## 19. Iterated ultrapowers and L\[U\]

Read: Jech Ch. 19. U is a normal measure on κ. Needed: L\[U\], the iterated ultrapowers Mα = Ult^(α)(V, U) with embeddings i(α, β), the images κ^(α) and U^(α), M-ultrafilter, the club filter Fλ on λ, Rudin–Keisler equivalence.

**19.1.** In L\[U\], the set U ∩ L\[U\] is a normal measure on κ. So L\[U\] is a model of "V = L\[D\] for a normal measure D".

**19.2.** In L\[U\]: 0# exists, and 2^λ = λ⁺ for all λ ≥ κ. Use 13.20.

**19.3.** ★ Define Mα and i(α, β) by recursion with direct limits at limit stages. Show Mβ ⊆ Mα for α < β and that i(α, α + γ) is the γ-th iterated ultrapower embedding of Mα by U^(α), computed inside Mα.

**19.4.** ★★ (Gaifman) Every Mα is well-founded.

**19.5.** The sequence κ^(α) is normal; i(α, β) has critical point κ^(α); and |κ^(α)| ≤ 2^κ · |α|.

**19.6.** ★ Every element of Mₙ has the form i(0, n)(f)(κ^(0), …, κ^(n−1)), and Mₙ is the ultrapower of V by the n-fold product of U.

**19.7.** ★ For limit λ and X ∈ Mλ with X ⊆ κ^(λ): X ∈ U^(λ) iff X contains {κ^(γ) : α ≤ γ < λ} for some α < λ.

**19.8.** ★ If λ > 2^κ is a cardinal then κ^(λ) = λ. If ν is a strong limit cardinal with cf ν > κ and α < ν, then i(0, α)(ν) = ν.

**19.9.** ★ For regular λ > 2^κ, U^(λ) = Fλ ∩ Mλ.

**19.10.** ★★ Let M be a transitive model of ZFC minus Power Set and W an M-ultrafilter such that every countable subfamily of W has nonempty intersection. Then all iterated ultrapowers of (M, W) are well-founded.

**19.11.** ★ The iteration of L\[U\] by U ∩ L\[U\] is the restriction of the iteration of V by U: its α-th model is L\[U^(α)\] and its maps are the restrictions of the i(0, α).

**19.12.** ★★ For regular λ > 2^κ, L\[U^(λ)\] = L\[Fλ\]. So the λ-th iterate of L\[U\] depends only on λ.

**19.13.** ★★ Assume V = L\[D\] with D normal on κ, let A be a set of ordinals of size at least κ⁺, and let θ be a cardinal with D ∈ Lθ\[D\] and A ⊆ θ. Then every subset of κ is in the Skolem hull of κ ∪ A in Lθ\[D\].

**19.14.** ★★ (Kunen) If V = L\[D\] with D a normal measure on κ, then D is the only normal measure on κ.

**19.15.** ★★ (Kunen) If V = L\[D\] with D a normal measure on κ, then κ is the only measurable cardinal.

**19.16.** ★★ (Silver) If V = L\[D\] with D a normal measure on κ, then GCH holds, including below κ.

**19.17.** ★★ (Kunen) If D and W are such that L\[D\] and L\[W\] each satisfy "my predicate is a normal measure on κ" for the same κ, then L\[D\] = L\[W\] and D ∩ L\[D\] = W ∩ L\[W\].

**19.18.** ★★ If L\[D\] and L\[W\] are such models for κ < λ respectively, then L\[W\] is an iterated ultrapower of L\[D\].

**19.19.** ★ If normal measures satisfy U ◁ W in the Mitchell order of 17.9, then W contains the set of measurable cardinals below κ. In L\[U\] no normal measure contains that set.

**19.20.** ★★ In L\[U\], every κ-complete nonprincipal ultrafilter on κ is Rudin–Keisler equivalent to a finite product of U with itself.

**19.21.** ★★ (Silver) In L\[U\] the reals have a Δ¹₃ well-ordering.

**19.22.** ★ If κ₀ < κ₁ carry normal measures U₀, U₁, then in L\[U₀, U₁\] both remain measurable.

**19.23.** ★★ (Bukovský, Dehornoy) The sequence (κ^(n) : n < ω) is not in Mω, and Mω with this sequence adjoined equals the intersection of the Mₙ.

**19.24.** ★ Assume V = L\[U\]. The inner models of the form L\[W\] satisfying "W is a normal measure on some ordinal" are exactly the iterates of V, and they are linearly ordered by inclusion.

**19.25.** ★ If κ < λ are both measurable, with U on κ and W on λ, then j\_W restricts to a nontrivial elementary embedding of L\[U\] into itself with critical point λ. Deduce V ≠ L\[U\] without using 19.15.

## 20. Very large cardinals

Read: Jech Ch. 20. Needed: Pκ(λ), fine measure, normal fine measure, λ-strongly compact and strongly compact, λ-supercompact and supercompact, Laver function, strong cardinal, (κ, λ)-extender, extendible, huge, Vopěnka's principle (VP).

**20.1.** ★ Every κ-complete filter on every set extends to a κ-complete ultrafilter iff Pκ(λ) carries a fine measure for every λ ≥ κ.

**20.2.** ★★ κ is strongly compact iff the language L(κ, κ) satisfies the full compactness theorem: a set of sentences has a model whenever every subset of size less than κ does.

**20.3.** ★ Pκ(λ) carries a fine measure iff there is j: V → M with critical point κ such that every X ⊆ M with |X| ≤ λ is included in some Y ∈ M with |Y| < j(κ) in M.

**20.4.** A strongly compact κ is measurable, and every regular λ ≥ κ carries a uniform κ-complete ultrafilter.

**20.5.** ★★ (Solovay) If κ is strongly compact and λ ≥ κ is regular, then λ^<κ = λ.

**20.6.** ★★ (Solovay) SCH holds above a strongly compact cardinal.

**20.7.** ★ If κ is strongly compact and λ > κ is regular, every stationary subset of E(λ, ω) reflects at some α < λ.

**20.8.** ★ If a strongly compact cardinal exists, then V ≠ L\[A\] for every set A.

**20.9.** ★ Pκ(λ) carries a normal fine measure iff there is j: V → M with critical point κ, j(κ) > λ, and M closed under λ-sequences.

**20.10.** ★ A fine measure U on Pκ(λ) is normal iff the identity represents the pointwise image of λ under j\_U. A normal fine measure contains every club subset of Pκ(λ), and every choice function f(x) ∈ x is constant on a set in it.

**20.11.** For the ultrapower by a normal fine measure U on Pκ(λ): U ∉ M, and with μ = λ^<κ we have 2^μ ≤ (2^μ)^M < j(κ) < (2^μ)⁺.

**20.12.** ★ For κ ≤ μ < λ, a normal fine measure on Pκ(λ) projects to one on Pκ(μ), and the two ultrapower embeddings commute with an elementary k whose critical point is above μ.

**20.13.** ★★ If κ is 2^κ-supercompact, there is a normal measure on κ containing the set of measurable cardinals below κ, and κ carries 2^(2^κ) normal measures.

**20.14.** ★ If κ is supercompact and GCH holds below κ, then GCH holds everywhere.

**20.15.** ★★ If κ is supercompact then Vκ is a Σ₂-elementary submodel of V.

**20.16.** ★★ (Menas) A measurable limit of strongly compact cardinals is strongly compact. The least such cardinal is not 2^κ-supercompact.

**20.17.** ★★ (Laver) If κ is supercompact there is f: κ → Vκ such that for every x and every λ ≥ |TC(x)| some normal fine measure U on Pκ(λ) has j\_U(f)(κ) = x.

**20.18.** ★ From j: V → M with critical point κ derive the (κ, λ)-extender E. Then Ult(V, E) is well-founded and j factors through it by a map that is the identity on λ.

**20.19.** ★ κ is strong iff for every λ there is an extender E with critical point κ and Vλ ⊆ Ult(V, E).

**20.20.** ★ A supercompact cardinal is strong and is a limit of strong cardinals. A strong cardinal κ has Vκ Σ₂-elementary in V.

**20.21.** ★★ Every extendible cardinal is supercompact.

**20.22.** ★★ Vopěnka's principle implies there is an extendible cardinal.

**20.23.** ★ κ is huge with target λ iff there is a κ-complete normal fine ultrafilter on the set of subsets of λ of order type κ.

**20.24.** ★★ If κ is huge then VP holds in Vκ. If a huge cardinal and a supercompact cardinal both exist, the least huge is below the least supercompact.

**20.25.** ★★ Synthesis. For measurable, strong, strongly compact, supercompact, extendible, VP and huge: draw the diagram of direct implications and the diagram of consistency strength, prove every arrow available from this book, and list the comparisons between least instances that ZFC does not decide.

## Where to check your work

These statements were written from memory of the standard literature, without the book open, and nothing here was machine-checked. If a problem resists for a week, suspect the statement and compare it with the source below before spending more time. No links are given because none were opened.

| Chapters | First place to look | Second |
| --- | --- | --- |
| 1–6 | Jech, same chapter (theorems and exercise hints) | Komjáth and Totik, *Problems and Theorems in Classical Set Theory* (full solutions) |
| 2, 3, 5 | Komjáth and Totik | Jech, *The Axiom of Choice*, for the ZF problems |
| 4, 11 | Kechris, *Classical Descriptive Set Theory* | Moschovakis, *Descriptive Set Theory* |
| 7–9 | Jech, same chapter | Kunen, *Set Theory* (2011), Ch. III; Halbeisen, *Combinatorial Set Theory* |
| 10, 17 | Kanamori, *The Higher Infinite*, Ch. 1–2 | Jech, same chapter |
| 12–13 | Kunen (2011), Ch. I–II; Devlin, *Constructibility* | Jech, same chapter |
| 14–16 | Kunen (2011), Ch. IV–V | Jech, same chapter; Bell, *Set Theory: Boolean-Valued Models and Independence Proofs* |
| 18–19 | Kanamori, Ch. 2 (§9) and Ch. 4 (§§19–20) | Jech, same chapter |
| 20 | Kanamori, Ch. 5 | Solovay, Reinhardt and Kanamori, "Strong axioms of infinity and elementary embeddings" |

Problems that reach past Ch. 1–20 of Jech, with the chapter where he treats them: 13.23–13.25 and 18.11 (Ch. 25), 15.24 (Ch. 23), 15.15–15.16 (Ch. 26). Skip them on a first pass if time is short.
