import { useEffect, useMemo, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { useUserTier } from '../hooks/useUserTier'
import { loadCsvSession } from '../lib/planStorage/csvSession'
import { dismissProNudge, isProNudgeDismissed } from '../lib/proNudgeDismissed'
import { isSessionSavePlanDismissed } from '../lib/sessionFlags'
import { AppButton } from './ui/AppButton'
import './AccountPlanBottomBanner.scss'

const SHOW_DELAY_MS = 1500
const EXIT_MS = 320

type AccountPlanBottomBannerProps = {
  onOpenUpgrade?: () => void
}

function hasSessionCsvImportData(): boolean {
  return loadCsvSession() != null
}

export function AccountPlanBottomBanner({ onOpenUpgrade }: AccountPlanBottomBannerProps) {
  const { user } = useAuth()
  const {
    showSavePlanPrompt,
    acceptBrowserSave,
    dismissSavePlanPrompt,
    tier,
    isPro,
    hasSessionCsvHoldings,
  } = useUserTier()

  const [proNudgeDismissed, setProNudgeDismissed] = useState(() => isProNudgeDismissed())
  const [phase1Mounted, setPhase1Mounted] = useState(false)
  const [phase1Revealed, setPhase1Revealed] = useState(false)
  const [exiting, setExiting] = useState(false)

  const hasCsvImport = useMemo(
    () => hasSessionCsvImportData() || hasSessionCsvHoldings,
    [hasSessionCsvHoldings],
  )

  const showPhase1 = showSavePlanPrompt

  const showPhase2 =
    !showPhase1 &&
    !user &&
    !isPro &&
    (tier === 'browser_saved' || isSessionSavePlanDismissed()) &&
    !proNudgeDismissed

  useEffect(() => {
    if (!showPhase1) {
      setPhase1Mounted(false)
      setPhase1Revealed(false)
      return
    }
    const showId = window.setTimeout(() => setPhase1Mounted(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(showId)
  }, [showPhase1])

  useEffect(() => {
    if (!phase1Mounted || exiting || !showPhase1) return
    let cancelled = false
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (!cancelled) setPhase1Revealed(true)
      })
    })
    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
    }
  }, [phase1Mounted, exiting, showPhase1])

  function dismissWithAnimation(action: () => void) {
    setPhase1Revealed(false)
    setExiting(true)
    window.setTimeout(() => {
      action()
      setPhase1Mounted(false)
      setExiting(false)
    }, EXIT_MS)
  }

  function handleDismissProNudge() {
    dismissProNudge()
    setProNudgeDismissed(true)
  }

  if (!showPhase1 && !showPhase2) return null

  if (showPhase1 && (phase1Mounted || exiting)) {
    return (
      <div
        className={[
          'account-plan-bottom-banner',
          'account-plan-bottom-banner--phase1',
          phase1Revealed && !exiting ? 'account-plan-bottom-banner--phase1-visible' : '',
          exiting ? 'account-plan-bottom-banner--phase1-exiting' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="region"
        aria-live="polite"
        aria-label="Save your plan"
      >
        <div className="account-plan-bottom-banner__phase1-inner">
          <p className="account-plan-bottom-banner__message">
            {hasCsvImport ? (
              <>
                Your profile and settings will be saved to this browser. Imported positions
                stay in this session only — to keep them, upgrade to Pro.
              </>
            ) : (
              <>
                Want this plan waiting for you next time? We&apos;ll save your profile and
                settings to this browser.
              </>
            )}
          </p>
          <div className="account-plan-bottom-banner__phase1-actions">
            <AppButton
              type="button"
              size="sm"
              variant="primary"
              className="account-plan-bottom-banner__save"
              onPress={() => dismissWithAnimation(acceptBrowserSave)}
            >
              Save my plan
            </AppButton>
            {hasCsvImport && onOpenUpgrade ? (
              <AppButton
                type="button"
                size="sm"
                variant="secondary"
                className="account-plan-bottom-banner__upgrade"
                onPress={onOpenUpgrade}
              >
                Upgrade to Pro
              </AppButton>
            ) : null}
            <button
              type="button"
              className="account-plan-bottom-banner__dismiss-link"
              onClick={() => dismissWithAnimation(dismissSavePlanPrompt)}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showPhase2) {
    return (
      <div
        className="account-plan-bottom-banner account-plan-bottom-banner--phase2"
        role="region"
        aria-live="polite"
        aria-label="Upgrade to Pro"
      >
        <p className="account-plan-bottom-banner__phase2-message">
          {hasCsvImport ? (
            <>
              Imported positions aren&apos;t saved locally. Upgrade to Pro to keep your full
              plan across sessions, plus Plaid sync and advanced scenarios.
            </>
          ) : (
            <>
              Your plan is saved to this browser. Upgrade to Pro to access it anywhere, plus
              Plaid sync and advanced scenarios.
            </>
          )}
        </p>
        <div className="account-plan-bottom-banner__phase2-actions">
          {onOpenUpgrade ? (
            <AppButton
              type="button"
              size="sm"
              variant="secondary"
              className="account-plan-bottom-banner__phase2-upgrade"
              onPress={onOpenUpgrade}
            >
              Upgrade to Pro
            </AppButton>
          ) : null}
          <button
            type="button"
            className="account-plan-bottom-banner__phase2-close"
            aria-label="Dismiss"
            onClick={handleDismissProNudge}
          >
            <IconX size={16} stroke={1.5} aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  return null
}
