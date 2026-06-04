/** Display helpers for Fidelity holdings tables (value hover, etc.). */

export function formatHoldingShareCount(quantity: number): string {
  if (!Number.isFinite(quantity)) return '—'
  if (Math.abs(quantity - Math.round(quantity)) < 1e-6) return `${Math.round(quantity)} shares`
  return `${quantity.toLocaleString('en-US', { maximumFractionDigits: 4 })} shares`
}

export function formatHoldingLastPerShare(lastPrice: number): string {
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) return '—'
  return `$${lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/share`
}

/** One line for value hover; returns null if nothing to show. */
export function formatHoldingDailyChangeLine(dollar: number | null, pct: number | null): string | null {
  if (dollar == null && pct == null) return null
  const dollarStr =
    dollar != null && Number.isFinite(dollar)
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' }).format(dollar)
      : null
  const pctStr =
    pct != null && Number.isFinite(pct) ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : null
  if (dollarStr && pctStr) return `Change: ${dollarStr} (${pctStr})`
  if (dollarStr) return `Change: ${dollarStr}`
  if (pctStr) return `Change: (${pctStr})`
  return null
}

export const HOLDINGS_DESCRIPTION_MAX_CHARS = 48

export function truncateForHoldingsTable(text: string, maxLen = HOLDINGS_DESCRIPTION_MAX_CHARS): string {
  const t = text.trim()
  if (t.length <= maxLen) return t
  return t.slice(0, Math.max(0, maxLen - 1)) + '…'
}
