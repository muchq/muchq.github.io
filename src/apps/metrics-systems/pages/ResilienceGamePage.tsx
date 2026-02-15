import { useState, useEffect, useRef } from 'react'
import ResilienceNavigation from '../components/ResilienceNavigation'
import { SystemDiagram } from '../components/SystemDiagram'
import { TimeseriesGraph } from '../components/TimeseriesGraph'
import styles from './ResilienceGamePage.module.css'

interface DataPoint {
  timestamp: number
  value: number
}

// Queueing theory models for server and database
interface SystemMetrics {
  latency: number
  throughput: number
  errorRate: number
  saturation: number
}

interface SystemState {
  rps: number
  serverCpu: number
  serverMemory: number
  dbCpu: number
  dbConnections: number
  isRunning: boolean
}

interface SystemArchitecture {
  servers: number
  databases: number
  readReplicas: number
  loadBalancer: boolean
  cache: boolean
}

interface Component {
  id: string
  name: string
  description: string
  cost: number
  icon: string
}

// M/M/1 queue model for server processing with load balancing
function calculateServerMetrics(rps: number, architecture: SystemArchitecture): SystemMetrics {
  // Commodity server specs: 4 vCPU, 16GB RAM, ~500 req/sec max throughput each
  const maxServerRps = 500
  const effectiveServers = architecture.loadBalancer ? architecture.servers : 1
  const rpsPerServer = rps / effectiveServers
  const utilization = rpsPerServer / maxServerRps
  
  // M/M/1 queue: E[T] = 1/(μ - λ) where μ = service rate, λ = arrival rate
  const serviceTime = 2 // 2ms base processing time
  const latency = utilization >= 1 ? 10000 : serviceTime / (1 - utilization)
  
  const errorRate = utilization > 0.8 ? Math.min((utilization - 0.8) * 100, 50) : 0
  const saturation = Math.min(utilization * 100, 100)
  
  return {
    latency: Math.min(latency, 10000),
    throughput: Math.min(rps, maxServerRps * effectiveServers),
    errorRate,
    saturation
  }
}

// Database connection pool model with read replicas
function calculateDbMetrics(rps: number, architecture: SystemArchitecture): SystemMetrics {
  // Single database: 100 max connections, ~300 queries/sec max
  // Read replicas: 80% of queries are reads, can be distributed
  const maxDbRps = 300
  const readRatio = 0.8
  const writeRps = rps * (1 - readRatio)
  const readRps = rps * readRatio
  
  // Distribute reads across primary + read replicas
  const totalReadCapacity = maxDbRps * (1 + architecture.readReplicas * 0.8) // Replicas handle 80% of primary capacity
  const readUtilization = readRps / totalReadCapacity
  const writeUtilization = writeRps / maxDbRps
  const overallUtilization = Math.max(readUtilization, writeUtilization)
  
  // Database query time increases with connection pool exhaustion
  const baseQueryTime = 5 // 5ms base query time
  const maxConnections = 100 * (1 + architecture.readReplicas * 0.5)
  const connectionPressure = Math.min(rps / maxConnections, 2)
  const latency = overallUtilization >= 1 ? 15000 : baseQueryTime * (1 + connectionPressure) / (1 - Math.min(overallUtilization, 0.95))
  
  const errorRate = overallUtilization > 0.9 ? Math.min((overallUtilization - 0.9) * 200, 80) : 0
  const saturation = Math.min(overallUtilization * 100, 100)
  
  return {
    latency: Math.min(latency, 15000),
    throughput: Math.min(rps, totalReadCapacity),
    errorRate,
    saturation
  }
}

