import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './core/pages/HomePage'
import ThoughtsPage from './apps/thoughts/pages/ThoughtsPage'
import GroupsPage from './apps/math-learning/pages/GroupsPage'
import SetsPage from './apps/math-learning/pages/SetsPage'
import GolfPage from './apps/golf/pages/GolfPage'
import PartyPage from './apps/party/pages/PartyPage'
import QuestPage from './apps/quest/pages/QuestPage'
import LearningPage from './apps/math-learning/pages/LearningPage'
import TracyPage from './apps/tracy/pages/TracyPage'
import PosterizePage from './apps/posterize/pages/PosterizePage'
import SystemsPage from './apps/metrics-systems/pages/SystemsPage'
import ResilienceGamePage from './apps/metrics-systems/pages/ResilienceGamePage'
import MetricsPage from './apps/metrics-systems/pages/MetricsPage'
import WordchainsPage from './apps/wordchains/pages/WordchainsPage'
import R3drPage from './apps/r3dr/pages/R3drPage'
import NotFoundPage from './core/pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/thoughts" element={<ThoughtsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/sets" element={<SetsPage />} />
      <Route path="/golf" element={<GolfPage />} />
      <Route path="/golf/room/:roomId" element={<GolfPage />} />
      <Route path="/golf/room/:roomId/game/:gameId" element={<GolfPage />} />
      <Route path="/party" element={<PartyPage />} />
      <Route path="/quest" element={<QuestPage />} />
      <Route path="/tracy" element={<TracyPage />} />
      <Route path="/posterize" element={<PosterizePage />} />
      <Route path="/wordchains" element={<WordchainsPage />} />
      <Route path="/r3dr" element={<R3drPage />} />
      <Route path="/metrics" element={<Navigate to="/metrics/host" replace />} />
      <Route path="/metrics/:tab" element={<MetricsPage />} />
      <Route path="/resilience" element={<SystemsPage />} />
      <Route path="/resilience/phase1/level1" element={<ResilienceGamePage />} />
      <Route path="/top" element={<Navigate to="/top/sets" replace />} />
      <Route path="/top/:module" element={<LearningPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
