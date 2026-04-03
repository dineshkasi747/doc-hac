import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginDoctor } from '../api/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect to where they were trying to go, or dashboard
  const from = location.state?.from?.pathname || '/'

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Please enter your email')
      return
    }
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await loginDoctor({ email, password })
      const data = res.data

      if (data.role !== 'doctor') {
        setError(
          'This dashboard is only for doctors. ' +
          'Please login with a doctor account.'
        )
        return
      }

      login(data)
      navigate(from, { replace: true })

    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 404) {
        setError('No account found with this email.')
      } else if (err.response?.status === 401) {
        setError('Wrong password. Please try again.')
      } else {
        setError(detail || 'Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white
                    to-indigo-50 flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* Card */}
        <div className="card p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🧬</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              OrphanCure
            </h1>
            <span className="inline-block text-xs text-gray-500 bg-gray-100
                             px-3 py-1 rounded-full font-medium">
              Doctor Dashboard
            </span>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-5">

            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="doctor@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-gray-400 hover:text-gray-600 text-sm
                             transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border
                              border-red-200 rounded-lg px-4 py-3">
                <span className="text-red-500 text-sm mt-0.5">⚠️</span>
                <p className="text-red-600 text-sm leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Login button */}
            <button
              className="btn-primary w-full py-3 text-base mt-1"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white
                                   border-t-transparent rounded-full
                                   animate-spin" />
                  Logging in...
                </span>
              ) : (
                'Login to Dashboard'
              )}
            </button>

          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">
              DOCTOR ACCESS ONLY
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Note */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-blue-600 leading-relaxed text-center">
            New doctor?{' '}
            <span
                className="font-bold underline cursor-pointer"
                onClick={() => navigate('/register')}
            >
                Register here
            </span>
            {' '}to create your doctor account.
            </p>
          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          OrphanCure — AI Powered Rare Disease Navigator
        </p>

      </div>
    </div>
  )
}