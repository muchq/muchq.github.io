import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ThoughtsPage from './pages/ThoughtsPage'
import GroupsPage from './pages/GroupsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/thoughts" element={<ThoughtsPage />} />
      <Route path="/groups" element={<GroupsPage />} />
    </Routes>
  )
}

export default App