import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — token expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── AUTH ───────────────────────────────────────────────

export const loginDoctor = (data) =>
  api.post('/auth/login', data)

export const getMe = () =>
  api.get('/auth/me')

// ─── BOOKINGS ───────────────────────────────────────────

export const getDoctorBookings = (doctorId) =>
  api.get(`/booking/doctor/${doctorId}`)

export const getFullReport = (bookingId) =>
  api.get(`/booking/${bookingId}/full-report`)

// ─── DOCTOR ACTIONS ─────────────────────────────────────

export const confirmDiagnosis = (data) =>
  api.post('/doctor/confirm', data)

export const addDoctorNotes = (data) =>
  api.post('/doctor/notes', data)

export const getDoctorAnalytics = (doctorId) =>
  api.get(`/doctor/analytics/${doctorId}`)

// ─── NGO ────────────────────────────────────────────────

export const getAllApplications = () =>
  api.get('/ngo/applications')

export const approveAid = (applicationId, data) =>
  api.patch(`/ngo/approve/${applicationId}`, data)

// ─── COMMUNITY ──────────────────────────────────────────

export const getAllPosts = () =>
  api.get('/community/all')

export default api