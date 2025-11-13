import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function LinkWhatsAppCallback() {
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    const p = new URLSearchParams(loc.search)
    const status = p.get('status') || p.get('linked') || ''
    const error = p.get('error') || ''

    // If success-ish, go to dashboard. Otherwise, show message for a moment then go back.
    const success = /^(success|true|ok|connected)$/i.test(String(status))
    const timeout = setTimeout(() => {
      nav('/dashboard')
    }, 1200)

    return () => clearTimeout(timeout)
  }, [loc.search, nav])

  return (
    <div className="max-w-md mx-auto p-6 bg-white border rounded text-center space-y-2">
      <div className="text-lg font-semibold">Finishing WhatsApp linking…</div>
      <div className="text-sm text-gray-600">You will be redirected shortly.</div>
      <div className="text-xs text-gray-500">If nothing happens, <button className="underline" onClick={() => nav('/dashboard')}>click here</button>.</div>
    </div>
  )
}
