import { IconAdjustments, IconMenu2, IconX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import type { DrawerName } from '../lib/computeResults'
import {
  APP_NAV_DRAWER_ITEMS,
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
  targetRetirementAge: number
  drawer: DrawerName | null
  snapshotOpen: boolean
  mobileNavOpen: boolean
  onMobileNavToggle: () => void
  onOpenDrawer: (name: DrawerName) => void
  onSnapshotToggle: () => void
  onOpenConfig: () => void
  navContext: NavPanelContext
}

export type HeaderProps = HeaderMarketingProps | HeaderAppProps

function HeaderBrand() {
  return (
    <div className="header__brand">
      <span className="header__mark">Eggspectifi</span>
      <span className="header__kicker">Hatch your retirement plan.</span>
    </div>
  )
}

function HeaderAuthTail({
  variant,
  onSignIn,
  onCreateAccount,
  drawer,
  onOpenConfig,
  targetRetirementAge,
}: HeaderAuthProps & {
  variant: HeaderProps['variant']
  drawer?: DrawerName | null
  onOpenConfig?: () => void
  targetRetirementAge?: number
}) {
  const { apiReady, loading, user, googleCheckoutUi } = useAuth()
  const accountLabel = user
    ? user.displayName?.trim() || user.email
    : googleCheckoutUi
      ? googleCheckoutUi.displayName?.trim() || googleCheckoutUi.email
      : ''
  const showRetireByInProfile = Boolean(user?.onboardingDone)
  const isApp = variant === 'app'

  if (!loading && user?.email && isApp && onOpenConfig) {
    return (
      <div className="header__tail">
        <button
          type="button"
          className={`header__account-group${drawer === 'config' ? ' header__account-group--active' : ''}`}
          aria-label="Open configure: planning, Social Security, and income presets"
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
        {isApp && onOpenConfig ? (
          <button
            type="button"
            className={`header__settings${drawer === 'config' ? ' header__settings--active' : ''}`}
            aria-label="Configure: planning, Social Security, and income presets"
            aria-expanded={drawer === 'config'}
            aria-controls="drawer"
            onClick={onOpenConfig}
          >
            <IconAdjustments size={18} stroke={1.65} aria-hidden />
          </button>
        ) : null}
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
  const snapshotAvailable = isSnapshotNavAvailable(navContext)
  const snapshotUnavailableReason = navItemUnavailableReason(SNAPSHOT_NAV_REQUIRES, navContext)

  return (
    <nav className="header__nav header__nav--app" aria-label="Panels and tools">
      <button
        id="app-top-chrome-snapshot-btn"
        type="button"
        className={`header__link${snapshotOpen && snapshotAvailable ? ' header__link--active' : ''}${!snapshotAvailable ? ' header__link--unavailable' : ''}`}
        aria-expanded={snapshotOpen && snapshotAvailable}
        aria-controls="strip-snapshot-panel"
        aria-disabled={!snapshotAvailable}
        title={snapshotUnavailableReason ?? undefined}
        onClick={() => {
          if (!snapshotAvailable) return
          onSnapshotToggle()
        }}
      >
        Snapshot
      </button>
      {APP_NAV_DRAWER_ITEMS.map(({ id, label, requires }) => {
        const available = navRequirementsMet(requires, navContext)
        const unavailableReason = navItemUnavailableReason(requires, navContext)
        return (
          <button
            key={id}
            type="button"
            className={`header__link${drawer === id && available ? ' header__link--active' : ''}${!available ? ' header__link--unavailable' : ''}`}
            aria-disabled={!available}
            title={unavailableReason ?? undefined}
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
        <HeaderBrand />

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
        />
      </div>
    </header>
  )
}
