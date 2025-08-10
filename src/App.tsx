import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ThoughtsPage from './pages/ThoughtsPage'
import GroupsPage from './pages/GroupsPage'
import SetsPage from './pages/SetsPage'
import GolfPage from './pages/GolfPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/thoughts" element={<ThoughtsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
      <Route path="/sets" element={<SetsPage />} />
      <Route path="/golf" element={<GolfPage />} />
    </Routes>
  )
}

export default App
