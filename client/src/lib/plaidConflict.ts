import type { FidelityPositionRow } from './fidelityCsv'
import { mapRowToBucket, totalsFromPositionRows, totalsToCalculatorBases } from './fidelityCsv'
import { custodianToBrokerSource, enrichBatchRows, resolveBrokerSource, stampRowsWithBrokerSource } from './brokerMonogram'
import type { PlaidHoldingsSnapshot } from './plaidImportApply'
import type { FidelityImportBatch, StoredFidelityImportV2 } from './fidelityStorage'
import {
  computeBalancesFromBatches,
  loadStoredFidelityImport,
  mergeFidelityBatches,
  saveStoredFidelityImport,
} from './fidelityStorage'
import type { KnownBrokerSource } from './plaidInstitutionBroker'
import { brokerDisplayLabel, institutionToBrokerSource } from './plaidInstitutionBroker'
import type { ManualAccountEntry } from './manualAccountEntries'
import { ACCOUNT_TYPE_AGGREGATE_BUCKET } from './onboardingAccountTypesByLocale'
import { loadStoredManualAccounts } from './manualAccountEntries'

export type PlaidConflictResolution = 'use_plaid' | 'keep_both' | 'skip_plaid'

export type PlaidBrokerConflict = {
  broker: KnownBrokerSource
  brokerLabel: string
  existingBatchCount: number
  existingRowCount: number
}

export type PlaidManualOverlapLine = {
  id: string
  label: string
  balance: number
  bucketKey: 'pretax' | 'roth' | 'hsa' | 'brokerage'
}

export type PlaidManualOverlapBucket = {
  bucketKey: 'pretax' | 'roth' | 'hsa' | 'brokerage'
  bucketLabel: string
  manualLines: PlaidManualOverlapLine[]
  plaidTotal: number
}

function batchBrokerSource(batch: FidelityImportBatch): KnownBrokerSource | null {
  if (batch.plaidItemId) return null
  const custodian = batch.custodian ?? 'fidelity'
  if (custodian === 'other') {
    const first = batch.rows[0]
    const src = first ? resolveBrokerSource(first) : null
    if (src && src !== 'plaid' && src !== 'manual' && src !== 'other') return src
    return null
  }
  return custodianToBrokerSource(custodian) as KnownBrokerSource
}

