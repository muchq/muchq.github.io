import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const HomePage = lazy(() => import('./pages/HomePage'))
const ThoughtsPage = lazy(() => import('./pages/ThoughtsPage'))
const GroupsPage = lazy(() => import('./pages/GroupsPage'))
const SetsPage = lazy(() => import('./pages/SetsPage'))
const GolfPage = lazy(() => import('./pages/GolfPage'))
const PartyPage = lazy(() => import('./pages/PartyPage'))
const AurumSiphonPage = lazy(() => import('./pages/AurumSiphonPage'))
const QuestPage = lazy(() => import('./pages/QuestPage'))
const LearningPage = lazy(() => import('./pages/LearningPage'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/thoughts" element={<ThoughtsPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/sets" element={<SetsPage />} />
        <Route path="/golf" element={<GolfPage />} />
        <Route path="/party" element={<PartyPage />} />
        <Route path="/aurum" element={<AurumSiphonPage />} />
        <Route path="/quest" element={<QuestPage />} />
        <Route path="/top" element={<Navigate to="/top/sets" replace />} />
        <Route path="/top/:module" element={<LearningPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
