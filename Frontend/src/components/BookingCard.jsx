import { useNavigate } from 'react-router-dom'

export default function BookingCard({ booking }) {
  const navigate = useNavigate()

  const statusConfig = {
    pending: {
      label: 'Pending',
      className: 'badge-pending',
      dot: 'bg-yellow-400',
    },
    confirmed: {
      label: 'Confirmed',
      className: 'badge-confirmed',
      dot: 'bg-green-400',
    },
    rejected: {
      label: 'Rejected',
      className: 'badge-rejected',
      dot: 'bg-red-400',
    },
  }

  const status = statusConfig[booking.status] || statusConfig.pending

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4 hover:shadow-md
                    transition-shadow duration-200">

      {/* Top row — patient info + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">

          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-600
                          flex items-center justify-center text-lg font-bold
                          flex-shrink-0">
            {booking.patient_name?.charAt(0)?.toUpperCase() || 'P'}
          </div>

          {/* Name and age */}
          <div>
            <p className="text-base font-semibold text-gray-800">
              {booking.patient_name || 'Patient'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {booking.patient_age
                ? `Age: ${booking.patient_age}`
                : 'Age not provided'}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          <span className={status.className}>{status.label}</span>
        </div>
      </div>

      {/* Details */}
      <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2">

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Slot</span>
          <span className="text-xs text-gray-700 font-semibold">
            {booking.slot || 'Not set'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Booked on</span>
          <span className="text-xs text-gray-700 font-semibold">
            {formatDate(booking.created_at)}
          </span>
        </div>

        {booking.confirmed_disease && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">
              Diagnosis
            </span>
            <span className="text-xs text-blue-600 font-semibold">
              {booking.confirmed_disease}
            </span>
          </div>
        )}

        {booking.notes && (
          <div className="flex flex-col gap-1 pt-1 border-t border-gray-200">
            <span className="text-xs text-gray-400 font-medium">
              Patient notes
            </span>
            <span className="text-xs text-gray-600 leading-relaxed">
              {booking.notes}
            </span>
          </div>
        )}
      </div>

      {/* AI prediction preview */}
      {booking.top_disease && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50
                        rounded-lg border border-blue-100">
          <span className="text-blue-500 text-sm">🤖</span>
          <span className="text-xs text-blue-600 font-medium">
            AI suggests: {booking.top_disease}
          </span>
        </div>
      )}

      {/* View button */}
      <button
        onClick={() => navigate(`/booking/${booking._id}`)}
        className="btn-primary w-full text-sm py-2.5"
      >
        View Full Report →
      </button>

    </div>
  )
}