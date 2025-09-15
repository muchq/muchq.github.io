import React, { useState } from 'react';
import styles from '@/styles/ModuleStyles.module.css';
import FunctionMachine from './FunctionMachine';
import CompositionLab from './CompositionLab';
import EquivalenceRelationBuilder from './EquivalenceRelationBuilder';

type TabType = 'machine' | 'composition' | 'equivalence';

const FunctionsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('machine');

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'machine' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('machine')}
        >
          Function Machine
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'composition' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('composition')}
        >
          Composition Lab
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'equivalence' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('equivalence')}
        >
          Equivalence Relations
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'machine' && <FunctionMachine />}
        {activeTab === 'composition' && <CompositionLab />}
        {activeTab === 'equivalence' && <EquivalenceRelationBuilder />}
      </div>
    </div>
  );
};

export default FunctionsModule;