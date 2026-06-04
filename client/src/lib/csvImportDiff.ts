import {
  fidelityAccountKey,
  isPendingActivityImportRow,
  mapRowToBucket,
  normalizeImportSymbol,
  type ImportedPositionRow,
} from './positionsCsv'
import type { PositionsCsvCustodian } from './positionsCsvImport'
import { flattenBatches, type PositionsImportBatch, type StoredPositionsImportV2 } from './positionsImportStorage'

export type ImportIntent = 'update' | 'add' | 'replace'

export type RemovedHoldingAction = 'keep' | 'remove'

/** Stable key: symbol + tax bucket + account name (within a custodian update). */
export function importPositionKey(row: ImportedPositionRow): string {
  const sym = normalizeImportSymbol(row.symbol)
  const bucket = mapRowToBucket(row)
  const acct = fidelityAccountKey(row.accountName)
  return `${sym}|${bucket}|${acct}`
}

export type ImportDiffRemovedRow = {
  key: string
  row: ImportedPositionRow
  /** e.g. "SPAXX — Fidelity Government Money Market" */
  displayLabel: string
}

export type CustodianImportDiff = {
  updated: ImportedPositionRow[]
  added: ImportedPositionRow[]
  unchanged: ImportedPositionRow[]
  removed: ImportDiffRemovedRow[]
  counts: {
    updated: number
    added: number
    unchanged: number
    removed: number
  }
}

function displayLabelForRow(row: ImportedPositionRow): string {
  const sym = normalizeImportSymbol(row.symbol)
  const desc = row.description.trim()
  return desc ? `${sym} — ${desc}` : sym
}

function valuesEqual(a: ImportedPositionRow, b: ImportedPositionRow): boolean {
  return a.currentValue === b.currentValue
}

export function rowsForCustodian(
  batches: PositionsImportBatch[],
  custodian: PositionsCsvCustodian,
): ImportedPositionRow[] {
  const out: ImportedPositionRow[] = []
  for (const b of batches) {
    if ((b.custodian ?? 'fidelity') !== custodian) continue
    for (const r of b.rows) {
      if (!isPendingActivityImportRow(r)) out.push(r)
    }
  }
  return out
}

/** Compare incoming rows against existing holdings for the same custodian (update intent). */
export function computeCustodianImportDiff(
  existing: StoredPositionsImportV2 | null,
  incomingRows: ImportedPositionRow[],
  custodian: PositionsCsvCustodian,
): CustodianImportDiff {
  const existingSameCust = rowsForCustodian(existing?.batches ?? [], custodian)

  const incomingMap = new Map<string, ImportedPositionRow>()
  for (const r of incomingRows) {
    if (isPendingActivityImportRow(r)) continue
    incomingMap.set(importPositionKey(r), r)
  }

  const existingMap = new Map<string, ImportedPositionRow>()
  for (const r of existingSameCust) {
    existingMap.set(importPositionKey(r), r)
  }

  const updated: ImportedPositionRow[] = []
  const added: ImportedPositionRow[] = []
  const unchanged: ImportedPositionRow[] = []
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

export function hasStoredHoldings(existing: StoredPositionsImportV2 | null): boolean {
  if (!existing?.batches.length) return false
  return flattenBatches(existing.batches).some((r) => !isPendingActivityImportRow(r))
}

export function defaultRemovedActions(removed: ImportDiffRemovedRow[]): Record<string, RemovedHoldingAction> {
  const m: Record<string, RemovedHoldingAction> = {}
  for (const item of removed) m[item.key] = 'keep'
  return m
}
