import { useState } from 'react'
import styles from './TracySceneEditor.module.css'

interface Sphere {
  center: [number, number, number]
  radius: number
  color: [number, number, number]
  specular: number
  reflective: number
}

interface Light {
  lightType: 'ambient' | 'point' | 'directional'
  intensity: number
  position: [number, number, number]
}

interface SceneData {
  scene: {
    backgroundColor: [number, number, number]
    backgroundStarProbability: number
    spheres: Sphere[]
    lights: Light[]
  }
  perspective: {
    cameraPosition: [number, number, number]
    cameraFocus: [number, number, number]
  }
  output: {
    width: number
    height: number
  }
}

interface TracySceneEditorProps {
  onRender: (sceneData: SceneData) => void
  isLoading: boolean
}

const defaultScene: SceneData = {
  scene: {
    backgroundColor: [0, 0, 0],
    backgroundStarProbability: 0.0006,
    spheres: [
      {
        center: [0.0, -1.0, 3.0],
        radius: 1.0,
        color: [255, 0, 0],
        specular: 500.0,
        reflective: 0.55
      },
      {
        center: [2.0, 0.0, 4.0],
        radius: 1.0,
        color: [0, 0, 255],
        specular: 500.0,
        reflective: 0.3
      },
      {
        center: [-2.0, 0.0, 4.0],
        radius: 1.0,
        color: [0, 255, 0],
        specular: 10.0,
        reflective: 0.4
      },
      {
        center: [0.0, -5001.0, 8.0],
        radius: 5000.0,
        color: [64, 64, 64],
        specular: 1000.0,
        reflective: 0.2
      }
    ],
    lights: [
      {
        lightType: 'ambient',
        intensity: 0.2,
        position: [0.0, 0.0, 0.0]
      },
      {
        lightType: 'point',
        intensity: 0.6,
        position: [2.0, 1.0, 0.0]
      },
      {
        lightType: 'directional',
        intensity: 0.2,
        position: [1.0, 4.0, 4.0]
      }
    ]
  },
  perspective: {
    cameraPosition: [0.0, 0.0, -5.0],
    cameraFocus: [0.0, 0.0, 0.0]
  },
  output: {
    width: 800,
    height: 640
  }
}

