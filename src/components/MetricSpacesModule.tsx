import React, { useState } from 'react';
import styles from './MetricSpacesModule.module.css';
import DistanceFunctionDesigner from './DistanceFunctionDesigner';
import BallVisualizer from './BallVisualizer';
import SequenceConvergence from './SequenceConvergence';

type TabType = 'designer' | 'balls' | 'sequences';

const MetricSpacesModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('designer');

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'designer' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('designer')}
        >
          Distance Functions
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'balls' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('balls')}
        >
          Balls & Neighborhoods
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'sequences' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('sequences')}
        >
          Sequence Convergence
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'designer' && <DistanceFunctionDesigner />}
        {activeTab === 'balls' && <BallVisualizer />}
        {activeTab === 'sequences' && <SequenceConvergence />}
      </div>
    </div>
  );
};

export default MetricSpacesModule;