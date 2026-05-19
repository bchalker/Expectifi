const MANUAL_PROJECTIONS_CALLOUT_DISMISSED_KEY =
  'retirement-calculator/manual-projections-callout-dismissed'

export function markManualProjectionsCalloutDismissed(): void {
  try {
    localStorage.setItem(MANUAL_PROJECTIONS_CALLOUT_DISMISSED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function isManualProjectionsCalloutDismissed(): boolean {
  try {
    return localStorage.getItem(MANUAL_PROJECTIONS_CALLOUT_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function shouldShowManualProjectionsCallout(opts: {
  hasPortfolioBalances: boolean
  hasPlaidConnections: boolean
  hasImportedData: boolean
  onboardingAccountsSkipped: boolean
}): boolean {
  if (isManualProjectionsCalloutDismissed()) return false
  if (!opts.onboardingAccountsSkipped) return false
  if (!opts.hasPortfolioBalances) return false
  if (opts.hasPlaidConnections) return false
  if (opts.hasImportedData) return false
  return true
}
