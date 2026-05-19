import { apiFetchJson } from '../api'
import type { PlaidHoldingsSnapshot } from '../plaidImportApply'

export type PlaidStatus = {
  ok: true
  configured: boolean
  connected: boolean
  institutions: string[]
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

export async function fetchPlaidStatus(): Promise<PlaidStatus> {
  return apiFetchJson<PlaidStatus>('/api/plaid/status')
}

export async function createPlaidLinkToken(): Promise<PlaidLinkTokenResponse> {
  return apiFetchJson<PlaidLinkTokenResponse>('/api/plaid/link-token', { method: 'POST' })
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
