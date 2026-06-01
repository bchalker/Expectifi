import { useCallback, useContext, useEffect, useState } from 'react'
import { IconLink } from '@tabler/icons-react'
import { AppButton } from './ui/AppButton'
import { UpgradePrompt } from './ui/UpgradePrompt'
import { PlaidConnectionContext } from './PlaidConnectionHeader'
import { useAuth } from '../context/AuthContext'
import { usePlan } from '../hooks/usePlan'
import { fetchPlaidStatus } from '../lib/api/plaid'
import { usePlaidLinkFlow } from '../hooks/usePlaidLinkFlow'
import type { CalculatorInputs } from '../lib/computeResults'
import './PlaidLinkButton.scss'

type Props = {
  className?: string
  variant?: 'primary' | 'ghost' | 'toolbar' | 'choice'
  residenceCountry?: string
  onApplyBalances: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onImportApplied?: () => void
  onOpenUpgrade?: () => void
  disabled?: boolean
}

export function PlaidLinkButton({
  className,
  variant = 'primary',
  residenceCountry: _residenceCountry,
  onApplyBalances,
  onImportApplied,
  onOpenUpgrade,
  disabled = false,
}: Props) {
  const { user } = useAuth()
  const { hasPaidSubscription } = usePlan()
  const ctx = useContext(PlaidConnectionContext)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const handleImportApplied = useCallback(() => {
    onImportApplied?.()
  }, [onImportApplied])

  const standaloneFlow = usePlaidLinkFlow({
    onApplyBalances,
    onImportApplied: handleImportApplied,
    enabled: hasPaidSubscription && !ctx,
  })

  useEffect(() => {
    if (ctx) return
    let cancelled = false
    void (async () => {
      try {
        const status = await fetchPlaidStatus()
        if (!cancelled) setConfigured(status.configured)
      } catch {
        if (!cancelled) setConfigured(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ctx])

  const busy = ctx?.linkBusy ?? standaloneFlow.busy
  const err = ctx?.linkErr ?? standaloneFlow.err
  const info = ctx?.linkInfo ?? standaloneFlow.info
  const startConnect = ctx ? () => ctx.startAddAccount() : () => void standaloneFlow.startLink(null)

  const label = busy ? 'Connecting…' : variant === 'choice' ? 'Connect via Plaid' : 'Connect with Plaid'

  if (variant === 'choice' && !hasPaidSubscription) {
    return (
      <>
        <div className="financials-entry-choice-wrap" role="listitem">
          <button
            type="button"
            role="listitem"
            className="financials-entry-choice"
            onClick={() => setUpgradeOpen(true)}
          >
            <IconLink size={18} stroke={1.5} aria-hidden />
            Connect via Plaid
          </button>
        </div>
        <UpgradePrompt
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          onUpgrade={() => {
            setUpgradeOpen(false)
            onOpenUpgrade?.()
          }}
          title="Connect with live Plaid sync"
          description={
            user
              ? 'Upgrade to Pro to link your brokerage accounts with automatic Plaid sync. CSV import and manual entry stay available on every plan.'
              : 'Create a Pro account to link brokerage accounts with live Plaid sync. CSV import and manual entry remain free.'
          }
          feature="Live Plaid account linking"
        />
      </>
    )
  }

  if (variant !== 'choice' && !hasPaidSubscription) return null

  const configuredState = ctx ? ctx.configured : configured
  if (variant !== 'choice' && configuredState === false) return null

  const statusBlocksClick = configuredState === null || configuredState === false
  const btnClass = [
    variant === 'choice' ? 'financials-entry-choice' : 'plaid-link-btn',
    variant === 'toolbar' && 'plaid-link-btn--toolbar',
    variant === 'ghost' && 'plaid-link-btn--ghost',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={variant === 'choice' ? 'financials-entry-choice-wrap' : 'plaid-link-btn-wrap'}>
      {variant === 'toolbar' ? (
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          className={btnClass}
          isDisabled={disabled || busy || statusBlocksClick}
          onPress={startConnect}
        >
          <IconLink size={16} stroke={1.5} aria-hidden />
          {label}
        </AppButton>
      ) : (
        <button
          type="button"
          role={variant === 'choice' ? 'listitem' : undefined}
          className={btnClass}
          disabled={disabled || busy || statusBlocksClick}
          onClick={startConnect}
        >
          <IconLink size={18} stroke={1.5} aria-hidden />
          {label}
        </button>
      )}
      {configuredState === false && hasPaidSubscription ? (
        <p className="plaid-link-btn__err" role="status">
          Account linking is not available right now.
        </p>
      ) : null}
      {info ? (
        <p className="plaid-link-btn__info" role="status">
          {info}
        </p>
      ) : null}
      {err ? (
        <p className="plaid-link-btn__err" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  )
}

export { plaidErrorMessage, plaidAlreadyConnectedMessage } from '../hooks/usePlaidLinkFlow'
