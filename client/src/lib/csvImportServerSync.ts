import { fetchUserCsvImport, saveUserCsvImport } from './api/csvImport'
import { getPlanWriteTier } from './planStorage/writeContext'
import { tierCanPersistCsvHoldings } from './planStorage/resolveTier'
import {
  readLocalStoragePositionsImport,
  writeLocalStoragePositionsImport,
  type StoredPositionsImportV2,
} from './positionsImportStorage'

let syncTimer: ReturnType<typeof setTimeout> | null = null
let hydrateInFlight: Promise<boolean> | null = null

function canSyncCsvToServer(): boolean {
  return tierCanPersistCsvHoldings(getPlanWriteTier())
}

/** Debounced push after local save (pro subscribers only). */
export function queueCsvImportServerSync(payload: StoredPositionsImportV2): void {
  if (!canSyncCsvToServer()) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = null
    void saveUserCsvImport(payload).catch(() => {
      /* offline / transient — local copy remains */
    })
  }, 800)
}

/**
 * Load CSV import from server for pro users. Server wins when present; otherwise
 * uploads existing local copy (device migration).
 */
export async function hydrateCsvImportFromServer(): Promise<boolean> {
  if (!canSyncCsvToServer()) return false
  if (hydrateInFlight) return hydrateInFlight
  hydrateInFlight = (async () => {
    try {
      const remote = await fetchUserCsvImport()
      if (remote?.batches?.length) {
        writeLocalStoragePositionsImport(remote)
        return true
      }
      const local = readLocalStoragePositionsImport()
      if (local?.batches?.length) {
        await saveUserCsvImport(local)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      hydrateInFlight = null
    }
  })()
  return hydrateInFlight
}
