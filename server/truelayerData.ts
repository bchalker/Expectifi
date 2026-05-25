import { randomUUID } from 'node:crypto'
import { dbQuery } from './dbQuery.js'
import {
  decryptAccessToken,
  decryptRefreshToken,
  encryptTokenPair,
  fetchTrueLayerAccountsWithBalances,
  refreshTrueLayerAccessToken,
  type TrueLayerTokenPair,
} from './truelayerClient.js'
import { buildTrueLayerHoldingsSnapshot } from './truelayerHoldings.js'
import type { PlaidHoldingsSnapshot } from './plaidHoldings.js'
import { getTrueLayerConfig, isTrueLayerConfigured } from './truelayerConfig.js'

export type TrueLayerConnectionRow = {
  id: string
  user_id: string
  access_token_enc: string
  refresh_token_enc: string | null
  token_expires_at: string | Date | null
  provider_id: string | null
  institution_name: string | null
  updated_at: string | Date
  created_at: string | Date
}

export type TrueLayerAccountRow = {
  id: string
  user_id: string
  connection_id: string
  display_name: string | null
  account_type: string | null
  currency: string | null
  current_balance: string | number | null
  available_balance: string | number | null
  provider_id: string | null
}

function isoTimestamp(value: string | Date): string {
  if (value instanceof Date) return value.toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function numFromDb(v: string | number | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.round(n) : 0
}

export async function loadTrueLayerConnection(userId: string): Promise<TrueLayerConnectionRow | null> {
  const { rows } = await dbQuery<TrueLayerConnectionRow>(
    `SELECT id, user_id, access_token_enc, refresh_token_enc, token_expires_at,
            provider_id, institution_name, updated_at, created_at
     FROM truelayer_connections WHERE user_id = ? LIMIT 1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function deleteTrueLayerConnectionForUser(userId: string): Promise<void> {
  await dbQuery('DELETE FROM truelayer_connections WHERE user_id = ?', [userId])
}

export async function saveTrueLayerTokensForUser(
  userId: string,
  tokens: TrueLayerTokenPair,
  meta?: { providerId?: string | null; institutionName?: string | null },
): Promise<string> {
  const enc = encryptTokenPair(tokens)
  const existing = await loadTrueLayerConnection(userId)
  const connectionId = existing?.id ?? randomUUID()
  const institutionName = meta?.institutionName?.trim() || existing?.institution_name || 'Connected bank'
  const providerId = meta?.providerId?.trim() || existing?.provider_id || null

  if (existing) {
    await dbQuery(
      `UPDATE truelayer_connections
       SET access_token_enc = ?, refresh_token_enc = ?, token_expires_at = ?,
           provider_id = ?, institution_name = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [
        enc.accessTokenEnc,
        enc.refreshTokenEnc,
        enc.expiresAt,
        providerId,
        institutionName,
        userId,
      ],
    )
  } else {
    await dbQuery(
      `INSERT INTO truelayer_connections
        (id, user_id, access_token_enc, refresh_token_enc, token_expires_at, provider_id, institution_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        connectionId,
        userId,
        enc.accessTokenEnc,
        enc.refreshTokenEnc,
        enc.expiresAt,
        providerId,
        institutionName,
      ],
    )
  }
  return connectionId
}

function tokenNeedsRefresh(row: TrueLayerConnectionRow): boolean {
  if (!row.token_expires_at) return false
  const exp = row.token_expires_at instanceof Date ? row.token_expires_at : new Date(row.token_expires_at)
  if (Number.isNaN(exp.getTime())) return false
  return exp.getTime() <= Date.now() + 60_000
}

export async function resolveTrueLayerAccessToken(
  row: TrueLayerConnectionRow,
): Promise<{ accessToken: string; refreshed: boolean } | { error: string }> {
  const cfg = getTrueLayerConfig()
  if (!cfg) return { error: 'truelayer_not_configured' }

  if (!tokenNeedsRefresh(row)) {
    try {
      return { accessToken: decryptAccessToken(row.access_token_enc), refreshed: false }
    } catch {
      return { error: 'invalid_stored_token' }
    }
  }

  const refreshPlain = decryptRefreshToken(row.refresh_token_enc)
  if (!refreshPlain) {
    try {
      return { accessToken: decryptAccessToken(row.access_token_enc), refreshed: false }
    } catch {
      return { error: 'invalid_stored_token' }
    }
  }

  const refreshed = await refreshTrueLayerAccessToken(refreshPlain, cfg)
  if (!refreshed.ok) {
    try {
      return { accessToken: decryptAccessToken(row.access_token_enc), refreshed: false }
    } catch {
      return { error: refreshed.error }
    }
  }

  await saveTrueLayerTokensForUser(row.user_id, refreshed.tokens, {
    providerId: row.provider_id,
    institutionName: row.institution_name,
  })
  return { accessToken: refreshed.tokens.accessToken, refreshed: true }
}

export async function persistTrueLayerAccounts(
  userId: string,
  connectionId: string,
  accessToken: string,
): Promise<void> {
  const { accounts, balancesByAccountId } = await fetchTrueLayerAccountsWithBalances(accessToken)
  await dbQuery('DELETE FROM truelayer_accounts WHERE user_id = ?', [userId])

  for (const account of accounts) {
    const accountId = account.account_id?.trim()
    if (!accountId) continue
    const balance = balancesByAccountId.get(accountId)
    const current =
      typeof balance?.current === 'number' && Number.isFinite(balance.current)
        ? balance.current
        : null
    const available =
      typeof balance?.available === 'number' && Number.isFinite(balance.available)
        ? balance.available
        : null
    await dbQuery(
      `INSERT INTO truelayer_accounts
        (id, user_id, connection_id, display_name, account_type, currency,
         current_balance, available_balance, provider_id, raw_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        accountId,
        userId,
        connectionId,
        account.display_name?.trim() || null,
        account.account_type?.trim() || null,
        account.currency?.trim() || null,
        current,
        available,
        account.provider_id?.trim() || null,
        JSON.stringify({ account, balance: balance ?? null }),
      ],
    )
  }

  const primaryProvider = accounts.find((a) => a.provider_id)?.provider_id?.trim()
  if (primaryProvider) {
    await dbQuery('UPDATE truelayer_connections SET provider_id = ?, updated_at = NOW() WHERE id = ?', [
      primaryProvider,
      connectionId,
    ])
  }
  await dbQuery('UPDATE truelayer_connections SET updated_at = NOW() WHERE id = ?', [connectionId])
}