const TracySceneEditor: React.FC<TracySceneEditorProps> = ({ onRender, isLoading }) => {
  const [sceneData, setSceneData] = useState<SceneData>(defaultScene)
  const [activeTab, setActiveTab] = useState<'spheres' | 'lights' | 'camera' | 'background'>('spheres')
  const [selectedSphere, setSelectedSphere] = useState<number | null>(null)
  const [selectedLight, setSelectedLight] = useState<number | null>(null)
  
  // Track raw input values to preserve intermediate decimal representations
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({})

  // Helper to get current input value (raw string or fallback to numeric value)
  const getInputValue = (key: string, fallbackValue: number): string => {
    return inputValues[key] ?? fallbackValue.toString()
  }

  // Helper to set input value (both raw string and parsed numeric)
  const setInputValue = (key: string, stringValue: string, updateSceneData: () => void) => {
    // Update raw input value
    setInputValues(prev => ({ ...prev, [key]: stringValue }))
    
    // Update scene data with parsed numeric value
    updateSceneData()
  }

  const handleSphereChange = (index: number, field: keyof Sphere, value: string | { subIndex: string; value: string }) => {
    const newSpheres = [...sceneData.scene.spheres]
    if (field === 'center' || field === 'color') {
      if (typeof value === 'object' && 'subIndex' in value) {
        const subIndex = parseInt(value.subIndex)
        ;(newSpheres[index][field] as number[])[subIndex] = parseFloat(value.value) || 0
      }
    } else {
      newSpheres[index][field] = parseFloat(value as string) || 0
    }
    setSceneData({
      ...sceneData,
      scene: { ...sceneData.scene, spheres: newSpheres }
    })
  }

  const handleLightChange = (index: number, field: keyof Light, value: string | { subIndex: string; value: string }) => {
    const newLights = [...sceneData.scene.lights]
    if (field === 'position') {
      if (typeof value === 'object' && 'subIndex' in value) {
        const subIndex = parseInt(value.subIndex)
        ;(newLights[index][field] as number[])[subIndex] = parseFloat(value.value) || 0
      }
    } else if (field === 'intensity') {
      newLights[index][field] = parseFloat(value as string) || 0
    } else if (field === 'lightType') {
      newLights[index][field] = value as 'ambient' | 'point' | 'directional'
    }
    setSceneData({
      ...sceneData,
      scene: { ...sceneData.scene, lights: newLights }
    })
  }

  const addSphere = () => {
    const newSphere: Sphere = {
      center: [0, 0, 0],
      radius: 1.0,
      color: [128, 128, 128],
      specular: 100.0,
      reflective: 0.2
    }
    setSceneData({
      ...sceneData,
      scene: { ...sceneData.scene, spheres: [...sceneData.scene.spheres, newSphere] }
    })
  }

  const removeSphere = (index: number) => {
    const newSpheres = sceneData.scene.spheres.filter((_, i) => i !== index)
    setSceneData({
      ...sceneData,
      scene: { ...sceneData.scene, spheres: newSpheres }
    })
    setSelectedSphere(null)
  }

  const addLight = () => {
    const newLight: Light = {
      lightType: 'point',
      intensity: 0.5,
      position: [0, 0, 0]
    }
    setSceneData({
      ...sceneData,
      scene: { ...sceneData.scene, lights: [...sceneData.scene.lights, newLight] }
    })
  }

  const removeLight = (index: number) => {
    const newLights = sceneData.scene.lights.filter((_, i) => i !== index)
    setSceneData({
      ...sceneData,
      scene: { ...sceneData.scene, lights: newLights }
    })
    setSelectedLight(null)
  }

  const handleCameraChange = (field: 'position' | 'focus', axis: number, value: string) => {
    const newPerspective = { ...sceneData.perspective }
    if (field === 'position') {
      newPerspective.cameraPosition[axis] = parseFloat(value) || 0
    } else {
      newPerspective.cameraFocus[axis] = parseFloat(value) || 0
    }
    setSceneData({
      ...sceneData,
      perspective: newPerspective
    })
  }

  const handleBackgroundChange = (field: string, value: string | { index: number; value: string }) => {
    if (field === 'backgroundColor') {
      if (typeof value === 'object' && 'index' in value) {
        const newColor = [...sceneData.scene.backgroundColor]
        const parsedValue = Math.max(0, Math.min(255, parseInt(value.value) || 0))
        newColor[value.index] = parsedValue
        setSceneData({
          ...sceneData,
          scene: { ...sceneData.scene, backgroundColor: newColor as [number, number, number] }
        })
      }
    } else if (field === 'backgroundStarProbability') {
      setSceneData({
        ...sceneData,
        scene: { ...sceneData.scene, backgroundStarProbability: parseFloat(value as string) || 0 }
      })
    }
  }

  const handleRender = () => {
    onRender(sceneData)
  }

  const resetScene = () => {
    setSceneData(defaultScene)
    setSelectedSphere(null)
    setSelectedLight(null)
  }

  return (
    <div className={styles.editor}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'spheres' ? styles.active : ''}`}
          onClick={() => setActiveTab('spheres')}
        >
          Spheres
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'lights' ? styles.active : ''}`}
          onClick={() => setActiveTab('lights')}
        >
          Lights
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'camera' ? styles.active : ''}`}
          onClick={() => setActiveTab('camera')}
        >
          Camera
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'background' ? styles.active : ''}`}
          onClick={() => setActiveTab('background')}
        >
          Background
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'spheres' && (
          <div className={styles.section}>
            <div className={styles.itemList}>
              {sceneData.scene.spheres.map((sphere, index) => (
                <div
                  key={index}
                  className={`${styles.item} ${selectedSphere === index ? styles.selected : ''}`}
                  onClick={() => setSelectedSphere(index)}
                >
                  <div className={styles.itemPreview}>
                    <div
                      className={styles.colorSwatch}
                      style={{
                        backgroundColor: `rgb(${sphere.color[0]}, ${sphere.color[1]}, ${sphere.color[2]})`
                      }}
                    />
                    <span>Sphere {index + 1}</span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSphere(index)
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addSphere}>
                + Add Sphere
              </button>
            </div>

            {selectedSphere !== null && (
              <div className={styles.properties}>
                <h3>Sphere Properties</h3>
                <div className={styles.inputGroup}>
                  <label>Position (X, Y, Z)</label>
                  <div className={styles.vectorInput}>
                    {[0, 1, 2].map((i) => (
                      <input
                        key={i}
                        type="number"
                        step="0.1"
                        value={getInputValue(`sphere-${selectedSphere}-center-${i}`, sceneData.scene.spheres[selectedSphere].center[i])}
                        placeholder="0"
                        onChange={(e) =>
                          setInputValue(
                            `sphere-${selectedSphere}-center-${i}`,
                            e.target.value,
                            () => handleSphereChange(selectedSphere, 'center', {
                              subIndex: i.toString(),
                              value: e.target.value
                            })
                          )
                        }
                        onFocus={(e) => e.target.select()}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Radius</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={sceneData.scene.spheres[selectedSphere].radius?.toString() ?? ''}
                    placeholder="1.0"
                    onChange={(e) => handleSphereChange(selectedSphere, 'radius', e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Color (R, G, B)</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      value={`#${sceneData.scene.spheres[selectedSphere].color.map(c => Math.round(c || 0).toString(16).padStart(2, '0')).join('')}`}
                      onChange={(e) => {
                        const hex = e.target.value.substring(1)
                        const r = parseInt(hex.substring(0, 2), 16)
                        const g = parseInt(hex.substring(2, 4), 16)
                        const b = parseInt(hex.substring(4, 6), 16)
                        const newSpheres = [...sceneData.scene.spheres]
                        newSpheres[selectedSphere].color = [r, g, b]
                        setSceneData({
                          ...sceneData,
                          scene: { ...sceneData.scene, spheres: newSpheres }
                        })
                      }}
                      className={styles.colorPicker}
                    />
                    <div className={styles.vectorInput}>
                      {[0, 1, 2].map((i) => (
                        <input
                          key={i}
                          type="number"
                          min="0"
                          max="255"
                          value={sceneData.scene.spheres[selectedSphere].color[i]?.toString() ?? ''}
                          placeholder={['255', '0', '0'][i]}
                          onChange={(e) =>
                            handleSphereChange(selectedSphere, 'color', {
                              subIndex: i.toString(),
                              value: e.target.value
                            })
                          }
                          onFocus={(e) => e.target.select()}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Specular</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={sceneData.scene.spheres[selectedSphere].specular?.toString() ?? ''}
                    placeholder="100"
                    onChange={(e) => handleSphereChange(selectedSphere, 'specular', e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Reflective</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={getInputValue(`sphere-${selectedSphere}-reflective`, sceneData.scene.spheres[selectedSphere].reflective)}
                    placeholder="0.2"
                    onChange={(e) =>
                      setInputValue(
                        `sphere-${selectedSphere}-reflective`,
                        e.target.value,
                        () => handleSphereChange(selectedSphere, 'reflective', e.target.value)
                      )
                    }
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lights' && (
          <div className={styles.section}>
            <div className={styles.itemList}>
              {sceneData.scene.lights.map((light, index) => (
                <div
                  key={index}
                  className={`${styles.item} ${selectedLight === index ? styles.selected : ''}`}
                  onClick={() => setSelectedLight(index)}
                >
                  <span>{light.lightType} Light {index + 1}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeLight(index)
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={addLight}>
                + Add Light
              </button>
            </div>

            {selectedLight !== null && (
              <div className={styles.properties}>
                <h3>Light Properties</h3>
                <div className={styles.inputGroup}>
                  <label>Type</label>
                  <select
                    value={sceneData.scene.lights[selectedLight].lightType}
                    onChange={(e) =>
                      handleLightChange(selectedLight, 'lightType', e.target.value)
                    }
                  >
                    <option value="ambient">Ambient</option>
                    <option value="point">Point</option>
                    <option value="directional">Directional</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Intensity</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={getInputValue(`light-${selectedLight}-intensity`, sceneData.scene.lights[selectedLight].intensity)}
                    placeholder="0.5"
                    onChange={(e) =>
                      setInputValue(
                        `light-${selectedLight}-intensity`,
                        e.target.value,
                        () => handleLightChange(selectedLight, 'intensity', e.target.value)
                      )
                    }
                    onFocus={(e) => e.target.select()}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Position (X, Y, Z)</label>
                  <div className={styles.vectorInput}>
                    {[0, 1, 2].map((i) => (
                      <input
                        key={i}
                        type="number"
                        step="0.1"
                        value={sceneData.scene.lights[selectedLight].position[i]?.toString() ?? ''}
                        placeholder="0"
                        onChange={(e) =>
                          handleLightChange(selectedLight, 'position', {
                            subIndex: i.toString(),
                            value: e.target.value
                          })
                        }
                        onFocus={(e) => e.target.select()}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'camera' && (
          <div className={styles.section}>
            <div className={styles.properties}>
              <h3>Camera Settings</h3>
              <div className={styles.inputGroup}>
                <label>Camera Position (X, Y, Z)</label>
                <div className={styles.vectorInput}>
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="number"
                      step="0.5"
                      value={sceneData.perspective.cameraPosition[i]?.toString() ?? ''}
                      placeholder="0"
                      onChange={(e) => handleCameraChange('position', i, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Camera Focus (X, Y, Z)</label>
                <div className={styles.vectorInput}>
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="number"
                      step="0.5"
                      value={sceneData.perspective.cameraFocus[i]?.toString() ?? ''}
                      placeholder="0"
                      onChange={(e) => handleCameraChange('focus', i, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Output Resolution</label>
                <div className={styles.vectorInput}>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="10"
                    value={sceneData.output.width?.toString() ?? ''}
                    placeholder="800"
                    onChange={(e) =>
                      setSceneData({
                        ...sceneData,
                        output: { ...sceneData.output, width: parseInt(e.target.value) || 800 }
                      })
                    }
                    onFocus={(e) => e.target.select()}
                  />
                  <span>×</span>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="10"
                    value={sceneData.output.height?.toString() ?? ''}
                    placeholder="640"
                    onChange={(e) =>
                      setSceneData({
                        ...sceneData,
                        output: { ...sceneData.output, height: parseInt(e.target.value) || 640 }
                      })
                    }
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'background' && (
          <div className={styles.section}>
            <div className={styles.properties}>
              <h3>Background Settings</h3>
              <div className={styles.inputGroup}>
                <label>Background Color (R, G, B)</label>
                <div className={styles.colorInput}>
                  <input
                    type="color"
                    value={`#${sceneData.scene.backgroundColor.map(c => Math.round(c || 0).toString(16).padStart(2, '0')).join('')}`}
                    onChange={(e) => {
                      const hex = e.target.value.substring(1)
                      const r = parseInt(hex.substring(0, 2), 16)
                      const g = parseInt(hex.substring(2, 4), 16)
                      const b = parseInt(hex.substring(4, 6), 16)
                      setSceneData({
                        ...sceneData,
                        scene: { ...sceneData.scene, backgroundColor: [r, g, b] }
                      })
                    }}
                    className={styles.colorPicker}
                  />
                  <div className={styles.vectorInput}>
                    {[0, 1, 2].map((i) => (
                      <input
                        key={i}
                        type="number"
                        min="0"
                        max="255"
                        value={sceneData.scene.backgroundColor[i]?.toString() ?? ''}
                        placeholder="0"
                        onChange={(e) =>
                          handleBackgroundChange('backgroundColor', {
                            index: i,
                            value: e.target.value
                          })
                        }
                        onFocus={(e) => e.target.select()}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Star Probability</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.01"
                  value={getInputValue('background-star-probability', sceneData.scene.backgroundStarProbability)}
                  placeholder="0.0006"
                  onChange={(e) =>
                    setInputValue(
                      'background-star-probability',
                      e.target.value,
                      () => handleBackgroundChange('backgroundStarProbability', e.target.value)
                    )
                  }
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.resetBtn} onClick={resetScene}>
          Reset Scene
        </button>
        <button
          className={styles.renderBtn}
          onClick={handleRender}
          disabled={isLoading}
        >
          {isLoading ? 'Rendering...' : 'Render Scene'}
        </button>
      </div>
    </div>
  )
}

export default TracySceneEditor