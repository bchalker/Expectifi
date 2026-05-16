import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useAppPath } from './hooks/useAppPath'
import { APP_PATHS } from './lib/appPaths'
import App from './App'
import { GuestWelcomeGate } from './components/GuestWelcomeGate'
import { shouldSkipWelcome } from './lib/welcomeGate'
import { getInitialCalculatorInputs } from './lib/initialCalculatorInputs'
import { AuthModal, type AuthModalMode } from './components/AuthModal'
import { LandingPage } from './components/LandingPage'
import { landingNavigateOnboarding } from './components/landingNav'
import { trackPageView } from './lib/analytics'
import { consumeLandingAuthIntent } from './lib/landingAuthIntent'

function resolveGuestView(path: string): 'landing' | 'app' {
  if (path === APP_PATHS.home) return 'landing'
  if (path === APP_PATHS.onboarding || path === APP_PATHS.login) return 'app'
  return 'landing'
}

export default function AppRoot() {
  const { loading: authLoading, user, resolveGoogleCheckoutFromUrl, clearGoogleCheckoutUi } = useAuth()
  const path = useAppPath()
  const [landingAuthModal, setLandingAuthModal] = useState<AuthModalMode | null>(null)

  const guestView = useMemo(() => resolveGuestView(path), [path])

  const initialAuthModal: AuthModalMode | null = path === APP_PATHS.login ? 'signin' : null

  useEffect(() => {
    trackPageView(path + (typeof window !== 'undefined' ? window.location.search : ''))
  }, [path])

  useEffect(() => {
    if (authLoading || user) return
    const intent = consumeLandingAuthIntent()
    if (intent) setLandingAuthModal('register')
  }, [authLoading, user])

  useEffect(() => {
    if (authLoading || user) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_checkout') !== '1') return
    let cancelled = false
    void (async () => {
      const result = await resolveGoogleCheckoutFromUrl()
      if (cancelled) return
      params.delete('google_checkout')
      const q = params.toString()
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`,
      )
      if (result.status === 'payment_required') {
        setLandingAuthModal('google_checkout')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, resolveGoogleCheckoutFromUrl])

  const openLandingSignIn = useCallback(() => {
    setLandingAuthModal('signin')
  }, [])

  const openLandingRegister = useCallback(() => {
    setLandingAuthModal('register')
  }, [])

  const closeLandingAuthModal = useCallback(() => {
    setLandingAuthModal((mode) => {
      if (mode === 'google_checkout') clearGoogleCheckoutUi()
      return null
    })
  }, [clearGoogleCheckoutUi])

  if (authLoading) {
    return <div className="app-root-loading" aria-busy="true" aria-label="Loading" />
  }

  if (user) {
    return <App key={user.id} />
  }

  const guestSkipWelcome = shouldSkipWelcome({ inputs: getInitialCalculatorInputs() })

  if (guestView === 'landing') {
    return (
      <>
        <LandingPage
          onSignIn={openLandingSignIn}
          onCreateAccount={openLandingRegister}
          onGetStarted={landingNavigateOnboarding}
        />
        <AuthModal
          open={landingAuthModal}
          onClose={closeLandingAuthModal}
          onSwitchMode={(mode) => setLandingAuthModal(mode)}
        />
      </>
    )
  }

  if (guestSkipWelcome) {
    return <App key="guest" initialAuthModal={initialAuthModal} />
  }

  return (
    <GuestWelcomeGate>
      <App key="guest" initialAuthModal={initialAuthModal} />
    </GuestWelcomeGate>
  )
}
