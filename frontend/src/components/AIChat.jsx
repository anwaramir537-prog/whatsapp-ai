import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AIChat() {
  const { api, user } = useAuth()
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const send = async (e) => {
    e && e.preventDefault()
    const msg = input.trim()
    if (!msg) return
    setInput('')
    setHistory(h => [...h, { role: 'user', text: msg }])
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/ai/ask/${user.id}`, { text: msg })
      const reply = data?.text || ''
      const source = data?.source || ''
      setHistory(h => [...h, { role: 'assistant', text: reply, source }])
    } catch (e) {
      setError(e?.response?.data?.error || 'AI error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded bg-white space-y-3">
      <div className="font-semibold">AI Chat (FAQ + Groq)</div>
      <div className="h-64 overflow-auto border rounded p-2 bg-gray-50">
        {history.length === 0 && <div className="text-sm text-gray-500">Ask something to test the bot (uses your uploaded FAQs first, then AI).</div>}
        {history.map((m, i) => (
          <div key={i} className={`my-1 text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block px-2 py-1 rounded ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>
              {m.text}
              {m.source && <span className="block text-[10px] text-gray-600">{m.source}</span>}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input className="flex-1 border rounded p-2" placeholder="Type a message" value={input} onChange={e=>setInput(e.target.value)} />
        <button disabled={loading} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">Send</button>
      </form>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}
