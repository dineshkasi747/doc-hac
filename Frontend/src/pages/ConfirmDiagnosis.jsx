import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFullReport, confirmDiagnosis } from '../api/api'
import Navbar from '../components/Navbar'

export default function ConfirmDiagnosis() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [report, setReport] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [confirmedDisease, setConfirmedDisease] = useState('')
  const [aiWasCorrect, setAiWasCorrect] = useState(null)
  const [confidenceLevel, setConfidenceLevel] = useState('high')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    getFullReport(id)
      .then((res) => {
        setReport(res.data)
        // Pre-fill with top AI prediction
        const topDisease = res.data?.case?.top_disease || ''
        setConfirmedDisease(topDisease)
      })
      .catch(() => setError('Failed to load report'))
      .finally(() => setFetching(false))
  }, [id])

  const handleConfirm = async () => {
    if (!confirmedDisease.trim()) {
      setError('Please enter the confirmed disease name')
      return
    }
    if (aiWasCorrect === null) {
      setError('Please indicate whether the AI prediction was correct')
      return
    }

    setLoading(true)
    setError('')

    try {
      await confirmDiagnosis({
        booking_id: id,
        confirmed_disease: confirmedDisease.trim(),
        ai_was_correct: aiWasCorrect,
        confidence_in_diagnosis: confidenceLevel,
        notes: notes.trim(),
      })
      setSuccess(true)
      setTimeout(() => navigate(`/booking/${id}`), 2000)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to confirm diagnosis. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const predictions = report?.case?.predictions || []
  const patientName = report?.patient?.name || 'Patient'

  const confidenceLevels = [
    {
      value: 'high',
      label: 'High Confidence',
      desc: 'I am certain of this diagnosis',
      color: 'green',
    },
    {
      value: 'medium',
      label: 'Medium Confidence',
      desc: 'Likely but needs follow up tests',
      color: 'yellow',
    },
    {
      value: 'low',
      label: 'Low Confidence',
      desc: 'Uncertain, further investigation needed',
      color: 'red',
    },
  ]

  const confidenceStyle = {
    high: {
      selected: 'border-green-400 bg-green-50',
      dot: 'bg-green-400',
      text: 'text-green-700',
    },
    medium: {
      selected: 'border-yellow-400 bg-yellow-50',
      dot: 'bg-yellow-400',
      text: 'text-yellow-700',
    },
    low: {
      selected: 'border-red-400 bg-red-50',
      dot: 'bg-red-400',
      text: 'text-red-700',
    },
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="page-container">
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Diagnosis Confirmed
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              {confirmedDisease} has been confirmed for {patientName}.
            </p>
            <p className="text-gray-400 text-xs">
              Redirecting to booking detail...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Loading screen
  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="page-container">
          <div className="animate-pulse flex flex-col gap-5 max-w-2xl
                          mx-auto">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="card p-6 h-48 bg-gray-100" />
            <div className="card p-6 h-64 bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5">

        {/* Back button */}
        <button
          onClick={() => navigate(`/booking/${id}`)}
          className="flex items-center gap-1.5 text-blue-600 text-sm
                     font-medium hover:underline self-start"
        >
          ← Back to Report
        </button>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Confirm Diagnosis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Patient: <span className="font-semibold">{patientName}</span>
          </p>
        </div>

        {/* AI Predictions — quick select */}
        {predictions.length > 0 && (
          <div className="card p-5">
            <p className="section-title">AI Suggested Diagnoses</p>
            <p className="text-xs text-gray-400 mb-3">
              Click to select as confirmed diagnosis
            </p>
            <div className="flex flex-col gap-2">
              {predictions.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setConfirmedDisease(p.disease)
                    setAiWasCorrect(true)
                  }}
                  className={`flex items-center justify-between p-3
                              rounded-lg border text-left transition-all
                              ${confirmedDisease === p.disease
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                              }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center
                                      justify-center text-white text-xs
                                      font-bold flex-shrink-0
                                      ${i === 0 ? 'bg-red-500'
                                        : i === 1 ? 'bg-yellow-500'
                                        : 'bg-green-500'}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {p.disease}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold
                                      ${i === 0 ? 'text-red-500'
                                        : i === 1 ? 'text-yellow-500'
                                        : 'text-green-500'}`}>
                      {p.confidence}%
                    </span>
                    {confirmedDisease === p.disease && (
                      <span className="text-blue-500 text-sm">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed disease input */}
        <div className="card p-5">
          <p className="section-title">Confirmed Disease Name</p>
          <p className="text-xs text-gray-400 mb-3">
            Edit the disease name or type a different one if AI was wrong
          </p>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Wilson's Disease, Gaucher Disease..."
            value={confirmedDisease}
            onChange={(e) => setConfirmedDisease(e.target.value)}
          />
        </div>

        {/* Was AI correct */}
        <div className="card p-5">
          <p className="section-title">Was the AI Prediction Correct?</p>
          <p className="text-xs text-gray-400 mb-3">
            This helps improve AI accuracy over time
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAiWasCorrect(true)}
              className={`p-4 rounded-lg border-2 text-center transition-all
                          ${aiWasCorrect === true
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
            >
              <div className="text-2xl mb-1">✅</div>
              <div className={`text-sm font-semibold
                               ${aiWasCorrect === true
                                 ? 'text-green-700'
                                 : 'text-gray-600'
                               }`}>
                Yes, AI was correct
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                AI predicted the right disease
              </div>
            </button>

            <button
              onClick={() => setAiWasCorrect(false)}
              className={`p-4 rounded-lg border-2 text-center transition-all
                          ${aiWasCorrect === false
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
            >
              <div className="text-2xl mb-1">❌</div>
              <div className={`text-sm font-semibold
                               ${aiWasCorrect === false
                                 ? 'text-red-700'
                                 : 'text-gray-600'
                               }`}>
                No, AI was wrong
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                I am overriding the AI prediction
              </div>
            </button>
          </div>
        </div>

        {/* Confidence level */}
        <div className="card p-5">
          <p className="section-title">Your Confidence Level</p>
          <div className="flex flex-col gap-2">
            {confidenceLevels.map((level) => {
              const style = confidenceStyle[level.value]
              const isSelected = confidenceLevel === level.value
              return (
                <button
                  key={level.value}
                  onClick={() => setConfidenceLevel(level.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg
                              border-2 text-left transition-all
                              ${isSelected
                                ? style.selected
                                : 'border-gray-200 hover:border-gray-300'
                              }`}
                >
                  <span className={`w-3 h-3 rounded-full flex-shrink-0
                                    ${style.dot}`} />
                  <div>
                    <p className={`text-sm font-semibold
                                   ${isSelected
                                     ? style.text
                                     : 'text-gray-700'
                                   }`}>
                      {level.label}
                    </p>
                    <p className="text-xs text-gray-400">{level.desc}</p>
                  </div>
                  {isSelected && (
                    <span className={`ml-auto text-sm ${style.text}`}>
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Additional notes */}
        <div className="card p-5">
          <p className="section-title">Additional Notes (Optional)</p>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Any additional clinical observations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border
                          border-red-200 rounded-lg px-4 py-3">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Submit buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
          <button
            className="btn-secondary py-3 text-base"
            onClick={() => navigate(`/booking/${id}`)}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-success py-3 text-base"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white
                                 border-t-transparent rounded-full
                                 animate-spin" />
                Confirming...
              </span>
            ) : (
              '✅ Confirm Diagnosis'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}