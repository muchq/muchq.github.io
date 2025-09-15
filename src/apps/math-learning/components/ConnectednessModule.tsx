import React, { useState } from 'react';
import styles from './ConnectednessModule.module.css';
import SpaceCutter from './SpaceCutter';
import ConnectedComponentFinder from './ConnectedComponentFinder';
import PathHomotopyAnimator from './PathHomotopyAnimator';

type TabType = 'cutter' | 'components' | 'homotopy';

const ConnectednessModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('cutter');

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'cutter' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('cutter')}
        >
          Space Cutter
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'components' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('components')}
        >
          Component Finder
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'homotopy' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('homotopy')}
        >
          Path Homotopy
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'cutter' && <SpaceCutter />}
        {activeTab === 'components' && <ConnectedComponentFinder />}
        {activeTab === 'homotopy' && <PathHomotopyAnimator />}
      </div>
    </div>
  );
};

export default ConnectednessModule;