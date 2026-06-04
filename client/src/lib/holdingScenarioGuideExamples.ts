import {
  aggregatePositionsBySymbol,
  isMoneyMarketImportRow,
  isPendingActivityImportRow,
  normalizeImportSymbol,
  type AggregatedSymbolRow,
  type ImportedPositionRow,
} from './positionsCsv'

const BOND_TICKER_MARKERS = ['BND', 'AGG', 'TLT', 'BOND'] as const

function symbolKey(symbol: string): string {
  return normalizeImportSymbol(symbol).toUpperCase()
}

/** Bond / fixed income: ticker substring markers or optional Plaid-style asset type. */
export function isBondOrFixedIncomeHolding(
  row: Pick<AggregatedSymbolRow, 'symbol' | 'contributingRows'>,
  assetType?: string | null,
): boolean {
  if (assetType?.toLowerCase() === 'bond') return true
  const sym = symbolKey(row.symbol)
  if (!sym) return false
  return BOND_TICKER_MARKERS.some((m) => sym.includes(m))
}

function isMoneyMarketAggregate(row: AggregatedSymbolRow): boolean {
  return row.contributingRows.some(isMoneyMarketImportRow)
}

function isStockOrEtfHolding(row: AggregatedSymbolRow): boolean {
  if (isBondOrFixedIncomeHolding(row)) return false
  if (isMoneyMarketAggregate(row)) return false
  return true
}

/** Up to three largest holdings for the lead copy (“But X, Y, and Z behave…”). */
export function pickScenarioGuideLeadTickers(rows: AggregatedSymbolRow[]): string[] {
  const eligible = rows.filter((r) => r.currentValue > 0 && symbolKey(r.symbol))
  if (eligible.length === 0) return []

  return [...eligible]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 3)
    .map((r) => r.symbol)
}

/** Up to three tickers for the dynamic examples line (largest, bond if any, then stock/ETF). */
export function pickScenarioGuideExampleTickers(rows: AggregatedSymbolRow[]): string[] {
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
  importedPositionRows: ImportedPositionRow[],
): AggregatedSymbolRow[] {
  const rows = importedPositionRows.filter((r) => !isPendingActivityImportRow(r))
  return aggregatePositionsBySymbol(rows).filter((r) => r.currentValue > 0)
}
