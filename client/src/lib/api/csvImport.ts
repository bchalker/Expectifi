import { apiFetchJson } from '../api'
import type { StoredPositionsImportV2 } from '../positionsImportStorage'

type CsvImportGetResponse = {
  ok: true
  import: StoredPositionsImportV2 | null
  updatedAt?: string
}

export async function fetchUserCsvImport(): Promise<StoredPositionsImportV2 | null> {
  const data = await apiFetchJson<CsvImportGetResponse>('/api/user/csv-import')
  if (!data.import || data.import.version !== 2) return null
  return data.import
}

export async function saveUserCsvImport(payload: StoredPositionsImportV2): Promise<void> {
  await apiFetchJson<{ ok: true }>('/api/user/csv-import', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteUserCsvImport(): Promise<void> {
  await apiFetchJson<{ ok: true }>('/api/user/csv-import', { method: 'DELETE' })
}
