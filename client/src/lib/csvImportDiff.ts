import {
  fidelityAccountKey,
  isFidelityPendingActivityRow,
  mapRowToBucket,
  normalizeFidelityImportSymbol,
  type FidelityPositionRow,
} from './fidelityCsv'
import type { PositionsCsvCustodian } from './positionsCsvImport'
import { flattenBatches, type FidelityImportBatch, type StoredFidelityImportV2 } from './fidelityStorage'

export type ImportIntent = 'update' | 'add' | 'replace'

export type RemovedHoldingAction = 'keep' | 'remove'

/** Stable key: symbol + tax bucket + account name (within a custodian update). */
export function importPositionKey(row: FidelityPositionRow): string {
  const sym = normalizeFidelityImportSymbol(row.symbol)
  const bucket = mapRowToBucket(row)
  const acct = fidelityAccountKey(row.accountName)
  return `${sym}|${bucket}|${acct}`
}

export type ImportDiffRemovedRow = {
  key: string
  row: FidelityPositionRow
  /** e.g. "SPAXX — Fidelity Government Money Market" */
  displayLabel: string
}

export type CustodianImportDiff = {
  updated: FidelityPositionRow[]
  added: FidelityPositionRow[]
  unchanged: FidelityPositionRow[]
  removed: ImportDiffRemovedRow[]
  counts: {
    updated: number
    added: number
    unchanged: number
    removed: number
  }
}

function displayLabelForRow(row: FidelityPositionRow): string {
  const sym = normalizeFidelityImportSymbol(row.symbol)
  const desc = row.description.trim()
  return desc ? `${sym} — ${desc}` : sym
}

function valuesEqual(a: FidelityPositionRow, b: FidelityPositionRow): boolean {
  return a.currentValue === b.currentValue
}

export function rowsForCustodian(
  batches: FidelityImportBatch[],
  custodian: PositionsCsvCustodian,
): FidelityPositionRow[] {
  const out: FidelityPositionRow[] = []
  for (const b of batches) {
    if ((b.custodian ?? 'fidelity') !== custodian) continue
    for (const r of b.rows) {
      if (!isFidelityPendingActivityRow(r)) out.push(r)
    }
  }
  return out
}

/** Compare incoming rows against existing holdings for the same custodian (update intent). */
export function computeCustodianImportDiff(
  existing: StoredFidelityImportV2 | null,
  incomingRows: FidelityPositionRow[],
  custodian: PositionsCsvCustodian,
): CustodianImportDiff {
  const existingSameCust = rowsForCustodian(existing?.batches ?? [], custodian)

  const incomingMap = new Map<string, FidelityPositionRow>()
  for (const r of incomingRows) {
    if (isFidelityPendingActivityRow(r)) continue
    incomingMap.set(importPositionKey(r), r)
  }

  const existingMap = new Map<string, FidelityPositionRow>()
  for (const r of existingSameCust) {
    existingMap.set(importPositionKey(r), r)
  }

  const updated: FidelityPositionRow[] = []
  const added: FidelityPositionRow[] = []
  const unchanged: FidelityPositionRow[] = []
  const removed: ImportDiffRemovedRow[] = []

  for (const [key, inc] of incomingMap) {
    const ex = existingMap.get(key)
    if (!ex) added.push(inc)
    else if (valuesEqual(ex, inc)) unchanged.push(inc)
    else updated.push(inc)
  }

  for (const [key, ex] of existingMap) {
    if (!incomingMap.has(key)) {
      removed.push({
        key,
        row: ex,
        displayLabel: displayLabelForRow(ex),
      })
    }
  }

  return {
    updated,
    added,
    unchanged,
    removed,
    counts: {
      updated: updated.length,
      added: added.length,
      unchanged: unchanged.length,
      removed: removed.length,
    },
  }
}

export function hasStoredHoldings(existing: StoredFidelityImportV2 | null): boolean {
  if (!existing?.batches.length) return false
  return flattenBatches(existing.batches).some((r) => !isFidelityPendingActivityRow(r))
}

export function defaultRemovedActions(removed: ImportDiffRemovedRow[]): Record<string, RemovedHoldingAction> {
  const m: Record<string, RemovedHoldingAction> = {}
  for (const item of removed) m[item.key] = 'keep'
  return m
}
