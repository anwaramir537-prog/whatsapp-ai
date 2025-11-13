import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try { await login(email, password); nav('/dashboard') }
    catch { setError('Invalid credentials') }
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto space-y-3">
      <h2 className="text-2xl font-semibold">Login</h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded w-full">Login</button>
    </form>
  )
}
