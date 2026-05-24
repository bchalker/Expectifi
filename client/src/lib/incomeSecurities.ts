import incomeSecuritiesData from '../data/income_securities.json'

export type NavErosionRisk =
  | 'Very Low'
  | 'Low'
  | 'Low-Moderate'
  | 'Moderate'
  | 'Moderate-High'
  | 'High'
  | 'Very High'

export type IncomeSecurity = {
  ticker: string
  name: string
  type: 'ETF' | 'Stock' | string
  category: string
  yield_est: number
  expense_ratio: number | null
  nav_erosion_risk: NavErosionRisk
  frequency: string
  notes: string
}

export type IncomeSecurityFilterId =
  | 'all'
  | 'covered-call'
  | 'yieldmax'
  | 'dividend-growth'
  | 'high-dividend'
  | 'reit-bdc'
  | 'bonds'
  | 'stocks'

export const INCOME_SECURITY_FILTERS: ReadonlyArray<{ id: IncomeSecurityFilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'covered-call', label: 'Covered Call' },
  { id: 'yieldmax', label: 'YieldMax' },
  { id: 'dividend-growth', label: 'Dividend Growth' },
  { id: 'high-dividend', label: 'High Dividend' },
  { id: 'reit-bdc', label: 'REIT/BDC' },
  { id: 'bonds', label: 'Bonds' },
  { id: 'stocks', label: 'Stocks' },
]

export const INCOME_SECURITY_FILTER_DESCRIPTIONS: Record<IncomeSecurityFilterId, string> = {
  all: 'Browse the full list of income-producing securities across all strategies and asset types.',
  'covered-call':
    'ETFs that sell call options on their holdings to generate monthly income. Lower upside potential in exchange for consistent cash flow.',
  yieldmax:
    'Single-stock synthetic covered call ETFs with very high yields. Income can be significant but NAV erosion is a real risk over time.',
  'dividend-growth':
    'Companies with long track records of growing their dividends year over year. Lower current yield but more reliable long-term income.',
  'high-dividend':
    'Stocks and ETFs screened for above-average current yield. Good for immediate income needs, less focus on growth.',
  'reit-bdc':
    'Real estate investment trusts and business development companies. Required by law to distribute most of their income, making them natural income vehicles.',
  bonds:
    'Fixed income ETFs ranging from investment grade to high yield. More predictable income with varying levels of credit and interest rate risk.',
  stocks:
    'Individual dividend-paying companies. More control and transparency than funds, but concentration risk to consider.',
}

const BOND_CATEGORIES = new Set([
  'High Yield Bond',
  'Investment Grade Bond',
  'Preferred Stock',
  'MLP',
  'Midstream Energy',
])

/** NAV erosion risk → annual drift magnitude shown as “+X.X% NAV erosion”. */
export const NAV_EROSION_RISK_PCT: Record<NavErosionRisk, number> = {
  'Very Low': 0.2,
  Low: 0.5,
  'Low-Moderate': 1.0,
  Moderate: 1.5,
  'Moderate-High': 2.5,
  High: 4.0,
  'Very High': 7.0,
}

export const INCOME_SECURITIES: IncomeSecurity[] = (
  incomeSecuritiesData as { securities: IncomeSecurity[] }
).securities

const byTicker = new Map(INCOME_SECURITIES.map((s) => [s.ticker, s]))

export function findIncomeSecurity(ticker: string): IncomeSecurity | undefined {
  return byTicker.get(ticker)
}

export function navDriftFromErosionRisk(risk: NavErosionRisk): number {
  return NAV_EROSION_RISK_PCT[risk] / 100
}

export function formatSecurityYieldPct(yieldEst: number): string {
  const rounded = Math.round(yieldEst * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`
}

export function paysFrequencyLabel(frequency: string): string {
  const trimmed = frequency.trim()
  if (!trimmed) return ''
  return `Pays ${trimmed.toLowerCase()}`
}

export function securityRowSubtext(security: IncomeSecurity): string {
  const payLine = paysFrequencyLabel(security.frequency)
  const typeLabel = security.type === 'ETF' ? 'ETF' : security.type
  const base = `${security.category} ${typeLabel}`
  return payLine ? `${base} • ${payLine}` : base
}

export function matchesIncomeSecurityFilter(
  security: IncomeSecurity,
  filterId: IncomeSecurityFilterId,
): boolean {
  switch (filterId) {
    case 'all':
      return true
    case 'covered-call':
      return security.category === 'Covered Call' || security.category === 'Options Income'
    case 'yieldmax':
      return security.category === 'YieldMax'
    case 'dividend-growth':
      return security.category === 'Dividend Growth'
    case 'high-dividend':
      return security.category === 'High Dividend'
    case 'reit-bdc':
      return security.category === 'REIT' || security.category === 'BDC'
    case 'bonds':
      return BOND_CATEGORIES.has(security.category)
    case 'stocks':
      return security.type === 'Stock'
    default:
      return true
  }
}

export function filterIncomeSecurities(
  securities: IncomeSecurity[],
  query: string,
  filterId: IncomeSecurityFilterId,
): IncomeSecurity[] {
  const q = query.trim().toLowerCase()
  return securities.filter((s) => {
    if (!matchesIncomeSecurityFilter(s, filterId)) return false
    if (!q) return true
    return s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  })
}

export function navErosionRiskTextClass(risk: NavErosionRisk): string {
  switch (risk) {
    case 'Very Low':
    case 'Low':
      return 'income-security-selector__risk-value--green'
    case 'Low-Moderate':
    case 'Moderate':
      return 'income-security-selector__risk-value--amber'
    case 'Moderate-High':
      return 'income-security-selector__risk-value--orange'
    case 'High':
    case 'Very High':
      return 'income-security-selector__risk-value--red'
    default:
      return 'income-security-selector__risk-value--amber'
  }
}

/** @deprecated Use navErosionRiskTextClass for list rows. */
export function navErosionRiskCssClass(risk: NavErosionRisk): string {
  switch (risk) {
    case 'Very Low':
      return 'income-security-selector__dot--very-low'
    case 'Low':
      return 'income-security-selector__dot--low'
    case 'Low-Moderate':
      return 'income-security-selector__dot--low-moderate'
    case 'Moderate':
      return 'income-security-selector__dot--moderate'
    case 'Moderate-High':
      return 'income-security-selector__dot--moderate-high'
    case 'High':
      return 'income-security-selector__dot--high'
    case 'Very High':
      return 'income-security-selector__dot--very-high'
    default:
      return 'income-security-selector__dot--moderate'
  }
}
