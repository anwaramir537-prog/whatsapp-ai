import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'

export default function ChatWindow() {
  const { api, user } = useAuth()
  const { socket } = useSocket()
  const [chats, setChats] = useState([])
  const [selected, setSelected] = useState(null)
  const [text, setText] = useState('')

  // Build live chat state from socket events
  useEffect(() => {
    setChats([])
    setSelected(null)
  }, [])

  useEffect(() => {
    if (!socket) return
    const onIncoming = ({ userId, from, text }) => {
      const contactId = from
      setChats(prev => {
        const idx = prev.findIndex(c => c.contactId === contactId)
        if (idx === -1) return [...prev, { contactId, messages: [{ role: 'user', text }] }]
        const copy = [...prev]
        copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, { role: 'user', text }] }
        return copy
      })
    }
    const onReply = ({ userId, to, text, source, provider }) => {
      const contactId = to
      setChats(prev => {
        const idx = prev.findIndex(c => c.contactId === contactId)
        const meta = { role: 'assistant', text, responseType: source, provider }
        if (idx === -1) return [...prev, { contactId, messages: [meta] }]
        const copy = [...prev]
        copy[idx] = { ...copy[idx], messages: [...copy[idx].messages, meta] }
        return copy
      })
    }
    socket.on('wa:incoming', onIncoming)
    socket.on('wa:reply', onReply)
    return () => {
      socket.off('wa:incoming', onIncoming)
      socket.off('wa:reply', onReply)
    }
  }, [socket])

  const send = async () => {
    if (!selected) return
    const to = selected.contactId
    await api.post(`/whatsapp/send/${user.id}`, { to, text })
    setText('')
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1 border rounded bg-white overflow-auto">
        {chats.map(c => (
          <div key={c._id} onClick={() => setSelected(c)} className={`p-3 cursor-pointer border-b ${selected?._id === c._id ? 'bg-gray-100' : ''}`}>
            <div className="font-semibold">{c.contactId}</div>
            <div className="text-xs text-gray-600">{c.messages?.[c.messages.length-1]?.text?.slice(0,40)}</div>
          </div>
        ))}
      </div>
      <div className="col-span-2 flex flex-col border rounded bg-white">
        <div className="flex-1 p-4 space-y-2 overflow-auto">
          {selected?.messages?.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[70%] px-3 py-2 rounded ${m.role === 'user' ? 'bg-gray-200' : 'bg-green-200'}`}>
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                {m.responseType && (
                  <div className="text-[10px] text-gray-600 mt-1">
                    {m.provider ? `${m.responseType} (${m.provider})` : m.responseType}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} className="flex-1 border rounded px-2" placeholder="Type a message" />
          <button onClick={send} className="px-3 py-2 bg-green-600 text-white rounded">Send</button>
        </div>
      </div>
    </div>
  )
}
