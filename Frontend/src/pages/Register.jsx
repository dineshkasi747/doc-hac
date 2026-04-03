import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    hospital: '',
    location: '',
    phone: '',
    diseases_treated: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRegister = async () => {
    if (!form.name.trim()) return setError('Please enter your name')
    if (!form.email.trim()) return setError('Please enter your email')
    if (!form.password.trim()) return setError('Please enter a password')
    if (form.password !== form.confirmPassword)
      return setError('Passwords do not match')
    if (!form.specialization.trim())
      return setError('Please enter your specialization')

    setLoading(true)
    setError('')

    try {
      const BASE_URL =
        import.meta.env.VITE_API_URL || 'http://localhost:8000'

      const res = await axios.post(`${BASE_URL}/auth/register`, {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'doctor',
        specialization: form.specialization.trim(),
        hospital: form.hospital.trim(),
        location: form.location.trim(),
        phone: form.phone.trim(),
        diseases_treated: form.diseases_treated
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d.length > 0),
      })

      login(res.data)
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 400) {
        setError('Email already registered. Please login instead.')
      } else {
        setError(detail || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRegister()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white
                    to-indigo-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        <div className="card p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🧬</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Doctor Registration
            </h1>
            <span className="inline-block text-xs text-gray-500
                             bg-gray-100 px-3 py-1 rounded-full font-medium">
              OrphanCure — Doctor Dashboard
            </span>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">

            {/* Name */}
            <div>
              <label className="label">Full Name</label>
              <input
                name="name"
                type="text"
                className="input-field"
                placeholder="Dr. Ramesh Kumar"
                value={form.name}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email Address</label>
              <input
                name="email"
                type="email"
                className="input-field"
                placeholder="doctor@hospital.com"
                value={form.email}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Password row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Password</label>
                <input
                  name="password"
                  type="password"
                  className="input-field"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  className="input-field"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="label">Specialization</label>
              <input
                name="specialization"
                type="text"
                className="input-field"
                placeholder="e.g. Rare Disease Specialist, Geneticist..."
                value={form.specialization}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Hospital */}
            <div>
              <label className="label">Hospital / Institution</label>
              <input
                name="hospital"
                type="text"
                className="input-field"
                placeholder="e.g. AIIMS Delhi, Nizam's Institute..."
                value={form.hospital}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Location and Phone row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Location</label>
                <input
                  name="location"
                  type="text"
                  className="input-field"
                  placeholder="City, State"
                  value={form.location}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  name="phone"
                  type="text"
                  className="input-field"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>

            {/* Diseases treated */}
            <div>
              <label className="label">
                Diseases Treated (comma separated)
              </label>
              <input
                name="diseases_treated"
                type="text"
                className="input-field"
                placeholder="Wilson's Disease, Gaucher Disease, Marfan..."
                value={form.diseases_treated}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
              <p className="text-xs text-gray-400 mt-1">
                This is used to match you with relevant patients
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border
                              border-red-200 rounded-lg px-4 py-3">
                <span className="text-red-500 mt-0.5">⚠️</span>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Register button */}
            <button
              className="btn-primary w-full py-3 text-base mt-1"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white
                                   border-t-transparent rounded-full
                                   animate-spin" />
                  Registering...
                </span>
              ) : (
                'Create Doctor Account'
              )}
            </button>

          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">
              Already have an account?
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Login link */}
          <Link to="/login">
            <button className="btn-secondary w-full py-3 text-base">
              Login to Dashboard
            </button>
          </Link>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          OrphanCure — AI Powered Rare Disease Navigator
        </p>

      </div>
    </div>
  )
}