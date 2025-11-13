import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPanel() {
  const { api, user } = useAuth()
  const [aiEnabled, setAiEnabled] = useState(true)
  const [faqThreshold, setFaqThreshold] = useState(0.42)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [logLevel, setLogLevel] = useState('info')

  const load = async () => {
    try {
      const [{ data: s }, { data: c }] = await Promise.all([
        api.get(`/settings/${user.id}`),
        api.get(`/config/log-level`),
      ])
      setAiEnabled(!!s.settings.aiEnabled)
      setFaqThreshold(Number(s.settings.faqThreshold || 0.42))
      setLogLevel(c.level || 'info')
      localStorage.setItem('logLevel', c.level || 'info')
    } catch {}
  }

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
      await api.put(`/settings/${user.id}`, { aiEnabled, faqThreshold })
      await api.post(`/config/log-level`, { level: logLevel })
      localStorage.setItem('logLevel', logLevel)
      setMsg('Saved')
      setTimeout(()=>setMsg(''), 1500)
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="p-4 border rounded bg-white space-y-3">
      <div className="font-semibold">AI & FAQ Settings</div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={aiEnabled} onChange={e=>setAiEnabled(e.target.checked)} />
        <span>Enable AI fallback when FAQ has no match</span>
      </label>
      <div>
        <div className="text-sm text-gray-700">FAQ Match Threshold: {faqThreshold.toFixed(2)}</div>
        <input type="range" min="0" max="1" step="0.01" value={faqThreshold} onChange={e=>setFaqThreshold(Number(e.target.value))} className="w-full" />
      </div>
      <div>
        <div className="text-sm text-gray-700">Log Level</div>
        <select value={logLevel} onChange={e=>setLogLevel(e.target.value)} className="border rounded px-2 py-1">
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <div className="text-xs text-gray-500 mt-1">When Debug is enabled, live connection events will appear in the browser console.</div>
      </div>
      <button onClick={save} disabled={saving} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
      {msg && <div className="text-xs text-gray-600">{msg}</div>}
    </div>
  )
}
