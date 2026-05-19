import type { FidelityPositionRow } from './fidelityCsv'
import { totalsFromPositionRows, totalsToCalculatorBases } from './fidelityCsv'
import {
  loadStoredFidelityImport,
  mergeFidelityBatches,
  saveStoredFidelityImport,
  type StoredFidelityImportV2,
} from './fidelityStorage'

export type PlaidHoldingsSnapshot = {
  itemId: string
  institutionName: string
  rows: FidelityPositionRow[]
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
  return {
    contentHash: `plaid-${snapshot.itemId}`,
    fileName: `${snapshot.institutionName} (Plaid)`,
    importedAt: now,
    rows: snapshot.rows,
    custodian: 'other' as const,
    plaidItemId: snapshot.itemId,
  }
}

function stripPlaidBatches(
  stored: StoredFidelityImportV2 | null,
  itemIds: string[],
): StoredFidelityImportV2 | null {
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
  const existing = loadStoredFidelityImport()
  const next = stripPlaidBatches(existing, [itemId])
  if (next && next !== existing) saveStoredFidelityImport(next)
  return next?.balances ?? null
}

/** Merge Plaid holdings into local import storage and return calculator balance totals. */
export function applyPlaidHoldingsSnapshot(snapshot: PlaidHoldingsSnapshot) {
  const batch = snapshotToBatch(snapshot)
  const existing = loadStoredFidelityImport()
  const withoutItem = stripPlaidBatches(existing, [snapshot.itemId])
  const next = mergeFidelityBatches(withoutItem, [batch], { replaceDuplicateHashes: true })
  saveStoredFidelityImport(next)
  return next.balances
}

/** Replace all Plaid batches and merge rows from multiple item snapshots. */
export function applyPlaidHoldingsSnapshots(snapshots: PlaidHoldingsSnapshot[]) {
  if (snapshots.length === 0) return null
  const itemIds = snapshots.map((s) => s.itemId)
  const batches = snapshots.map(snapshotToBatch)
  const existing = loadStoredFidelityImport()
  const withoutItems = stripPlaidBatches(existing, itemIds)
  let next = withoutItems
  for (const batch of batches) {
    next = mergeFidelityBatches(next, [batch], { replaceDuplicateHashes: true })
  }
  saveStoredFidelityImport(next!)
  return next!.balances
}
