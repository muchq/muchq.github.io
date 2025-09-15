import React, { useState } from 'react';
import styles from '@/styles/ModuleStyles.module.css';
import TopologyGenerator from './TopologyGenerator';
import OpenSetInvestigator from './OpenSetInvestigator';
import BasisBuilder from './BasisBuilder';

type TabType = 'generator' | 'investigator' | 'basis';

const TopologicalSpacesModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('generator');

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'generator' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          Topology Generator
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'investigator' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('investigator')}
        >
          Open Set Investigator
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'basis' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('basis')}
        >
          Basis Builder
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'generator' && <TopologyGenerator />}
        {activeTab === 'investigator' && <OpenSetInvestigator />}
        {activeTab === 'basis' && <BasisBuilder />}
      </div>
    </div>
  );
};

export default TopologicalSpacesModule;