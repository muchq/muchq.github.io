import React, { useState } from 'react';
import styles from './SetTheoryModule.module.css';
import VennDiagram from './VennDiagram';
import SetRelationExplorer from './SetRelationExplorer';

interface SetElement {
  id: string;
  value: string | number;
  color: string;
}

type TabType = 'builder' | 'venn' | 'relations';

const SetTheoryModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('builder');
  const [universe] = useState<SetElement[]>([
    { id: '1', value: 1, color: '#FF6B6B' },
    { id: '2', value: 2, color: '#4ECDC4' },
    { id: '3', value: 3, color: '#45B7D1' },
    { id: '4', value: 4, color: '#96CEB4' },
    { id: '5', value: 5, color: '#FECA57' },
    { id: '6', value: 6, color: '#DDA0DD' },
    { id: '7', value: 7, color: '#98D8C8' },
    { id: '8', value: 8, color: '#FFB6C1' },
  ]);

  // Initialize with example sets to make the module immediately interactive
  const [setA, setSetA] = useState<SetElement[]>([
    { id: '1', value: 1, color: '#FF6B6B' },
    { id: '2', value: 2, color: '#4ECDC4' },
    { id: '3', value: 3, color: '#45B7D1' },
  ]);
  const [setB, setSetB] = useState<SetElement[]>([
    { id: '2', value: 2, color: '#4ECDC4' },
    { id: '3', value: 3, color: '#45B7D1' },
    { id: '4', value: 4, color: '#96CEB4' },
    { id: '5', value: 5, color: '#FECA57' },
  ]);
  const [setC, setSetC] = useState<SetElement[]>([
    { id: '1', value: 1, color: '#FF6B6B' },
    { id: '3', value: 3, color: '#45B7D1' },
    { id: '5', value: 5, color: '#FECA57' },
    { id: '7', value: 7, color: '#98D8C8' },
  ]);
  const [draggedElement, setDraggedElement] = useState<SetElement | null>(null);
  const [selectedDefinitionType, setSelectedDefinitionType] = useState<'listing' | 'property'>('listing');

  const handleDragStart = (element: SetElement) => {
    setDraggedElement(element);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropToSet = (
    e: React.DragEvent,
    targetSet: SetElement[],
    setTargetSet: React.Dispatch<React.SetStateAction<SetElement[]>>
  ) => {
    e.preventDefault();
    if (draggedElement && !targetSet.find(el => el.id === draggedElement.id)) {
      setTargetSet([...targetSet, draggedElement]);
    }
  };

  const removeFromSet = (
    element: SetElement,
    set: SetElement[],
    setSet: React.Dispatch<React.SetStateAction<SetElement[]>>
  ) => {
    setSet(set.filter(el => el.id !== element.id));
  };

  const clearSet = (setSet: React.Dispatch<React.SetStateAction<SetElement[]>>) => {
    setSet([]);
  };

  const loadExampleSets = () => {
    // Load interesting example sets that demonstrate various relationships
    setSetA([
      { id: '1', value: 1, color: '#FF6B6B' },
      { id: '2', value: 2, color: '#4ECDC4' },
      { id: '3', value: 3, color: '#45B7D1' },
    ]);
    setSetB([
      { id: '2', value: 2, color: '#4ECDC4' },
      { id: '3', value: 3, color: '#45B7D1' },
      { id: '4', value: 4, color: '#96CEB4' },
      { id: '5', value: 5, color: '#FECA57' },
    ]);
    setSetC([
      { id: '1', value: 1, color: '#FF6B6B' },
      { id: '3', value: 3, color: '#45B7D1' },
      { id: '5', value: 5, color: '#FECA57' },
      { id: '7', value: 7, color: '#98D8C8' },
    ]);
  };

  const getPropertyDefinition = (set: SetElement[]): string => {
    if (set.length === 0) return '∅ (empty set)';
    
    const values = set.map(el => el.value as number).sort((a, b) => a - b);
    
    // Check for even numbers
    const allEven = values.every(v => v % 2 === 0);
    if (allEven && values.length > 0) {
      return '{ x | x is even }';
    }
    
    // Check for odd numbers
    const allOdd = values.every(v => v % 2 === 1);
    if (allOdd && values.length > 0) {
      return '{ x | x is odd }';
    }
    
    // Check for range
    if (values.length > 1) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const isConsecutive = values.every((v, i) => i === 0 || v === values[i - 1] + 1);
      if (isConsecutive) {
        return `{ x | ${min} ≤ x ≤ ${max} }`;
      }
    }
    
    // Check for greater than
    if (values.length > 0) {
      const min = Math.min(...values);
      if (values.every(v => v >= min)) {
        return `{ x | x ≥ ${min} }`;
      }
    }
    
    // Default to listing
    return `{ ${values.join(', ')} }`;
  };

  const renderSetBuilder = () => (
    <div className={styles.setBuilder}>
      <div className={styles.instructions}>
        <h3>Interactive Set Builder</h3>
        <p>Drag elements from the universe to create sets. See how sets can be defined by listing elements or by properties.</p>
      </div>
      
      <div className={styles.universe}>
        <h4>Universe U = {'{1, 2, 3, 4, 5, 6, 7, 8}'}</h4>
        <div className={styles.elementGrid}>
          {universe.map(element => (
            <div
              key={element.id}
              className={styles.element}
              style={{ backgroundColor: element.color }}
              draggable
              onDragStart={() => handleDragStart(element)}
            >
              {element.value}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.definitionToggle}>
        <button
          className={`${styles.toggleButton} ${selectedDefinitionType === 'listing' ? styles.active : ''}`}
          onClick={() => setSelectedDefinitionType('listing')}
        >
          List Definition
        </button>
        <button
          className={`${styles.toggleButton} ${selectedDefinitionType === 'property' ? styles.active : ''}`}
          onClick={() => setSelectedDefinitionType('property')}
        >
          Property Definition
        </button>
        <button
          className={styles.toggleButton}
          onClick={loadExampleSets}
          style={{ marginLeft: '2rem' }}
        >
          Load Example Sets
        </button>
      </div>

      <div className={styles.sets}>
        <div className={styles.setContainer}>
          <div className={styles.setHeader}>
            <h4>Set A</h4>
            <button className={styles.clearButton} onClick={() => clearSet(setSetA)}>Clear</button>
          </div>
          <div
            className={styles.setDropZone}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToSet(e, setA, setSetA)}
          >
            {setA.length === 0 ? (
              <p className={styles.emptyMessage}>Drop elements here</p>
            ) : (
              <div className={styles.setElements}>
                {setA.map(element => (
                  <div
                    key={element.id}
                    className={styles.setElement}
                    style={{ backgroundColor: element.color }}
                    onClick={() => removeFromSet(element, setA, setSetA)}
                  >
                    {element.value}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.setDefinition}>
            {selectedDefinitionType === 'listing'
              ? `A = { ${setA.map(el => el.value).join(', ')} }`
              : `A = ${getPropertyDefinition(setA)}`}
          </div>
        </div>

        <div className={styles.setContainer}>
          <div className={styles.setHeader}>
            <h4>Set B</h4>
            <button className={styles.clearButton} onClick={() => clearSet(setSetB)}>Clear</button>
          </div>
          <div
            className={styles.setDropZone}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToSet(e, setB, setSetB)}
          >
            {setB.length === 0 ? (
              <p className={styles.emptyMessage}>Drop elements here</p>
            ) : (
              <div className={styles.setElements}>
                {setB.map(element => (
                  <div
                    key={element.id}
                    className={styles.setElement}
                    style={{ backgroundColor: element.color }}
                    onClick={() => removeFromSet(element, setB, setSetB)}
                  >
                    {element.value}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.setDefinition}>
            {selectedDefinitionType === 'listing'
              ? `B = { ${setB.map(el => el.value).join(', ')} }`
              : `B = ${getPropertyDefinition(setB)}`}
          </div>
        </div>

        <div className={styles.setContainer}>
          <div className={styles.setHeader}>
            <h4>Set C</h4>
            <button className={styles.clearButton} onClick={() => clearSet(setSetC)}>Clear</button>
          </div>
          <div
            className={styles.setDropZone}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropToSet(e, setC, setSetC)}
          >
            {setC.length === 0 ? (
              <p className={styles.emptyMessage}>Drop elements here</p>
            ) : (
              <div className={styles.setElements}>
                {setC.map(element => (
                  <div
                    key={element.id}
                    className={styles.setElement}
                    style={{ backgroundColor: element.color }}
                    onClick={() => removeFromSet(element, setC, setSetC)}
                  >
                    {element.value}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.setDefinition}>
            {selectedDefinitionType === 'listing'
              ? `C = { ${setC.map(el => el.value).join(', ')} }`
              : `C = ${getPropertyDefinition(setC)}`}
          </div>
        </div>
      </div>

      <div className={styles.tips}>
        <h4>💡 Tips:</h4>
        <ul>
          <li>Drag elements from the universe to add them to sets</li>
          <li>Click elements in sets to remove them</li>
          <li>Switch between list and property definitions to see different representations</li>
          <li>Try creating sets with patterns (all even, all odd, consecutive numbers)</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className={styles.module}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'builder' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          Set Builder
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'venn' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('venn')}
        >
          Venn Diagrams
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'relations' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('relations')}
        >
          Set Relations
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'builder' && renderSetBuilder()}
        {activeTab === 'venn' && (
          <VennDiagram 
            setA={setA.map(el => el.value as number)}
            setB={setB.map(el => el.value as number)}
            setC={setC.map(el => el.value as number)}
          />
        )}
        {activeTab === 'relations' && (
          <SetRelationExplorer
            setA={setA.map(el => el.value as number)}
            setB={setB.map(el => el.value as number)}
            setC={setC.map(el => el.value as number)}
          />
        )}
      </div>
    </div>
  );
};

export default SetTheoryModule;