import { Link } from 'react-router-dom'
import { CHAPTERS } from '../chapters'
import { useGroupsProgress } from '../progress'
import styles from './Groups.module.css'

const Overview = () => {
  const { solved } = useGroupsProgress()
  const total = CHAPTERS.reduce((n, c) => n + c.problems.length, 0)
  const done = CHAPTERS.reduce((n, c) => n + c.problems.filter(p => solved.has(p.id)).length, 0)

  return (
    <article className={styles.card}>
      <h1>Group theory</h1>
      <p className={styles.chapterSummary}>A first course, with proofs, problems, and a lab</p>
      <p>
        This is a one-semester undergraduate course in group theory: from the axioms through Lagrange, quotients and the
        isomorphism theorems, the classification of finite abelian groups, group actions, and the Sylow theorems, ending with
        simple and solvable groups. Each chapter has definitions, theorems with proofs, worked examples, and a problem set.
      </p>

      <section className={styles.section}>
        <h2>How to use it</h2>
        <ul>
          <li>
            <strong>Proofs are folded.</strong> Try to see why a theorem is true before opening its proof.
          </li>
          <li>
            <strong>Compute problems</strong> check your answer. Permutations are compared as permutations, so (2 3 1) counts
            as (1 2 3); sets in any order are fine.
          </li>
          <li>
            <strong>Proof problems</strong> are for paper. Write a proof, then compare with the model solution and mark the
            problem done. Hints come before solutions.
          </li>
          <li>
            <strong>Drills</strong> make unlimited fresh computations — orders, products, counts — for the routine skills.
          </li>
          <li>
            <strong>The lab</strong> computes the Cayley table, subgroups, cosets, quotients, and conjugacy classes of about
            thirty small groups. Use it to check examples and to find counterexamples.
          </li>
        </ul>
        <p>
          Progress is kept in this browser: {done} of {total} problems done.
        </p>
      </section>

      <section className={styles.section}>
        <h2>Chapters</h2>
        <ol className={styles.chapterGrid}>
          {CHAPTERS.map(c => (
            <li key={c.slug}>
              <Link className={styles.chapterCard} to={`/groups/${c.slug}`}>
                <h3>
                  {c.number}. {c.title}
                </h3>
                <p>{c.summary}</p>
                <span className={styles.tag}>
                  {c.problems.filter(p => solved.has(p.id)).length}/{c.problems.length} problems
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link className={styles.chapterCard} to="/groups/lab">
              <h3>The lab</h3>
              <p>Every group in the catalog, with its table, subgroups, cosets, quotients, and classes.</p>
            </Link>
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2>Before you start</h2>
        <p>
          You need sets and functions (injective, surjective, bijective), equivalence relations, induction, and arithmetic
          mod n, including gcd and Bézout's identity. The <Link to="/sets">sets course</Link> covers the first three.
        </p>
        <p>Conventions: Dₙ is the symmetry group of the n-gon, of order 2n. Permutations compose right to left: στ means τ first.</p>
      </section>

      <section className={styles.section}>
        <h2>References</h2>
        <ul>
          <li>Thomas W. Judson, <em>Abstract Algebra: Theory and Applications</em> — free and open, closest in order to this course.</li>
          <li>Joseph A. Gallian, <em>Contemporary Abstract Algebra</em> — many more exercises at this level.</li>
          <li>David S. Dummit and Richard M. Foote, <em>Abstract Algebra</em> — the standard next step.</li>
          <li>Michael Artin, <em>Algebra</em> — groups through symmetry and linear algebra.</li>
        </ul>
      </section>
    </article>
  )
}

export default Overview
