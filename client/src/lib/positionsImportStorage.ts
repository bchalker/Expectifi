import type { CalculatorInputs } from './computeResults'
import type { ImportedPositionRow } from './positionsCsv'
import { isPendingActivityImportRow, normalizeImportSymbol, totalsFromPositionRows, totalsToCalculatorBases } from './positionsCsv'
import type { PositionsCsvCustodian } from './positionsCsvImport'
import { enrichBatchRows, enrichImportBatches } from './brokerMonogram'
import { clearBalanceInputModeStorage } from './retirementBalanceMode'
import { stripCsvDerivedFromCalculatorInputs } from './calculatorInputSanitize'
import { tierCanPersistCsvHoldings } from './planStorage/resolveTier'
import type { UserTier } from './planStorage/types'
import { getPlanWriteTier } from './planStorage/writeContext'
import { clearCsvSession, loadCsvSession, saveCsvSession } from './planStorage/csvSession'
import { setSessionHasCsvHoldings } from './sessionFlags'

export const FIDELITY_IMPORT_STORAGE_KEY = 'retirement-calculator/fidelity-import-v1'

const LEGACY_V1_BATCH_HASH = '__migrated-from-v1__'

/** One imported CSV file (positions + stable content hash). */
export type PositionsImportBatch = {
  contentHash: string
  fileName: string
  importedAt: string
  rows: ImportedPositionRow[]
  /** Source custodian for this file (defaults to fidelity for legacy batches). */
  custodian?: PositionsCsvCustodian
  /** When synced from Plaid, ties this batch to a Plaid Item for replacement on re-sync. */
  plaidItemId?: string
}

export type StoredPositionsImportV1 = {
  version: 1
  savedAt: string
  balances: {
    base401k: number
    baseSE401k: number
    baseRoth: number
    baseHsa: number
    brkBal: number
  }
  positions: ImportedPositionRow[]
}

export type StoredPositionsImportV2 = {
  version: 2
  savedAt: string
  /** Each prior import; merged balances = sum of all rows across batches. */
  batches: PositionsImportBatch[]
  balances: {
    base401k: number
    baseSE401k: number
    baseRoth: number
    baseHsa: number
    brkBal: number
  }
}

export type StoredPositionsImport = StoredPositionsImportV2

function shouldPersistCsvToLocalStorage(): boolean {
  return tierCanPersistCsvHoldings(getPlanWriteTier())
}

function readLocalStoragePositionsImport(): StoredPositionsImportV2 | null {
  try {
    const raw = localStorage.getItem(FIDELITY_IMPORT_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as StoredPositionsImportV1 | StoredPositionsImportV2
    if (o?.version === 2 && Array.isArray((o as StoredPositionsImportV2).batches)) {
      const v2 = o as StoredPositionsImportV2
      if (!v2.balances) return null
      return {
        ...v2,
        batches: enrichImportBatches(v2.batches),
      }
    }
    if (
      o?.version === 1 &&
      (o as StoredPositionsImportV1).balances &&
      Array.isArray((o as StoredPositionsImportV1).positions)
    ) {
      return migrateV1ToV2(o as StoredPositionsImportV1)
    }
    return null
  } catch {
    return null
  }
}

function writeLocalStoragePositionsImport(data: StoredPositionsImportV2): void {
  const batches = enrichImportBatches(data.batches)
  const payload: StoredPositionsImportV2 = {
    version: 2,
    savedAt: data.savedAt,
    batches,
    balances: data.balances,
  }
  localStorage.setItem(FIDELITY_IMPORT_STORAGE_KEY, JSON.stringify(payload))
  setSessionHasCsvHoldings((payload.batches?.length ?? 0) > 0)
}

/** Promote tab-session CSV into localStorage when the user can persist holdings. */
function migrateCsvSessionToLocalStorageIfNeeded(): void {
  const session = loadCsvSession()
  if (!session?.batches?.length) return
  const local = readLocalStoragePositionsImport()
  if (local?.batches?.length) return
  writeLocalStoragePositionsImport(session)
}

/**
 * Boot: anonymous guests get ephemeral CSV only; signed-in / browser-save tiers keep
 * localStorage holdings and migrate any in-tab session import before clearing session.
 */
export function clearNonProCsvHoldingsOnBoot(tier: UserTier = getPlanWriteTier()): void {
  if (tierCanPersistCsvHoldings(tier)) {
    migrateCsvSessionToLocalStorageIfNeeded()
    clearCsvSession()
    return
  }
  clearCsvSession()
  try {
    localStorage.removeItem(FIDELITY_IMPORT_STORAGE_KEY)
  } catch {
    /* private mode / quota */
  }
  clearBalanceInputModeStorage()
}

export function shouldStripCsvFromPersistedCalculatorSession(): boolean {
  return !shouldPersistCsvToLocalStorage()
}

export function inputsForPersistedCalculatorSession(inputs: CalculatorInputs): CalculatorInputs {
  if (!shouldStripCsvFromPersistedCalculatorSession()) return inputs
  return stripCsvDerivedFromCalculatorInputs(inputs)
}

/** Stable hash of raw CSV text for duplicate detection (SHA-256, or djb2 fallback). */
export async function hashCsvText(text: string): Promise<string> {
  const norm = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm))
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {
    /* fall through */
  }
  let h = 5381
  for (let i = 0; i < norm.length; i++) h = Math.imul(h, 33) ^ norm.charCodeAt(i)
  return `djb2-${(h >>> 0).toString(16)}`
}

