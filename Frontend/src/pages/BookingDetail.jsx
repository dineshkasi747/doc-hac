import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFullReport } from '../api/api'
import Navbar from '../components/Navbar'
import AIReportCard from '../components/AIReportCard'

export default function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReport()
  }, [id])

  const fetchReport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getFullReport(id)
      setData(res.data)
    } catch (err) {
      setError('Failed to load patient report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="page-container">
          <div className="animate-pulse flex flex-col gap-5">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="card p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
            <div className="card p-6 h-64 bg-gray-100" />
            <div className="card p-6 h-40 bg-gray-100" />
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
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Failed to load report
            </h3>
            <p className="text-sm text-gray-400 mb-6">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                className="btn-primary"
                onClick={fetchReport}
              >
                Try Again
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate('/')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { booking, patient, case: caseData } = data

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const isConfirmed = booking?.status === 'confirmed'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-5">

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-blue-600 text-sm
                     font-medium hover:underline self-start"
        >
          ← Back to Dashboard
        </button>

        {/* Patient Info Card */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4
                          flex-wrap">

            {/* Left — avatar + details */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-blue-50
                              text-blue-600 flex items-center justify-center
                              text-2xl font-bold flex-shrink-0">
                {patient?.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {patient?.name || 'Patient'}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3
                                gap-y-1 mt-1">
                  {patient?.age && (
                    <span className="text-sm text-gray-500">
                      Age: {patient.age}
                    </span>
                  )}
                  {patient?.gender && (
                    <span className="text-sm text-gray-500 capitalize">
                      {patient.gender}
                    </span>
                  )}
                  {patient?.location && (
                    <span className="text-sm text-gray-500">
                      📍 {patient.location}
                    </span>
                  )}
                  {patient?.phone && (
                    <span className="text-sm text-gray-500">
                      📞 {patient.phone}
                    </span>
                  )}
                  {patient?.email && (
                    <span className="text-sm text-gray-500">
                      ✉️ {patient.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right — slot + status */}
            <div className="flex flex-col items-end gap-2">
              <span className={
                isConfirmed ? 'badge-confirmed' : 'badge-pending'
              }>
                {isConfirmed ? '✅ Confirmed' : '🕐 Pending'}
              </span>
              <p className="text-sm font-semibold text-gray-700">
                📅 {booking?.slot || 'Slot not set'}
              </p>
              <p className="text-xs text-gray-400">
                Booked {formatDate(booking?.created_at)}
              </p>
            </div>

          </div>

          {/* Patient notes */}
          {booking?.notes && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4
                            border-blue-400">
              <p className="text-xs text-blue-500 font-semibold mb-1">
                Patient Notes
              </p>
              <p className="text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* AI Report Card */}
        <AIReportCard caseData={caseData} />

        {/* Action Buttons — only if not confirmed */}
        {!isConfirmed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className="btn-success py-3 text-base"
              onClick={() => navigate(`/booking/${id}/confirm`)}
            >
              ✅ Confirm Diagnosis
            </button>
            <button
              className="btn-secondary py-3 text-base"
              onClick={() => navigate(`/booking/${id}/notes`)}
            >
              📝 Add Treatment Notes
            </button>
          </div>
        )}

        {/* Confirmed diagnosis summary */}
        {isConfirmed && (
          <div className="card p-6 border-green-200 bg-green-50">

            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-green-700">
                ✅ Diagnosis Confirmed
              </h3>
              <button
                className="text-sm text-blue-600 font-medium hover:underline"
                onClick={() => navigate(`/booking/${id}/notes`)}
              >
                Update Notes
              </button>
            </div>

            <div className="flex flex-col gap-3">

              {booking?.confirmed_disease && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 font-semibold
                                   uppercase tracking-wide w-32 flex-shrink-0
                                   mt-0.5">
                    Diagnosis
                  </span>
                  <span className="text-sm font-bold text-green-700">
                    {booking.confirmed_disease}
                  </span>
                </div>
              )}

              {booking?.ai_was_correct !== undefined && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 font-semibold
                                   uppercase tracking-wide w-32 flex-shrink-0
                                   mt-0.5">
                    AI Accuracy
                  </span>
                  <span className={`text-sm font-semibold ${
                    booking.ai_was_correct
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}>
                    {booking.ai_was_correct
                      ? '✓ AI prediction was correct'
                      : '✗ AI prediction was overridden'}
                  </span>
                </div>
              )}

              {booking?.treatment_plan && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 font-semibold
                                   uppercase tracking-wide w-32 flex-shrink-0
                                   mt-0.5">
                    Treatment
                  </span>
                  <span className="text-sm text-gray-700">
                    {booking.treatment_plan}
                  </span>
                </div>
              )}

              {booking?.medications?.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 font-semibold
                                   uppercase tracking-wide w-32 flex-shrink-0
                                   mt-0.5">
                    Medications
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {booking.medications.map((m, i) => (
                      <span key={i} className="text-xs bg-white text-gray-700
                                               px-2 py-0.5 rounded-full border
                                               border-gray-200">
                        💊 {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {booking?.clinical_notes && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 font-semibold
                                   uppercase tracking-wide w-32 flex-shrink-0
                                   mt-0.5">
                    Clinical Notes
                  </span>
                  <span className="text-sm text-gray-700 leading-relaxed">
                    {booking.clinical_notes}
                  </span>
                </div>
              )}

              {booking?.follow_up_date && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 font-semibold
                                   uppercase tracking-wide w-32 flex-shrink-0
                                   mt-0.5">
                    Follow Up
                  </span>
                  <span className="text-sm font-semibold text-blue-600">
                    📅 {booking.follow_up_date}
                  </span>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  )
}