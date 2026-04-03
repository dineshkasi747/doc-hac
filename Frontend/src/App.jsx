import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import BookingDetail from './pages/BookingDetail'
import ConfirmDiagnosis from './pages/ConfirmDiagnosis'
import AddNotes from './pages/AddNotes'
import Analytics from './pages/Analytics'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🧬</div>
          <p className="text-gray-500 text-lg">Loading OrphanCure...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/booking/:id" element={
          <ProtectedRoute><BookingDetail /></ProtectedRoute>
        } />
        <Route path="/booking/:id/confirm" element={
          <ProtectedRoute><ConfirmDiagnosis /></ProtectedRoute>
        } />
        <Route path="/booking/:id/notes" element={
          <ProtectedRoute><AddNotes /></ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute><Analytics /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}