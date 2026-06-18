import type { ImportIntent, RemovedHoldingAction } from './csvImportDiff'
import { importPositionKey } from './csvImportDiff'
import { isPendingActivityImportRow } from './positionsCsv'
import {
  computeBalancesFromBatches,
  mergePositionsImportBatches,
  type PositionsImportBatch,
  type StoredPositionsImportV2,
} from './positionsImportStorage'
import type { PositionsCsvCustodian } from './positionsCsvImport'

export type ApplyImportOptions = {
  intent: ImportIntent
  replaceDuplicateHashes: boolean
  /** Per removed holding key — only used when intent is `update`. Defaults to keep all. */
  removedActions?: Record<string, RemovedHoldingAction>
}

function batchCustodian(b: PositionsImportBatch): PositionsCsvCustodian {
  return b.custodian ?? 'fidelity'
}

function applyUpdateIntent(
  existing: StoredPositionsImportV2 | null,
  incoming: PositionsImportBatch[],
  removedActions: Record<string, RemovedHoldingAction>,
): StoredPositionsImportV2 {
  if (!incoming.length) {
    throw new Error('Could not build import from the current review state.')
  }

  const inc = incoming[0]!
  const custodian = batchCustodian(inc)
  const incomingKeys = new Set<string>()
  for (const r of inc.rows) {
    if (isPendingActivityImportRow(r)) continue
    incomingKeys.add(importPositionKey(r))
  }

  const otherBatches = (existing?.batches ?? []).filter((b) => batchCustodian(b) !== custodian)

  const keptFromPrior: typeof inc.rows = []
  for (const b of existing?.batches ?? []) {
    if (batchCustodian(b) !== custodian) continue
    for (const r of b.rows) {
      if (isPendingActivityImportRow(r)) continue
      const key = importPositionKey(r)
      if (incomingKeys.has(key)) continue
      if (removedActions[key] === 'remove') continue
      keptFromPrior.push(r)
    }
  }

  const mergedHoldings = [
    ...inc.rows.filter((r) => !isPendingActivityImportRow(r)),
    ...keptFromPrior,
  ]
  const pendingAdjustments = inc.rows.filter((r) => isPendingActivityImportRow(r))

  const updatedBatch: PositionsImportBatch = {
    ...inc,
    rows: [...mergedHoldings, ...pendingAdjustments],
  }

  const batches = [...otherBatches, updatedBatch]
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    batches,
    balances: computeBalancesFromBatches(batches),
  }
}

function applyReplaceIntent(incoming: PositionsImportBatch[]): StoredPositionsImportV2 {
  const batches = incoming.map((b) => ({
    contentHash: b.contentHash,
    fileName: b.fileName,
    importedAt: b.importedAt,
    rows: b.rows,
    custodian: b.custodian,
    plaidItemId: b.plaidItemId,
  }))
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    batches,
    balances: computeBalancesFromBatches(batches),
  }
}

/**
 * Apply an import using the selected intent.
 * - `add`: append batches (existing merge behavior; no cross-brokerage dedup).
 * - `replace`: discard all prior batches and use incoming only.
 * - `update`: replace same-custodian batches; merge incoming with kept removed rows.
 */
export function applyImportWithIntent(
  existing: StoredPositionsImportV2 | null,
  incoming: PositionsImportBatch[],
  opts: ApplyImportOptions,
): StoredPositionsImportV2 {
  if (!incoming.length) {
    throw new Error('Could not build import from the current review state.')
  }

  switch (opts.intent) {
    case 'replace':
      return applyReplaceIntent(incoming)
    case 'add':
      return mergePositionsImportBatches(existing, incoming, {
        replaceDuplicateHashes: opts.replaceDuplicateHashes,
      })
    case 'update':
      return applyUpdateIntent(existing, incoming, opts.removedActions ?? {})
    default:
      return mergePositionsImportBatches(existing, incoming, {
        replaceDuplicateHashes: opts.replaceDuplicateHashes,
      })
  }
}
