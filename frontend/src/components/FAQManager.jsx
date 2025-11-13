import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function FAQManager() {
  const { api, user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [status, setStatus] = useState('')
  const [merge, setMerge] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/faq/${user.id}`)
      setItems(data.items || [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }

  const add = async () => {
    if (!q || !a) return
    try {
      const { data } = await api.post(`/faq/${user.id}`, { question: q, answer: a })
      setQ(''); setA(''); setStatus('Added')
      setTimeout(()=>setStatus(''), 1200)
      await load()
    } catch (e) { setStatus(e?.response?.data?.error || 'Add failed') }
  }

  const save = async (id, question, answer) => {
    try {
      await api.put(`/faq/${user.id}/${id}`, { question, answer })
      await load()
    } catch {}
  }

  const del = async (id) => {
    try { await api.delete(`/faq/${user.id}/${id}`); await load() } catch {}
  }

  const importCSV = async (file) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      // Confirm destructive replace when merge is off
      if (!merge) {
        const ok = window.confirm('This will delete existing FAQs. Continue?')
        if (!ok) { setStatus('Import canceled'); return }
      }
      const url = `/faq/import/csv/${user.id}${merge ? '?merge=1' : ''}`
      const { data } = await api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus(`${data?.mode === 'merge' ? 'Merged' : 'Replaced'} • ${data?.inserted || 0} items`)
      await load()
    } catch (e) { setStatus(e?.response?.data?.error || 'Import failed') }
  }

  useEffect(()=>{ load() }, [])

  return (
    <div className="p-4 border rounded bg-white space-y-2">
      <div className="font-semibold">FAQ Manager</div>
      <div className="flex gap-2 items-center">
        <input className="border rounded px-2 py-1 flex-1" placeholder="Question" value={q} onChange={e=>setQ(e.target.value)} />
        <input className="border rounded px-2 py-1 flex-1" placeholder="Answer" value={a} onChange={e=>setA(e.target.value)} />
        <button onClick={add} className="px-3 py-2 bg-indigo-600 text-white rounded">Add</button>
      </div>
      <div className="text-xs text-gray-600">Or import CSV (columns: Question,Answer): <input type="file" accept=".csv" onChange={e=>importCSV(e.target.files?.[0])} /></div>
      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={merge} onChange={e=>setMerge(e.target.checked)} />
        Merge with existing (don’t delete old FAQs)
      </label>
      {status && <div className="text-xs text-gray-700">{status}</div>}
      <div className="max-h-60 overflow-auto divide-y">
        {loading ? <div className="text-xs text-gray-500">Loading…</div> : (
          items.map(it => <Row key={it._id} item={it} onSave={save} onDel={del} />)
        )}
        {!loading && items.length === 0 && <div className="text-xs text-gray-500">No FAQs yet.</div>}
      </div>
    </div>
  )
}

function Row({ item, onSave, onDel }) {
  const [question, setQuestion] = useState(item.question)
  const [answer, setAnswer] = useState(item.answer)
  return (
    <div className="py-2 flex items-start gap-2">
      <input className="border rounded px-2 py-1 flex-1" value={question} onChange={e=>setQuestion(e.target.value)} />
      <input className="border rounded px-2 py-1 flex-1" value={answer} onChange={e=>setAnswer(e.target.value)} />
      <button onClick={()=>onSave(item._id, question, answer)} className="px-2 py-1 border rounded">Save</button>
      <button onClick={()=>onDel(item._id)} className="px-2 py-1 border rounded text-red-600">Delete</button>
    </div>
  )
}
