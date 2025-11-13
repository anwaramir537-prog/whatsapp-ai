import React, { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'

const AuthCtx = createContext(null)

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
// Ensure global axios sends token by default as well
const bootToken = localStorage.getItem('token')
if (bootToken) axios.defaults.headers.common['Authorization'] = `Bearer ${bootToken}`
const api = axios.create({ baseURL })

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user')
    return u ? JSON.parse(u) : null
  })

  useEffect(() => {
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    else delete api.defaults.headers.common['Authorization']
  }, [token])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }

  const signup = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ api, token, user, setUser, login, signup, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() { return useContext(AuthCtx) }
