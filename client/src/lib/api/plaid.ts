import { apiFetchJson } from '../api'
import type { PlaidHoldingsSnapshot } from '../plaidImportApply'

export type PlaidStatus = {
  ok: true
  configured: boolean
  available: boolean
  connected: boolean
  institutions: string[]
}

export type PlaidItemSummary = {
  id: string
  institutionId: string | null
  institutionName: string
  logoUrl: string | null
  status: 'healthy' | 'error'
  errorCode: string | null
  lastSyncedAt: string
  createdAt: string
}

export type PlaidItemsResponse = {
  ok: true
  items: PlaidItemSummary[]
}

export type PlaidLinkTokenResponse = {
  ok: true
  linkToken: string
  expiration: string
}

export type PlaidExchangeResponse = {
  ok: true
  snapshot: PlaidHoldingsSnapshot
}

export type PlaidSyncResponse = {
  ok: true
  snapshot: PlaidHoldingsSnapshot
  itemSnapshots: PlaidHoldingsSnapshot[]
}

export type PlaidResolveInstitutionResponse = {
  ok: true
  action: 'connect' | 'already_connected' | 'update'
  itemId?: string
  institutionName?: string
}

export async function fetchPlaidStatus(): Promise<PlaidStatus> {
  return apiFetchJson<PlaidStatus>('/api/plaid/status')
}

export async function fetchPlaidItems(): Promise<PlaidItemsResponse> {
  return apiFetchJson<PlaidItemsResponse>('/api/plaid/items')
}

export async function createPlaidLinkToken(body?: { itemId?: string }): Promise<PlaidLinkTokenResponse> {
  return apiFetchJson<PlaidLinkTokenResponse>('/api/plaid/link-token', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  })
}

export async function exchangePlaidPublicToken(body: {
  publicToken: string
  institutionId?: string | null
  institutionName?: string | null
}): Promise<PlaidExchangeResponse> {
  return apiFetchJson<PlaidExchangeResponse>('/api/plaid/exchange-token', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function syncPlaidHoldings(): Promise<PlaidSyncResponse> {
  return apiFetchJson<PlaidSyncResponse>('/api/plaid/sync', { method: 'POST' })
}

export async function deletePlaidItem(itemId: string): Promise<{ ok: true }> {
  return apiFetchJson<{ ok: true }>(`/api/plaid/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  })
}

export async function resolvePlaidInstitution(institutionId: string): Promise<PlaidResolveInstitutionResponse> {
  return apiFetchJson<PlaidResolveInstitutionResponse>('/api/plaid/resolve-institution', {
    method: 'POST',
    body: JSON.stringify({ institutionId }),
  })
}
