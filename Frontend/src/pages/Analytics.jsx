import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDoctorAnalytics, getDoctorBookings } from '../api/api'
import Navbar from '../components/Navbar'

export default function Analytics() {
  const { getDoctorId, getDoctorName } = useAuth()
  const navigate = useNavigate()

  const [analytics, setAnalytics] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const doctorId = getDoctorId()
      const [analyticsRes, bookingsRes] = await Promise.all([
        getDoctorAnalytics(doctorId),
        getDoctorBookings(doctorId),
      ])
      setAnalytics(analyticsRes.data)
      setBookings(bookingsRes.data)
    } catch (err) {
      setError('Failed to load analytics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Build disease frequency map from bookings
  const getDiseaseFrequency = () => {
    const freq = {}
    bookings.forEach((b) => {
      const disease = b.confirmed_disease || b.top_disease
      if (disease) {
        freq[disease] = (freq[disease] || 0) + 1
      }
    })
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }

  // Build monthly cases from bookings
  const getMonthlyCases = () => {
    const months = {}
    bookings.forEach((b) => {
      if (!b.created_at) return
      try {
        const date = new Date(b.created_at)
        const key = date.toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit',
        })
        months[key] = (months[key] || 0) + 1
      } catch {
        // skip
      }
    })
    return Object.entries(months).slice(-6)
  }

  // Get recent confirmed bookings
  const getRecentConfirmed = () => {
    return bookings
      .filter((b) => b.status === 'confirmed')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
  }

  const diseaseFreq = getDiseaseFrequency()
  const monthlyCases = getMonthlyCases()
  const recentConfirmed = getRecentConfirmed()
  const maxMonthly = Math.max(...monthlyCases.map((m) => m[1]), 1)
  const maxDisease = Math.max(...diseaseFreq.map((d) => d[1]), 1)

  const aiAccuracy = analytics?.ai_accuracy_rate || 0
  const accuracyColor =
    aiAccuracy >= 80
      ? 'text-green-600'
      : aiAccuracy >= 60
      ? 'text-yellow-600'
      : 'text-red-600'
  const accuracyBg =
    aiAccuracy >= 80
      ? 'bg-green-50 border-green-200'
      : aiAccuracy >= 60
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-red-50 border-red-200'

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="page-container">
          <div className="animate-pulse flex flex-col gap-5">
            <div className="h-8 w-48 bg-gray-200 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-5 h-24 bg-gray-100" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-6 h-64 bg-gray-100" />
              <div className="card p-6 h-64 bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="page-container">
          <div className="text-center py-20">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button className="btn-primary" onClick={fetchAll}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="page-container flex flex-col gap-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Dr. {getDoctorName()} — Performance Overview
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-blue-600 text-sm
                       font-medium hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          <div className="stat-card">
            <span className="text-3xl font-bold text-blue-600">
              {analytics?.total_cases || 0}
            </span>
            <span className="text-xs text-gray-400 font-medium
                             uppercase tracking-wide">
              Total Cases
            </span>
          </div>

          <div className="stat-card">
            <span className="text-3xl font-bold text-green-500">
              {analytics?.confirmed_correct || 0}
            </span>
            <span className="text-xs text-gray-400 font-medium
                             uppercase tracking-wide">
              Confirmed
            </span>
          </div>

          <div className="stat-card">
            <span className="text-3xl font-bold text-yellow-500">
              {analytics?.cases_this_month || 0}
            </span>
            <span className="text-xs text-gray-400 font-medium
                             uppercase tracking-wide">
              This Month
            </span>
          </div>

          <div className={`stat-card border ${accuracyBg}`}>
            <span className={`text-3xl font-bold ${accuracyColor}`}>
              {aiAccuracy}%
            </span>
            <span className="text-xs text-gray-400 font-medium
                             uppercase tracking-wide">
              AI Accuracy
            </span>
          </div>

        </div>

        {/* AI Accuracy detail */}
        <div className={`card p-5 border ${accuracyBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">
                🤖 AI Prediction Accuracy
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                How often the AI correctly predicted the disease
              </p>
            </div>
            <span className={`text-2xl font-bold ${accuracyColor}`}>
              {aiAccuracy}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700
                          ${aiAccuracy >= 80
                            ? 'bg-green-500'
                            : aiAccuracy >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                          }`}
              style={{ width: `${aiAccuracy}%` }}
            />
          </div>

          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-400">0%</span>
            <span className={`text-xs font-semibold ${accuracyColor}`}>
              {aiAccuracy >= 80
                ? '🏆 Excellent'
                : aiAccuracy >= 60
                ? '👍 Good'
                : '⚠️ Needs Improvement'}
            </span>
            <span className="text-xs text-gray-400">100%</span>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Monthly cases bar chart */}
          <div className="card p-5">
            <p className="section-title">Monthly Cases</p>
            {monthlyCases.length === 0 ? (
              <div className="flex items-center justify-center h-40
                              text-gray-300 text-sm">
                No data yet
              </div>
            ) : (
              <div className="flex items-end gap-3 h-40 mt-4">
                {monthlyCases.map(([month, count], i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <span className="text-xs font-bold text-blue-600">
                      {count}
                    </span>
                    <div
                      className="w-full bg-blue-500 rounded-t-md
                                 transition-all duration-500 min-h-1"
                      style={{
                        height: `${(count / maxMonthly) * 120}px`,
                      }}
                    />
                    <span className="text-xs text-gray-400 text-center
                                     leading-tight">
                      {month}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disease frequency */}
          <div className="card p-5">
            <p className="section-title">Top Diseases Treated</p>
            {diseaseFreq.length === 0 ? (
              <div className="flex items-center justify-center h-40
                              text-gray-300 text-sm">
                No confirmed diagnoses yet
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                {diseaseFreq.map(([disease, count], i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-700
                                       truncate flex-1 mr-2">
                        {disease}
                      </span>
                      <span className="text-xs font-bold text-gray-500
                                       flex-shrink-0">
                        {count} case{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full
                                    overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500
                                   transition-all duration-500"
                        style={{
                          width: `${(count / maxDisease) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Diseases treated list */}
        {analytics?.diseases_treated?.length > 0 && (
          <div className="card p-5">
            <p className="section-title">
              All Diseases Treated ({analytics.diseases_treated.length})
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {analytics.diseases_treated.map((disease, i) => (
                <span
                  key={i}
                  className="symptom-chip"
                >
                  {disease}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent confirmed cases */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0">Recent Confirmed Cases</p>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              View All →
            </button>
          </div>

          {recentConfirmed.length === 0 ? (
            <div className="text-center py-8 text-gray-300 text-sm">
              No confirmed cases yet
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentConfirmed.map((booking, i) => (
                <div
                  key={i}
                  onClick={() => navigate(`/booking/${booking._id}`)}
                  className="flex items-center gap-3 p-3 rounded-lg
                             bg-gray-50 hover:bg-blue-50 cursor-pointer
                             transition-colors border border-transparent
                             hover:border-blue-100"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-100
                                  text-blue-600 flex items-center
                                  justify-center text-sm font-bold
                                  flex-shrink-0">
                    {booking.patient_name?.charAt(0)?.toUpperCase() || 'P'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800
                                  truncate">
                      {booking.patient_name || 'Patient'}
                    </p>
                    <p className="text-xs text-blue-600 font-medium
                                  truncate">
                      {booking.confirmed_disease || 'Disease not set'}
                    </p>
                  </div>

                  {/* AI correct badge */}
                  <div className="flex flex-col items-end gap-1
                                  flex-shrink-0">
                    {booking.ai_was_correct !== undefined && (
                      <span className={`text-xs font-medium px-2 py-0.5
                                        rounded-full
                                        ${booking.ai_was_correct
                                          ? 'bg-green-100 text-green-600'
                                          : 'bg-red-100 text-red-500'
                                        }`}>
                        {booking.ai_was_correct ? '🤖 AI ✓' : '🤖 Overridden'}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {booking.created_at
                        ? new Date(booking.created_at)
                            .toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                        : ''}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty state for new doctors */}
        {analytics?.total_cases === 0 && (
          <div className="card p-10 text-center">
            <div className="text-5xl mb-4">🏥</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">
              No Cases Yet
            </h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
              Your analytics will appear here once patients start booking
              consultations and you confirm diagnoses.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate('/')}
            >
              View Bookings
            </button>
          </div>
        )}

      </div>
    </div>
  )
}