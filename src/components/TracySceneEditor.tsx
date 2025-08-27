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

  const handleSphereChange = (index: number, field: keyof Sphere, value: any) => {
    const newSpheres = [...sceneData.scene.spheres]
    if (field === 'center' || field === 'color') {
      const subIndex = parseInt(value.subIndex)
      ;(newSpheres[index][field] as number[])[subIndex] = parseFloat(value.value) || 0
    } else {
      (newSpheres[index] as any)[field] = parseFloat(value) || 0
    }
    setSceneData({
      ...sceneData,
      scene: { ...sceneData.scene, spheres: newSpheres }
    })
  }

  const handleLightChange = (index: number, field: keyof Light, value: any) => {
    const newLights = [...sceneData.scene.lights]
    if (field === 'position') {
      const subIndex = parseInt(value.subIndex)
      ;(newLights[index][field] as number[])[subIndex] = parseFloat(value.value) || 0
    } else if (field === 'intensity') {
      newLights[index][field] = parseFloat(value) || 0
    } else {
      (newLights[index] as any)[field] = value
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

  const handleBackgroundChange = (field: string, value: any) => {
    if (field === 'backgroundColor') {
      const newColor = [...sceneData.scene.backgroundColor]
      newColor[value.index] = parseInt(value.value) || 0
      setSceneData({
        ...sceneData,
        scene: { ...sceneData.scene, backgroundColor: newColor as [number, number, number] }
      })
    } else if (field === 'backgroundStarProbability') {
      setSceneData({
        ...sceneData,
        scene: { ...sceneData.scene, backgroundStarProbability: parseFloat(value) || 0 }
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
                        value={sceneData.scene.spheres[selectedSphere].center[i]}
                        onChange={(e) =>
                          handleSphereChange(selectedSphere, 'center', {
                            subIndex: i,
                            value: e.target.value
                          })
                        }
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
                    value={sceneData.scene.spheres[selectedSphere].radius}
                    onChange={(e) => handleSphereChange(selectedSphere, 'radius', e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Color (R, G, B)</label>
                  <div className={styles.vectorInput}>
                    {[0, 1, 2].map((i) => (
                      <input
                        key={i}
                        type="number"
                        min="0"
                        max="255"
                        value={sceneData.scene.spheres[selectedSphere].color[i]}
                        onChange={(e) =>
                          handleSphereChange(selectedSphere, 'color', {
                            subIndex: i,
                            value: e.target.value
                          })
                        }
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Specular</label>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={sceneData.scene.spheres[selectedSphere].specular}
                    onChange={(e) => handleSphereChange(selectedSphere, 'specular', e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Reflective</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={sceneData.scene.spheres[selectedSphere].reflective}
                    onChange={(e) => handleSphereChange(selectedSphere, 'reflective', e.target.value)}
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
                    value={sceneData.scene.lights[selectedLight].intensity}
                    onChange={(e) => handleLightChange(selectedLight, 'intensity', e.target.value)}
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
                        value={sceneData.scene.lights[selectedLight].position[i]}
                        onChange={(e) =>
                          handleLightChange(selectedLight, 'position', {
                            subIndex: i,
                            value: e.target.value
                          })
                        }
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
                      value={sceneData.perspective.cameraPosition[i]}
                      onChange={(e) => handleCameraChange('position', i, e.target.value)}
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
                      value={sceneData.perspective.cameraFocus[i]}
                      onChange={(e) => handleCameraChange('focus', i, e.target.value)}
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
                    value={sceneData.output.width}
                    onChange={(e) =>
                      setSceneData({
                        ...sceneData,
                        output: { ...sceneData.output, width: parseInt(e.target.value) || 800 }
                      })
                    }
                  />
                  <span>×</span>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="10"
                    value={sceneData.output.height}
                    onChange={(e) =>
                      setSceneData({
                        ...sceneData,
                        output: { ...sceneData.output, height: parseInt(e.target.value) || 640 }
                      })
                    }
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
                <div className={styles.vectorInput}>
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="number"
                      min="0"
                      max="255"
                      value={sceneData.scene.backgroundColor[i]}
                      onChange={(e) =>
                        handleBackgroundChange('backgroundColor', {
                          index: i,
                          value: e.target.value
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Star Probability</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.01"
                  value={sceneData.scene.backgroundStarProbability}
                  onChange={(e) =>
                    handleBackgroundChange('backgroundStarProbability', e.target.value)
                  }
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