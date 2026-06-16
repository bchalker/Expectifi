import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { IconAdjustments, IconMenu2, IconX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { useWelcomeSettingsReveal } from '../hooks/useWelcomeSettingsReveal'
import { useAppPath } from '../hooks/useAppPath'
import { APP_DASHBOARD_PATH, APP_PATHS, navigateApp } from '../lib/appPaths'
import type { DrawerName } from '../lib/computeResults'
import {
  APP_NAV_DRAWER_ITEMS,
  APP_NAV_ROUTE_ITEMS,
  navItemUnavailableReason,
  navRequirementsMet,
  type NavPanelContext,
} from '../lib/appNavDrawers'
import { firstNameFromDisplayName } from '../utils/userDisplayName'
import { PhaseSegmentTabs, type PhaseSegment } from './PhaseSegmentTabs'
import './Header.scss'

const MARKETING_SECTIONS = [
  { id: 'how-it-works' as const, label: 'How it works' },
  { id: 'pricing' as const, label: 'Pricing' },
  { id: 'faq' as const, label: 'FAQ' },
]

const MARKETING_MOBILE_NAV_BODY_CLASS = 'app-left-nav--mobile-open-body'
const MARKETING_MOBILE_NAV_MQ = '(min-width: 761px)'

function HeaderBrandLogo() {
  return (
    <span className="header__wordmark" aria-hidden="true">
      <span className="header__wordmark-expect">Expect</span>
      <span className="header__wordmark-ifi">ifi</span>
    </span>
  )
}

type HeaderAuthProps = {
  onSignIn: () => void
  onCreateAccount: () => void
}

type HeaderMarketingProps = HeaderAuthProps & {
  variant: 'marketing'
  className?: string
  onMarketingAnchor: (sectionId: (typeof MARKETING_SECTIONS)[number]['id']) => void
}

type HeaderAppProps = HeaderAuthProps & {
  variant: 'app'
  className?: string
  onBrandClick?: () => void
  targetRetirementAge: number
  drawer: DrawerName | null
  mobileNavOpen: boolean
  onMobileNavToggle: () => void
  onOpenDrawer: (name: DrawerName) => void
  onOpenConfig: () => void
  welcomeDone?: boolean
  navContext: NavPanelContext
  /** Desktop header center — between brand and tail. */
  goalBar?: ReactNode
  /** Mobile header center — Growth / Income toggle between brand and menu. */
  phaseToggle?: {
    phase: PhaseSegment
    onPhase: (phase: PhaseSegment) => void
    targetRetirementAge: number
  } | null
}

export type HeaderProps = HeaderMarketingProps | HeaderAppProps

function HeaderBrand({
  onBrandClick,
  onboardingMode = false,
}: {
  onBrandClick?: () => void
  onboardingMode?: boolean
}) {
  const { user } = useAuth()
  const path = useAppPath()

  if (onboardingMode) {
    return (
      <div className="header__brand header__brand--onboarding" aria-label="Expectifi">
        <HeaderBrandLogo />
      </div>
    )
  }

  const handleClick = () => {
    if (user) {
      onBrandClick?.()
      navigateApp(APP_DASHBOARD_PATH)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (path === APP_PATHS.home) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigateApp(APP_PATHS.home)
  }

  const ariaLabel = user
    ? 'Expectifi home — return to calculator'
    : path === APP_PATHS.home
      ? 'Expectifi — scroll to top'
      : 'Expectifi — return to landing page'

  return (
    <button type="button" className="header__brand" onClick={handleClick} aria-label={ariaLabel}>
      <HeaderBrandLogo />
    </button>
  )
}

function HeaderAuthTail({
  variant,
  onSignIn,
  onCreateAccount,
  drawer,
  onOpenConfig,
  welcomeDone = true,
  wrapInTail = true,
}: HeaderAuthProps & {
  variant: HeaderProps['variant']
  drawer?: DrawerName | null
  onOpenConfig?: () => void
  welcomeDone?: boolean
  wrapInTail?: boolean
}) {
  const { apiReady, loading, user, googleCheckoutUi, signOut } = useAuth()
  const { showSettings, slideIn } = useWelcomeSettingsReveal(welcomeDone)
  const accountLabel = user
    ? firstNameFromDisplayName(user.displayName) || user.email
    : googleCheckoutUi
      ? firstNameFromDisplayName(googleCheckoutUi.displayName) || googleCheckoutUi.email
      : ''
  const showViewMyPlansInProfile = Boolean(user?.onboardingDone)
  const isApp = variant === 'app'

  const wrap = (node: ReactNode) =>
    wrapInTail ? <div className="header__tail">{node}</div> : node

  if (!loading && user?.email && isApp && onOpenConfig && showSettings) {
    return wrap(
      <div
        className={[
          'header__account-group',
          drawer === 'config' ? 'header__account-group--active' : '',
          slideIn ? 'header__account-group--slide-in' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="header__profile-menu">
          <button
            type="button"
            className="header__account-group__profile"
            aria-label="View My Plans"
            aria-haspopup="menu"
            aria-expanded={drawer === 'config'}
            aria-controls="drawer"
            onClick={onOpenConfig}
          >
            {accountLabel ? <span className="header__profile-name">{accountLabel}</span> : null}
            {showViewMyPlansInProfile ? (
              <span className="header__profile-ages">View My Plans</span>
            ) : null}
          </button>
          <div className="header__profile-popout" role="menu" aria-label="Profile">
            <button
              type="button"
              role="menuitem"
              className="header__profile-popout-action"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>,
    )
  }

  if (!loading && (!user?.email || !isApp)) {
    return wrap(
      <>
        {isApp && onOpenConfig && showSettings ? (
          <button
            type="button"
            className={[
              'header__settings',
              drawer === 'config' ? 'header__settings--active' : '',
              slideIn ? 'header__settings--slide-in' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="My Plans: planning and Social Security"
            aria-expanded={drawer === 'config'}
            aria-controls="drawer"
            onClick={onOpenConfig}
          >
            <span className="header__settings-label">My Plans</span>
            <IconAdjustments size={18} stroke={1.65} aria-hidden />
          </button>
        ) : null}
        <div className="header__auth" aria-label="Account">
          {isApp && !apiReady ? (
            <span className="header__auth-offline" title="API not reachable">
              Offline
            </span>
          ) : null}
          <button type="button" className="header__auth-link" onClick={onSignIn}>
            Sign in
          </button>
          <button type="button" className="header__auth-cta" onClick={onCreateAccount}>
            Create account
          </button>
        </div>
      </>,
    )
  }

  return wrapInTail ? <div className="header__tail" /> : null
}

function HeaderMarketingNav({
  onMarketingAnchor,
}: {
  onMarketingAnchor: (sectionId: (typeof MARKETING_SECTIONS)[number]['id']) => void
}) {
  return (
    <nav className="header__nav header__nav--marketing" aria-label="Marketing">
      {MARKETING_SECTIONS.map(({ id, label }) => (
        <button key={id} type="button" className="header__link" onClick={() => onMarketingAnchor(id)}>
          {label}
        </button>
      ))}
    </nav>
  )
}

function HeaderMarketingMobileNav({
  open,
  onClose,
  onMarketingAnchor,
  onSignIn,
  onCreateAccount,
}: {
  open: boolean
  onClose: () => void
  onMarketingAnchor: (sectionId: (typeof MARKETING_SECTIONS)[number]['id']) => void
  onSignIn: () => void
  onCreateAccount: () => void
}) {
  const handleAnchor = (sectionId: (typeof MARKETING_SECTIONS)[number]['id']) => {
    onMarketingAnchor(sectionId)
    onClose()
  }

  const handleSignIn = () => {
    onSignIn()
    onClose()
  }

  const handleCreateAccount = () => {
    onCreateAccount()
    onClose()
  }

  return (
    <>
      <button
        type="button"
        className={[
          'header__marketing-nav-backdrop',
          open ? 'header__marketing-nav-backdrop--open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        aria-label="Close menu"
        onClick={onClose}
      />
      <nav
        id="header-marketing-mobile-nav"
        className={[
          'header__marketing-nav',
          open ? 'header__marketing-nav--open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Site menu"
        aria-hidden={!open}
      >
        <div className="header__marketing-nav-links">
          {MARKETING_SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="header__marketing-nav-link"
              onClick={() => handleAnchor(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="header__marketing-nav-auth" aria-label="Account">
          <button type="button" className="header__marketing-nav-auth-link" onClick={handleSignIn}>
            Sign in
          </button>
          <button type="button" className="header__marketing-nav-auth-cta" onClick={handleCreateAccount}>
            Create account
          </button>
        </div>
      </nav>
    </>
  )
}

function headerAppDrawerNavVisible(navContext: NavPanelContext): boolean {
  return APP_NAV_DRAWER_ITEMS.some(({ requires }) => navRequirementsMet(requires, navContext))
}

function HeaderAppRouteLinks({ navContext }: { navContext: NavPanelContext }) {
  const path = useAppPath()
  const links = APP_NAV_ROUTE_ITEMS.flatMap(({ id, path: routePath, label, requires }) => {
    const available = navRequirementsMet(requires, navContext)
    const unavailableReason = navItemUnavailableReason(requires, navContext)
    if (!available) return []
    const isActive = path === routePath
    return [
      <button
        key={id}
        type="button"
        className={`header__link header__link--utility${isActive ? ' header__link--active' : ''}`}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={!available}
        title={!available ? (unavailableReason ?? undefined) : undefined}
        onClick={() => {
          if (!available) return
          navigateApp(routePath)
        }}
      >
        {label}
      </button>,
    ]
  })

  if (links.length === 0) return null

  return (
    <nav className="header__route-nav" aria-label="App pages">
      {links}
    </nav>
  )
}

function HeaderAppNav({
  drawer,
  navContext,
  onOpenDrawer,
}: Pick<HeaderAppProps, 'drawer' | 'navContext' | 'onOpenDrawer'>) {
  return (
    <nav className="header__nav header__nav--app" aria-label="Panels and tools">
      {APP_NAV_DRAWER_ITEMS.map(({ id, label, requires }) => {
        const available = navRequirementsMet(requires, navContext)
        const unavailableReason = navItemUnavailableReason(requires, navContext)
        if (!available) return null
        return (
          <button
            key={id}
            type="button"
            className={`header__link${drawer === id && available ? ' header__link--active' : ''}`}
            aria-disabled={!available}
            title={!available ? (unavailableReason ?? undefined) : undefined}
            onClick={() => {
              if (!available) return
              onOpenDrawer(id)
            }}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export function Header(props: HeaderProps) {
  const { variant, className = '', onSignIn, onCreateAccount } = props
  const [marketingMobileOpen, setMarketingMobileOpen] = useState(false)
  const onboardingChrome = variant === 'app' && props.welcomeDone === false
  const closeMarketingMobile = useCallback(() => setMarketingMobileOpen(false), [])

  useEffect(() => {
    if (variant !== 'marketing' || !marketingMobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMarketingMobile()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant, marketingMobileOpen, closeMarketingMobile])

  useEffect(() => {
    if (variant !== 'marketing') return
    if (marketingMobileOpen) document.body.classList.add(MARKETING_MOBILE_NAV_BODY_CLASS)
    else document.body.classList.remove(MARKETING_MOBILE_NAV_BODY_CLASS)
    return () => document.body.classList.remove(MARKETING_MOBILE_NAV_BODY_CLASS)
  }, [variant, marketingMobileOpen])

  useEffect(() => {
    if (variant !== 'marketing') return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(MARKETING_MOBILE_NAV_MQ)
    const onChange = () => {
      if (mq.matches) closeMarketingMobile()
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [variant, closeMarketingMobile])

  const rootClass = [
    'header',
    `header--${variant}`,
    onboardingChrome && 'header--onboarding',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={rootClass}>
      <div className="header__inner">
        <HeaderBrand
          onBrandClick={variant === 'app' && !onboardingChrome ? props.onBrandClick : undefined}
          onboardingMode={onboardingChrome}
        />

        {!onboardingChrome && variant === 'app' && props.phaseToggle ? (
          <div className="header__phase">
            <PhaseSegmentTabs
              phase={props.phaseToggle.phase}
              onPhase={props.phaseToggle.onPhase}
              targetRetirementAge={props.phaseToggle.targetRetirementAge}
              instanceId="mobile-header"
              incomePhase={props.phaseToggle.phase === 'income'}
              showAge={false}
            />
          </div>
        ) : null}

        {!onboardingChrome && variant === 'app' && props.goalBar ? (
          <div className="header__goal">{props.goalBar}</div>
        ) : null}

        {!onboardingChrome && variant === 'marketing' ? (
          <HeaderMarketingNav onMarketingAnchor={props.onMarketingAnchor} />
        ) : null}

        {!onboardingChrome && variant === 'app' && headerAppDrawerNavVisible(props.navContext) ? (
          <HeaderAppNav
            drawer={props.drawer}
            navContext={props.navContext}
            onOpenDrawer={props.onOpenDrawer}
          />
        ) : null}

        {!onboardingChrome && variant === 'app' ? (
          <button
            type="button"
            className="header__menu-btn"
            aria-label={props.mobileNavOpen ? 'Close panels menu' : 'Open panels menu'}
            aria-expanded={props.mobileNavOpen}
            aria-controls="app-left-nav-panel"
            onClick={props.onMobileNavToggle}
          >
            {props.mobileNavOpen ? (
              <IconX size={22} stroke={1.75} aria-hidden />
            ) : (
              <IconMenu2 size={22} stroke={1.75} aria-hidden />
            )}
          </button>
        ) : null}

        {!onboardingChrome && variant === 'marketing' ? (
          <button
            type="button"
            className="header__menu-btn header__menu-btn--marketing"
            aria-label={marketingMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={marketingMobileOpen}
            aria-controls="header-marketing-mobile-nav"
            onClick={() => setMarketingMobileOpen((open) => !open)}
          >
            {marketingMobileOpen ? (
              <IconX size={22} stroke={1.75} aria-hidden />
            ) : (
              <IconMenu2 size={22} stroke={1.75} aria-hidden />
            )}
          </button>
        ) : null}

        {!onboardingChrome ? (
          <div className="header__tail">
            {variant === 'app' ? <HeaderAppRouteLinks navContext={props.navContext} /> : null}
            <HeaderAuthTail
              variant={variant}
              onSignIn={onSignIn}
              onCreateAccount={onCreateAccount}
              drawer={variant === 'app' ? props.drawer : undefined}
              onOpenConfig={variant === 'app' ? props.onOpenConfig : undefined}
              welcomeDone={variant === 'app' ? props.welcomeDone : undefined}
              wrapInTail={false}
            />
          </div>
        ) : null}
      </div>

      {variant === 'marketing' ? (
        <HeaderMarketingMobileNav
          open={marketingMobileOpen}
          onClose={closeMarketingMobile}
          onMarketingAnchor={props.onMarketingAnchor}
          onSignIn={onSignIn}
          onCreateAccount={onCreateAccount}
        />
      ) : null}
    </header>
  )
}
