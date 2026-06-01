import type { ImportIntent, RemovedHoldingAction } from './csvImportDiff'
import { importPositionKey } from './csvImportDiff'
import { isFidelityPendingActivityRow } from './fidelityCsv'
import {
  computeBalancesFromBatches,
  mergeFidelityBatches,
  type FidelityImportBatch,
  type StoredFidelityImportV2,
} from './fidelityStorage'
import type { PositionsCsvCustodian } from './positionsCsvImport'

export type ApplyImportOptions = {
  intent: ImportIntent
  replaceDuplicateHashes: boolean
  /** Per removed holding key — only used when intent is `update`. Defaults to keep all. */
  removedActions?: Record<string, RemovedHoldingAction>
}

function batchCustodian(b: FidelityImportBatch): PositionsCsvCustodian {
  return b.custodian ?? 'fidelity'
}

function applyUpdateIntent(
  existing: StoredFidelityImportV2 | null,
  incoming: FidelityImportBatch[],
  removedActions: Record<string, RemovedHoldingAction>,
): StoredFidelityImportV2 {
  if (!incoming.length) {
    throw new Error('Could not build import from the current review state.')
  }

  const inc = incoming[0]!
  const custodian = batchCustodian(inc)
  const incomingKeys = new Set<string>()
  for (const r of inc.rows) {
    if (isFidelityPendingActivityRow(r)) continue
    incomingKeys.add(importPositionKey(r))
  }

  const otherBatches = (existing?.batches ?? []).filter((b) => batchCustodian(b) !== custodian)

  const keptFromPrior: typeof inc.rows = []
  for (const b of existing?.batches ?? []) {
    if (batchCustodian(b) !== custodian) continue
    for (const r of b.rows) {
      if (isFidelityPendingActivityRow(r)) continue
      const key = importPositionKey(r)
      if (incomingKeys.has(key)) continue
      if (removedActions[key] === 'remove') continue
      keptFromPrior.push(r)
    }
  }

  const mergedRows = [...inc.rows.filter((r) => !isFidelityPendingActivityRow(r)), ...keptFromPrior]

  const updatedBatch: FidelityImportBatch = {
    ...inc,
    rows: mergedRows,
  }

  const batches = [...otherBatches, updatedBatch]
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    batches,
    balances: computeBalancesFromBatches(batches),
  }
}

function applyReplaceIntent(incoming: FidelityImportBatch[]): StoredFidelityImportV2 {
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
  existing: StoredFidelityImportV2 | null,
  incoming: FidelityImportBatch[],
  opts: ApplyImportOptions,
): StoredFidelityImportV2 {
  if (!incoming.length) {
    throw new Error('Could not build import from the current review state.')
  }

  switch (opts.intent) {
    case 'replace':
      return applyReplaceIntent(incoming)
    case 'add':
      return mergeFidelityBatches(existing, incoming, {
        replaceDuplicateHashes: opts.replaceDuplicateHashes,
      })
    case 'update':
      return applyUpdateIntent(existing, incoming, opts.removedActions ?? {})
    default:
      return mergeFidelityBatches(existing, incoming, {
        replaceDuplicateHashes: opts.replaceDuplicateHashes,
      })
  }
}
