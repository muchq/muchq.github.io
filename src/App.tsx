import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ThoughtsPage from './pages/ThoughtsPage'
import GroupsPage from './pages/GroupsPage'
import SetsPage from './pages/SetsPage'
import GolfPage from './pages/GolfPage'
import PartyPage from './pages/PartyPage'
import AurumSiphonPage from './pages/AurumSiphonPage'
import QuestPage from './pages/QuestPage'
import LearningPage from './pages/LearningPage'
import TracyPage from './pages/TracyPage'
import MetricsPage from './pages/MetricsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/thoughts" element={<ThoughtsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/sets" element={<SetsPage />} />
      <Route path="/golf" element={<GolfPage />} />
      <Route path="/party" element={<PartyPage />} />
      <Route path="/aurum" element={<AurumSiphonPage />} />
      <Route path="/quest" element={<QuestPage />} />
      <Route path="/tracy" element={<TracyPage />} />
      <Route path="/metrics" element={<MetricsPage />} />
      <Route path="/top" element={<Navigate to="/top/sets" replace />} />
      <Route path="/top/:module" element={<LearningPage />} />
    </Routes>
  )
}

export default App
