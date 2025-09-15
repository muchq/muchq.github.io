import React, { useState } from 'react';
import styles from '@/styles/ModuleStyles.module.css';
import SeparationAxiomLab from './SeparationAxiomLab';
import HausdorffDetective from './HausdorffDetective';
import RegularNormalConstructor from './RegularNormalConstructor';

type TabType = 'laboratory' | 'hausdorff' | 'regular';

const SeparationAxiomsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('laboratory');

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'laboratory' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('laboratory')}
        >
          Axiom Laboratory
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'hausdorff' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('hausdorff')}
        >
          Hausdorff Detective
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'regular' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('regular')}
        >
          Regular/Normal Spaces
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'laboratory' && <SeparationAxiomLab />}
        {activeTab === 'hausdorff' && <HausdorffDetective />}
        {activeTab === 'regular' && <RegularNormalConstructor />}
      </div>
    </div>
  );
};

export default SeparationAxiomsModule;