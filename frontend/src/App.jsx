import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Marketing from './pages/Marketing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import LinkWhatsApp from './pages/LinkWhatsApp.jsx'
import LinkWhatsAppCallback from './pages/LinkWhatsAppCallback.jsx'
import CaseStudies from './pages/CaseStudies.jsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { SocketProvider } from './contexts/SocketContext.jsx'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <nav className="flex items-center justify-between p-4 shadow bg-white">
            <Link to="/" className="font-semibold">WhatsApp AI</Link>
            <div className="space-x-4">
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </div>
          </nav>
          <div className="p-4">
            <Routes>
              <Route path="/" element={<Marketing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/case-studies" element={<CaseStudies />} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/link-whatsapp" element={<PrivateRoute><LinkWhatsApp /></PrivateRoute>} />
              <Route path="/link-whatsapp/callback" element={<PrivateRoute><LinkWhatsAppCallback /></PrivateRoute>} />
            </Routes>
          </div>
        </div>
      </SocketProvider>
    </AuthProvider>
  )
}
