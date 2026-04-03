import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { doctor, logout, getDoctorName } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Left — Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="text-2xl">🧬</span>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 leading-tight">
              OrphanCure
            </span>
            <span className="text-xs text-gray-400 leading-tight">
              Doctor Dashboard
            </span>
          </div>
        </div>

        {/* Center — Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
              ${isActive('/')
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
          >
            📋 Bookings
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
              ${isActive('/analytics')
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
          >
            📊 Analytics
          </button>
        </div>

        {/* Right — Doctor info + logout */}
        <div className="flex items-center gap-3">

          {/* Doctor avatar and name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white
                            flex items-center justify-center text-sm font-bold">
              {getDoctorName()?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800 leading-tight">
                Dr. {getDoctorName() || doctor?.name || 'Doctor'}
              </span>
              <span className="text-xs text-gray-400 leading-tight">
                {doctor?.specialization || 'Specialist'}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg
                       text-sm font-medium text-red-500 hover:bg-red-50
                       transition-colors duration-200"
          >
            <span>↩</span>
            <span>Logout</span>
          </button>

        </div>
      </div>
    </nav>
  )
}