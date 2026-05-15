import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiRequestError, apiFetchJson } from '../lib/api'

export type AuthUser = {
  id: string
  email: string
}

type MeResponse = { ok: true; user: AuthUser } | { ok: false; error?: string }

type AuthCtx = {
  /** API reachable (health check succeeded). */
  apiReady: boolean
  loading: boolean
  user: AuthUser | null
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiReady, setApiReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (res.status === 401) {
        setUser(null)
        return
      }
      const data = (await res.json()) as MeResponse
      if (data.ok) setUser(data.user)
      else setUser(null)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await fetch('/api/health')
        if (!cancelled) setApiReady(r.ok)
      } catch {
        if (!cancelled) setApiReady(false)
      }
      try {
        await refreshSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshSession])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiFetchJson<{ ok: true; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(data.user)
      return {}
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'invalid_credentials') {
        return { error: 'Invalid email or password.' }
      }
      return { error: 'Could not sign in. Is the API running?' }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const data = await apiFetchJson<{ ok: true; user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(data.user)
      return {}
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.code === 'email_in_use') return { error: 'That email is already registered.' }
        if (e.code === 'password_too_short') return { error: 'Password must be at least 8 characters.' }
        if (e.code === 'invalid_email') return { error: 'Enter a valid email.' }
      }
      return { error: 'Could not create account. Is the API running and MySQL configured?' }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await apiFetchJson<{ ok: true }>('/api/auth/logout', { method: 'POST' })
    } catch {
      /* still clear local session */
    }
    setUser(null)
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      apiReady,
      loading,
      user,
      signIn,
      signUp,
      signOut,
    }),
    [apiReady, loading, user, signIn, signUp, signOut],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
