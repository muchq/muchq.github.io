import { Link } from 'react-router-dom'
import { ModuleType } from '@/hooks/useTopologyQuest'
import styles from './TopologyQuestNav.module.css'

interface TopologyQuestNavProps {
  activeModule: ModuleType
  onModuleChange?: (module: ModuleType) => void
}

const TopologyQuestNav = ({ activeModule }: TopologyQuestNavProps) => {
  const getPhaseForModule = (module: ModuleType): string => {
    switch (module) {
      case 'sets':
      case 'functions':
      case 'infinite':
      case 'metric':
        return 'Before Topology';
      case 'topological':
      case 'continuity':
      case 'separation':
        return 'Core Topology';
      case 'compactness':
      case 'connectedness':
      case 'functionspaces':
        return 'More Topology';
      default:
        return '';
    }
  };

  const currentPhase = getPhaseForModule(activeModule);

  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <ul className={styles.phaseButtons}>
          {/* Before Topology Phase */}
          <li className={styles.phaseDropdown}>
            <button
              className={`${styles.phaseButton} ${currentPhase === 'Before Topology' ? styles.activePhase : ''}`}
            >
              Before Topology
            </button>
            <div className={styles.dropdownMenu}>
              <Link
                to="/top/sets"
                className={`${styles.moduleOption} ${activeModule === 'sets' ? styles.activeModule : ''}`}
              >
                Set Theory
              </Link>
              <Link
                to="/top/functions"
                className={`${styles.moduleOption} ${activeModule === 'functions' ? styles.activeModule : ''}`}
              >
                Functions
              </Link>
              <Link
                to="/top/infinite"
                className={`${styles.moduleOption} ${activeModule === 'infinite' ? styles.activeModule : ''}`}
              >
                Infinite Sets
              </Link>
              <Link
                to="/top/metric"
                className={`${styles.moduleOption} ${activeModule === 'metric' ? styles.activeModule : ''}`}
              >
                Metric Spaces
              </Link>
            </div>
          </li>

          {/* Core Topology Phase */}
          <li className={styles.phaseDropdown}>
            <button
              className={`${styles.phaseButton} ${currentPhase === 'Core Topology' ? styles.activePhase : ''}`}
            >
              Core Topology
            </button>
            <div className={styles.dropdownMenu}>
              <Link
                to="/top/topological"
                className={`${styles.moduleOption} ${activeModule === 'topological' ? styles.activeModule : ''}`}
              >
                Topological Spaces
              </Link>
              <Link
                to="/top/continuity"
                className={`${styles.moduleOption} ${activeModule === 'continuity' ? styles.activeModule : ''}`}
              >
                Continuity & Homeomorphism
              </Link>
              <Link
                to="/top/separation"
                className={`${styles.moduleOption} ${activeModule === 'separation' ? styles.activeModule : ''}`}
              >
                Separation Axioms
              </Link>
            </div>
          </li>

          {/* More Topology Phase */}
          <li className={styles.phaseDropdown}>
            <button
              className={`${styles.phaseButton} ${currentPhase === 'More Topology' ? styles.activePhase : ''}`}
            >
              More Topology
            </button>
            <div className={styles.dropdownMenu}>
              <Link
                to="/top/compactness"
                className={`${styles.moduleOption} ${activeModule === 'compactness' ? styles.activeModule : ''}`}
              >
                Compactness
              </Link>
              <Link
                to="/top/connectedness"
                className={`${styles.moduleOption} ${activeModule === 'connectedness' ? styles.activeModule : ''}`}
              >
                Connectedness
              </Link>
              <Link
                to="/top/functionspaces"
                className={`${styles.moduleOption} ${activeModule === 'functionspaces' ? styles.activeModule : ''}`}
              >
                Function Spaces
              </Link>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default TopologyQuestNav
