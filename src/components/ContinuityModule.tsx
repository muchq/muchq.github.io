import React, { useState } from 'react';
import styles from '../styles/ModuleStyles.module.css';
import ContinuityChecker from './ContinuityChecker';
import HomeomorphismHunter from './HomeomorphismHunter';
import ProductTopologyExplorer from './ProductTopologyExplorer';

type TabType = 'checker' | 'hunter' | 'product';

const ContinuityModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('checker');

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'checker' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('checker')}
        >
          Continuity Checker
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'hunter' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('hunter')}
        >
          Homeomorphism Hunter
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'product' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('product')}
        >
          Product Topology
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'checker' && <ContinuityChecker />}
        {activeTab === 'hunter' && <HomeomorphismHunter />}
        {activeTab === 'product' && <ProductTopologyExplorer />}
      </div>
    </div>
  );
};

export default ContinuityModule;