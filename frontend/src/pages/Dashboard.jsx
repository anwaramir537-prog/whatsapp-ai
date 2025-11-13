import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import WhatsAppConnect from '../components/WhatsAppConnect'
import ChatWindow from '../components/ChatWindow'
import FAQUpload from '../components/FAQUpload'
import SettingsPanel from '../components/SettingsPanel'
import AIChat from '../components/AIChat'
import FAQManager from '../components/FAQManager'
import SEO from '../components/SEO'

export default function Dashboard() {
  const { api, user, logout } = useAuth()
  const nav = useNavigate()
  const [analytics, setAnalytics] = useState({ total: 0, faq: 0, ai: 0, manual: 0 })

  // Auto-redirect to linking page if not connected
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get(`/whatsapp/status/${user.id}`)
        if (data?.status !== 'connected') nav('/link-whatsapp')
      } catch (_) {
        nav('/link-whatsapp')
      }
    }
    check()
  }, [])

  // Load analytics
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/chat/analytics/${user.id}`)
        setAnalytics(data?.totals || { total: 0, faq: 0, ai: 0, manual: 0 })
      } catch {}
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [])

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Wrap AI Dashboard",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
  }
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: typeof window !== 'undefined' ? window.location.origin + '/' : undefined },
      { "@type": "ListItem", position: 2, name: "Dashboard", item: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined }
    ]
  }

  return (
    <div className="space-y-4">
      <SEO title="Dashboard — Wrap AI" description="Manage FAQs, WhatsApp sessions, AI settings and analytics." jsonLd={[appJsonLd, breadcrumbJsonLd]} />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Welcome, {user?.name}</div>
          <div className="text-sm text-gray-600">User ID: {user?.id}</div>
        </div>
        <button onClick={logout} className="px-3 py-2 border rounded">Logout</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <FAQUpload />
          <FAQManager />
          <WhatsAppConnect />
          <a href="/link-whatsapp" className="text-sm text-indigo-600 underline">Open linking screen</a>
          <div className="pt-2">
            <SettingsPanel />
          </div>
        </div>
        <div className="p-4 border rounded bg-white">
          <div className="font-semibold">Analytics</div>
          <div className="text-sm text-gray-700 mt-2">Total: {analytics.total} · FAQ: {analytics.faq} · AI: {analytics.ai} · Manual: {analytics.manual}</div>
        </div>
        <AIChat />
        <ChatWindow />
      </div>
    </div>
  )
}
