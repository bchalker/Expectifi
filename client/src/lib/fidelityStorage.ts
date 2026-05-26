import type { FidelityPositionRow } from './fidelityCsv'
import { isFidelityPendingActivityRow, normalizeFidelityImportSymbol, totalsFromPositionRows, totalsToCalculatorBases } from './fidelityCsv'
import type { PositionsCsvCustodian } from './positionsCsvImport'
import { getPlanWriteTier } from './planStorage/writeContext'
import { clearCsvSession, loadCsvSession, saveCsvSession } from './planStorage/csvSession'

export const FIDELITY_IMPORT_STORAGE_KEY = 'retirement-calculator/fidelity-import-v1'

const LEGACY_V1_BATCH_HASH = '__migrated-from-v1__'

/** One imported CSV file (positions + stable content hash). */
export type FidelityImportBatch = {
  contentHash: string
  fileName: string
  importedAt: string
  rows: FidelityPositionRow[]
  /** Source custodian for this file (defaults to fidelity for legacy batches). */
  custodian?: PositionsCsvCustodian
  /** When synced from Plaid, ties this batch to a Plaid Item for replacement on re-sync. */
  plaidItemId?: string
}

export type StoredFidelityImportV1 = {
  version: 1
  savedAt: string
  balances: {
    base401k: number
    baseSE401k: number
    baseRoth: number
    baseHsa: number
    brkBal: number
  }
  positions: FidelityPositionRow[]
}

export type StoredFidelityImportV2 = {
  version: 2
  savedAt: string
  /** Each prior import; merged balances = sum of all rows across batches. */
  batches: FidelityImportBatch[]
  balances: {
    base401k: number
    baseSE401k: number
    baseRoth: number
    baseHsa: number
    brkBal: number
  }
}

export type StoredFidelityImport = StoredFidelityImportV2

function shouldPersistCsvToLocalStorage(): boolean {
  // Phase C: non-pro users are session-only; pro users keep existing behavior.
  return getPlanWriteTier() === 'pro'
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

export function flattenBatches(batches: FidelityImportBatch[]): FidelityPositionRow[] {
  const out: FidelityPositionRow[] = []
  for (const b of batches) {
    for (const r of b.rows) {
      const row = {
        ...r,
        costBasis: r.costBasis ?? null,
        symbol: normalizeFidelityImportSymbol(r.symbol),
      }
      if (isFidelityPendingActivityRow(row)) continue
      out.push(row)
    }
  }
  return out
}

export function computeBalancesFromBatches(batches: FidelityImportBatch[]) {
  return totalsToCalculatorBases(totalsFromPositionRows(flattenBatches(batches)))
}

function migrateV1ToV2(o: StoredFidelityImportV1): StoredFidelityImportV2 {
  const rows = (o.positions ?? []).map((r) => ({
    ...r,
    costBasis: (r as FidelityPositionRow).costBasis ?? null,
    dailyChangeDollar: (r as FidelityPositionRow).dailyChangeDollar ?? null,
    dailyChangePercent: (r as FidelityPositionRow).dailyChangePercent ?? null,
  }))
  const batches: FidelityImportBatch[] = [
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

export function loadStoredFidelityImport(): StoredFidelityImportV2 | null {
  if (!shouldPersistCsvToLocalStorage()) {
    return loadCsvSession()
  }
  try {
    const raw = localStorage.getItem(FIDELITY_IMPORT_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as StoredFidelityImportV1 | StoredFidelityImportV2
    if (o?.version === 2 && Array.isArray((o as StoredFidelityImportV2).batches)) {
      const v2 = o as StoredFidelityImportV2
      if (!v2.balances) return null
      return v2
    }
    if (o?.version === 1 && (o as StoredFidelityImportV1).balances && Array.isArray((o as StoredFidelityImportV1).positions)) {
      const v2 = migrateV1ToV2(o as StoredFidelityImportV1)
      try {
        if (shouldPersistCsvToLocalStorage()) saveStoredFidelityImport(v2)
        else saveCsvSession(v2)
      } catch {
        /* quota or private mode — still return migrated shape in memory */
      }
      return v2
    }
    return null
  } catch {
    return null
  }
}

export function clearStoredFidelityImport(): void {
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

export function saveStoredFidelityImport(data: StoredFidelityImportV2) {
  const payload: StoredFidelityImportV2 = {
    version: 2,
    savedAt: data.savedAt,
    batches: data.batches,
    balances: data.balances,
  }
  if (!shouldPersistCsvToLocalStorage()) {
    saveCsvSession(payload)
    return
  }
  localStorage.setItem(FIDELITY_IMPORT_STORAGE_KEY, JSON.stringify(payload))
}

/**
 * Merge new batch(es) into stored imports.
 * When `replaceDuplicateHashes` is true, existing batches with the same contentHash are removed before appending the incoming batch for that hash.
 */
export function mergeFidelityBatches(
  existing: StoredFidelityImportV2 | null,
  incoming: FidelityImportBatch[],
  opts: { replaceDuplicateHashes: boolean },
): StoredFidelityImportV2 {
  let batches = [...(existing?.batches ?? [])]

  for (const inc of incoming) {
    const already = batches.some((b) => b.contentHash === inc.contentHash)
    if (already && !opts.replaceDuplicateHashes) continue
    if (already && opts.replaceDuplicateHashes) {
      batches = batches.filter((b) => b.contentHash !== inc.contentHash)
    }
    batches.push({
      contentHash: inc.contentHash,
      fileName: inc.fileName,
      importedAt: inc.importedAt,
      rows: inc.rows,
      custodian: inc.custodian,
      plaidItemId: inc.plaidItemId,
    })
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
export function isHashAlreadyImported(contentHash: string, existing: StoredFidelityImportV2 | null): boolean {
  if (!existing?.batches.length) return false
  return existing.batches.some((b) => b.contentHash === contentHash)
}

/** Custodian on the most recently appended batch (import order). */
export function latestBatchCustodian(batches: FidelityImportBatch[]): PositionsCsvCustodian {
  const b = batches[batches.length - 1]
  return b?.custodian ?? 'fidelity'
}
