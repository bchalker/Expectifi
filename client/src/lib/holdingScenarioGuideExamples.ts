import {
  aggregateFidelityPositionsBySymbol,
  isFidelityMoneyMarketRow,
  isFidelityPendingActivityRow,
  normalizeFidelityImportSymbol,
  type AggregatedFidelitySymbolRow,
  type FidelityPositionRow,
} from './fidelityCsv'

const BOND_TICKER_MARKERS = ['BND', 'AGG', 'TLT', 'BOND'] as const

function symbolKey(symbol: string): string {
  return normalizeFidelityImportSymbol(symbol).toUpperCase()
}

/** Bond / fixed income: ticker substring markers or optional Plaid-style asset type. */
export function isBondOrFixedIncomeHolding(
  row: Pick<AggregatedFidelitySymbolRow, 'symbol' | 'contributingRows'>,
  assetType?: string | null,
): boolean {
  if (assetType?.toLowerCase() === 'bond') return true
  const sym = symbolKey(row.symbol)
  if (!sym) return false
  return BOND_TICKER_MARKERS.some((m) => sym.includes(m))
}

function isMoneyMarketAggregate(row: AggregatedFidelitySymbolRow): boolean {
  return row.contributingRows.some(isFidelityMoneyMarketRow)
}

function isStockOrEtfHolding(row: AggregatedFidelitySymbolRow): boolean {
  if (isBondOrFixedIncomeHolding(row)) return false
  if (isMoneyMarketAggregate(row)) return false
  return true
}

/** Up to three largest holdings for the lead copy (“But X, Y, and Z behave…”). */
export function pickScenarioGuideLeadTickers(rows: AggregatedFidelitySymbolRow[]): string[] {
  const eligible = rows.filter((r) => r.currentValue > 0 && symbolKey(r.symbol))
  if (eligible.length === 0) return []

  return [...eligible]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 3)
    .map((r) => r.symbol)
}

/** Up to three tickers for the dynamic examples line (largest, bond if any, then stock/ETF). */
export function pickScenarioGuideExampleTickers(rows: AggregatedFidelitySymbolRow[]): string[] {
  const eligible = rows.filter((r) => r.currentValue > 0 && symbolKey(r.symbol))
  if (eligible.length === 0) return []

  const sorted = [...eligible].sort((a, b) => b.currentValue - a.currentValue)
  const first = sorted[0]
  const firstKey = symbolKey(first.symbol)
  const used = new Set<string>([firstKey])
  const picks: string[] = [first.symbol]

  const bond = sorted.find((r) => {
    const k = symbolKey(r.symbol)
    return k !== firstKey && !used.has(k) && isBondOrFixedIncomeHolding(r)
  })
  if (bond) {
    picks.push(bond.symbol)
    used.add(symbolKey(bond.symbol))
  }

  const stockEtf = sorted.find((r) => {
    const k = symbolKey(r.symbol)
    return k !== firstKey && !used.has(k) && isStockOrEtfHolding(r)
  })
  if (stockEtf) picks.push(stockEtf.symbol)

  return picks.slice(0, 3)
}

export function aggregatedHoldingsForScenarioGuide(
  fidelityRows: FidelityPositionRow[],
): AggregatedFidelitySymbolRow[] {
  const rows = fidelityRows.filter((r) => !isFidelityPendingActivityRow(r))
  return aggregateFidelityPositionsBySymbol(rows).filter((r) => r.currentValue > 0)
}
