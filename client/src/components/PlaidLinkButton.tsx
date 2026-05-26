import { useCallback, useEffect, useState } from 'react'
import { IconLink } from '@tabler/icons-react'
import { AppButton } from './ui/AppButton'
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
  disabled?: boolean
}

export function PlaidLinkButton({
  className,
  variant = 'primary',
  residenceCountry: _residenceCountry,
  onApplyBalances,
  onImportApplied,
  disabled = false,
}: Props) {
  const { user } = useAuth()
  const { hasPaidSubscription } = usePlan()
  const [configured, setConfigured] = useState<boolean | null>(null)
  const handleImportApplied = useCallback(() => {
    onImportApplied?.()
  }, [onImportApplied])

  const { startLink, busy, err, info } = usePlaidLinkFlow({
    onApplyBalances,
    onImportApplied: handleImportApplied,
    enabled: hasPaidSubscription,
  })

  useEffect(() => {
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
  }, [])

  const label =
    busy ? 'Connecting…' : variant === 'choice' ? 'Connect via Plaid' : 'Connect with Plaid'

  if (variant === 'choice' && !hasPaidSubscription) {
    const proNote = user ? 'Subscribe to Pro to connect' : 'Pro subscribers only'
    return (
      <div className="financials-entry-choice-wrap financials-entry-choice-wrap--pro-gated" role="listitem">
        <button
          type="button"
          className="financials-entry-choice financials-entry-choice--pro-gated"
          disabled
          aria-disabled="true"
        >
          <IconLink size={18} stroke={1.5} aria-hidden />
          Connect via Plaid
        </button>
        <p className="financials-entry-choice__pro-note">{proNote}</p>
      </div>
    )
  }

  if (variant !== 'choice' && !hasPaidSubscription) return null
  if (variant !== 'choice' && configured === false) return null

  const statusBlocksClick = configured === null || configured === false
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
          onPress={() => void startLink(null)}
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
          onClick={() => void startLink(null)}
        >
          <IconLink size={18} stroke={1.5} aria-hidden />
          {label}
        </button>
      )}
      {configured === false && hasPaidSubscription ? (
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
