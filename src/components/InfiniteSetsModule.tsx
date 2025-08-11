import React, { useState } from 'react';
import styles from '../styles/ModuleStyles.module.css';
import BijectionConstructor from './BijectionConstructor';
import CantorDiagonalGame from './CantorDiagonalGame';
import CardinalArithmetic from './CardinalArithmetic';
import LargeCardinalsExplorer from './LargeCardinalsExplorer';

type TabType = 'bijection' | 'diagonal' | 'arithmetic' | 'large';

const InfiniteSetsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('bijection');

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'bijection' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('bijection')}
        >
          Bijection Constructor
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'diagonal' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('diagonal')}
        >
          Cantor's Diagonal
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'arithmetic' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('arithmetic')}
        >
          Cardinal Arithmetic
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'large' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('large')}
        >
          Large Cardinals
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'bijection' && <BijectionConstructor />}
        {activeTab === 'diagonal' && <CantorDiagonalGame />}
        {activeTab === 'arithmetic' && <CardinalArithmetic />}
        {activeTab === 'large' && <LargeCardinalsExplorer />}
      </div>
    </div>
  );
};

export default InfiniteSetsModule;