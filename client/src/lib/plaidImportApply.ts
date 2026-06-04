import type { ImportedPositionRow } from './positionsCsv'
import {
  applyPlaidHoldingsSnapshotDefault,
  applyPlaidHoldingsWithResolution,
  type PlaidConflictResolution,
} from './plaidConflict'
import {
  computeBalancesFromBatches,
  loadStoredPositionsImport,
  mergePositionsImportBatches,
  saveStoredPositionsImport,
  type StoredPositionsImportV2,
} from './positionsImportStorage'
import { totalsFromPositionRows, totalsToCalculatorBases } from './positionsCsv'
import { enrichBatchRows, stampRowsWithBrokerSource } from './brokerMonogram'

export type { PlaidConflictResolution } from './plaidConflict'

export type PlaidHoldingsSnapshot = {
  itemId: string
  institutionName: string
  institutionId?: string | null
  rows: ImportedPositionRow[]
  balances: {
    base401k: number
    baseSE401k: number
    baseRoth: number
    baseHsa: number
    brkBal: number
  }
}

function snapshotToBatch(snapshot: PlaidHoldingsSnapshot) {
  const now = new Date().toISOString()
  return enrichBatchRows({
    contentHash: `plaid-${snapshot.itemId}`,
    fileName: `${snapshot.institutionName} (Plaid)`,
    importedAt: now,
    rows: stampRowsWithBrokerSource(snapshot.rows, 'plaid'),
    custodian: 'other' as const,
    plaidItemId: snapshot.itemId,
  })
}

function stripPlaidBatches(
  stored: StoredPositionsImportV2 | null,
  itemIds: string[],
): StoredPositionsImportV2 | null {
  if (!stored?.batches?.length) return stored
  const idSet = new Set(itemIds)
  const batches = stored.batches.filter((b) => !b.plaidItemId || !idSet.has(b.plaidItemId))
  if (batches.length === stored.batches.length) return stored
  const rows = batches.flatMap((b) => b.rows)
  const totals = totalsFromPositionRows(rows)
  return {
    ...stored,
    savedAt: new Date().toISOString(),
    batches,
    balances: totalsToCalculatorBases(totals),
  }
}

/** Remove one Plaid item's batch from local import storage; returns updated calculator balances. */
export function removePlaidItemFromLocalStorage(itemId: string) {
  const existing = loadStoredPositionsImport()
  const next = stripPlaidBatches(existing, [itemId])
  if (next && next !== existing) saveStoredPositionsImport(next)
  return next?.balances ?? null
}

/** Merge Plaid holdings into local import storage and return calculator balance totals. */
export function applyPlaidHoldingsSnapshot(snapshot: PlaidHoldingsSnapshot) {
  return applyPlaidHoldingsSnapshotDefault(snapshot)
}

export function applyPlaidHoldingsSnapshotResolved(
  snapshot: PlaidHoldingsSnapshot,
  resolution: PlaidConflictResolution,
  conflictBroker?: Parameters<typeof applyPlaidHoldingsWithResolution>[2],
) {
  return applyPlaidHoldingsWithResolution(snapshot, resolution, conflictBroker)
}

/** Replace synced Plaid item batches and merge rows from multiple item snapshots. */
export function applyPlaidHoldingsSnapshots(snapshots: PlaidHoldingsSnapshot[]) {
  if (snapshots.length === 0) return null
  const itemIds = snapshots.map((s) => s.itemId)
  const batches = snapshots.map(snapshotToBatch)
  const existing = loadStoredPositionsImport()
  const withoutItems = stripPlaidBatches(existing, itemIds)
  let next = withoutItems
  for (const batch of batches) {
    next = mergePositionsImportBatches(next, [batch], { replaceDuplicateHashes: true })
  }
  saveStoredPositionsImport(next!)
  return next!.balances
}

export function recomputeStoredImportBalances() {
  const stored = loadStoredPositionsImport()
  if (!stored?.batches?.length) return null
  const balances = computeBalancesFromBatches(stored.batches)
  saveStoredPositionsImport({ ...stored, balances, savedAt: new Date().toISOString() })
  return balances
}
