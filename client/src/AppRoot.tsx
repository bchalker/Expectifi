import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useAppPath } from './hooks/useAppPath'
import { APP_PATHS } from './lib/appPaths'
import { guestHasCompletedOnboarding, peekPostSignOutSession } from './lib/welcomeGate'
import App from './App'
import { CalculatorShell } from './components/CalculatorShell'
import { markForceOnboardingSession } from './lib/welcomeGate'
import { AuthModal, type AuthModalMode } from './components/AuthModal'
import { ContactModal } from './components/ContactModal'
import { LandingPage } from './components/LandingPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import { landingNavigateOnboarding } from './components/landingNav'
import { trackPageView } from './lib/analytics'
import { consumeLandingAuthIntent } from './lib/landingAuthIntent'

function resolveGuestView(path: string): 'landing' | 'app' {
  if (peekPostSignOutSession()) return 'landing'
  if (path === APP_PATHS.home) {
    return guestHasCompletedOnboarding() ? 'app' : 'landing'
  }
  if (
    path === APP_PATHS.onboarding ||
    path === APP_PATHS.login ||
    path === APP_PATHS.whereToRetire
  ) {
    return 'app'
  }
  return 'landing'
}

export default function AppRoot() {
  const { loading: authLoading, user, signedOut, resolveGoogleCheckoutFromUrl, clearGoogleCheckoutUi } = useAuth()
  const path = useAppPath()
  const [landingAuthModal, setLandingAuthModal] = useState<AuthModalMode | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  const guestView = useMemo(() => resolveGuestView(path), [path, user, signedOut])

  const showLanding = signedOut || guestView === 'landing'

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
    if (authLoading) return
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
      } else if (result.status === 'checkout_expired' || result.status === 'error') {
        setLandingAuthModal('signin')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, resolveGoogleCheckoutFromUrl])

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

  useEffect(() => {
    if (authLoading || user) return
    if (path !== APP_PATHS.onboarding) return
    markForceOnboardingSession()
  }, [authLoading, user, path])

  const openContact = useCallback(() => {
    setContactOpen(true)
  }, [])

  const closeContact = useCallback(() => {
    setContactOpen(false)
  }, [])

  if (path === APP_PATHS.privacy || path === APP_PATHS.terms) {
    return (
      <>
        {path === APP_PATHS.privacy ? (
          <PrivacyPolicy
            onSignIn={openLandingSignIn}
            onCreateAccount={openLandingRegister}
            onContactClick={openContact}
          />
        ) : (
          <TermsOfService
            onSignIn={openLandingSignIn}
            onCreateAccount={openLandingRegister}
            onContactClick={openContact}
          />
        )}
        {!user ? (
          <AuthModal
            open={landingAuthModal}
            onClose={closeLandingAuthModal}
            onSwitchMode={(mode) => setLandingAuthModal(mode)}
          />
        ) : null}
        <ContactModal open={contactOpen} onClose={closeContact} />
      </>
    )
  }

  if (authLoading) {
    return <div className="app-root-loading" aria-busy="true" aria-label="Loading" />
  }

  if (user) {
    return (
      <CalculatorShell>
        <App key={user.id} />
      </CalculatorShell>
    )
  }

  if (showLanding) {
    return (
      <>
        <LandingPage
          onSignIn={openLandingSignIn}
          onCreateAccount={openLandingRegister}
          onGetStarted={landingNavigateOnboarding}
          onContactClick={openContact}
        />
        <AuthModal
          open={landingAuthModal}
          onClose={closeLandingAuthModal}
          onSwitchMode={(mode) => setLandingAuthModal(mode)}
        />
        <ContactModal open={contactOpen} onClose={closeContact} />
      </>
    )
  }

  return (
    <CalculatorShell>
      <App key="guest" initialAuthModal={initialAuthModal} />
    </CalculatorShell>
  )
}
