import React, { useState } from 'react';
import OpenCoverSimulator from './OpenCoverSimulator';
import SequentialCompactnessExplorer from './SequentialCompactnessExplorer';
import TychonoffVisualizer from './TychonoffVisualizer';
import CompactHausdorffExplorer from './CompactHausdorffExplorer';
import styles from '../styles/ModuleStyles.module.css';

type TabType = 'learn' | 'opencover' | 'sequential' | 'hausdorff' | 'tychonoff';

const CompactnessModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('learn');

  const renderContent = () => {
    switch (activeTab) {
      case 'learn':
        return (
          <div className={styles.learnContent}>
            <section className={styles.concept}>
              <h2>What is Compactness?</h2>
              <p>
                Compactness is one of the most important concepts in topology. A topological space is 
                <strong> compact</strong> if every open cover has a finite subcover.
              </p>
              <div className={styles.definition}>
                <h3>Definition</h3>
                <p>
                  A topological space (X, τ) is <em>compact</em> if for every collection of open sets 
                  {"{"}U<sub>α</sub>{"}"} where ⋃U<sub>α</sub> = X, there exists a finite subcollection 
                  {"{"}U<sub>1</sub>, ..., U<sub>n</sub>{"}"} such that U<sub>1</sub> ∪ ... ∪ U<sub>n</sub> = X.
                </p>
              </div>
            </section>

            <section className={styles.concept}>
              <h2>Sequential Compactness</h2>
              <p>
                In metric spaces, compactness is equivalent to sequential compactness:
              </p>
              <div className={styles.theorem}>
                <h3>Theorem</h3>
                <p>
                  A metric space is compact if and only if every sequence has a convergent subsequence.
                </p>
              </div>
            </section>

            <section className={styles.concept}>
              <h2>Compact Hausdorff Spaces</h2>
              <p>
                Compact Hausdorff spaces are particularly well-behaved and combine two of the most important 
                topological properties. They are central to many areas of mathematics.
              </p>
              <div className={styles.theorem}>
                <h3>Key Properties of Compact Hausdorff Spaces</h3>
                <ul>
                  <li><strong>Normal:</strong> Every compact Hausdorff space is normal (disjoint closed sets have disjoint open neighborhoods)</li>
                  <li><strong>Closed Maps:</strong> Continuous functions from compact spaces to Hausdorff spaces are closed maps</li>
                  <li><strong>Unique Limits:</strong> Sequences and nets have at most one limit</li>
                  <li><strong>Metrizable (if second-countable):</strong> By the Urysohn metrization theorem</li>
                </ul>
              </div>
              <div className={styles.definition}>
                <h3>Why They Matter</h3>
                <p>
                  Compact Hausdorff spaces are the "nice" spaces of topology:
                </p>
                <ul>
                  <li>They are precisely the spaces where continuous real-valued functions separate points</li>
                  <li>The Stone-Čech compactification embeds any completely regular space into a compact Hausdorff space</li>
                  <li>They form the foundation for C*-algebras and functional analysis</li>
                  <li>Compact subspaces of Hausdorff spaces are always closed</li>
                </ul>
              </div>
            </section>

            <section className={styles.concept}>
              <h2>Tychonoff's Theorem</h2>
              <p>
                One of the most fundamental results in topology:
              </p>
              <div className={styles.theorem}>
                <h3>Tychonoff's Theorem</h3>
                <p>
                  The product of any collection of compact topological spaces is compact in the 
                  product topology.
                </p>
              </div>
            </section>

            <section className={styles.concept}>
              <h2>Examples</h2>
              <div className={styles.examples}>
                <div className={styles.example}>
                  <h3>Compact Hausdorff Spaces</h3>
                  <ul>
                    <li>[0, 1] in the usual topology</li>
                    <li>The unit circle S¹</li>
                    <li>The n-sphere Sⁿ</li>
                    <li>Any closed bounded subset of ℝⁿ</li>
                    <li>The Cantor set</li>
                    <li>Stone-Čech compactification βX</li>
                  </ul>
                </div>
                <div className={styles.example}>
                  <h3>Compact but not Hausdorff</h3>
                  <ul>
                    <li>Any finite space with indiscrete topology</li>
                    <li>Sierpiński space {"{"} 0, 1 {"}"} with topology {"{"} {"{"} {"}"}, {"{"} 0 {"}"}, {"{"} 0, 1 {"}"} {"}"}</li>
                    <li>Cofinite topology on infinite sets</li>
                  </ul>
                </div>
                <div className={styles.example}>
                  <h3>Non-Compact Spaces</h3>
                  <ul>
                    <li>ℝ with the usual topology</li>
                    <li>(0, 1) open interval</li>
                    <li>ℕ with the discrete topology</li>
                    <li>Any infinite discrete space</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        );
      case 'opencover':
        return <OpenCoverSimulator />;
      case 'sequential':
        return <SequentialCompactnessExplorer />;
      case 'hausdorff':
        return <CompactHausdorffExplorer />;
      case 'tychonoff':
        return <TychonoffVisualizer />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'learn' ? styles.active : ''}`}
          onClick={() => setActiveTab('learn')}
        >
          Learn
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'opencover' ? styles.active : ''}`}
          onClick={() => setActiveTab('opencover')}
        >
          Open Cover Simulator
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'sequential' ? styles.active : ''}`}
          onClick={() => setActiveTab('sequential')}
        >
          Sequential Compactness
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'hausdorff' ? styles.active : ''}`}
          onClick={() => setActiveTab('hausdorff')}
        >
          Compact Hausdorff
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'tychonoff' ? styles.active : ''}`}
          onClick={() => setActiveTab('tychonoff')}
        >
          Tychonoff's Theorem
        </button>
      </div>
      <div className={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

export default CompactnessModule;