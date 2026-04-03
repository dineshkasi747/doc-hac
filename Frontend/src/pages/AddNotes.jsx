import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFullReport, addDoctorNotes } from '../api/api'
import Navbar from '../components/Navbar'

export default function AddNotes() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [report, setReport] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form state
  const [confirmedDisease, setConfirmedDisease] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [medications, setMedications] = useState([])
  const [medicationInput, setMedicationInput] = useState('')

  useEffect(() => {
    getFullReport(id)
      .then((res) => {
        setReport(res.data)
        const booking = res.data?.booking
        const caseData = res.data?.case

        // Pre fill if notes already exist
        setConfirmedDisease(
          booking?.confirmed_disease ||
          caseData?.top_disease || ''
        )
        setTreatmentPlan(booking?.treatment_plan || '')
        setClinicalNotes(booking?.clinical_notes || '')
        setFollowUpDate(booking?.follow_up_date || '')
        setMedications(booking?.medications || [])
      })
      .catch(() => setError('Failed to load booking data'))
      .finally(() => setFetching(false))
  }, [id])

  const handleAddMedication = () => {
    const med = medicationInput.trim()
    if (!med) return
    if (medications.includes(med)) {
      setMedicationInput('')
      return
    }
    setMedications([...medications, med])
    setMedicationInput('')
  }

  const handleRemoveMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  const handleMedicationKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddMedication()
    }
  }

  const handleSave = async () => {
    if (!treatmentPlan.trim()) {
      setError('Please enter a treatment plan')
      return
    }

    setLoading(true)
    setError('')

    try {
      await addDoctorNotes({
        booking_id: id,
        confirmed_disease: confirmedDisease.trim(),
        treatment_plan: treatmentPlan.trim(),
        clinical_notes: clinicalNotes.trim(),
        follow_up_date: followUpDate,
        medications: medications,
      })
      setSuccess(true)
      setTimeout(() => navigate(`/booking/${id}`), 2000)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to save notes. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const patientName = report?.patient?.name || 'Patient'

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="page-container">
          <div className="max-w-md mx-auto text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Notes Saved
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              Treatment notes for {patientName} have been saved successfully.
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
            <div className="card p-6 h-40 bg-gray-100" />
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
            Treatment Notes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Patient:{' '}
            <span className="font-semibold">{patientName}</span>
          </p>
        </div>

        {/* Patient summary bar */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600
                          flex items-center justify-center font-bold
                          text-base flex-shrink-0">
            {patientName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {patientName}
            </p>
            <p className="text-xs text-gray-400">
              Slot: {report?.booking?.slot || 'Not set'}
            </p>
          </div>
          {report?.case?.top_disease && (
            <div className="flex items-center gap-1.5 bg-blue-50 px-3
                            py-1.5 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-500">🤖</span>
              <span className="text-xs text-blue-600 font-medium">
                {report.case.top_disease}
              </span>
            </div>
          )}
        </div>

        {/* Confirmed disease */}
        <div className="card p-5">
          <label className="label">Confirmed Disease</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Wilson's Disease, Gaucher Disease..."
            value={confirmedDisease}
            onChange={(e) => setConfirmedDisease(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-2">
            This will be shown to the patient as their confirmed diagnosis
          </p>
        </div>

        {/* Treatment plan */}
        <div className="card p-5">
          <label className="label">
            Treatment Plan
            <span className="text-red-400 ml-1">*</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="Describe the recommended treatment plan, therapy, lifestyle changes..."
            value={treatmentPlan}
            onChange={(e) => setTreatmentPlan(e.target.value)}
          />
        </div>

        {/* Medications */}
        <div className="card p-5">
          <label className="label">Medications</label>
          <p className="text-xs text-gray-400 mb-3">
            Type a medication and press Enter or click Add
          </p>

          {/* Input row */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              className="input-field flex-1"
              placeholder="e.g. Penicillamine 250mg..."
              value={medicationInput}
              onChange={(e) => setMedicationInput(e.target.value)}
              onKeyDown={handleMedicationKeyDown}
            />
            <button
              type="button"
              onClick={handleAddMedication}
              className="btn-primary px-4 py-2 text-sm flex-shrink-0"
            >
              Add
            </button>
          </div>

          {/* Medication chips */}
          {medications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {medications.map((med, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-blue-50
                             text-blue-700 text-xs font-medium px-3 py-1.5
                             rounded-full border border-blue-200"
                >
                  <span>💊</span>
                  <span>{med}</span>
                  <button
                    onClick={() => handleRemoveMedication(i)}
                    className="text-blue-400 hover:text-red-500
                               transition-colors ml-1 font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-300 italic">
              No medications added yet
            </p>
          )}
        </div>

        {/* Follow up date */}
        <div className="card p-5">
          <label className="label">Follow Up Date</label>
          <input
            type="date"
            className="input-field"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <p className="text-xs text-gray-400 mt-2">
            Patient will be reminded of this follow up date
          </p>
        </div>

        {/* Clinical notes */}
        <div className="card p-5">
          <label className="label">Clinical Notes (Optional)</label>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="Additional clinical observations, test results to follow up, 
special instructions for the patient..."
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
          />
        </div>

        {/* Summary preview */}
        {(confirmedDisease || treatmentPlan || medications.length > 0) && (
          <div className="card p-5 bg-green-50 border-green-200">
            <p className="section-title text-green-600">
              Notes Preview
            </p>
            <div className="flex flex-col gap-2">
              {confirmedDisease && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-400 w-28 flex-shrink-0">
                    Disease:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {confirmedDisease}
                  </span>
                </div>
              )}
              {treatmentPlan && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-400 w-28 flex-shrink-0">
                    Treatment:
                  </span>
                  <span className="text-gray-700 leading-relaxed">
                    {treatmentPlan}
                  </span>
                </div>
              )}
              {medications.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-400 w-28 flex-shrink-0">
                    Medications:
                  </span>
                  <span className="text-gray-700">
                    {medications.join(', ')}
                  </span>
                </div>
              )}
              {followUpDate && (
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-400 w-28 flex-shrink-0">
                    Follow Up:
                  </span>
                  <span className="text-gray-700 font-medium">
                    📅 {followUpDate}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border
                          border-red-200 rounded-lg px-4 py-3">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
          <button
            className="btn-secondary py-3 text-base"
            onClick={() => navigate(`/booking/${id}`)}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-primary py-3 text-base"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white
                                 border-t-transparent rounded-full
                                 animate-spin" />
                Saving...
              </span>
            ) : (
              '💾 Save Notes'
            )}
          </button>
        </div>

      </div>
    </div>
  )
}