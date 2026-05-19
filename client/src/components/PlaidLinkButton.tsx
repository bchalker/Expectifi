import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import type { PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { IconLink } from '@tabler/icons-react'
import { AppButton } from './ui/AppButton'
import { ApiRequestError } from '../lib/api'
import { createPlaidLinkToken, exchangePlaidPublicToken, fetchPlaidStatus } from '../lib/api/plaid'
import { applyPlaidHoldingsSnapshot } from '../lib/plaidImportApply'
import type { CalculatorInputs } from '../lib/computeResults'
import { markPortfolioBalancesFlush, triggerPortfolioWaveReveal } from '../lib/portfolioWaveReveal'
import './PlaidLinkButton.scss'

type Props = {
  className?: string
  variant?: 'primary' | 'ghost' | 'toolbar'
  onApplyBalances: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onImportApplied?: () => void
  onOpenSignIn?: () => void
  isSignedIn: boolean
  disabled?: boolean
}

function plaidErrorMessage(code: string): string {
  switch (code) {
    case 'unauthorized':
      return 'Sign in to connect your accounts.'
    case 'plaid_not_configured':
      return 'Account linking is not available right now.'
    case 'plaid_link_token_failed':
      return 'Could not start Plaid. Try again in a moment.'
    case 'plaid_exchange_failed':
      return 'Could not finish linking your account. Try again.'
    default:
      return 'Something went wrong connecting your account.'
  }
}

export function PlaidLinkButton({
  className,
  variant = 'primary',
  onApplyBalances,
  onImportApplied,
  onOpenSignIn,
  isSignedIn,
  disabled = false,
}: Props) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pendingOpenRef = useRef(false)
  const exchangingRef = useRef(false)

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

  const finishExchange = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      exchangingRef.current = true
      setBusy(true)
      setErr(null)
      try {
        const { snapshot } = await exchangePlaidPublicToken({
          publicToken,
          institutionId: metadata.institution?.institution_id ?? null,
          institutionName: metadata.institution?.name ?? null,
        })
        const balances = applyPlaidHoldingsSnapshot(snapshot)
        markPortfolioBalancesFlush()
        onApplyBalances(balances)
        triggerPortfolioWaveReveal()
        onImportApplied?.()
      } catch (e) {
        const code = e instanceof ApiRequestError ? e.code : 'unknown'
        setErr(plaidErrorMessage(code))
      } finally {
        exchangingRef.current = false
        setBusy(false)
        setLinkToken(null)
        pendingOpenRef.current = false
      }
    },
    [onApplyBalances, onImportApplied],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      void finishExchange(publicToken, metadata)
    },
    onExit: () => {
      setLinkToken(null)
      pendingOpenRef.current = false
      if (!exchangingRef.current) setBusy(false)
    },
  })

  useEffect(() => {
    if (!linkToken || !ready || !pendingOpenRef.current) return
    open()
    pendingOpenRef.current = false
  }, [linkToken, ready, open])

  const startLink = useCallback(async () => {
    setErr(null)
    if (!isSignedIn) {
      onOpenSignIn?.()
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const { linkToken: token } = await createPlaidLinkToken()
      pendingOpenRef.current = true
      setLinkToken(token)
    } catch (e) {
      const code = e instanceof ApiRequestError ? e.code : 'unknown'
      setErr(plaidErrorMessage(code))
      setBusy(false)
    }
  }, [busy, isSignedIn, onOpenSignIn])

  if (configured === false) return null

  const label = busy ? 'Connecting…' : 'Connect with Plaid'
  const btnClass = [
    'plaid-link-btn',
    variant === 'toolbar' && 'plaid-link-btn--toolbar',
    variant === 'ghost' && 'plaid-link-btn--ghost',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="plaid-link-btn-wrap">
      {variant === 'toolbar' ? (
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          className={btnClass}
          isDisabled={disabled || busy || configured === null}
          onPress={() => void startLink()}
        >
          <IconLink size={16} stroke={1.5} aria-hidden />
          {label}
        </AppButton>
      ) : (
        <button
          type="button"
          className={btnClass}
          disabled={disabled || busy || configured === null}
          onClick={() => void startLink()}
        >
          <IconLink size={18} stroke={1.5} aria-hidden />
          {label}
        </button>
      )}
      {err ? (
        <p className="plaid-link-btn__err" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  )
}
