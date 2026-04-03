import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { doctor, loading } = useAuth()
  const location = useLocation()

  // Still checking token validity — show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🧬</div>
          <p className="text-gray-400 text-base">Verifying session...</p>
        </div>
      </div>
    )
  }

  // Not logged in — redirect to login and remember where they were going
  if (!doctor) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Not a doctor — show access denied
  if (doctor.role && doctor.role !== 'doctor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center card p-10 max-w-md mx-auto">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            This dashboard is only accessible to registered doctors.
            Please login with a doctor account.
          </p>
          <button
            className="btn-primary w-full"
            onClick={() => {
              localStorage.clear()
              window.location.href = '/login'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return children
}