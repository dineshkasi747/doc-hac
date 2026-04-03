import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)

  // On app load check if token exists and validate it
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getMe()
        .then((res) => {
          if (res.data.role === 'doctor') {
            setDoctor(res.data)
          } else {
            // Logged in but not a doctor — clear and redirect
            localStorage.clear()
            setDoctor(null)
          }
        })
        .catch(() => {
          // Token invalid or expired
          localStorage.clear()
          setDoctor(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (tokenData) => {
    localStorage.setItem('token', tokenData.access_token)
    localStorage.setItem('doctor_id', tokenData.user_id)
    localStorage.setItem('doctor_name', tokenData.name)
    setDoctor({
      _id: tokenData.user_id,
      name: tokenData.name,
      role: tokenData.role,
    })
  }

  const logout = () => {
    localStorage.clear()
    setDoctor(null)
  }

  const getDoctorId = () => {
    return localStorage.getItem('doctor_id')
  }

  const getDoctorName = () => {
    return localStorage.getItem('doctor_name')
  }

  return (
    <AuthContext.Provider value={{
      doctor,
      loading,
      login,
      logout,
      getDoctorId,
      getDoctorName,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}