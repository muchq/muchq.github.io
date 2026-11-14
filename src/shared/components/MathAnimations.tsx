import { Link } from 'react-router-dom'
import styles from './MathAnimations.module.css'

const MathAnimations = () => {
  return (
    <>
      <p>
        <math className={styles.third}>
          <mfrac>
            <mn>1</mn>
            <mn>π</mn>
          </mfrac>
        </math>
      </p>
      
      <math className={styles.fffo}>
        <mi>∀A</mi>
        <mo>∊</mo>
        <mi>𝔰𝔩(n,𝔽)</mi>
        <mspace></mspace>
        <mo>,</mo>
        <mspace></mspace>
        <mi>TrA</mi>
        <mo>=</mo>
        <mi>0</mi>
      </math>
      
      <math className={styles.julia}>
        <semantics>
          <mrow>
            <msub>
              <mi>z</mi>
              <mrow>
                <mi>n</mi>
                <mo stretchy="false">+</mo>
                <mn>1</mn>
              </mrow>
            </msub>
            <mo stretchy="false">=</mo>
            <mrow>
              <msubsup>
                <mi>z</mi>
                <mi>n</mi>
                <mn>2</mn>
              </msubsup>
              <mo stretchy="false">+</mo>
              <mi>c</mi>
            </mrow>
          </mrow>
        </semantics>
      </math>

      {/* Keyboard focus pauses the courses for navigation; pointer hover keeps them moving. */}
      <div className={styles.courses}>
        <div className={styles.chessFloat}>
          <Link to="/games?play=chess" className={`${styles.pill} ${styles.chessLink}`} aria-label="Play chess" title="Play chess">
            <span aria-hidden="true">
              <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 38c0-8 4-13 11-18l-7 3-5-1-3-5L20 8l1-5 5 4c11 2 15 12 12 23l-2 8M20 8l6 3M23 20c4-3 6-5 6-8M12 38h24l3 6H9l3-6Z" />
                <circle cx="20" cy="14" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </Link>
        </div>
        <div className={styles.setsOrbit}>
          <Link to="/sets" className={`${styles.pill} ${styles.setsLink}`} aria-label="Set theory problem curriculum" title="Set theory: 500 problems">
            <math><mi>|A|</mi><mo>&lt;</mo><mi>|𝒫(A)|</mi></math>
          </Link>
        </div>
        {/* The First Isomorphism Theorem, spiraling around the page: the way into the group theory course. */}
        <div className={styles.spiral}>
          <div className={styles.arm}>
            <Link
              to="/groups"
              className={`${styles.pill} ${styles.groupsLink}`}
              aria-label="Group theory course"
              title="Group theory: a first course"
            >
              <math>
                <mi>G</mi>
                <mo>/</mo>
                <mrow>
                  <mi>ker</mi>
                  <mo rspace="0.2em">⁡</mo>
                  <mi>φ</mi>
                </mrow>
                <mo>≅</mo>
                <mrow>
                  <mi>im</mi>
                  <mo rspace="0.2em">⁡</mo>
                  <mi>φ</mi>
                </mrow>
              </math>
            </Link>
          </div>
        </div>

        {/*
          π₁(S¹) ≅ ℤ going around the circle, counterclockwise: a loop that
          generates the very group it names. The way into the proofs course.
        */}
        <div className={styles.orbit}>
          <div className={styles.orbitArm}>
            <Link
              to="/proofs"
              className={`${styles.pill} ${styles.proofsLink}`}
              aria-label="Algebra and topology, by proof"
              title="Algebra and topology, by proof"
            >
              <math>
                <msub>
                  <mi>π</mi>
                  <mn>1</mn>
                </msub>
                <mo>(</mo>
                <msup>
                  <mi>S</mi>
                  <mn>1</mn>
                </msup>
                <mo>)</mo>
                <mo>≅</mo>
                <mi>ℤ</mi>
              </math>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default MathAnimations
