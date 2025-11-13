import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketCtx = createContext(null)

export function SocketProvider({ children }) {
  const { token, user } = useAuth()
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!token || !user?.id) { setSocket(null); return }
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const base = (import.meta.env.VITE_SOCKET_URL) || apiUrl.replace(/\/api\/?$/, '')
    const namespace = `/tenant/${user.id}`
    const s = io(base + namespace, { auth: { token } })
    setSocket(s)
    return () => { s.disconnect() }
  }, [token, user?.id])

  return (
    <SocketCtx.Provider value={{ socket }}>
      {children}
    </SocketCtx.Provider>
  )
}

export function useSocket() { return useContext(SocketCtx) }
