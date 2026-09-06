import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './core/pages/HomePage'
import ThoughtsPage from './apps/thoughts/pages/ThoughtsPage'
import GroupsPage from './apps/math-learning/pages/GroupsPage'
import SetsPage from './apps/math-learning/pages/SetsPage'
import LobbyPage from './apps/lobby/pages/LobbyPage'
import LobbyRedirect from './apps/lobby/pages/LobbyRedirect'
import PartyPage from './apps/party/pages/PartyPage'
import QuestPage from './apps/quest/pages/QuestPage'
import LearningPage from './apps/math-learning/pages/LearningPage'
import TracyPage from './apps/tracy/pages/TracyPage'
import PosterizePage from './apps/posterize/pages/PosterizePage'
import SystemsPage from './apps/metrics-systems/pages/SystemsPage'
import ResilienceGamePage from './apps/metrics-systems/pages/ResilienceGamePage'
import MetricsPage from './apps/metrics-systems/pages/MetricsPage'
import StatsPage from './apps/stats/pages/StatsPage'
import WordchainsPage from './apps/wordchains/pages/WordchainsPage'
import IiliPage from './apps/iili/pages/IiliPage'
import NotFoundPage from './core/pages/NotFoundPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/thoughts" element={<ThoughtsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/sets" element={<SetsPage />} />
      <Route path="/games" element={<LobbyPage />} />
      <Route path="/games/room/:roomId" element={<LobbyPage />} />
      <Route path="/games/room/:roomId/table/:gameId" element={<LobbyPage />} />
      <Route path="/golf" element={<LobbyRedirect />} />
      <Route path="/golf/room/:roomId" element={<LobbyRedirect />} />
      <Route path="/golf/room/:roomId/game/:gameId" element={<LobbyRedirect />} />
      <Route path="/castle" element={<LobbyRedirect />} />
      <Route path="/castle/room/:roomId" element={<LobbyRedirect />} />
      <Route path="/party" element={<PartyPage />} />
      <Route path="/quest" element={<QuestPage />} />
      <Route path="/tracy" element={<TracyPage />} />
      <Route path="/posterize" element={<PosterizePage />} />
      <Route path="/wordchains" element={<WordchainsPage />} />
      <Route path="/iili" element={<IiliPage />} />
      <Route path="/r3dr" element={<Navigate to="/iili" replace />} />
      <Route path="/metrics" element={<Navigate to="/metrics/host" replace />} />
      <Route path="/metrics/:tab" element={<MetricsPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/resilience" element={<SystemsPage />} />
      <Route path="/resilience/phase1/level1" element={<ResilienceGamePage />} />
      <Route path="/top" element={<Navigate to="/top/sets" replace />} />
      <Route path="/top/:module" element={<LearningPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
