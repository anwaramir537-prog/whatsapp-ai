import React from 'react'
import { useNavigate } from 'react-router-dom'
import WhatsAppConnect from '../components/WhatsAppConnect'

export default function LinkWhatsApp() {
  const nav = useNavigate()

  const joyzUrl = (import.meta.env.VITE_JOYZ_LINK_URL || 'https://app.joyz.ai/enterprise/690d481f5a2b8840164cf5d1/dashboard/integration-settings/wa-ai-agent')
  const linkViaJoyz = () => {
    try {
      const returnUrl = `${window.location.origin}/link-whatsapp/callback`
      const url = new URL(joyzUrl)
      url.searchParams.set('return_url', returnUrl)
      url.searchParams.set('redirect_uri', returnUrl)
      window.location.href = url.toString()
    } catch (_) {
      window.location.href = joyzUrl
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white border rounded space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-2">Link your WhatsApp</h2>
        <p className="text-sm text-gray-600">Choose one of the options below to link your WhatsApp.</p>
      </div>

      <div className="space-y-2 p-3 border rounded">
        <div className="font-medium">Option A: Link via Joyz</div>
        <p className="text-sm text-gray-600">Opens Joyz linking page and returns here after success.</p>
        <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={linkViaJoyz}>Link via Joyz</button>
      </div>

      <div className="space-y-2 p-3 border rounded">
        <div className="font-medium">Option B: Link via in‑app QR</div>
        <p className="text-sm text-gray-600">Scan the QR below. After it connects, you’ll be redirected back.</p>
        <WhatsAppConnect fullPage onConnected={() => nav('/dashboard')} />
      </div>

      <div className="text-right">
        <button className="px-3 py-2 border rounded" onClick={() => nav('/dashboard')}>Cancel</button>
      </div>
    </div>
  )
}
