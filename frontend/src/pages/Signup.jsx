import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) {
      setError('Please fill all fields')
      return
    }
    try {
      setLoading(true)
      await signup(name, email, password)
      nav('/dashboard')
    } catch (err) {
      console.error('Signup failed', err)
      const msg = err?.response?.data?.error || 'Signup failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto space-y-3">
      <h2 className="text-2xl font-semibold">Create account</h2>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <input className="w-full border rounded p-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <button disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded w-full disabled:opacity-50">
        {loading ? 'Signing up...' : 'Signup'}
      </button>
    </form>
  )
}
