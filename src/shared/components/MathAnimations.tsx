import { Link } from 'react-router-dom'
import styles from './MathAnimations.module.css'

const wordLadder = ['COLD', 'CORD', 'CARD']

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
            <span aria-hidden="true">♘</span>
          </Link>
        </div>
        <div className={styles.wordchainFloat}>
          <Link
            to="/games?play=wordchain"
            className={`${styles.pill} ${styles.wordchainLink}`}
            aria-label="Wordchains quick race"
            title="Wordchains: find an opponent for a quick race"
          >
            <span className={styles.wordLadder} aria-hidden="true">
              {wordLadder.map((word, rung) => (
                <span key={word} className={styles.wordRung} data-word={word}>
                  {[...word].map((letter, index) => (
                    <span key={index} className={rung > 0 && wordLadder[rung - 1][index] !== letter ? styles.changedLetter : undefined}>
                      {letter}
                    </span>
                  ))}
                </span>
              ))}
            </span>
            <span className={styles.raceLabel}>Quick race</span>
          </Link>
        </div>
        <div className={styles.setsBob}>
          <Link to="/sets" className={`${styles.pill} ${styles.setsLink}`} aria-label="Set theory problem curriculum" title="Set theory: 500 problems">
            <math><mi>|A|</mi><mo>&lt;</mo><mi>|𝒫(A)|</mi></math>
          </Link>
        </div>
        {/* The First Isomorphism Theorem: the way into the group theory course. */}
        <div className={styles.groupsBob}>
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

        {/* π₁(S¹) ≅ ℤ: the way into the proofs course. */}
        <div className={styles.proofsBob}>
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
    </>
  )
}

export default MathAnimations