export function flattenBatches(batches: PositionsImportBatch[]): ImportedPositionRow[] {
  const out: ImportedPositionRow[] = []
  for (const b of batches) {
    for (const r of b.rows) {
      const row = {
        ...r,
        costBasis: r.costBasis ?? null,
        symbol: normalizeImportSymbol(r.symbol),
      }
      if (isPendingActivityImportRow(row)) continue
      out.push(row)
    }
  }
  return out
}

export function computeBalancesFromBatches(batches: PositionsImportBatch[]) {
  return totalsToCalculatorBases(totalsFromPositionRows(flattenBatches(batches)))
}

function migrateV1ToV2(o: StoredPositionsImportV1): StoredPositionsImportV2 {
  const rows = (o.positions ?? []).map((r) => ({
    ...r,
    costBasis: (r as ImportedPositionRow).costBasis ?? null,
    dailyChangeDollar: (r as ImportedPositionRow).dailyChangeDollar ?? null,
    dailyChangePercent: (r as ImportedPositionRow).dailyChangePercent ?? null,
  }))
  const batches: PositionsImportBatch[] = [
    {
      contentHash: LEGACY_V1_BATCH_HASH,
      fileName: 'Previous import',
      importedAt: o.savedAt,
      rows,
      custodian: 'fidelity',
    },
  ]
  return {
    version: 2,
    savedAt: o.savedAt,
    batches,
    balances: computeBalancesFromBatches(batches),
  }
}

export function loadStoredPositionsImport(): StoredPositionsImportV2 | null {
  if (!shouldPersistCsvToLocalStorage()) {
    return loadCsvSession()
  }
  const stored = readLocalStoragePositionsImport()
  if (stored) return stored
  return loadCsvSession()
}

export function clearStoredPositionsImport(): void {
  if (!shouldPersistCsvToLocalStorage()) {
    clearCsvSession()
    return
  }
  try {
    localStorage.removeItem(FIDELITY_IMPORT_STORAGE_KEY)
  } catch {
    /* private mode / quota */
  }
}

export function saveStoredPositionsImport(data: StoredPositionsImportV2) {
  const batches = enrichImportBatches(data.batches)
  const payload: StoredPositionsImportV2 = {
    version: 2,
    savedAt: data.savedAt,
    batches,
    balances: data.balances,
  }
  if (!shouldPersistCsvToLocalStorage()) {
    saveCsvSession(payload)
    return
  }
  localStorage.setItem(FIDELITY_IMPORT_STORAGE_KEY, JSON.stringify(payload))
  setSessionHasCsvHoldings((payload.batches?.length ?? 0) > 0)
}

/**
 * Merge new batch(es) into stored imports.
 * When `replaceDuplicateHashes` is true, existing batches with the same contentHash are removed before appending the incoming batch for that hash.
 */
export function mergePositionsImportBatches(
  existing: StoredPositionsImportV2 | null,
  incoming: PositionsImportBatch[],
  opts: { replaceDuplicateHashes: boolean },
): StoredPositionsImportV2 {
  let batches = [...(existing?.batches ?? [])]

  for (const inc of incoming) {
    const already = batches.some((b) => b.contentHash === inc.contentHash)
    if (already && !opts.replaceDuplicateHashes) continue
    if (already && opts.replaceDuplicateHashes) {
      batches = batches.filter((b) => b.contentHash !== inc.contentHash)
    }
    batches.push(enrichBatchRows({
      contentHash: inc.contentHash,
      fileName: inc.fileName,
      importedAt: inc.importedAt,
      rows: inc.rows,
      custodian: inc.custodian,
      plaidItemId: inc.plaidItemId,
    }))
  }

  const balances = computeBalancesFromBatches(batches)
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    batches,
    balances,
  }
}

/** True if this content hash is already saved from a prior import. */
export function isHashAlreadyImported(contentHash: string, existing: StoredPositionsImportV2 | null): boolean {
  if (!existing?.batches.length) return false
  return existing.batches.some((b) => b.contentHash === contentHash)
}

/** Custodian on the most recently appended batch (import order). */
export function latestBatchCustodian(batches: PositionsImportBatch[]): PositionsCsvCustodian {
  const b = batches[batches.length - 1]
  return b?.custodian ?? 'fidelity'
}
