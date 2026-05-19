import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiRequestError, apiFetchJson } from '../lib/api'
import type { UserPrefs } from '../lib/userPrefs'
import { parseUserPrefs } from '../lib/userPrefs'

export type AuthUser = {
  id: string
  email: string
  /** From Google profile or future profile settings; null for email/password-only until set. */
  displayName: string | null
  /** Server flag: welcome survey completed (Plan / SS fields editable in Configure anytime). */
  onboardingDone: boolean
  /** Saved welcome fields from profile (DB). */
  planPrefs: UserPrefs | null
  /** Stripe subscription status; guests omit this field. */
  subscriptionStatus?:
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'paused'
    | 'none'
}

type MeResponse = { ok: true; user: AuthUser } | { ok: false; error?: string }

function normalizeDisplayName(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t.length > 0 ? t : null
}

function normalizeAuthUser(u: AuthUser): AuthUser {
  return {
    ...u,
    displayName: normalizeDisplayName(u.displayName),
    onboardingDone: typeof u.onboardingDone === 'boolean' ? u.onboardingDone : false,
    planPrefs: parseUserPrefs((u as AuthUser & { planPrefs?: unknown }).planPrefs),
    subscriptionStatus:
      typeof (u as AuthUser & { subscriptionStatus?: unknown }).subscriptionStatus === 'string'
        ? ((u as AuthUser & { subscriptionStatus: AuthUser['subscriptionStatus'] }).subscriptionStatus ??
          'none')
        : 'none',
  }
}

export type GoogleCheckoutResolveResult =
  | { status: 'session_ready' }
  | { status: 'payment_required' }
  | { status: 'idle' }
  | { status: 'error' }

type CheckoutSessionJson =
  | {
      ok: true
      status: 'session_ready'
      user: AuthUser
    }
  | {
      ok: true
      status: 'payment_required'
      email: string
      displayName: string | null
      onboardingDone?: boolean
    }
  | { ok: false; error?: string }

type AuthCtx = {
  /** API reachable (health check succeeded). */
  apiReady: boolean
  /** Google OAuth client id + secret configured on the API (see server `.env`). */
  googleOAuth: boolean
  loading: boolean
  user: AuthUser | null
  /** Email + display name for the post-Google Stripe step (set when `?google_checkout=1` needs payment). */
  googleCheckoutUi: { email: string; displayName: string | null } | null
  clearGoogleCheckoutUi: () => void
  /** Call after redirect with `?google_checkout=1` to resume session or open payment. */
  resolveGoogleCheckoutFromUrl: () => Promise<GoogleCheckoutResolveResult>
  /** Finish Google signup after collecting a payment method (Stripe configured on server). */
  completeGoogleCheckout: (paymentMethodId: string) => Promise<{ error?: string }>
  /** Set after redirect from Google when `?auth_error=` is present; cleared when consumed. */
  authCallbackMessage: string | null
  clearAuthCallbackMessage: () => void
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, paymentMethodId?: string) => Promise<{ error?: string }>
  /** Full-page navigation to `/api/auth/google` (cookie session on return). */
  signInWithGoogle: () => void
  signOut: () => Promise<void>
  /** Marks welcome survey complete on the server; call after persisting plan fields to calculator state. */
  completeOnboarding: () => Promise<{ error?: string }>
  /** Persist welcome fields to the user profile. */
  saveUserPrefs: (prefs: UserPrefs) => Promise<{ error?: string }>
  /** Cancel Stripe subscription and delete the signed-in account. */
  cancelAccount: () => Promise<{ error?: string }>
}

const Ctx = createContext<AuthCtx | null>(null)

