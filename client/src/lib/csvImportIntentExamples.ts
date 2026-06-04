import { formatMoney } from './displayCurrency'
import {
  isPendingActivityImportRow,
  normalizeImportSymbol,
  type ImportedPositionRow,
} from './positionsCsv'
import { flattenBatches, loadStoredPositionsImport } from './positionsImportStorage'

export type ImportIntentExamples = {
  update: string
  add: string
  replace: string
}

function formatConjunctionList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function loadedHoldingsRows(): ImportedPositionRow[] {
  const stored = loadStoredPositionsImport()
  if (!stored?.batches.length) return []
  return flattenBatches(stored.batches).filter((r) => !isPendingActivityImportRow(r))
}

function topHoldingsByValue(rows: ImportedPositionRow[], limit: number): ImportedPositionRow[] {
  return [...rows].sort((a, b) => b.currentValue - a.currentValue).slice(0, limit)
}

function holdingWithValue(row: ImportedPositionRow): string {
  const sym = normalizeImportSymbol(row.symbol)
  return `${sym} (${formatMoney(row.currentValue)})`
}

/** Personalized example copy for the import intent cards. */
export function buildImportIntentExamples(): ImportIntentExamples {
  const rows = loadedHoldingsRows()
  const top = topHoldingsByValue(rows, 3)
  const totalCount = rows.length

  const valuedList = formatConjunctionList(top.map(holdingWithValue))
  const symbolList = formatConjunctionList(
    top.map((r) => normalizeImportSymbol(r.symbol)),
  )

  const topTwo = top.slice(0, 2).map((r) => normalizeImportSymbol(r.symbol))
  const replaceInclude =
    topTwo.length >= 2
      ? `${topTwo[0]} and ${topTwo[1]}`
      : topTwo[0] ?? 'your holdings'

  return {
    update: `e.g. your ${valuedList} values will be revised to match this file`,
    add: `e.g. these holdings will be added alongside your existing ${symbolList} positions`,
    replace: `e.g. your current ${totalCount} holding${totalCount === 1 ? '' : 's'} including ${replaceInclude} will be permanently removed and replaced`,
  }
}