const ResilienceGamePage = () => {
  const [systemState, setSystemState] = useState<SystemState>({
    rps: 10,
    serverCpu: 2,
    serverMemory: 4,
    dbCpu: 8,
    dbConnections: 20,
    isRunning: false
  })

  const [architecture, setArchitecture] = useState<SystemArchitecture>({
    servers: 1,
    databases: 1,
    readReplicas: 0,
    loadBalancer: false,
    cache: false
  })

  const [budget, setBudget] = useState(1000) // Starting budget in dollars
  const [gamePhase, setGamePhase] = useState<'setup' | 'running' | 'scaling'>('setup')
  const intervalRef = useRef<number | undefined>(undefined)

  // Timeseries data for graphs
  const [latencyData, setLatencyData] = useState<DataPoint[]>([])
  const [trafficData, setTrafficData] = useState<DataPoint[]>([])
  const [errorData, setErrorData] = useState<DataPoint[]>([])
  const [saturationData, setSaturationData] = useState<DataPoint[]>([])
  const metricsIntervalRef = useRef<number | undefined>(undefined)
  
  // Refs to get current values in interval
  const systemStateRef = useRef(systemState)
  const architectureRef = useRef(architecture)

  // Available components for Level 1
  const availableComponents: Component[] = [
    {
      id: 'server',
      name: 'Additional Server',
      description: 'Add another server to handle more traffic (requires load balancer)',
      cost: 50,
      icon: '🖥️'
    },
    {
      id: 'loadbalancer',
      name: 'Load Balancer',
      description: 'Distribute traffic across multiple servers',
      cost: 25,
      icon: '⚖️'
    },
    {
      id: 'readreplica',
      name: 'Read Replica',
      description: 'Database read replica to handle read queries',
      cost: 75,
      icon: '📖'
    }
  ]

  // Update refs when state changes
  useEffect(() => {
    systemStateRef.current = systemState
    architectureRef.current = architecture
  }, [systemState, architecture])

  const serverMetrics = calculateServerMetrics(systemState.rps, architecture)
  const dbMetrics = calculateDbMetrics(systemState.rps, architecture)

  // Handle component purchases
  const purchaseComponent = (componentId: string) => {
    const component = availableComponents.find(c => c.id === componentId)
    if (!component || budget < component.cost) return

    setBudget(prev => prev - component.cost)

    switch (componentId) {
      case 'server':
        if (architecture.loadBalancer) {
          setArchitecture(prev => ({ ...prev, servers: prev.servers + 1 }))
        } else {
          alert('You need a load balancer first to add more servers!')
        }
        break
      case 'loadbalancer':
        setArchitecture(prev => ({ ...prev, loadBalancer: true }))
        break
      case 'readreplica':
        setArchitecture(prev => ({ ...prev, readReplicas: prev.readReplicas + 1 }))
        break
    }
  }

  // Handle component removal
  const removeComponent = (componentId: string) => {
    const component = availableComponents.find(c => c.id === componentId)
    if (!component) return

    switch (componentId) {
      case 'server':
        if (architecture.servers > 1) {
          setArchitecture(prev => ({ ...prev, servers: prev.servers - 1 }))
          setBudget(prev => prev + component.cost)
        }
        break
      case 'loadbalancer':
        // Can't remove load balancer if there are multiple servers
        if (architecture.servers === 1) {
          setArchitecture(prev => ({ ...prev, loadBalancer: false }))
          setBudget(prev => prev + component.cost)
        } else {
          alert('Remove extra servers first before removing the load balancer!')
        }
        break
      case 'readreplica':
        if (architecture.readReplicas > 0) {
          setArchitecture(prev => ({ ...prev, readReplicas: prev.readReplicas - 1 }))
          setBudget(prev => prev + component.cost)
        }
        break
    }
  }

  const startSimulation = () => {
    setGamePhase('running')
    setSystemState(prev => ({ ...prev, isRunning: true }))
    
    // Start collecting metrics data using refs for current values
    const collectMetrics = () => {
      const currentSystemState = systemStateRef.current
      const currentArchitecture = architectureRef.current
      const currentServerMetrics = calculateServerMetrics(currentSystemState.rps, currentArchitecture)
      const currentDbMetrics = calculateDbMetrics(currentSystemState.rps, currentArchitecture)
      const now = Date.now()
      const maxDataPoints = 60
      
      setLatencyData(prev => {
        // Add small latency noise (±10% variation)
        const baseLatency = Math.max(currentServerMetrics.latency, currentDbMetrics.latency)
        const noisePercent = (Math.random() - 0.5) * 0.2 // ±10%
        const noisyLatency = baseLatency * (1 + noisePercent)
        const newData = [...prev, { 
          timestamp: now, 
          value: Math.max(1, noisyLatency) // Minimum 1ms
        }]
        return newData.slice(-maxDataPoints)
      })
      
      setTrafficData(prev => {
        // Add realistic noise to traffic (±5% variation)
        const noisePercent = (Math.random() - 0.5) * 0.1 // ±5%
        const noisyRps = currentSystemState.rps * (1 + noisePercent)
        const newData = [...prev, { timestamp: now, value: Math.max(0, noisyRps) }]
        return newData.slice(-maxDataPoints)
      })
      
      setErrorData(prev => {
        // Add small error rate noise when > 0
        const baseErrorRate = Math.max(currentServerMetrics.errorRate, currentDbMetrics.errorRate)
        let noisyErrorRate = baseErrorRate
        if (baseErrorRate > 0) {
          const noise = (Math.random() - 0.5) * Math.min(baseErrorRate * 0.3, 1) // ±30% or ±1%, whichever is smaller
          noisyErrorRate = Math.max(0, baseErrorRate + noise)
        }
        const newData = [...prev, { 
          timestamp: now, 
          value: noisyErrorRate 
        }]
        return newData.slice(-maxDataPoints)
      })
      
      setSaturationData(prev => {
        // Add saturation noise (±3% variation)
        const baseSaturation = Math.max(currentServerMetrics.saturation, currentDbMetrics.saturation)
        const noisePercent = (Math.random() - 0.5) * 0.06 // ±3%
        const noisySaturation = Math.min(100, Math.max(0, baseSaturation * (1 + noisePercent)))
        const newData = [...prev, { 
          timestamp: now, 
          value: noisySaturation 
        }]
        return newData.slice(-maxDataPoints)
      })
    }
    
    // Collect initial data point
    collectMetrics()
    
    // Set up interval
    metricsIntervalRef.current = window.setInterval(collectMetrics, 1000)
  }

  const scaleToHighTraffic = () => {
    setGamePhase('scaling')
    
    // Gradually increase RPS from 10 to 1000 over 10 seconds
    let currentRps = 10
    const targetRps = 1000
    const steps = 20
    const stepSize = (targetRps - currentRps) / steps
    
    intervalRef.current = window.setInterval(() => {
      currentRps += stepSize
      if (currentRps >= targetRps) {
        currentRps = targetRps
        window.clearInterval(intervalRef.current!)
      }
      
      setSystemState(prev => ({ ...prev, rps: Math.round(currentRps) }))
    }, 500)
  }

  const resetSimulation = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    if (metricsIntervalRef.current) {
      window.clearInterval(metricsIntervalRef.current)
    }
    
    setGamePhase('setup')
    setSystemState({
      rps: 10,
      serverCpu: 2,
      serverMemory: 4,
      dbCpu: 8,
      dbConnections: 20,
      isRunning: false
    })
    setArchitecture({
      servers: 1,
      databases: 1,
      readReplicas: 0,
      loadBalancer: false,
      cache: false
    })
    setBudget(1000)
    
    // Clear timeseries data
    setLatencyData([])
    setTrafficData([])
    setErrorData([])
    setSaturationData([])
  }


  return (
    <div className={styles.gamePage}>
      <ResilienceNavigation 
        level="Level 1"
        phase="Phase 1"
        currentRps={systemState.rps}
        gamePhase={gamePhase}
      />
      
      <main className={styles.content}>
        <div className={styles.header}>
          <h1>Level 1: "The Startup Launch"</h1>
          <p>Your startup is going live! Monitor your system as traffic grows from 10 to 1000 RPS.</p>
        </div>

        <div className={styles.gameContainer}>
          <div className={styles.leftPanel}>
            <div className={styles.scenario}>
              <h3>📊 Current Scenario</h3>
              <div className={styles.scenarioDetails}>
                <div className={styles.stat}>
                  <label>Current RPS:</label>
                  <span className={styles.statValue}>{systemState.rps}</span>
                </div>
                <div className={styles.stat}>
                  <label>Phase:</label>
                  <span className={styles.statValue}>
                    {gamePhase === 'setup' && 'Ready to Start'}
                    {gamePhase === 'running' && 'Monitoring (10 RPS)'}
                    {gamePhase === 'scaling' && 'Scaling Up!'}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.controlsAndArch}>
              <div className={styles.controls}>
                <h3>🎮 Controls</h3>
                {gamePhase === 'setup' && (
                  <button onClick={startSimulation} className={styles.primaryButton}>
                    Start Monitoring
                  </button>
                )}
                {gamePhase === 'running' && (
                  <button onClick={scaleToHighTraffic} className={styles.scaleButton}>
                    Scale to 1000 RPS
                  </button>
                )}
                {gamePhase === 'scaling' && (
                  <div className={styles.scalingInfo}>
                    <p>🚀 Traffic is increasing...</p>
                    <p>Watch your metrics closely!</p>
                  </div>
                )}
                <button onClick={resetSimulation} className={styles.resetButton}>
                  Reset Simulation
                </button>
              </div>

              <div className={styles.architecture}>
                <h3>🏗️ Architecture</h3>
                <div className={styles.architectureDetails}>
                  <div className={styles.archStat}>
                    <span>Servers:</span>
                    <span>{architecture.servers}</span>
                  </div>
                  <div className={styles.archStat}>
                    <span>Load Balancer:</span>
                    <span>{architecture.loadBalancer ? '✅' : '❌'}</span>
                  </div>
                  <div className={styles.archStat}>
                    <span>Read Replicas:</span>
                    <span>{architecture.readReplicas}</span>
                  </div>
                  <div className={styles.archStat}>
                    <span>Budget:</span>
                    <span>${budget}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.objectives}>
              <h3>🎯 Success Criteria</h3>
              <ul>
                <li className={serverMetrics?.latency && serverMetrics.latency < 100 ? styles.success : styles.pending}>
                  Maintain server latency &lt; 100ms
                </li>
                <li className={dbMetrics?.latency && dbMetrics.latency < 100 ? styles.success : styles.pending}>
                  Maintain database latency &lt; 100ms
                </li>
                <li className={serverMetrics?.errorRate !== undefined && serverMetrics.errorRate < 5 ? styles.success : styles.pending}>
                  Keep error rate &lt; 5%
                </li>
                <li className={systemState.rps >= 1000 ? styles.success : styles.pending}>
                  Handle 1000 RPS successfully
                </li>
              </ul>
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.visualization}>
              <SystemDiagram 
                systemState={systemState}
                serverMetrics={serverMetrics}
                dbMetrics={dbMetrics}
                architecture={architecture}
              />
            </div>

            <div className={styles.metrics}>
              <h3>📈 Golden Signals (Read-Heavy Workload: 80% reads, 20% writes)</h3>
              
              <div className={styles.timeseriesGrid}>
                <TimeseriesGraph
                  data={latencyData}
                  title="Latency"
                  color="#ff6b9d"
                  unit="ms"
                  width={180}
                  height={60}
                  thresholds={{ warning: 100, critical: 500 }}
                />
                
                <TimeseriesGraph
                  data={trafficData}
                  title="Traffic"
                  color="#00d4ff"
                  unit="rps"
                  width={180}
                  height={60}
                />
                
                <TimeseriesGraph
                  data={errorData}
                  title="Errors"
                  color="#ff6b6b"
                  unit="%"
                  width={180}
                  height={60}
                  thresholds={{ warning: 1, critical: 5 }}
                />
                
                <TimeseriesGraph
                  data={saturationData}
                  title="Saturation"
                  color="#ffb347"
                  unit="%"
                  width={180}
                  height={60}
                  thresholds={{ warning: 70, critical: 85 }}
                />
              </div>

            </div>

            <div className={styles.components}>
              <h3>🛠️ Manage Components</h3>
              <div className={styles.componentsList}>
                {availableComponents.map(component => {
                  const getCurrentCount = (id: string) => {
                    switch (id) {
                      case 'server': return architecture.servers
                      case 'loadbalancer': return architecture.loadBalancer ? 1 : 0
                      case 'readreplica': return architecture.readReplicas
                      default: return 0
                    }
                  }
                  
                  const canRemove = (id: string) => {
                    switch (id) {
                      case 'server': return architecture.servers > 1
                      case 'loadbalancer': return architecture.loadBalancer && architecture.servers === 1
                      case 'readreplica': return architecture.readReplicas > 0
                      default: return false
                    }
                  }
                  
                  const currentCount = getCurrentCount(component.id)
                  
                  return (
                    <div key={component.id} className={styles.component}>
                      <div className={styles.componentInfo}>
                        <span className={styles.componentIcon}>{component.icon}</span>
                        <div>
                          <div className={styles.componentName}>
                            {component.name} 
                            <span className={styles.componentCount}>({currentCount})</span>
                          </div>
                          <div className={styles.componentDesc}>{component.description}</div>
                          <div className={styles.componentCost}>${component.cost}/month</div>
                        </div>
                      </div>
                      <div className={styles.componentButtons}>
                        <button 
                          onClick={() => removeComponent(component.id)}
                          disabled={!canRemove(component.id)}
                          className={styles.componentRemoveButton}
                        >
                          −
                        </button>
                        <button 
                          onClick={() => purchaseComponent(component.id)}
                          disabled={budget < component.cost}
                          className={styles.componentAddButton}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ResilienceGamePage