function mapGoogleAuthError(code: string): string {
  switch (code) {
    case 'access_denied':
      return 'Google sign-in was cancelled.'
    case 'invalid_state':
      return 'Sign-in session expired. Try again.'
    case 'oauth_token':
      return 'Could not complete Google sign-in. Try again.'
    case 'unverified_email':
      return 'Google account email is not verified.'
    case 'account_conflict':
      return 'This email is linked to a different Google account. Sign in with email/password or contact support.'
    case 'email_in_use':
      return 'That email is already registered. Sign in or use a different Google account.'
    case 'server':
      return 'Something went wrong during Google sign-in. Try again.'
    default:
      return 'Google sign-in failed. Try again.'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiReady, setApiReady] = useState(false)
  const [googleOAuth, setGoogleOAuth] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [googleCheckoutUi, setGoogleCheckoutUi] = useState<{
    email: string
    displayName: string | null
  } | null>(null)
  const [authCallbackMessage, setAuthCallbackMessage] = useState<string | null>(null)

  const clearGoogleCheckoutUi = useCallback(() => {
    setGoogleCheckoutUi(null)
  }, [])

  const clearAuthCallbackMessage = useCallback(() => {
    setAuthCallbackMessage(null)
  }, [])

  const resolveGoogleCheckoutFromUrl = useCallback(async (): Promise<GoogleCheckoutResolveResult> => {
    try {
      const res = await fetch('/api/auth/google/checkout-session', { credentials: 'include' })
      const data = (await res.json()) as CheckoutSessionJson
      if (!res.ok || !data.ok) {
        setGoogleCheckoutUi(null)
        return res.status === 401 ? { status: 'idle' } : { status: 'error' }
      }
      if (data.status === 'session_ready') {
        setUser(normalizeAuthUser(data.user))
        setGoogleCheckoutUi(null)
        return { status: 'session_ready' }
      }
      setGoogleCheckoutUi({
        email: data.email,
        displayName: data.displayName ?? null,
      })
      return { status: 'payment_required' }
    } catch {
      setGoogleCheckoutUi(null)
      return { status: 'error' }
    }
  }, [])

  const completeGoogleCheckout = useCallback(async (paymentMethodId: string) => {
    try {
      const data = await apiFetchJson<{ ok: true; user: AuthUser }>('/api/auth/google/complete-signup', {
        method: 'POST',
        body: JSON.stringify({ paymentMethodId }),
      })
      setUser(normalizeAuthUser(data.user))
      setGoogleCheckoutUi(null)
      return {}
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.code === 'payment_failed') {
          return { error: 'Card could not be saved. Check the number or try another card.' }
        }
        if (e.code === 'payment_method_required') {
          return { error: 'Add a payment method to continue.' }
        }
        if (e.code === 'stripe_not_configured') {
          return { error: 'Payment is not configured on the server.' }
        }
      }
      return { error: 'Could not complete account setup. Try again.' }
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = (await res.json()) as MeResponse
      if (data.ok && data.user) setUser(normalizeAuthUser(data.user))
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
        const c = await fetch('/api/auth/config', { credentials: 'include' })
        if (c.ok && !cancelled) {
          const j = (await c.json()) as { ok?: boolean; googleOAuth?: boolean }
          if (j.ok && j.googleOAuth) setGoogleOAuth(true)
        }
      } catch {
        if (!cancelled) setGoogleOAuth(false)
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('auth_error')
    if (!err) return
    setAuthCallbackMessage(mapGoogleAuthError(err))
    params.delete('auth_error')
    const q = params.toString()
    const path = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`
    window.history.replaceState({}, '', path)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await apiFetchJson<{ ok: true; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      await refreshSession()
      return {}
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'invalid_credentials') {
        return { error: 'Invalid email or password.' }
      }
      return { error: 'Could not sign in. Is the API running?' }
    }
  }, [refreshSession])

  const signUp = useCallback(async (email: string, password: string, paymentMethodId?: string) => {
    try {
      const body: Record<string, string> = { email, password }
      if (paymentMethodId) body.paymentMethodId = paymentMethodId
      const data = await apiFetchJson<{ ok: true; user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setUser(normalizeAuthUser(data.user))
      return {}
    } catch (e) {
      if (e instanceof ApiRequestError) {
        if (e.code === 'email_in_use') return { error: 'That email is already registered.' }
        if (e.code === 'password_too_short') return { error: 'Password must be at least 8 characters.' }
        if (e.code === 'invalid_email') return { error: 'Enter a valid email.' }
        if (e.code === 'payment_method_required') {
          return { error: 'Add the Vite publishable key (VITE_STRIPE_PUBLISHABLE_KEY) and complete card details.' }
        }
        if (e.code === 'payment_failed') {
          return { error: 'Card could not be saved. Check the number or try another card.' }
        }
        if (e.code === 'subscription_price_not_configured') {
          return {
            error:
              'Billing is not fully configured on the server (STRIPE_SUBSCRIPTION_PRICE_ID for $9/mo).',
          }
        }
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
    setGoogleCheckoutUi(null)
  }, [])

  const completeOnboarding = useCallback(async () => {
    try {
      const data = await apiFetchJson<{ ok: true; user: AuthUser }>('/api/user/onboarding-complete', {
        method: 'POST',
      })
      setUser(normalizeAuthUser(data.user))
      return {}
    } catch {
      return { error: 'Could not save progress. Try again.' }
    }
  }, [])

  const saveUserPrefs = useCallback(async (prefs: UserPrefs) => {
    try {
      const data = await apiFetchJson<{ ok: true; user: AuthUser }>('/api/user/prefs', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      })
      setUser(normalizeAuthUser(data.user))
      return {}
    } catch {
      return { error: 'Could not save your plan. Try again.' }
    }
  }, [])

  const cancelAccount = useCallback(async () => {
    try {
      await apiFetchJson<{ ok: true }>('/api/user/cancel-account', { method: 'POST' })
      setUser(null)
      setGoogleCheckoutUi(null)
      return {}
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'stripe_cancel_failed') {
        return { error: 'Could not cancel your subscription. Try again or contact support.' }
      }
      return { error: 'Could not cancel your account. Try again.' }
    }
  }, [])

  const signInWithGoogle = useCallback(() => {
    window.location.assign('/api/auth/google')
  }, [])

  const value = useMemo(() => {
    return {
      apiReady,
      googleOAuth,
      loading,
      user,
      googleCheckoutUi,
      clearGoogleCheckoutUi,
      resolveGoogleCheckoutFromUrl,
      completeGoogleCheckout,
      authCallbackMessage,
      clearAuthCallbackMessage,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      completeOnboarding,
      saveUserPrefs,
      cancelAccount,
    } satisfies AuthCtx
  }, [
    apiReady,
    googleOAuth,
    loading,
    user,
    googleCheckoutUi,
    clearGoogleCheckoutUi,
    resolveGoogleCheckoutFromUrl,
    completeGoogleCheckout,
    authCallbackMessage,
    clearAuthCallbackMessage,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    completeOnboarding,
    saveUserPrefs,
    cancelAccount,
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