function stripCsvBatchesForBroker(
  stored: StoredFidelityImportV2 | null,
  broker: KnownBrokerSource,
): StoredFidelityImportV2 | null {
  if (!stored?.batches?.length) return stored
  const batches = stored.batches.filter((b) => {
    if (b.plaidItemId) return true
    return batchBrokerSource(b) !== broker
  })
  if (batches.length === stored.batches.length) return stored
  return {
    ...stored,
    savedAt: new Date().toISOString(),
    batches,
    balances: computeBalancesFromBatches(batches),
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

function symbolBucketKey(row: FidelityPositionRow): string {
  const bucket = mapRowToBucket(row)
  const sym = (row.symbol || '').trim().toUpperCase()
  return `${bucket}:${sym}`
}

function markKeepBothDuplicates(
  stored: StoredFidelityImportV2,
  broker: KnownBrokerSource,
  plaidRows: FidelityPositionRow[],
): StoredFidelityImportV2 {
  const csvKeys = new Set<string>()
  for (const batch of stored.batches) {
    if (batch.plaidItemId) continue
    if (batchBrokerSource(batch) !== broker) continue
    for (const row of batch.rows) csvKeys.add(symbolBucketKey(row))
  }
  const plaidKeys = new Set(plaidRows.map(symbolBucketKey))
  const overlap = [...csvKeys].filter((k) => plaidKeys.has(k))

  const batches = stored.batches.map((batch) => {
    const isPlaid = Boolean(batch.plaidItemId)
    const isCsvBroker = batchBrokerSource(batch) === broker
    if (!isPlaid && !isCsvBroker) return batch
    const rows = batch.rows.map((row) => {
      const key = symbolBucketKey(row)
      const warn = overlap.includes(key)
      if (Boolean(row.plaidOverlapWarning) === warn) return row
      return { ...row, plaidOverlapWarning: warn }
    })
    return { ...batch, rows }
  })

  return { ...stored, batches }
}

export function detectPlaidBrokerConflict(
  institutionId: string | null | undefined,
  institutionName: string | null | undefined,
  stored: StoredFidelityImportV2 | null = loadStoredFidelityImport(),
): PlaidBrokerConflict | null {
  const broker = institutionToBrokerSource(institutionId, institutionName)
  if (!broker) return null

  const csvBatches = (stored?.batches ?? []).filter((b) => !b.plaidItemId && batchBrokerSource(b) === broker)
  if (!csvBatches.length) return null

  const existingRowCount = csvBatches.reduce((n, b) => n + b.rows.length, 0)
  return {
    broker,
    brokerLabel: brokerDisplayLabel(broker),
    existingBatchCount: csvBatches.length,
    existingRowCount,
  }
}

export function applyPlaidHoldingsWithResolution(
  snapshot: PlaidHoldingsSnapshot,
  resolution: PlaidConflictResolution,
  conflictBroker?: KnownBrokerSource,
): StoredFidelityImportV2['balances'] | null {
  if (resolution === 'skip_plaid') return null

  const batch = snapshotToBatch(snapshot)
  let existing = loadStoredFidelityImport()

  if (resolution === 'use_plaid' && conflictBroker) {
    existing = stripCsvBatchesForBroker(existing, conflictBroker)
  }

  const withoutItem = stripPlaidBatches(existing, [snapshot.itemId])
  let next = mergeFidelityBatches(withoutItem, [batch], { replaceDuplicateHashes: true })

  if (resolution === 'keep_both' && conflictBroker) {
    next = markKeepBothDuplicates(next!, conflictBroker, snapshot.rows)
  }

  saveStoredFidelityImport(next!)
  return next!.balances
}

/** Default apply when no broker CSV conflict — merge Plaid without removing unrelated CSV batches. */
export function applyPlaidHoldingsSnapshotDefault(snapshot: PlaidHoldingsSnapshot) {
  const batch = snapshotToBatch(snapshot)
  const existing = loadStoredFidelityImport()
  const withoutItem = stripPlaidBatches(existing, [snapshot.itemId])
  const next = mergeFidelityBatches(withoutItem, [batch], { replaceDuplicateHashes: true })
  saveStoredFidelityImport(next!)
  return next!.balances
}

const BUCKET_LABELS: Record<PlaidManualOverlapBucket['bucketKey'], string> = {
  pretax: 'Pre-tax',
  roth: 'Tax-advantaged (Roth)',
  hsa: 'HSA',
  brokerage: 'Brokerage',
}

function plaidTotalsByUiBucket(rows: FidelityPositionRow[]): Record<PlaidManualOverlapBucket['bucketKey'], number> {
  const totals: Record<PlaidManualOverlapBucket['bucketKey'], number> = {
    pretax: 0,
    roth: 0,
    hsa: 0,
    brokerage: 0,
  }
  for (const row of rows) {
    const bucket = mapRowToBucket(row)
    if (bucket === 'trad401k' || bucket === 'se401k') totals.pretax += row.currentValue
    else if (bucket === 'roth') totals.roth += row.currentValue
    else if (bucket === 'hsa') totals.hsa += row.currentValue
    else if (bucket === 'brokerage') totals.brokerage += row.currentValue
  }
  return totals
}

function manualEntryBucket(entry: ManualAccountEntry): PlaidManualOverlapBucket['bucketKey'] | null {
  if (!entry.type || entry.balance <= 0) return null
  const baseKey = ACCOUNT_TYPE_AGGREGATE_BUCKET[entry.type]
  if (!baseKey) return null
  if (baseKey === 'base401k' || baseKey === 'baseSE401k' || baseKey === 'baseTradIRA') return 'pretax'
  if (baseKey === 'baseRoth') return 'roth'
  if (baseKey === 'baseHsa') return 'hsa'
  if (baseKey === 'brkBal') return 'brokerage'
  return null
}

function manualEntryLabel(entry: ManualAccountEntry, labels: Map<string, string>): string {
  if (!entry.type) return 'Manual account'
  return labels.get(entry.type) ?? entry.type
}

/** Manual onboarding entries that overlap Plaid-imported tax buckets. */
export function detectPlaidManualOverlap(
  snapshot: PlaidHoldingsSnapshot,
  entryLabels: Map<string, string>,
): PlaidManualOverlapBucket[] {
  const stored = loadStoredManualAccounts()
  if (!stored?.entries.length) return []

  const plaidTotals = plaidTotalsByUiBucket(snapshot.rows)
  const byBucket = new Map<PlaidManualOverlapBucket['bucketKey'], PlaidManualOverlapLine[]>()

  for (const entry of stored.entries) {
    if (entry.balance <= 0) continue
    const bucketKey = manualEntryBucket(entry)
    if (!bucketKey) continue
    if (plaidTotals[bucketKey] <= 0) continue
    const list = byBucket.get(bucketKey) ?? []
    list.push({
      id: entry.id,
      label: manualEntryLabel(entry, entryLabels),
      balance: entry.balance,
      bucketKey,
    })
    byBucket.set(bucketKey, list)
  }

  const out: PlaidManualOverlapBucket[] = []
  for (const [bucketKey, manualLines] of byBucket) {
    out.push({
      bucketKey,
      bucketLabel: BUCKET_LABELS[bucketKey],
      manualLines,
      plaidTotal: plaidTotals[bucketKey],
    })
  }
  return out
}
