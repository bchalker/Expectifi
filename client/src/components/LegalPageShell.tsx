import { useCallback, useEffect, type ReactNode } from 'react'
import { Header } from './Header'
import { LandingFooter } from './LandingFooter'
import { useAppPath } from '../hooks/useAppPath'
import { APP_PATHS, navigateApp } from '../lib/appPaths'
import '../components/LandingPage.scss'
import '../pages/LegalPage.scss'

type MarketingSectionId = 'how-it-works' | 'pricing' | 'faq'

type Props = {
  children: ReactNode
  onSignIn: () => void
  onCreateAccount: () => void
  onContactClick: () => void
}

export function LegalPageShell({ children, onSignIn, onCreateAccount, onContactClick }: Props) {
  const path = useAppPath()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [path])

  const onMarketingAnchor = useCallback((sectionId: MarketingSectionId) => {
    if (path !== APP_PATHS.home) {
      navigateApp(APP_PATHS.home)
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
      return
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [path])

  return (
    <div className="landing-page legal-page">
      <Header
        variant="marketing"
        onSignIn={onSignIn}
        onCreateAccount={onCreateAccount}
        onMarketingAnchor={onMarketingAnchor}
      />
      <main className="legal-page__main">{children}</main>
      <LandingFooter onContactClick={onContactClick} />
    </div>
  )
}
