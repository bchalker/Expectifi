import type { ReactNode } from 'react'
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
import './Header.scss'

const MARKETING_SECTIONS = [
  { id: 'how-it-works' as const, label: 'How it works' },
  { id: 'pricing' as const, label: 'Pricing' },
  { id: 'faq' as const, label: 'FAQ' },
]

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
        <span className="header__mark">Expectifi</span>
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
      <span className="header__mark">Expectifi</span>
    </button>
  )
}

function HeaderAuthTail({
  variant,
  onSignIn,
  onCreateAccount,
  drawer,
  onOpenConfig,
  targetRetirementAge,
  welcomeDone = true,
  wrapInTail = true,
}: HeaderAuthProps & {
  variant: HeaderProps['variant']
  drawer?: DrawerName | null
  onOpenConfig?: () => void
  targetRetirementAge?: number
  welcomeDone?: boolean
  wrapInTail?: boolean
}) {
  const { apiReady, loading, user, googleCheckoutUi, signOut } = useAuth()
  const { showSettings, slideIn } = useWelcomeSettingsReveal(welcomeDone)
  const accountLabel = user
    ? user.displayName?.trim() || user.email
    : googleCheckoutUi
      ? googleCheckoutUi.displayName?.trim() || googleCheckoutUi.email
      : ''
  const showRetireByInProfile = Boolean(user?.onboardingDone)
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
        <button
          type="button"
          className={[
            'header__settings',
            'header__settings--signed-in',
            drawer === 'config' ? 'header__settings--active' : '',
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
        <div className="header__profile-menu">
          <button
            type="button"
            className="header__account-group__profile"
            aria-label="My Plans: profile"
            aria-haspopup="menu"
            aria-expanded={drawer === 'config'}
            aria-controls="drawer"
            onClick={onOpenConfig}
          >
            {accountLabel ? <span className="header__profile-name">{accountLabel}</span> : null}
            {showRetireByInProfile && targetRetirementAge != null ? (
              <span className="header__profile-ages" aria-hidden>
                Retire by {targetRetirementAge}
              </span>
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
        className={`header__link${isActive ? ' header__link--active' : ''}`}
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
  const onboardingChrome = variant === 'app' && props.welcomeDone === false
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

        {!onboardingChrome ? (
          <div className="header__tail">
            {variant === 'app' ? <HeaderAppRouteLinks navContext={props.navContext} /> : null}
            <HeaderAuthTail
              variant={variant}
              onSignIn={onSignIn}
              onCreateAccount={onCreateAccount}
              drawer={variant === 'app' ? props.drawer : undefined}
              onOpenConfig={variant === 'app' ? props.onOpenConfig : undefined}
              targetRetirementAge={variant === 'app' ? props.targetRetirementAge : undefined}
              welcomeDone={variant === 'app' ? props.welcomeDone : undefined}
              wrapInTail={false}
            />
          </div>
        ) : null}
      </div>
    </header>
  )
}
