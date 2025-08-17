import { useQuestGame } from '@/hooks/useQuestGame'
import styles from './QuestGame.module.css'

interface QuestGameProps {
  onGameDataChange?: (data: {
    score: number
    level: string
    gameStarted: boolean
  }) => void
}

const QuestGame = ({ onGameDataChange }: QuestGameProps) => {
  const {
    canvasRef,
    gameState,
    currentChallenge,
    showModal,
    testResults,
    userCode,
    setUserCode,
    startGame,
    runTests,
    closeModal
  } = useQuestGame({ onGameDataChange })

  if (!gameState.gameStarted) {
    return (
      <div className={styles.startScreen}>
        <div className={styles.startContent}>
          <h1 className={styles.title}>CODE QUEST</h1>
          <p className={styles.subtitle}>A Programming Adventure</p>
          <div className={styles.controls}>
            <div>Arrow Keys or WASD - Move</div>
            <div>SPACE - Interact with Terminal</div>
            <div>Find and hack all terminals!</div>
          </div>
          <button className={styles.startButton} onClick={startGame}>
            START ADVENTURE
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.gameContainer}>
      <canvas
        ref={canvasRef}
        className={styles.gameCanvas}
        width={1000}
        height={800}
      />
      
      <div className={styles.ui}>
        <div>Score: <span className={styles.score}>{gameState.score}</span></div>
        <div>Level: <span className={styles.levelName}>
          {gameState.currentLevel ? gameState.currentLevel.name : 'Classic'}
        </span></div>
        <div>Terminals: <span className={styles.terminals}>
          {gameState.terminalsCompleted}/{gameState.currentLevel ? gameState.currentLevel.terminalCount : 5}
        </span></div>
      </div>

      {showModal && currentChallenge && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.challengeTitle}>
              TERMINAL {currentChallenge.challenge.id}: {currentChallenge.challenge.title}
            </h2>
            
            <div className={styles.challengeDescription}>
              {currentChallenge.challenge.description}
            </div>
            
            <div className={styles.testCases}>
              <div className={styles.testCasesTitle}>TEST CASES:</div>
              {currentChallenge.challenge.tests.map((test, i) => (
                <div key={i} className={`${styles.testCase} ${testResults[i]?.passed ? styles.passed : ''}`}>
                  {testResults[i] ? testResults[i].message : 
                    `Test ${i + 1}: Input: ${JSON.stringify(test.input)} → Expected: ${JSON.stringify(test.expected)}`
                  }
                </div>
              ))}
            </div>
            
            <textarea
              className={styles.codeEditor}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              placeholder="// Write your code here..."
            />
            
            <div className={styles.hint}>
              💡 Hint: {currentChallenge.challenge.hint}
            </div>
            
            <div className={styles.buttonContainer}>
              <button className={styles.runButton} onClick={runTests}>
                RUN TESTS
              </button>
              <button className={styles.closeButton} onClick={closeModal}>
                CLOSE
              </button>
            </div>
            
            {testResults.length > 0 && testResults.every(r => r.passed) && (
              <div className={styles.successMessage}>
                🎉 SUCCESS! +{currentChallenge.challenge.points} points
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestGame