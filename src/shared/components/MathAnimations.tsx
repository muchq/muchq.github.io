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

      {/* The First Isomorphism Theorem, spiraling around the page: the way into the group theory course. */}
      <div className={styles.spiral}>
        <div className={styles.arm}>
          <Link to="/groups" className={styles.groupsLink} aria-label="Group theory course" title="Group theory: a first course">
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
    </>
  )
}

export default MathAnimations