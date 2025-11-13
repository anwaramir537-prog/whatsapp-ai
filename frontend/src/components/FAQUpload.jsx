import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function FAQUpload() {
  const { api, user } = useAuth()
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [merge, setMerge] = useState(false)

  const loadList = async () => {
    try {
      setLoadingList(true)
      const { data } = await api.get(`/faq/${user.id}`)
      setItems(Array.isArray(data.items) ? data.items.slice(0, 20) : [])
    } catch { setItems([]) }
    finally { setLoadingList(false) }
  }

  const onFile = (e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setStatus('')
    setProgress(0)
  }

  const upload = async () => {
    if (!file) { setStatus('Please choose a PDF'); return }
    if (!file.name.toLowerCase().endsWith('.pdf')) { setStatus('Only .pdf allowed'); return }
    setLoading(true)
    setStatus('')
    setProgress(0)
    try {
      // Confirm destructive replace when merge is off
      if (!merge) {
        const ok = window.confirm('This will delete existing FAQs. Continue?')
        if (!ok) { setStatus('Upload canceled'); setLoading(false); return }
      }
      const form = new FormData()
      form.append('file', file)
      const url = `/faq/upload/${user.id}${merge ? '?merge=1' : ''}`
      const { data } = await api.post(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
      setStatus(`${data?.mode === 'merge' ? 'Merged' : 'Replaced'} • ${data?.inserted || 0} Q/A pairs`)
      await loadList()
    } catch (e) {
      const msg = e?.response?.data?.error || 'Upload failed'
      setStatus(msg)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { loadList() }, [])

  return (
    <div className="p-4 border rounded bg-white space-y-2">
      <div className="font-semibold">Upload FAQ PDF</div>
      <input type="file" accept="application/pdf" onChange={onFile} />
      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={merge} onChange={e=>setMerge(e.target.checked)} />
        Merge with existing (don’t delete old FAQs)
      </label>
      {progress > 0 && <div className="text-xs text-gray-600">Progress: {progress}%</div>}
      <button onClick={upload} disabled={loading} className="px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">{loading ? 'Uploading...' : 'Upload'}</button>
      {status && <div className="text-xs text-gray-700">{status}</div>}
      <div className="pt-2">
        <div className="text-sm font-medium">Recent FAQs ({items.length})</div>
        {loadingList ? (
          <div className="text-xs text-gray-500">Loading...</div>
        ) : (
          <ul className="max-h-48 overflow-auto text-xs list-disc pl-4 space-y-1">
            {items.map((it, idx) => (
              <li key={idx}><span className="font-semibold">Q:</span> {it.question} <span className="font-semibold">A:</span> {it.answer?.slice(0,120)}</li>
            ))}
            {items.length === 0 && <li className="list-none text-gray-500">No FAQs uploaded yet.</li>}
          </ul>
        )}
      </div>
    </div>
  )
}
