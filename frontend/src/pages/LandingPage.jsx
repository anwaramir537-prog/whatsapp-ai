import React from 'react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">WhatsApp AI Support Assistant</h1>
      <p className="text-gray-700 mb-6">Connect your WhatsApp via QR, upload your FAQ, and let AI answer customer queries in real-time.</p>
      <div className="space-x-3">
        <Link to="/signup" className="px-4 py-2 bg-indigo-600 text-white rounded">Get Started</Link>
        <Link to="/login" className="px-4 py-2 border rounded">Login</Link>
      </div>
    </div>
  )
}
