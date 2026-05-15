import { useState } from 'react'
import { Button } from '@heroui/react'
import { useAuth } from '../context/AuthContext'

export function AuthBar() {
  const { apiReady, loading, user, signIn, signUp, signOut } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  if (!apiReady && !loading) {
    return (
      <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--mono)' }}>
        Start the API (<code style={{ fontSize: 10 }}>npm run dev -w server</code>) and set{' '}
        <code style={{ fontSize: 10 }}>DATABASE_URL</code> or MySQL env vars plus{' '}
        <code style={{ fontSize: 10 }}>JWT_SECRET</code> in <code style={{ fontSize: 10 }}>server/.env</code>.
      </span>
    )
  }

  if (loading) {
    return <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>Auth…</span>
  }

  if (user?.email) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{user.email}</span>
        <Button size="sm" variant="outline" onPress={() => void signOut()}>
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <form
      style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
      onSubmit={async (e) => {
        e.preventDefault()
        setMsg(null)
        const fn = mode === 'signin' ? signIn : signUp
        const { error } = await fn(email, password)
        if (error) setMsg(error)
        else setMsg(mode === 'signup' ? 'Account created. You are signed in.' : 'Signed in.')
      }}
    >
      <span style={{ display: 'flex', gap: 4, fontFamily: 'var(--mono)', fontSize: 10 }}>
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setMsg(null)
          }}
          style={{
            border: 'none',
            background: mode === 'signin' ? 'var(--surface2)' : 'transparent',
            color: 'var(--text-muted)',
            padding: '4px 8px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setMsg(null)
          }}
          style={{
            border: 'none',
            background: mode === 'signup' ? 'var(--surface2)' : 'transparent',
            color: 'var(--text-muted)',
            padding: '4px 8px',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Register
        </button>
      </span>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid var(--border-strong)',
          minWidth: 160,
        }}
      />
      <input
        type="password"
        required
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        placeholder="Password (8+ chars)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          padding: '6px 10px',
          borderRadius: 6,
          border: '1px solid var(--border-strong)',
          minWidth: 140,
        }}
      />
      <Button type="submit" size="sm" variant="primary">
        {mode === 'signin' ? 'Sign in' : 'Create account'}
      </Button>
      {msg ? <span style={{ fontSize: 10, color: 'var(--accent-text)', fontFamily: 'var(--mono)' }}>{msg}</span> : null}
    </form>
  )
}
