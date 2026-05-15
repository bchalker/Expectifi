import type { FidelityPositionRow } from './fidelityCsv'
import { isFidelityPendingActivityRow, mapRowToBucket } from './fidelityCsv'
import {
  computeBalancesFromBatches,
  clearStoredFidelityImport,
  loadStoredFidelityImport,
  saveStoredFidelityImport,
} from './fidelityStorage'
import type { PositionReturnModel } from './positionReturnModel'

const RETIREMENT_FIDELITY_POSITION_ID = /^fid-(ret401k|se401k|roth|hsa)-/
const ALL_FIDELITY_POSITION_ID = /^fid-/

function isRetirementPositionRow(r: FidelityPositionRow): boolean {
  if (isFidelityPendingActivityRow(r)) return false
  const bucket = mapRowToBucket(r)
  return bucket !== 'unknown' && bucket !== 'brokerage'
}

/** Drop retirement rows from stored CSV import; clear storage if nothing remains. */
export function stripRetirementFromFidelityStorage(): void {
  const existing = loadStoredFidelityImport()
  if (!existing) return

  const batches = existing.batches
    .map((b) => ({ ...b, rows: b.rows.filter((r) => !isRetirementPositionRow(r)) }))
    .filter((b) => b.rows.length > 0)

  if (!batches.length) {
    clearStoredFidelityImport()
    return
  }

  saveStoredFidelityImport({
    ...existing,
    savedAt: new Date().toISOString(),
    batches,
    balances: computeBalancesFromBatches(batches),
  })
}

export function filterRetirementPositionReturnModels(models: PositionReturnModel[] | undefined): PositionReturnModel[] {
  return (models ?? []).filter((p) => !RETIREMENT_FIDELITY_POSITION_ID.test(p.id))
}

export function filterAllFidelityPositionReturnModels(models: PositionReturnModel[] | undefined): PositionReturnModel[] {
  return (models ?? []).filter((p) => !ALL_FIDELITY_POSITION_ID.test(p.id))
}

/** Clear stored CSV import (retirement and brokerage). */
export function clearAllFidelityImportFromCard(): void {
  clearStoredFidelityImport()
}

export function clearRetirementAccountBalances(): {
  base401k: number
  baseSE401k: number
  baseRoth: number
  baseHsa: number
} {
  return { base401k: 0, baseSE401k: 0, baseRoth: 0, baseHsa: 0 }
}

export function clearAllAccountBalancesFromCard(): {
  base401k: number
  baseSE401k: number
  baseRoth: number
  baseHsa: number
  brkBal: number
} {
  return { ...clearRetirementAccountBalances(), brkBal: 0 }
}
