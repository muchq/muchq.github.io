import ResilienceNavigation from '../components/ResilienceNavigation'
import styles from './SystemsPage.module.css'

const SystemsPage = () => {

  return (
    <div className={styles.systemsPage}>
      <ResilienceNavigation showGameInfo={false} />
      
      <main className={styles.content}>
        <div className={styles.header}>
          <h1>System Architect: The Resilience Challenge</h1>
          <p className={styles.subtitle}>
            Learn distributed systems resilience patterns through hands-on simulation
          </p>
        </div>

        <div className={styles.gameOverview}>
          <section className={styles.section}>
            <h2>Game Overview</h2>
            <p>
              Design and optimize system architectures to handle various traffic patterns 
              and failure scenarios. Learn when and why to implement patterns like retries, 
              rate limiters, circuit breakers, and bulkheads through interactive simulation.
            </p>
            
            <div className={styles.features}>
              <div className={styles.feature}>
                <h3>🏗️ Progressive Learning</h3>
                <p>Start with simple single-server systems and advance to complex distributed architectures</p>
              </div>
              
              <div className={styles.feature}>
                <h3>📊 Real-time Metrics</h3>
                <p>Monitor the four golden signals: latency, traffic, errors, and saturation</p>
              </div>
              
              <div className={styles.feature}>
                <h3>🎯 Performance Focus</h3>
                <p>Balance availability, latency, error rates, and operational costs</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2>Learning Phases</h2>
            <div className={styles.phases}>
              <div className={styles.phase}>
                <h3>Phase 1: Foundation (Levels 1-3)</h3>
                <p><strong>Theme:</strong> Basic scaling patterns</p>
                <ul>
                  <li>Level 1: "The Startup Launch" - Single server scaling from 10 to 1000 RPS</li>
                  <li>Level 2: "The Morning Rush" - Handling traffic spikes with load balancing</li>
                  <li>Level 3: "The Database Bottleneck" - Implementing caching strategies</li>
                </ul>
                <button 
                  className={styles.phaseButton}
                  onClick={() => window.location.href = '/resilience/phase1/level1'}
                >
                  Start Phase 1
                </button>
              </div>

              <div className={styles.phase}>
                <h3>Phase 2: Resilience Patterns (Levels 4-7)</h3>
                <p><strong>Theme:</strong> Fault tolerance and reliability</p>
                <ul>
                  <li>Level 4: "The Retry Storm" - Implementing proper retry strategies</li>
                  <li>Level 5: "The Noisy Neighbor" - Rate limiting and throttling</li>
                  <li>Level 6: "The Cascading Failure" - Circuit breakers</li>
                  <li>Level 7: "The Resource Exhaustion" - Bulkhead pattern</li>
                </ul>
                <button 
                  className={styles.phaseButton}
                  disabled
                >
                  Coming Soon
                </button>
              </div>

              <div className={styles.phase}>
                <h3>Phase 3: Advanced Patterns (Levels 8-10)</h3>
                <p><strong>Theme:</strong> Global scale and optimization</p>
                <ul>
                  <li>Level 8: "The Geographic Challenge" - Multi-region deployment</li>
                  <li>Level 9: "The Cost Optimization" - Performance vs cost tradeoffs</li>
                  <li>Level 10: "The Perfect Storm" - Comprehensive resilience</li>
                </ul>
                <button 
                  className={styles.phaseButton}
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

export default SystemsPage