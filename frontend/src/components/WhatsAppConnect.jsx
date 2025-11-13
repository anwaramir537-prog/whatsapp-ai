import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

export default function WhatsAppConnect({ onConnected, fullPage = false }) {
  const { api, user } = useAuth()
  const [status, setStatus] = useState('idle')
  const [qr, setQr] = useState(null)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    try {
      const { data } = await api.get(`/whatsapp/status/${user.id}`)
      if (data?.status) {
        setStatus(data.status)
        if (data.status === 'connected') {
          setQr(null)
          setError('')
          onConnected && onConnected()
        }
      }
    } catch {}
  }

  const connect = async () => {
    setError('')
    setQr(null)
    setLoading(true)
    try {
      await api.post(`/whatsapp/connect/${user.id}`)
      setStatus('qr')
      // Fallback: one status check after 12s if no socket status arrived
      setTimeout(() => { if (status !== 'connected') fetchStatus() }, 12000)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || 'Connect failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial single status fetch; further updates come from Socket.io
    fetchStatus()
  }, [])

  // Socket QR + status listeners
  const { socket } = useSocket()
  useEffect(() => {
    if (!socket) return
    const onQr = (p) => {
      if (!p?.qr) return
      const url = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(p.qr)}&size=${fullPage ? '384x384' : '256x256'}`
      setQr(url)
      setStatus('qr')
      if (localStorage.getItem('logLevel') === 'debug') console.debug('[wa:qr] received')
    }
    const onStatus = (p) => {
      if (!p?.status) return
      setStatus(p.status)
      if (localStorage.getItem('logLevel') === 'debug') console.debug('[wa:status]', p)
      if (p?.reason?.statusCode === 401) {
        setNotice('⚠️ WhatsApp session expired. A new QR has been generated — please scan again.')
      } else if (p.status !== 'disconnected') {
        setNotice('')
      }
      if (p.status === 'connected') {
        setQr(null)
        onConnected && onConnected()
      }
    }
    socket.on('wa:qr', onQr)
    socket.on('wa:status', onStatus)
    return () => { socket.off('wa:qr', onQr); socket.off('wa:status', onStatus) }
  }, [socket])

  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">WhatsApp Connection</div>
          <div className="text-sm text-gray-600">Status: {status}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={connect} disabled={loading} className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50">
            {loading ? 'Connecting...' : 'Connect WhatsApp'}
          </button>
        </div>
      </div>
      {notice && <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{notice}</div>}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      {status === 'disconnected' && reason && <div className="mt-1 text-xs text-gray-600">Reason: {reason}</div>}
      {qr && (
        <div className="mt-4 flex justify-center">
          <img src={qr} alt="QR" className={fullPage ? 'w-96 h-96' : 'w-64 h-64'} />
        </div>
      )}
      {status === 'qr' && !qr && (
        <div className="mt-2 text-sm text-gray-600">QR generating... please wait</div>
      )}
    </div>
  )
}
