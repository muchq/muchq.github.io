import { useState, useEffect } from 'react'
import SetsNavigation from '@/components/SetsNavigation'
import VennDiagramBuilder from '@/components/VennDiagramBuilder'
import SetOperationsVisualizer from '@/components/SetOperationsVisualizer'
import RelationMatrixCalculator from '@/components/RelationMatrixCalculator'
import FunctionVisualizer from '@/components/FunctionVisualizer'
import CardinalityExplorer from '@/components/CardinalityExplorer'
import SetQuiz from '@/components/SetQuiz'
import styles from './SetsPage.module.css'

const SetsPage = () => {
  const [activeModule, setActiveModule] = useState('overview')
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem('setsProgress')
    if (saved) {
      setCompletedModules(new Set(JSON.parse(saved)))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('setsProgress', JSON.stringify(Array.from(completedModules)))
    setProgress((completedModules.size / 10) * 100)
  }, [completedModules])

  const markComplete = (module: string) => {
    setCompletedModules(new Set([...completedModules, module]))
  }

  return (
    <div className={styles.setsPage}>
      <SetsNavigation />
      
      <main className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Foundations of Set Theory</h1>
          <p className={styles.subtitle}>Interactive Learning Experience</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            <span className={styles.progressText}>{Math.round(progress)}% Complete</span>
          </div>
        </header>

        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeModule === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveModule('overview')}
          >
            Overview
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module1' ? styles.active : ''} ${
              completedModules.has('module1') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module1')}
          >
            Module 1: Intro & Logic
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module2' ? styles.active : ''} ${
              completedModules.has('module2') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module2')}
          >
            Module 2: Operations
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module3' ? styles.active : ''} ${
              completedModules.has('module3') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module3')}
          >
            Module 3: Relations
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module4' ? styles.active : ''} ${
              completedModules.has('module4') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module4')}
          >
            Module 4: Functions
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module5' ? styles.active : ''} ${
              completedModules.has('module5') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module5')}
          >
            Module 5: Counting
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module6' ? styles.active : ''} ${
              completedModules.has('module6') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module6')}
          >
            Module 6: Infinite Sets
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module7' ? styles.active : ''} ${
              completedModules.has('module7') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module7')}
          >
            Module 7: Cardinals
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module8' ? styles.active : ''} ${
              completedModules.has('module8') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module8')}
          >
            Module 8: Ordinals
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module9' ? styles.active : ''} ${
              completedModules.has('module9') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module9')}
          >
            Module 9: Choice
          </button>
          <button
            className={`${styles.tab} ${activeModule === 'module10' ? styles.active : ''} ${
              completedModules.has('module10') ? styles.completed : ''
            }`}
            onClick={() => setActiveModule('module10')}
          >
            Module 10: ZF Axioms
          </button>
        </nav>

        <div className={styles.tabContent}>
          {activeModule === 'overview' && (
            <div className={styles.overview}>
              <section className={styles.section}>
                <h2>Welcome to Set Theory</h2>
                <p className={styles.lead}>
                  Embark on a journey through the foundations of mathematics. This comprehensive course
                  progresses from basic concepts to advanced topics, with interactive tools and
                  visualizations to build deep understanding.
                </p>
                <p className={styles.citation}>
                  Based on Charles Pinter's "A Book of Set Theory"
                </p>
              </section>

              <section className={styles.section}>
                <h3>Learning Objectives</h3>
                <ul className={styles.objectives}>
                  <li>Master set notation and basic operations</li>
                  <li>Understand relations, functions, and their properties</li>
                  <li>Explore cardinality and infinite sets</li>
                  <li>Learn about ordinals and the Axiom of Choice</li>
                  <li>Understand the axiomatic foundations of set theory</li>
                </ul>
              </section>

              <section className={styles.section}>
                <h3>Course Modules</h3>
                <div className={styles.modules}>
                  <div className={`${styles.moduleCard} ${completedModules.has('module1') ? styles.completedCard : ''}`}>
                    <h4>Module 1: Introduction to Sets and Logic</h4>
                    <p>Sets, elements, membership, logical operations, quantifiers</p>
                    {completedModules.has('module1') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module2') ? styles.completedCard : ''}`}>
                    <h4>Module 2: Basic Set Operations</h4>
                    <p>Union, intersection, complement, Venn diagrams, De Morgan's Laws</p>
                    {completedModules.has('module2') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module3') ? styles.completedCard : ''}`}>
                    <h4>Module 3: Relations and Their Properties</h4>
                    <p>Cartesian products, equivalence relations, partial orders</p>
                    {completedModules.has('module3') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module4') ? styles.completedCard : ''}`}>
                    <h4>Module 4: Functions</h4>
                    <p>Injective, surjective, bijective functions, composition, inverses</p>
                    {completedModules.has('module4') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module5') ? styles.completedCard : ''}`}>
                    <h4>Module 5: Cardinality and Counting</h4>
                    <p>Finite vs infinite, inclusion-exclusion, pigeonhole principle</p>
                    {completedModules.has('module5') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module6') ? styles.completedCard : ''}`}>
                    <h4>Module 6: Infinite Sets and Countability</h4>
                    <p>Countable sets, Cantor's diagonal argument, uncountability</p>
                    {completedModules.has('module6') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module7') ? styles.completedCard : ''}`}>
                    <h4>Module 7: Cardinal Numbers and Arithmetic</h4>
                    <p>Cardinal arithmetic, aleph notation, Cantor's theorem</p>
                    {completedModules.has('module7') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module8') ? styles.completedCard : ''}`}>
                    <h4>Module 8: Well-Ordering and Ordinals</h4>
                    <p>Well-ordered sets, ordinal numbers, transfinite induction</p>
                    {completedModules.has('module8') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module9') ? styles.completedCard : ''}`}>
                    <h4>Module 9: The Axiom of Choice</h4>
                    <p>AC, Zorn's Lemma, Well-Ordering Theorem, applications</p>
                    {completedModules.has('module9') && <span className={styles.checkmark}>✓</span>}
                  </div>
                  <div className={`${styles.moduleCard} ${completedModules.has('module10') ? styles.completedCard : ''}`}>
                    <h4>Module 10: Axiomatic Set Theory</h4>
                    <p>ZF axioms, Russell's Paradox, consistency and independence</p>
                    {completedModules.has('module10') && <span className={styles.checkmark}>✓</span>}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeModule === 'module1' && (
            <div className={styles.module}>
              <h2>Module 1: Introduction to Sets and Logic</h2>
              
              <section className={styles.section}>
                <h3>1.1 What is a Set?</h3>
                <p>
                  A <strong>set</strong> is a collection of distinct objects, called <strong>elements</strong> or 
                  <strong> members</strong>. Sets are fundamental building blocks of mathematics.
                </p>
                
                <div className={styles.definition}>
                  <h4>Definition</h4>
                  <p>
                    A set is a well-defined collection of distinct objects. We write x ∈ A to mean
                    "x is an element of A" and x ∉ A to mean "x is not an element of A".
                  </p>
                </div>

                <div className={styles.notation}>
                  <h4>Set Notation</h4>
                  <ul>
                    <li><strong>Roster Method:</strong> A = {'{1, 2, 3, 4, 5}'}</li>
                    <li><strong>Set-Builder:</strong> A = {'{x | x is a positive integer less than 6}'}</li>
                    <li><strong>Empty Set:</strong> ∅ or {'{}'}</li>
                    <li><strong>Universal Set:</strong> U (contains all elements under consideration)</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>1.2 Logic and Set Theory</h3>
                <p>
                  Logic provides the language and rules for reasoning about sets. Understanding logical
                  operations is essential for proving set theoretic results.
                </p>
                
                <div className={styles.logicTable}>
                  <h4>Logical Operations</h4>
                  <table className={styles.truthTable}>
                    <thead>
                      <tr>
                        <th>Operation</th>
                        <th>Symbol</th>
                        <th>Meaning</th>
                        <th>Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Conjunction</td>
                        <td>∧</td>
                        <td>AND</td>
                        <td>p ∧ q is true when both p and q are true</td>
                      </tr>
                      <tr>
                        <td>Disjunction</td>
                        <td>∨</td>
                        <td>OR</td>
                        <td>p ∨ q is true when at least one is true</td>
                      </tr>
                      <tr>
                        <td>Negation</td>
                        <td>¬</td>
                        <td>NOT</td>
                        <td>¬p is true when p is false</td>
                      </tr>
                      <tr>
                        <td>Implication</td>
                        <td>→</td>
                        <td>IF...THEN</td>
                        <td>p → q is false only when p is true and q is false</td>
                      </tr>
                      <tr>
                        <td>Equivalence</td>
                        <td>↔</td>
                        <td>IF AND ONLY IF</td>
                        <td>p ↔ q is true when p and q have same truth value</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.section}>
                <h3>1.3 Quantifiers</h3>
                <div className={styles.quantifiers}>
                  <div className={styles.quantifier}>
                    <h4>Universal Quantifier (∀)</h4>
                    <p>"For all" or "for every"</p>
                    <p className={styles.example}>∀x ∈ ℕ, x + 1 {'>'} x</p>
                    <p>"For all natural numbers x, x + 1 is greater than x"</p>
                  </div>
                  <div className={styles.quantifier}>
                    <h4>Existential Quantifier (∃)</h4>
                    <p>"There exists" or "for some"</p>
                    <p className={styles.example}>∃x ∈ ℝ, x² = 2</p>
                    <p>"There exists a real number x such that x² = 2"</p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={1} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module1') ? (
                  <button
                    onClick={() => markComplete('module1')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module2' && (
            <div className={styles.module}>
              <h2>Module 2: Basic Set Operations</h2>
              
              <section className={styles.section}>
                <h3>2.1 Fundamental Operations</h3>
                <p>
                  Set operations allow us to combine and manipulate sets in meaningful ways.
                  These operations form the algebra of sets.
                </p>
                
                <div className={styles.operations}>
                  <div className={styles.operation}>
                    <h4>Union (A ∪ B)</h4>
                    <p>Elements in A OR B (or both)</p>
                    <p className={styles.formula}>A ∪ B = {'{x | x ∈ A or x ∈ B}'}</p>
                  </div>
                  <div className={styles.operation}>
                    <h4>Intersection (A ∩ B)</h4>
                    <p>Elements in both A AND B</p>
                    <p className={styles.formula}>A ∩ B = {'{x | x ∈ A and x ∈ B}'}</p>
                  </div>
                  <div className={styles.operation}>
                    <h4>Difference (A - B)</h4>
                    <p>Elements in A but NOT in B</p>
                    <p className={styles.formula}>A - B = {'{x | x ∈ A and x ∉ B}'}</p>
                  </div>
                  <div className={styles.operation}>
                    <h4>Complement (A')</h4>
                    <p>Elements NOT in A</p>
                    <p className={styles.formula}>A' = {'{x ∈ U | x ∉ A}'}</p>
                  </div>
                  <div className={styles.operation}>
                    <h4>Symmetric Difference (A △ B)</h4>
                    <p>Elements in A OR B but NOT both</p>
                    <p className={styles.formula}>A △ B = (A - B) ∪ (B - A)</p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>2.2 Interactive Venn Diagram Builder</h3>
                <p>
                  Visualize set operations using interactive Venn diagrams. Add elements to sets
                  and see how operations combine them.
                </p>
                
                <VennDiagramBuilder />
              </section>

              <section className={styles.section}>
                <h3>2.3 Set Operations Visualizer</h3>
                <p>
                  Explore how different operations transform sets step by step.
                </p>
                
                <SetOperationsVisualizer />
              </section>

              <section className={styles.section}>
                <h3>2.4 Properties of Set Operations</h3>
                
                <div className={styles.theorem}>
                  <h4>De Morgan's Laws</h4>
                  <ul>
                    <li>(A ∪ B)' = A' ∩ B'</li>
                    <li>(A ∩ B)' = A' ∪ B'</li>
                  </ul>
                </div>

                <div className={styles.properties}>
                  <h4>Algebraic Properties</h4>
                  <table className={styles.propertiesTable}>
                    <thead>
                      <tr>
                        <th>Property</th>
                        <th>Union</th>
                        <th>Intersection</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Commutative</td>
                        <td>A ∪ B = B ∪ A</td>
                        <td>A ∩ B = B ∩ A</td>
                      </tr>
                      <tr>
                        <td>Associative</td>
                        <td>(A ∪ B) ∪ C = A ∪ (B ∪ C)</td>
                        <td>(A ∩ B) ∩ C = A ∩ (B ∩ C)</td>
                      </tr>
                      <tr>
                        <td>Distributive</td>
                        <td>A ∪ (B ∩ C) = (A ∪ B) ∩ (A ∪ C)</td>
                        <td>A ∩ (B ∪ C) = (A ∩ B) ∪ (A ∩ C)</td>
                      </tr>
                      <tr>
                        <td>Identity</td>
                        <td>A ∪ ∅ = A</td>
                        <td>A ∩ U = A</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={2} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module2') ? (
                  <button
                    onClick={() => markComplete('module2')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module3' && (
            <div className={styles.module}>
              <h2>Module 3: Relations and Their Properties</h2>
              
              <section className={styles.section}>
                <h3>3.1 Cartesian Products</h3>
                <p>
                  The <strong>Cartesian product</strong> A × B of two sets A and B is the set of all
                  ordered pairs (a, b) where a ∈ A and b ∈ B.
                </p>
                
                <div className={styles.definition}>
                  <h4>Definition</h4>
                  <p>A × B = {'{(a, b) | a ∈ A and b ∈ B}'}</p>
                  <p className={styles.example}>
                    If A = {'{1, 2}'} and B = {'{a, b, c}'}, then<br/>
                    A × B = {'{(1,a), (1,b), (1,c), (2,a), (2,b), (2,c)}'}
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>3.2 Relations</h3>
                <p>
                  A <strong>relation</strong> R from set A to set B is a subset of A × B.
                  If (a, b) ∈ R, we write aRb and say "a is related to b".
                </p>
                
                <div className={styles.relationProperties}>
                  <h4>Properties of Relations on a Set A</h4>
                  <div className={styles.property}>
                    <h5>Reflexive</h5>
                    <p>∀a ∈ A, aRa</p>
                    <p className={styles.example}>Example: ≤ on ℝ (every number ≤ itself)</p>
                  </div>
                  <div className={styles.property}>
                    <h5>Symmetric</h5>
                    <p>∀a,b ∈ A, if aRb then bRa</p>
                    <p className={styles.example}>Example: "is sibling of"</p>
                  </div>
                  <div className={styles.property}>
                    <h5>Transitive</h5>
                    <p>∀a,b,c ∈ A, if aRb and bRc then aRc</p>
                    <p className={styles.example}>Example: {'<'} on ℝ</p>
                  </div>
                  <div className={styles.property}>
                    <h5>Antisymmetric</h5>
                    <p>∀a,b ∈ A, if aRb and bRa then a = b</p>
                    <p className={styles.example}>Example: ≤ on ℝ</p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>3.3 Relation Matrix Calculator</h3>
                <p>
                  Check properties of relations using matrix representation. Enter a relation
                  matrix and discover its properties.
                </p>
                
                <RelationMatrixCalculator />
              </section>

              <section className={styles.section}>
                <h3>3.4 Special Types of Relations</h3>
                
                <div className={styles.specialRelations}>
                  <div className={styles.relationType}>
                    <h4>Equivalence Relation</h4>
                    <p>A relation that is reflexive, symmetric, and transitive</p>
                    <p className={styles.example}>Example: "has same remainder when divided by 3"</p>
                    <div className={styles.important}>
                      <p><strong>Equivalence Classes:</strong> Partition the set into disjoint subsets</p>
                    </div>
                  </div>
                  
                  <div className={styles.relationType}>
                    <h4>Partial Order</h4>
                    <p>A relation that is reflexive, antisymmetric, and transitive</p>
                    <p className={styles.example}>Example: ⊆ on power set</p>
                    <div className={styles.important}>
                      <p><strong>Hasse Diagram:</strong> Visual representation omitting reflexive and transitive edges</p>
                    </div>
                  </div>
                  
                  <div className={styles.relationType}>
                    <h4>Total Order</h4>
                    <p>A partial order where every two elements are comparable</p>
                    <p className={styles.example}>Example: ≤ on ℝ</p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={3} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module3') ? (
                  <button
                    onClick={() => markComplete('module3')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module4' && (
            <div className={styles.module}>
              <h2>Module 4: Functions</h2>
              
              <section className={styles.section}>
                <h3>4.1 Functions as Special Relations</h3>
                <p>
                  A <strong>function</strong> f from set A to set B (written f: A → B) is a relation
                  that assigns to each element of A exactly one element of B.
                </p>
                
                <div className={styles.definition}>
                  <h4>Formal Definition</h4>
                  <p>
                    f ⊆ A × B is a function if:
                  </p>
                  <ul>
                    <li>∀a ∈ A, ∃b ∈ B such that (a,b) ∈ f (existence)</li>
                    <li>If (a,b) ∈ f and (a,c) ∈ f, then b = c (uniqueness)</li>
                  </ul>
                </div>

                <div className={styles.terminology}>
                  <h4>Terminology</h4>
                  <ul>
                    <li><strong>Domain:</strong> The set A (all possible inputs)</li>
                    <li><strong>Codomain:</strong> The set B (all potential outputs)</li>
                    <li><strong>Range/Image:</strong> {'{f(a) | a ∈ A}'} ⊆ B (actual outputs)</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>4.2 Types of Functions</h3>
                
                <div className={styles.functionTypes}>
                  <div className={styles.functionType}>
                    <h4>Injective (One-to-One)</h4>
                    <p>Different inputs give different outputs</p>
                    <p className={styles.formula}>∀a₁,a₂ ∈ A, if f(a₁) = f(a₂) then a₁ = a₂</p>
                    <p className={styles.example}>Example: f(x) = 2x on ℝ</p>
                  </div>
                  
                  <div className={styles.functionType}>
                    <h4>Surjective (Onto)</h4>
                    <p>Every element of codomain is an output</p>
                    <p className={styles.formula}>∀b ∈ B, ∃a ∈ A such that f(a) = b</p>
                    <p className={styles.example}>Example: f(x) = x³ from ℝ to ℝ</p>
                  </div>
                  
                  <div className={styles.functionType}>
                    <h4>Bijective (One-to-One Correspondence)</h4>
                    <p>Both injective and surjective</p>
                    <p className={styles.formula}>Has an inverse function f⁻¹: B → A</p>
                    <p className={styles.example}>Example: f(x) = x + 1 from ℝ to ℝ</p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>4.3 Interactive Function Visualizer</h3>
                <p>
                  Explore functions between finite sets. Create mappings and check their properties.
                </p>
                
                <FunctionVisualizer />
              </section>

              <section className={styles.section}>
                <h3>4.4 Function Composition</h3>
                <p>
                  If f: A → B and g: B → C, then the composition g ∘ f: A → C is defined by
                  (g ∘ f)(a) = g(f(a))
                </p>
                
                <div className={styles.theorem}>
                  <h4>Properties of Composition</h4>
                  <ul>
                    <li>Associative: (h ∘ g) ∘ f = h ∘ (g ∘ f)</li>
                    <li>If f and g are injective, so is g ∘ f</li>
                    <li>If f and g are surjective, so is g ∘ f</li>
                    <li>If f and g are bijective, so is g ∘ f</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={4} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module4') ? (
                  <button
                    onClick={() => markComplete('module4')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module5' && (
            <div className={styles.module}>
              <h2>Module 5: Cardinality and Counting</h2>
              
              <section className={styles.section}>
                <h3>5.1 Cardinality of Finite Sets</h3>
                <p>
                  The <strong>cardinality</strong> of a finite set A, denoted |A|, is the number
                  of elements in A.
                </p>
                
                <div className={styles.principle}>
                  <h4>Fundamental Counting Principles</h4>
                  <ul>
                    <li>|A ∪ B| = |A| + |B| - |A ∩ B|</li>
                    <li>|A × B| = |A| × |B|</li>
                    <li>If A ∩ B = ∅, then |A ∪ B| = |A| + |B|</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>5.2 Principle of Inclusion-Exclusion</h3>
                
                <div className={styles.theorem}>
                  <h4>For Three Sets</h4>
                  <p className={styles.formula}>
                    |A ∪ B ∪ C| = |A| + |B| + |C| - |A ∩ B| - |A ∩ C| - |B ∩ C| + |A ∩ B ∩ C|
                  </p>
                </div>

                <div className={styles.example}>
                  <h4>Example</h4>
                  <p>
                    In a class of 30 students:
                  </p>
                  <ul>
                    <li>18 take Math</li>
                    <li>15 take Physics</li>
                    <li>12 take Chemistry</li>
                    <li>8 take Math and Physics</li>
                    <li>7 take Math and Chemistry</li>
                    <li>6 take Physics and Chemistry</li>
                    <li>4 take all three</li>
                  </ul>
                  <p>
                    Students taking at least one subject = 18 + 15 + 12 - 8 - 7 - 6 + 4 = 28
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>5.3 Pigeonhole Principle</h3>
                
                <div className={styles.principle}>
                  <h4>Statement</h4>
                  <p>
                    If n pigeons are placed into m pigeonholes with n {'>'} m, then at least one
                    pigeonhole contains more than one pigeon.
                  </p>
                </div>

                <div className={styles.example}>
                  <h4>Applications</h4>
                  <ul>
                    <li>In any group of 13 people, at least 2 share a birth month</li>
                    <li>Among any 6 integers, at least 2 have the same remainder when divided by 5</li>
                    <li>In any sequence of n² + 1 distinct numbers, there's an increasing or decreasing subsequence of length n + 1</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>5.4 Cardinality Explorer</h3>
                <p>
                  Explore counting principles and cardinality relationships interactively.
                </p>
                
                <CardinalityExplorer mode="finite" />
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={5} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module5') ? (
                  <button
                    onClick={() => markComplete('module5')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module6' && (
            <div className={styles.module}>
              <h2>Module 6: Infinite Sets and Countability</h2>
              
              <section className={styles.section}>
                <h3>6.1 Countably Infinite Sets</h3>
                <p>
                  A set A is <strong>countably infinite</strong> if there exists a bijection
                  between A and ℕ (the natural numbers).
                </p>
                
                <div className={styles.examples}>
                  <h4>Countable Sets</h4>
                  <ul>
                    <li><strong>ℕ:</strong> Natural numbers {'{1, 2, 3, ...}'}</li>
                    <li><strong>ℤ:</strong> Integers - map via 0, 1, -1, 2, -2, 3, -3, ...</li>
                    <li><strong>ℚ:</strong> Rational numbers - use diagonal enumeration</li>
                    <li><strong>ℕ × ℕ:</strong> Pairs of naturals - use Cantor pairing</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>6.2 Cantor's Diagonal Argument</h3>
                <p>
                  Cantor's diagonal argument proves that the real numbers ℝ are uncountable.
                </p>
                
                <div className={styles.proof}>
                  <h4>Proof Sketch</h4>
                  <ol>
                    <li>Assume ℝ in [0,1] is countable: r₁, r₂, r₃, ...</li>
                    <li>Write each in decimal: r₁ = 0.d₁₁d₁₂d₁₃...</li>
                    <li>Construct x = 0.x₁x₂x₃... where xᵢ ≠ dᵢᵢ</li>
                    <li>Then x differs from every rᵢ at position i</li>
                    <li>So x is not in the list - contradiction!</li>
                  </ol>
                </div>
              </section>

              <section className={styles.section}>
                <h3>6.3 Uncountable Sets</h3>
                
                <div className={styles.uncountable}>
                  <h4>Examples of Uncountable Sets</h4>
                  <ul>
                    <li><strong>ℝ:</strong> The real numbers</li>
                    <li><strong>P(ℕ):</strong> Power set of natural numbers</li>
                    <li><strong>[0,1]:</strong> The unit interval</li>
                    <li><strong>{'{0,1}'}^ℕ:</strong> Infinite binary sequences</li>
                  </ul>
                </div>

                <div className={styles.theorem}>
                  <h4>Schröder-Bernstein Theorem</h4>
                  <p>
                    If there exist injections f: A → B and g: B → A, then there exists
                    a bijection between A and B.
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>6.4 Interactive Countability Explorer</h3>
                <p>
                  Visualize bijections and explore the difference between countable and uncountable sets.
                </p>
                
                <CardinalityExplorer mode="infinite" />
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={6} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module6') ? (
                  <button
                    onClick={() => markComplete('module6')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module7' && (
            <div className={styles.module}>
              <h2>Module 7: Cardinal Numbers and Arithmetic</h2>
              
              <section className={styles.section}>
                <h3>7.1 Cardinal Numbers</h3>
                <p>
                  <strong>Cardinal numbers</strong> measure the size of sets. Two sets have the
                  same cardinality if there exists a bijection between them.
                </p>
                
                <div className={styles.notation}>
                  <h4>Aleph Notation</h4>
                  <ul>
                    <li><strong>ℵ₀</strong> (aleph-null): Cardinality of ℕ</li>
                    <li><strong>c</strong> or <strong>2^ℵ₀</strong>: Cardinality of ℝ (continuum)</li>
                    <li><strong>ℵ₁</strong>: The smallest uncountable cardinal</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>7.2 Cardinal Arithmetic</h3>
                
                <div className={styles.arithmetic}>
                  <h4>Operations on Cardinals</h4>
                  <table className={styles.cardinalTable}>
                    <thead>
                      <tr>
                        <th>Operation</th>
                        <th>Finite</th>
                        <th>Infinite</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Addition</td>
                        <td>m + n</td>
                        <td>ℵ₀ + ℵ₀ = ℵ₀</td>
                      </tr>
                      <tr>
                        <td>Multiplication</td>
                        <td>m × n</td>
                        <td>ℵ₀ × ℵ₀ = ℵ₀</td>
                      </tr>
                      <tr>
                        <td>Exponentiation</td>
                        <td>m^n</td>
                        <td>2^ℵ₀ = c</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className={styles.important}>
                  <h4>Key Results</h4>
                  <ul>
                    <li>ℵ₀ + n = ℵ₀ for any finite n</li>
                    <li>ℵ₀ + ℵ₀ = ℵ₀ (countable union of countable sets)</li>
                    <li>c + c = c</li>
                    <li>c × c = c</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>7.3 Cantor's Theorem</h3>
                
                <div className={styles.theorem}>
                  <h4>Statement</h4>
                  <p>
                    For any set A, |A| {'<'} |P(A)|
                  </p>
                  <p>
                    The power set of A has strictly greater cardinality than A itself.
                  </p>
                </div>

                <div className={styles.consequence}>
                  <h4>Consequence</h4>
                  <p>
                    There is no largest cardinal number. The hierarchy of infinities continues:
                  </p>
                  <p className={styles.formula}>
                    ℵ₀ {'<'} 2^ℵ₀ {'<'} 2^(2^ℵ₀) {'<'} ...
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>7.4 The Continuum Hypothesis</h3>
                
                <div className={styles.hypothesis}>
                  <h4>Statement (CH)</h4>
                  <p>
                    There is no set whose cardinality is strictly between ℵ₀ and c.
                  </p>
                  <p>
                    In other words: 2^ℵ₀ = ℵ₁
                  </p>
                </div>

                <div className={styles.independence}>
                  <h4>Independence Result</h4>
                  <p>
                    Gödel (1940) and Cohen (1963) proved that CH is independent of ZFC:
                  </p>
                  <ul>
                    <li>CH cannot be proved from ZFC axioms</li>
                    <li>¬CH cannot be proved from ZFC axioms</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={7} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module7') ? (
                  <button
                    onClick={() => markComplete('module7')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module8' && (
            <div className={styles.module}>
              <h2>Module 8: Well-Ordering and Ordinals</h2>
              
              <section className={styles.section}>
                <h3>8.1 Well-Ordered Sets</h3>
                <p>
                  A set A with order ≤ is <strong>well-ordered</strong> if every non-empty subset
                  has a least element.
                </p>
                
                <div className={styles.examples}>
                  <h4>Examples</h4>
                  <ul>
                    <li><strong>Well-ordered:</strong> ℕ with usual order</li>
                    <li><strong>Well-ordered:</strong> {'{1, 2, 3}'} ∪ {'{ω}'} where ω {'>'} all naturals</li>
                    <li><strong>Not well-ordered:</strong> ℤ (no least element)</li>
                    <li><strong>Not well-ordered:</strong> [0, 1] (open intervals have no least)</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>8.2 Ordinal Numbers</h3>
                <p>
                  <strong>Ordinal numbers</strong> extend natural numbers to describe positions
                  in well-ordered sets, including transfinite positions.
                </p>
                
                <div className={styles.ordinals}>
                  <h4>First Ordinals</h4>
                  <ul>
                    <li>0, 1, 2, 3, ... (finite ordinals)</li>
                    <li>ω (first infinite ordinal)</li>
                    <li>ω+1, ω+2, ... (successor ordinals)</li>
                    <li>ω·2 = ω+ω (limit ordinal)</li>
                    <li>ω², ω^ω, ε₀, ... (larger ordinals)</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>8.3 Ordinal Arithmetic</h3>
                
                <div className={styles.arithmetic}>
                  <h4>Operations (Non-commutative!)</h4>
                  <table className={styles.ordinalTable}>
                    <thead>
                      <tr>
                        <th>Expression</th>
                        <th>Result</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1 + ω</td>
                        <td>ω</td>
                        <td>Adding finite to left doesn't change</td>
                      </tr>
                      <tr>
                        <td>ω + 1</td>
                        <td>ω + 1</td>
                        <td>Successor of ω</td>
                      </tr>
                      <tr>
                        <td>ω · 2</td>
                        <td>ω + ω</td>
                        <td>Two copies of ω</td>
                      </tr>
                      <tr>
                        <td>2 · ω</td>
                        <td>ω</td>
                        <td>ω pairs = ω</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={styles.section}>
                <h3>8.4 Transfinite Induction</h3>
                
                <div className={styles.principle}>
                  <h4>Principle</h4>
                  <p>
                    To prove P(α) for all ordinals α:
                  </p>
                  <ol>
                    <li><strong>Base:</strong> Prove P(0)</li>
                    <li><strong>Successor:</strong> If P(α), then P(α+1)</li>
                    <li><strong>Limit:</strong> If P(β) for all β {'<'} λ (λ limit), then P(λ)</li>
                  </ol>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={8} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module8') ? (
                  <button
                    onClick={() => markComplete('module8')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module9' && (
            <div className={styles.module}>
              <h2>Module 9: The Axiom of Choice</h2>
              
              <section className={styles.section}>
                <h3>9.1 Statement of the Axiom of Choice</h3>
                
                <div className={styles.definition}>
                  <h4>Axiom of Choice (AC)</h4>
                  <p>
                    For any collection of non-empty sets, there exists a function that selects
                    one element from each set.
                  </p>
                  <p className={styles.formal}>
                    If {'{Aᵢ | i ∈ I}'} is a family of non-empty sets, then ∏ᵢ∈ᵢ Aᵢ ≠ ∅
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>9.2 Equivalent Formulations</h3>
                
                <div className={styles.equivalents}>
                  <div className={styles.formulation}>
                    <h4>Zorn's Lemma</h4>
                    <p>
                      If every chain in a partially ordered set has an upper bound,
                      then the set has a maximal element.
                    </p>
                  </div>
                  
                  <div className={styles.formulation}>
                    <h4>Well-Ordering Theorem</h4>
                    <p>
                      Every set can be well-ordered.
                    </p>
                  </div>
                  
                  <div className={styles.formulation}>
                    <h4>Maximal Principle</h4>
                    <p>
                      Every vector space has a basis.
                    </p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>9.3 Applications of AC</h3>
                
                <div className={styles.applications}>
                  <h4>Results Requiring AC</h4>
                  <ul>
                    <li>Every vector space has a basis</li>
                    <li>The product of compact spaces is compact (Tychonoff)</li>
                    <li>Every field has an algebraic closure</li>
                    <li>Hahn-Banach theorem in functional analysis</li>
                  </ul>
                </div>

                <div className={styles.controversial}>
                  <h4>Controversial Consequences</h4>
                  <ul>
                    <li>Banach-Tarski Paradox: A ball can be decomposed and reassembled into two balls</li>
                    <li>Existence of non-measurable sets</li>
                    <li>Existence of bases for ℝ as a vector space over ℚ</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>9.4 Working Without AC</h3>
                
                <div className={styles.alternatives}>
                  <h4>Weaker Axioms</h4>
                  <ul>
                    <li><strong>Countable AC:</strong> AC for countable collections</li>
                    <li><strong>Dependent Choice:</strong> Sufficient for most analysis</li>
                    <li><strong>AC for finite sets:</strong> Provable in ZF</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={9} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module9') ? (
                  <button
                    onClick={() => markComplete('module9')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Module Completed!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeModule === 'module10' && (
            <div className={styles.module}>
              <h2>Module 10: Axiomatic Set Theory</h2>
              
              <section className={styles.section}>
                <h3>10.1 Why Axioms?</h3>
                
                <div className={styles.paradox}>
                  <h4>Russell's Paradox</h4>
                  <p>
                    Consider R = {'{x | x ∉ x}'} (the set of all sets that don't contain themselves)
                  </p>
                  <ul>
                    <li>If R ∈ R, then by definition R ∉ R</li>
                    <li>If R ∉ R, then by definition R ∈ R</li>
                  </ul>
                  <p className={styles.important}>
                    This paradox shows naive set theory is inconsistent!
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>10.2 The ZF Axioms</h3>
                
                <div className={styles.axioms}>
                  <div className={styles.axiom}>
                    <h4>1. Axiom of Extensionality</h4>
                    <p>Two sets are equal iff they have the same elements</p>
                    <p className={styles.formula}>∀A ∀B (A = B ↔ ∀x (x ∈ A ↔ x ∈ B))</p>
                  </div>
                  
                  <div className={styles.axiom}>
                    <h4>2. Axiom of Pairing</h4>
                    <p>For any two sets, there exists a set containing exactly them</p>
                    <p className={styles.formula}>∀a ∀b ∃c ∀x (x ∈ c ↔ x = a ∨ x = b)</p>
                  </div>
                  
                  <div className={styles.axiom}>
                    <h4>3. Axiom of Union</h4>
                    <p>For any set, there exists the union of its elements</p>
                    <p className={styles.formula}>∀A ∃B ∀x (x ∈ B ↔ ∃y (y ∈ A ∧ x ∈ y))</p>
                  </div>
                  
                  <div className={styles.axiom}>
                    <h4>4. Axiom of Power Set</h4>
                    <p>For any set, its power set exists</p>
                    <p className={styles.formula}>∀A ∃B ∀x (x ∈ B ↔ x ⊆ A)</p>
                  </div>
                  
                  <div className={styles.axiom}>
                    <h4>5. Axiom Schema of Separation</h4>
                    <p>Can form subsets using properties</p>
                    <p className={styles.formula}>∀A ∃B ∀x (x ∈ B ↔ x ∈ A ∧ φ(x))</p>
                  </div>
                  
                  <div className={styles.axiom}>
                    <h4>6. Axiom of Infinity</h4>
                    <p>An infinite set exists (containing ∅, {'{∅}'}, {'{∅, {∅}}'}, ...)</p>
                  </div>
                  
                  <div className={styles.axiom}>
                    <h4>7. Axiom Schema of Replacement</h4>
                    <p>The image of a set under a function is a set</p>
                  </div>
                  
                  <div className={styles.axiom}>
                    <h4>8. Axiom of Foundation</h4>
                    <p>Every non-empty set has an ∈-minimal element</p>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3>10.3 ZFC = ZF + AC</h3>
                <p>
                  The standard foundation of mathematics is ZFC: the ZF axioms plus the Axiom of Choice.
                </p>
                
                <div className={styles.consistency}>
                  <h4>Consistency and Completeness</h4>
                  <ul>
                    <li>ZFC is believed to be consistent (no contradictions)</li>
                    <li>By Gödel's theorems, ZFC cannot prove its own consistency</li>
                    <li>Many statements are independent of ZFC (CH, large cardinals)</li>
                  </ul>
                </div>
              </section>

              <section className={styles.section}>
                <h3>10.4 Beyond ZFC</h3>
                
                <div className={styles.extensions}>
                  <h4>Large Cardinal Axioms</h4>
                  <ul>
                    <li>Inaccessible cardinals</li>
                    <li>Measurable cardinals</li>
                    <li>Supercompact cardinals</li>
                  </ul>
                  <p>
                    These strengthen ZFC and decide some independent statements.
                  </p>
                </div>
              </section>

              <section className={styles.section}>
                <h3>Practice Problems</h3>
                <SetQuiz module={10} />
              </section>

              <div className={styles.moduleComplete}>
                {!completedModules.has('module10') ? (
                  <button
                    onClick={() => markComplete('module10')}
                    className={styles.completeButton}
                  >
                    Mark Module Complete
                  </button>
                ) : (
                  <div className={styles.completedMessage}>
                    ✅ Course Completed! Congratulations on mastering Set Theory!
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

export default SetsPage