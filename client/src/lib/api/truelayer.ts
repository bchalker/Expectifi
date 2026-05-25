import { apiFetchJson } from '../api'
import type { PlaidHoldingsSnapshot } from '../plaidImportApply'

export type TrueLayerStatus = {
  ok: true
  configured: boolean
  available: boolean
  connected: boolean
  institutionName: string | null
}

export type TrueLayerAccountSummary = {
  id: string
  displayName: string
  accountType: string | null
  currency: string | null
  currentBalance: number
  availableBalance: number
  providerId: string | null
}

export type TrueLayerConnectionSummary = {
  id: string
  institutionName: string
  providerId: string | null
  lastSyncedAt: string
  createdAt: string
}

export type TrueLayerAccountsResponse = {
  ok: true
  connected: boolean
  connection: TrueLayerConnectionSummary | null
  accounts: TrueLayerAccountSummary[]
  snapshot: PlaidHoldingsSnapshot | null
  fetchFailed?: boolean
  warning?: string
}

export async function fetchTrueLayerStatus(): Promise<TrueLayerStatus> {
  return apiFetchJson<TrueLayerStatus>('/api/truelayer/status')
}

/** Full-page redirect — server sets OAuth cookies and sends user to TrueLayer. */
export function startTrueLayerAuth(region?: string): void {
  const params = new URLSearchParams()
  params.set('origin', window.location.origin)
  if (region?.trim()) params.set('region', region.trim())
  window.location.assign(`/api/truelayer/auth?${params.toString()}`)
}

export async function fetchTrueLayerAccounts(): Promise<TrueLayerAccountsResponse> {
  return apiFetchJson<TrueLayerAccountsResponse>('/api/truelayer/accounts')
}

export async function disconnectTrueLayer(): Promise<{ ok: true }> {
  return apiFetchJson<{ ok: true }>('/api/truelayer/disconnect', { method: 'POST' })
}
