import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDoctorBookings } from '../api/api'
import Navbar from '../components/Navbar'
import BookingCard from '../components/BookingCard'

export default function Dashboard() {
  const { getDoctorId, getDoctorName } = useAuth()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    applyFilter()
  }, [filter, search, bookings])

  const fetchBookings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const doctorId = getDoctorId()
      const res = await getDoctorBookings(doctorId)
      const sorted = res.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
      setBookings(sorted)
    } catch (err) {
      setError('Failed to load bookings. Please refresh.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const applyFilter = () => {
    let result = [...bookings]

    // Filter by status
    if (filter !== 'all') {
      result = result.filter((b) => b.status === filter)
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (b) =>
          b.patient_name?.toLowerCase().includes(q) ||
          b.confirmed_disease?.toLowerCase().includes(q) ||
          b.slot?.toLowerCase().includes(q)
      )
    }

    setFiltered(result)
  }

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    rejected: bookings.filter((b) => b.status === 'rejected').length,
  }

  const filterTabs = [
    { key: 'all', label: 'All', emoji: '📋' },
    { key: 'pending', label: 'Pending', emoji: '🕐' },
    { key: 'confirmed', label: 'Confirmed', emoji: '✅' },
    { key: 'rejected', label: 'Rejected', emoji: '❌' },
  ]

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="page-container">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {getGreeting()}, Dr. {getDoctorName()} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {counts.pending > 0
                ? `You have ${counts.pending} pending booking${counts.pending > 1 ? 's' : ''} to review`
                : 'All bookings are up to date'}
            </p>
          </div>

          <button
            onClick={() => fetchBookings(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border
                       border-gray-200 rounded-lg text-sm text-gray-600
                       hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="stat-card">
            <span className="text-3xl font-bold text-blue-600">
              {counts.all}
            </span>
            <span className="text-xs text-gray-400 font-medium uppercase
                             tracking-wide">
              Total Bookings
            </span>
          </div>

          <div className="stat-card">
            <span className="text-3xl font-bold text-yellow-500">
              {counts.pending}
            </span>
            <span className="text-xs text-gray-400 font-medium uppercase
                             tracking-wide">
              Pending
            </span>
          </div>

          <div className="stat-card">
            <span className="text-3xl font-bold text-green-500">
              {counts.confirmed}
            </span>
            <span className="text-xs text-gray-400 font-medium uppercase
                             tracking-wide">
              Confirmed
            </span>
          </div>

          <div className="stat-card cursor-pointer hover:shadow-md
                          transition-shadow"
            onClick={() => navigate('/analytics')}
          >
            <span className="text-3xl font-bold text-purple-500">
              📊
            </span>
            <span className="text-xs text-gray-400 font-medium uppercase
                             tracking-wide">
              View Analytics
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2
                           text-gray-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            className="input-field pl-9"
            placeholder="Search by patient name, disease or slot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2
                         text-gray-400 hover:text-gray-600 text-sm"
              onClick={() => setSearch('')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg
                          text-sm font-medium whitespace-nowrap transition-colors
                          border flex-shrink-0
                          ${filter === tab.key
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                          }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                                ${filter === tab.key
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-500'
                                }`}>
                {counts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border
                          border-red-200 rounded-lg px-4 py-3 mb-6">
            <span>⚠️</span>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              className="ml-auto text-red-500 text-sm font-medium
                         hover:underline"
              onClick={() => fetchBookings()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                          gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-20 bg-gray-100 rounded-lg mb-4" />
                <div className="h-9 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">
              {search ? '🔍' : filter === 'pending' ? '🎉' : '📋'}
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {search
                ? 'No results found'
                : filter === 'pending'
                ? 'No pending bookings!'
                : 'No bookings yet'}
            </h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              {search
                ? `No bookings match "${search}". Try a different search.`
                : filter !== 'all'
                ? `No ${filter} bookings at the moment.`
                : 'Patient bookings will appear here once they book a consultation.'}
            </p>
            {search && (
              <button
                className="mt-4 text-blue-600 text-sm font-medium
                           hover:underline"
                onClick={() => setSearch('')}
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Bookings Grid */}
        {!loading && filtered.length > 0 && (
          <>
            <p className="text-xs text-gray-400 font-medium mb-4">
              Showing {filtered.length} of {bookings.length} booking
              {bookings.length !== 1 ? 's' : ''}
              {search && ` for "${search}"`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                            gap-5">
              {filtered.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}