import type { ImportedPositionRow } from './positionsCsv'
import { isPendingActivityImportRow, mapRowToBucket } from './positionsCsv'
import {
  computeBalancesFromBatches,
  clearStoredPositionsImport,
  loadStoredPositionsImport,
  saveStoredPositionsImport,
} from './positionsImportStorage'
import type { PositionReturnModel } from './positionReturnModel'

const RETIREMENT_FIDELITY_POSITION_ID = /^fid-(ret401k|se401k|roth|hsa)-/
const ALL_FIDELITY_POSITION_ID = /^fid-/

function isRetirementPositionRow(r: ImportedPositionRow): boolean {
  if (isPendingActivityImportRow(r)) return false
  const bucket = mapRowToBucket(r)
  return bucket !== 'unknown' && bucket !== 'brokerage'
}

/** Drop retirement rows from stored CSV import; clear storage if nothing remains. */
export function stripRetirementFromPositionsStorage(): void {
  const existing = loadStoredPositionsImport()
  if (!existing) return

  const batches = existing.batches
    .map((b) => ({ ...b, rows: b.rows.filter((r) => !isRetirementPositionRow(r)) }))
    .filter((b) => b.rows.length > 0)

  if (!batches.length) {
    clearStoredPositionsImport()
    return
  }

  saveStoredPositionsImport({
    ...existing,
    savedAt: new Date().toISOString(),
    batches,
    balances: computeBalancesFromBatches(batches),
  })
}

export function filterRetirementPositionReturnModels(models: PositionReturnModel[] | undefined): PositionReturnModel[] {
  return (models ?? []).filter((p) => !RETIREMENT_FIDELITY_POSITION_ID.test(p.id))
}

export function filterImportedPositionReturnModels(models: PositionReturnModel[] | undefined): PositionReturnModel[] {
  return (models ?? []).filter((p) => !ALL_FIDELITY_POSITION_ID.test(p.id))
}

/** Clear stored CSV import (retirement and brokerage). */
export function clearAllPositionsImportFromCard(): void {
  clearStoredPositionsImport()
}

export function clearRetirementAccountBalances(): {
  base401k: number
  baseSE401k: number
  baseTradIRA: number
  baseRoth: number
  baseHsa: number
} {
  return { base401k: 0, baseSE401k: 0, baseTradIRA: 0, baseRoth: 0, baseHsa: 0 }
}

export function clearAllAccountBalancesFromCard(): {
  base401k: number
  baseSE401k: number
  baseTradIRA: number
  baseRoth: number
  baseHsa: number
  brkBal: number
} {
  return { ...clearRetirementAccountBalances(), brkBal: 0 }
}
