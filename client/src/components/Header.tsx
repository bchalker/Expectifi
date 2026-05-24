import { IconAdjustments, IconMenu2, IconX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { useWelcomeSettingsReveal } from '../hooks/useWelcomeSettingsReveal'
import { useAppPath } from '../hooks/useAppPath'
import { APP_PATHS, navigateApp } from '../lib/appPaths'
import type { DrawerName } from '../lib/computeResults'
import {
  APP_NAV_DRAWER_ITEMS,
  APP_NAV_ROUTE_ITEMS,
  isSnapshotNavAvailable,
  navItemUnavailableReason,
  navRequirementsMet,
  SNAPSHOT_NAV_REQUIRES,
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
  snapshotOpen: boolean
  mobileNavOpen: boolean
  onMobileNavToggle: () => void
  onOpenDrawer: (name: DrawerName) => void
  onSnapshotToggle: () => void
  onOpenConfig: () => void
  welcomeDone?: boolean
  navContext: NavPanelContext
}

export type HeaderProps = HeaderMarketingProps | HeaderAppProps

function HeaderBrand({ onBrandClick }: { onBrandClick?: () => void }) {
  const { user } = useAuth()
  const path = useAppPath()

  const handleClick = () => {
    if (user) {
      onBrandClick?.()
      navigateApp(APP_PATHS.onboarding)
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
}: HeaderAuthProps & {
  variant: HeaderProps['variant']
  drawer?: DrawerName | null
  onOpenConfig?: () => void
  targetRetirementAge?: number
  welcomeDone?: boolean
}) {
  const { apiReady, loading, user, googleCheckoutUi } = useAuth()
  const { showSettings, slideIn } = useWelcomeSettingsReveal(welcomeDone)
  const accountLabel = user
    ? user.displayName?.trim() || user.email
    : googleCheckoutUi
      ? googleCheckoutUi.displayName?.trim() || googleCheckoutUi.email
      : ''
  const showRetireByInProfile = Boolean(user?.onboardingDone)
  const isApp = variant === 'app'

  if (!loading && user?.email && isApp && onOpenConfig && showSettings) {
    return (
      <div className="header__tail">
        <button
          type="button"
          className={[
            'header__account-group',
            drawer === 'config' ? 'header__account-group--active' : '',
            slideIn ? 'header__account-group--slide-in' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label="Open configure: planning and Social Security"
          aria-expanded={drawer === 'config'}
          aria-controls="drawer"
          onClick={onOpenConfig}
        >
          <span className="header__account-group__profile">
            {accountLabel ? <span className="header__profile-name">{accountLabel}</span> : null}
            {showRetireByInProfile && targetRetirementAge != null ? (
              <span className="header__profile-ages" aria-hidden>
                Retire by {targetRetirementAge}
              </span>
            ) : null}
          </span>
          <span className="header__account-group__icons" aria-hidden>
            <IconAdjustments size={18} stroke={1.65} />
          </span>
        </button>
      </div>
    )
  }

  if (!loading && (!user?.email || !isApp)) {
    return (
      <div className="header__tail">
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
      </div>
    )
  }

  return <div className="header__tail" />
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

function HeaderAppNav({
  drawer,
  snapshotOpen,
  navContext,
  onOpenDrawer,
  onSnapshotToggle,
}: Pick<HeaderAppProps, 'drawer' | 'snapshotOpen' | 'navContext' | 'onOpenDrawer' | 'onSnapshotToggle'>) {
  const path = useAppPath()
  const snapshotAvailable = isSnapshotNavAvailable(navContext)
  const snapshotUnavailableReason = navItemUnavailableReason(SNAPSHOT_NAV_REQUIRES, navContext)

  return (
    <nav className="header__nav header__nav--app" aria-label="Panels and tools">
      {snapshotAvailable ? (
        <button
          id="app-top-chrome-snapshot-btn"
          type="button"
          className={`header__link${snapshotOpen && snapshotAvailable ? ' header__link--active' : ''}`}
          aria-expanded={snapshotOpen && snapshotAvailable}
          aria-controls="strip-snapshot-panel"
          aria-disabled={!snapshotAvailable}
          title={!snapshotAvailable ? (snapshotUnavailableReason ?? undefined) : undefined}
          onClick={() => {
            if (!snapshotAvailable) return
            onSnapshotToggle()
          }}
        >
          Snapshot
        </button>
      ) : null}
      {APP_NAV_ROUTE_ITEMS.map(({ id, path: routePath, label, requires }) => {
        const available = navRequirementsMet(requires, navContext)
        const unavailableReason = navItemUnavailableReason(requires, navContext)
        if (!available) return null
        const isActive = path === routePath && available
        return (
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
          </button>
        )
      })}
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
  const rootClass = ['header', `header--${variant}`, className].filter(Boolean).join(' ')

  return (
    <header className={rootClass}>
      <div className="header__inner">
        <HeaderBrand onBrandClick={variant === 'app' ? props.onBrandClick : undefined} />

        {variant === 'marketing' ? (
          <HeaderMarketingNav onMarketingAnchor={props.onMarketingAnchor} />
        ) : (
          <HeaderAppNav
            drawer={props.drawer}
            snapshotOpen={props.snapshotOpen}
            navContext={props.navContext}
            onOpenDrawer={props.onOpenDrawer}
            onSnapshotToggle={props.onSnapshotToggle}
          />
        )}

        {variant === 'app' ? (
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

        <HeaderAuthTail
          variant={variant}
          onSignIn={onSignIn}
          onCreateAccount={onCreateAccount}
          drawer={variant === 'app' ? props.drawer : undefined}
          onOpenConfig={variant === 'app' ? props.onOpenConfig : undefined}
          targetRetirementAge={variant === 'app' ? props.targetRetirementAge : undefined}
          welcomeDone={variant === 'app' ? props.welcomeDone : undefined}
        />
      </div>
    </header>
  )
}