export async function loadTrueLayerAccountRows(userId: string): Promise<TrueLayerAccountRow[]> {
  const { rows } = await dbQuery<TrueLayerAccountRow>(
    `SELECT id, user_id, connection_id, display_name, account_type, currency,
            current_balance, available_balance, provider_id
     FROM truelayer_accounts WHERE user_id = ? ORDER BY display_name ASC`,
    [userId],
  )
  return rows
}

export function snapshotFromStoredAccounts(
  connection: TrueLayerConnectionRow,
  accountRows: TrueLayerAccountRow[],
): PlaidHoldingsSnapshot {
  const accounts = accountRows.map((row) => ({
    account_id: row.id,
    account_type: row.account_type,
    display_name: row.display_name,
    provider_id: row.provider_id,
    currency: row.currency,
  }))
  const balancesByAccountId = new Map(
    accountRows.map((row) => [
      row.id,
      {
        current: numFromDb(row.current_balance),
        available: numFromDb(row.available_balance),
        currency: row.currency,
      },
    ]),
  )
  return buildTrueLayerHoldingsSnapshot({
    connectionId: connection.id,
    institutionName: connection.institution_name?.trim() || 'Connected bank',
    accounts,
    balancesByAccountId,
  })
}

export async function fetchAndStoreTrueLayerSnapshot(
  userId: string,
  options?: { skipLiveFetch?: boolean },
): Promise<{ snapshot: PlaidHoldingsSnapshot | null; fetchFailed: boolean }> {
  if (!isTrueLayerConfigured()) return { snapshot: null, fetchFailed: false }
  const connection = await loadTrueLayerConnection(userId)
  if (!connection) return { snapshot: null, fetchFailed: false }

  let fetchFailed = false
  if (!options?.skipLiveFetch) {
    const tokenResult = await resolveTrueLayerAccessToken(connection)
    if ('error' in tokenResult) {
      const stored = await loadTrueLayerAccountRows(userId)
      if (stored.length > 0) {
        return { snapshot: snapshotFromStoredAccounts(connection, stored), fetchFailed: true }
      }
      return { snapshot: null, fetchFailed: true }
    }
    try {
      await persistTrueLayerAccounts(userId, connection.id, tokenResult.accessToken)
    } catch {
      fetchFailed = true
    }
  }

  const refreshedConnection = (await loadTrueLayerConnection(userId)) ?? connection
  const accountRows = await loadTrueLayerAccountRows(userId)
  if (accountRows.length === 0) return { snapshot: null, fetchFailed }
  return {
    snapshot: snapshotFromStoredAccounts(refreshedConnection, accountRows),
    fetchFailed,
  }
}

export function connectionSummary(connection: TrueLayerConnectionRow) {
  return {
    id: connection.id,
    institutionName: connection.institution_name?.trim() || 'Connected bank',
    providerId: connection.provider_id,
    lastSyncedAt: isoTimestamp(connection.updated_at),
    createdAt: isoTimestamp(connection.created_at),
  }
}
