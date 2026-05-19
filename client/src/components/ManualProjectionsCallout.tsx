import { useContext, useEffect, useMemo, useState } from 'react'
import { loadStoredFidelityImport } from '../lib/fidelityStorage'
import {
  markManualProjectionsCalloutDismissed,
  isManualProjectionsCalloutDismissed,
  shouldShowManualProjectionsCallout,
} from '../lib/manualProjectionsCallout'
import { manualAccountsOnboardingSkipped } from '../lib/manualAccountEntries'
import { PlaidConnectionContext } from './PlaidConnectionHeader'
import './ManualProjectionsCallout.scss'

type Props = {
  hasPortfolioBalances: boolean
  fidelityImportRev: number
  onConnectAccounts: () => void
  onImportCsv: () => void
}

export function ManualProjectionsCallout({
  hasPortfolioBalances,
  fidelityImportRev,
  onConnectAccounts,
  onImportCsv,
}: Props) {
  const ctx = useContext(PlaidConnectionContext)
  const hasPlaidConnections = (ctx?.items.length ?? 0) > 0
  const hasImportedData = useMemo(() => {
    void fidelityImportRev
    const imp = loadStoredFidelityImport()
    return (imp?.batches?.length ?? 0) > 0
  }, [fidelityImportRev])

  const [dismissed, setDismissed] = useState(() => isManualProjectionsCalloutDismissed())

  useEffect(() => {
    if (!hasPlaidConnections && !hasImportedData) return
    markManualProjectionsCalloutDismissed()
    setDismissed(true)
  }, [hasPlaidConnections, hasImportedData])

  const visible =
    !dismissed &&
    shouldShowManualProjectionsCallout({
      hasPortfolioBalances,
      hasPlaidConnections,
      hasImportedData,
      onboardingAccountsSkipped: manualAccountsOnboardingSkipped(),
    })

  if (!visible) return null

  return (
    <div className="manual-projections-callout" role="status">
      <p className="manual-projections-callout__text">
        <span className="manual-projections-callout__emoji" aria-hidden>
          📊
        </span>{' '}
        These projections are based on the numbers you provided.{' '}
        <button type="button" className="manual-projections-callout__link" onClick={onConnectAccounts}>
          Connect your accounts
        </button>{' '}
        or{' '}
        <button type="button" className="manual-projections-callout__link" onClick={onImportCsv}>
          import a CSV
        </button>{' '}
        for greater accuracy.
      </p>
    </div>
  )
}
