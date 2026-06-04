import type { ImportedPositionRow } from './positionsCsv'
import { normalizeImportSymbol, positionsForBrokerage, positionsForRetirementBucket } from './positionsCsv'
import type { CalculatorInputs } from './computeResults'
import {
  mergeBucketIntoAllModels,
  normalizePositionReturnModels,
  type PositionReturnModel,
} from './positionReturnModel'

const RETIREMENT_FIDELITY_BUCKET_DEFS = [
  { bucket: 'trad401k' as const, keyPrefix: 'ret401k' },
  { bucket: 'se401k' as const, keyPrefix: 'se401k' },
  { bucket: 'roth' as const, keyPrefix: 'roth' },
  { bucket: 'hsa' as const, keyPrefix: 'hsa' },
] as const

const DASHBOARD_PREFIXES = ['fid-ret401k-', 'fid-se401k-', 'fid-roth-', 'fid-hsa-', 'fid-brk-'] as const

export function isDashboardMergedPositionId(id: string): boolean {
  return DASHBOARD_PREFIXES.some((p) => id.startsWith(p))
}

/** Same merge chain as dashboard Fidelity holdings + brokerage, for editing return models in the merged card. */
export function computeMergedDashboardPositionModels(
  inputs: CalculatorInputs,
  importedPositionRows: ImportedPositionRow[],
  yearsToRetirement: number,
  retirementCalendarYear: number,
): PositionReturnModel[] {
  const h = Math.max(1, Math.min(50, Math.round(yearsToRetirement)))
  const calY = retirementCalendarYear
  const retRate = inputs.retRate
  const brkRate = inputs.brkRate

  let working = normalizePositionReturnModels(inputs.positionReturnModels ?? [], h, retRate, calY)
  for (const def of RETIREMENT_FIDELITY_BUCKET_DEFS) {
    const pos = positionsForRetirementBucket(importedPositionRows, def.bucket)
    working = mergeBucketIntoAllModels(working, pos, def.keyPrefix, retRate, h, calY)
  }
  const brokeragePositions = positionsForBrokerage(importedPositionRows)
  working = mergeBucketIntoAllModels(working, brokeragePositions, 'brk', brkRate, h, calY)

  return working.filter((m) => isDashboardMergedPositionId(m.id))
}

export function blendedRateForDashboardPositionId(id: string, retRate: number, brkRate: number): number {
  return id.startsWith('fid-brk-') ? brkRate : retRate
}

/** Uppercase normalized ticker keys from import rows (for cross-account symbol matching). */
export function tickerKeySetFromImportedRows(rows: ImportedPositionRow[]): Set<string> {
  const s = new Set<string>()
  for (const r of rows) {
    const k = normalizeImportSymbol(r.symbol).toUpperCase()
    if (k) s.add(k)
  }
  return s
}

export function countImportedLinesMatchingTickerKeys(
  rows: ImportedPositionRow[],
  symbolKeys: Set<string>,
): number {
  if (symbolKeys.size === 0) return 0
  return rows.filter((r) => {
    const k = normalizeImportSymbol(r.symbol).toUpperCase()
    return k && symbolKeys.has(k)
  }).length
}

/** All dashboard `PositionReturnModel`s for any of the given tickers (401k, Roth, HSA, brokerage, …). */
export function mergedDashboardModelsForTickerKeys(
  merged: PositionReturnModel[],
  symbolKeys: Set<string>,
): PositionReturnModel[] {
  if (symbolKeys.size === 0) return []
  const out: PositionReturnModel[] = []
  const seen = new Set<string>()
  for (const m of merged) {
    const tk = normalizeImportSymbol(m.ticker).toUpperCase()
    if (!tk || !symbolKeys.has(tk)) continue
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  return out
}
