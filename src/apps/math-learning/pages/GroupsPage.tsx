import GroupsNavigation from '../components/GroupsNavigation'
import PermutationVisualizer from '../components/PermutationVisualizer'
import CycleDecomposer from '../components/CycleDecomposer'
import PermutationQuiz from '../components/PermutationQuiz'
import SignCalculator from '../components/SignCalculator'
import { useGroupsLearning } from '@/hooks/useGroupsLearning'
import styles from './GroupsPage.module.css'

const GroupsPage = () => {
  const {
    activeTab,
    setActiveTab,
    markComplete,
    isCompleted
  } = useGroupsLearning()

  return (
    <div className={styles.groupsPage}>
      <GroupsNavigation />
      
      <main className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Permutation Groups</h1>
          <p className={styles.subtitle}>Interactive Learning Module</p>
        </header>

        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'chapter1' ? styles.active : ''} ${
              isCompleted('chapter1') ? styles.completed : ''
            }`}
            onClick={() => setActiveTab('chapter1')}
          >
            Ch 1: Foundations
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'chapter2' ? styles.active : ''} ${
              isCompleted('chapter2') ? styles.completed : ''
            }`}
            onClick={() => setActiveTab('chapter2')}
          >
            Ch 2: Cycles
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'chapter3' ? styles.active : ''} ${
              isCompleted('chapter3') ? styles.completed : ''
            }`}
            onClick={() => setActiveTab('chapter3')}
          >
            Ch 3: Properties
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'chapter4' ? styles.active : ''} ${
              isCompleted('chapter4') ? styles.completed : ''
            }`}
            onClick={() => setActiveTab('chapter4')}
          >
            Ch 4: Special Topics
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'chapter5' ? styles.active : ''} ${
              isCompleted('chapter5') ? styles.completed : ''
            }`}
            onClick={() => setActiveTab('chapter5')}
          >
            Ch 5: Advanced
          </button>
        </nav>

        <div className={styles.tabContent}>
          {activeTab === 'overview' && (
            <div className={styles.overview}>
              <section className={styles.section}>
                <h2>Welcome to Permutation Groups</h2>
                <p className={styles.lead}>
                  An interactive journey through one of the most fundamental structures in abstract algebra.
                  This module combines visualization, hands-on manipulation, and formal proofs to build
                  deep understanding of permutation groups.
                </p>
              </section>

              <section className={styles.section}>
                <h3>Learning Objectives</h3>
                <ul className={styles.objectives}>
                  <li>Understand permutations as bijective functions</li>
                  <li>Master cycle notation and permutation composition</li>
                  <li>Prove fundamental theorems about symmetric groups</li>
                  <li>Apply permutation groups to solve problems</li>
                  <li>Develop intuition through visual manipulation</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h3>Course Structure</h3>
                <div className={styles.chapters}>
                  <div className={`${styles.chapterCard} ${isCompleted('chapter1') ? styles.completedCard : ''}`}>
                    <h4>Chapter 1: Foundations</h4>
                    <p>Introduction to permutations, two-line notation, composition, and the symmetric group S<sub>n</sub></p>
                    {isCompleted('chapter1') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.chapterCard} ${isCompleted('chapter2') ? styles.completedCard : ''}`}>
                    <h4>Chapter 2: Cycle Notation</h4>
                    <p>Disjoint cycle decomposition, transpositions, and cycle structure</p>
                    {isCompleted('chapter2') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.chapterCard} ${isCompleted('chapter3') ? styles.completedCard : ''}`}>
                    <h4>Chapter 3: Group Properties</h4>
                    <p>Identity, inverses, order of permutations, and subgroups</p>
                    {isCompleted('chapter3') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.chapterCard} ${isCompleted('chapter4') ? styles.completedCard : ''}`}>
                    <h4>Chapter 4: Special Topics</h4>
                    <p>The alternating group, sign of a permutation, and conjugacy classes</p>
                    {isCompleted('chapter4') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.chapterCard} ${isCompleted('chapter5') ? styles.completedCard : ''}`}>
                    <h4>Chapter 5: Advanced Concepts</h4>
                    <p>Group actions, Cayley's theorem, and applications</p>
                    {isCompleted('chapter5') && <span className={styles.checkmark}>✓</span>}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'chapter1' && (
            <div className={styles.chapter}>
              <h2>Chapter 1: Foundations</h2>
              
              <section className={styles.section}>
                <h3>1.1 What is a Permutation?</h3>
                <p>
                  A <strong>permutation</strong> of a set X is a bijective function from X to itself.
                  In other words, it's a way of rearranging the elements of X where each element
                  appears exactly once.
                </p>
                
                <div className={styles.definition}>
                  <h4>Definition</h4>
                  <p>
                    Let X = {'{1, 2, ..., n}'}. A permutation σ of X is a function σ: X → X
                    that is both injective (one-to-one) and surjective (onto).
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>1.2 Interactive Permutation Visualizer</h3>
                <p>
                  Use the interactive tool below to explore how permutations work. Drag elements
                  to rearrange them and see the corresponding two-line and cycle notation.
                </p>
                
                <PermutationVisualizer />
              </section>

              <section className={styles.section}>
                <h3>1.3 Composition of Permutations</h3>
                <p>
                  We can combine two permutations by applying them one after another. This operation
                  is called <strong>composition</strong>. If σ and τ are permutations, their
                  composition στ means "first apply τ, then apply σ".
                </p>
                
                <div className={styles.important}>
                  <h4>Important Note</h4>
                  <p>
                    Permutation composition is read from right to left, just like function composition.
                    (στ)(x) = σ(τ(x))
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <PermutationQuiz chapter={1} />
              </section>

              <div className={styles.chapterComplete}>
                {!isCompleted('chapter1') ? (
                  <button
                    onClick={() => markComplete('chapter1')}
                    className={styles.completeButton}
                  >
                    Mark Chapter Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Chapter Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chapter2' && (
            <div className={styles.chapter}>
              <h2>Chapter 2: Cycle Notation</h2>
              
              <section className={styles.section}>
                <h3>2.1 Understanding Cycles</h3>
                <p>
                  A <strong>cycle</strong> is a permutation that moves elements in a circular fashion.
                  The notation (a₁ a₂ ... aₖ) means a₁ → a₂ → ... → aₖ → a₁.
                </p>
                
                <div className={styles.definition}>
                  <h4>Disjoint Cycle Decomposition</h4>
                  <p>
                    Every permutation can be uniquely written (up to order) as a product of disjoint cycles.
                    Two cycles are disjoint if they move different elements.
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>2.2 Interactive Cycle Decomposer</h3>
                <p>
                  Enter a permutation to see its cycle decomposition, transposition form, and order.
                </p>
                
                <CycleDecomposer />
              </section>

              <section className={styles.section}>
                <h3>2.3 Properties of Cycles</h3>
                
                <div className={styles.theorem}>
                  <h4>Key Properties</h4>
                  <ul>
                    <li>A k-cycle has order k</li>
                    <li>Disjoint cycles commute</li>
                    <li>Every cycle can be written as a product of transpositions</li>
                    <li>A k-cycle requires k-1 transpositions</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <PermutationQuiz chapter={2} />
              </section>

              <div className={styles.chapterComplete}>
                {!isCompleted('chapter2') ? (
                  <button
                    onClick={() => markComplete('chapter2')}
                    className={styles.completeButton}
                  >
                    Mark Chapter Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Chapter Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chapter3' && (
            <div className={styles.chapter}>
              <h2>Chapter 3: Group Properties</h2>
              
              <section className={styles.section}>
                <h3>3.1 The Symmetric Group</h3>
                <p>
                  The set of all permutations of n elements forms a group called the
                  <strong> symmetric group S<sub>n</sub></strong>, with composition as the operation.
                </p>
                
                <div className={styles.definition}>
                  <h4>Group Properties</h4>
                  <ul>
                    <li><strong>Closure:</strong> The composition of two permutations is a permutation</li>
                    <li><strong>Associativity:</strong> (στ)ρ = σ(τρ)</li>
                    <li><strong>Identity:</strong> The identity permutation leaves all elements fixed</li>
                    <li><strong>Inverses:</strong> Every permutation has an inverse</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>3.2 Order of a Permutation</h3>
                <p>
                  The <strong>order</strong> of a permutation σ is the smallest positive integer k
                  such that σᵏ = identity.
                </p>
                
                <div className={styles.theorem}>
                  <h4>Computing Order</h4>
                  <p>
                    The order of a permutation equals the least common multiple (LCM) of the lengths
                    of its disjoint cycles.
                  </p>
                </div>

                <div className={styles.example}>
                  <h4>Example</h4>
                  <p>σ = (1 2 3)(4 5) has order LCM(3, 2) = 6</p>
                  <p>This means σ⁶ = identity, and no smaller positive power gives the identity.</p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>3.3 Subgroups</h3>
                <p>
                  A <strong>subgroup</strong> of S<sub>n</sub> is a subset that is itself a group under
                  the same operation.
                </p>
                
                <div className={styles.important}>
                  <h4>Important Subgroups</h4>
                  <ul>
                    <li>The alternating group A<sub>n</sub> (even permutations)</li>
                    <li>Cyclic subgroups ⟨σ⟩ generated by a single permutation</li>
                    <li>Stabilizer subgroups that fix certain elements</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <PermutationQuiz chapter={3} />
              </section>

              <div className={styles.chapterComplete}>
                {!isCompleted('chapter3') ? (
                  <button
                    onClick={() => markComplete('chapter3')}
                    className={styles.completeButton}
                  >
                    Mark Chapter Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Chapter Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chapter4' && (
            <div className={styles.chapter}>
              <h2>Chapter 4: Special Topics</h2>
              
              <section className={styles.section}>
                <h3>4.1 The Sign of a Permutation</h3>
                <p>
                  Every permutation can be classified as either <strong>even</strong> or <strong>odd</strong>
                  based on the number of transpositions needed to express it.
                </p>
                
                <div className={styles.definition}>
                  <h4>Definition</h4>
                  <p>
                    The sign function sgn: S<sub>n</sub> → {'{+1, -1}'} is defined by:
                  </p>
                  <ul>
                    <li>sgn(σ) = +1 if σ is even (even number of transpositions)</li>
                    <li>sgn(σ) = -1 if σ is odd (odd number of transpositions)</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>4.2 Sign Calculator</h3>
                <p>
                  Enter a permutation to calculate its sign and see the number of inversions.
                </p>
                
                <SignCalculator />
              </section>

              <section className={styles.section}>
                <h3>4.3 The Alternating Group</h3>
                <p>
                  The <strong>alternating group A<sub>n</sub></strong> consists of all even permutations
                  in S<sub>n</sub>.
                </p>
                
                <div className={styles.theorem}>
                  <h4>Properties of A<sub>n</sub></h4>
                  <ul>
                    <li>|A<sub>n</sub>| = n!/2 for n ≥ 2</li>
                    <li>A<sub>n</sub> is a normal subgroup of S<sub>n</sub></li>
                    <li>A<sub>n</sub> is simple for n ≥ 5 (has no nontrivial normal subgroups)</li>
                    <li>A<sub>n</sub> is generated by 3-cycles</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>4.4 Conjugacy Classes</h3>
                <p>
                  Two permutations σ and τ are <strong>conjugate</strong> if there exists ρ ∈ S<sub>n</sub>
                  such that τ = ρσρ⁻¹.
                </p>
                
                <div className={styles.important}>
                  <h4>Key Fact</h4>
                  <p>
                    Two permutations are conjugate if and only if they have the same cycle type
                    (the same multiset of cycle lengths).
                  </p>
                </div>
              </section>

              <div className={styles.chapterComplete}>
                {!isCompleted('chapter4') ? (
                  <button
                    onClick={() => markComplete('chapter4')}
                    className={styles.completeButton}
                  >
                    Mark Chapter Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Chapter Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chapter5' && (
            <div className={styles.chapter}>
              <h2>Chapter 5: Advanced Concepts</h2>
              
              <section className={styles.section}>
                <h3>5.1 Group Actions</h3>
                <p>
                  A <strong>group action</strong> of G on a set X is a function G × X → X that satisfies:
                </p>
                
                <div className={styles.definition}>
                  <h4>Properties</h4>
                  <ul>
                    <li>Identity: e · x = x for all x ∈ X</li>
                    <li>Compatibility: (gh) · x = g · (h · x)</li>
                  </ul>
                </div>

                <p>
                  The symmetric group S<sub>n</sub> naturally acts on the set {'{1, 2, ..., n}'} by
                  permuting the elements.
                </p>
              </section>

              <section className={styles.section}>
                <h3>5.2 Cayley's Theorem</h3>
                
                <div className={styles.theorem}>
                  <h4>Theorem (Cayley)</h4>
                  <p>
                    Every finite group G is isomorphic to a subgroup of the symmetric group S<sub>|G|</sub>.
                  </p>
                  <p>
                    This fundamental result shows that every abstract group can be realized concretely
                    as a group of permutations.
                  </p>
                </div>

                <div className={styles.example}>
                  <h4>Construction</h4>
                  <p>
                    For each g ∈ G, define the permutation λ<sub>g</sub>: G → G by λ<sub>g</sub>(h) = gh.
                    The map g ↦ λ<sub>g</sub> is an injective homomorphism from G to S<sub>|G|</sub>.
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>5.3 Applications</h3>
                
                <div className={styles.applications}>
                  <div className={styles.application}>
                    <h4>Rubik's Cube</h4>
                    <p>
                      The group of Rubik's cube moves is a subgroup of S<sub>48</sub> (permuting 48 stickers),
                      with constraints from the physical structure.
                    </p>
                  </div>
                  
                  <div className={styles.application}>
                    <h4>15-Puzzle</h4>
                    <p>
                      Valid configurations form the alternating group A<sub>15</sub>, which is why
                      exactly half of all positions are solvable.
                    </p>
                  </div>
                  
                  <div className={styles.application}>
                    <h4>Cryptography</h4>
                    <p>
                      Classical substitution ciphers are elements of S<sub>26</sub>, and understanding
                      their group structure aids in cryptanalysis.
                    </p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>5.4 Further Study</h3>
                <p>Topics for continued exploration:</p>
                <ul>
                  <li>Sylow theorems and their applications to S<sub>n</sub></li>
                  <li>Representation theory of symmetric groups</li>
                  <li>Young tableaux and the RSK correspondence</li>
                  <li>Connections to combinatorics and algebraic geometry</li>
                </ul>
              </section>

              <div className={styles.chapterComplete}>
                {!isCompleted('chapter5') ? (
                  <button
                    onClick={() => markComplete('chapter5')}
                    className={styles.completeButton}
                  >
                    Mark Chapter Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Chapter Completed! Congratulations on finishing the course!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default GroupsPage