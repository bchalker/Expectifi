import { decryptTrueLayerToken, encryptTrueLayerToken } from './truelayerCrypto.js'
import { getTrueLayerConfig, type TrueLayerConfig } from './truelayerConfig.js'
import type { TrueLayerAccountRecord, TrueLayerBalanceRecord } from './truelayerHoldings.js'

export type TrueLayerTokenPair = {
  accessToken: string
  refreshToken: string | null
  expiresInSec: number | null
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

type ResultsEnvelope<T> = {
  results?: T[]
  status?: string
}

export async function exchangeTrueLayerAuthCode(
  code: string,
  cfg: TrueLayerConfig = getTrueLayerConfig()!,
): Promise<{ ok: true; tokens: TrueLayerTokenPair } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    code,
  })
  const r = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await r.json()) as TokenResponse
  if (!r.ok || data.error || !data.access_token) {
    const msg = data.error_description ?? data.error ?? 'token_exchange_failed'
    return { ok: false, error: msg }
  }
  return {
    ok: true,
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token?.trim() || null,
      expiresInSec: typeof data.expires_in === 'number' ? data.expires_in : null,
    },
  }
}

export async function refreshTrueLayerAccessToken(
  refreshToken: string,
  cfg: TrueLayerConfig = getTrueLayerConfig()!,
): Promise<{ ok: true; tokens: TrueLayerTokenPair } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: refreshToken,
  })
  const r = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = (await r.json()) as TokenResponse
  if (!r.ok || data.error || !data.access_token) {
    const msg = data.error_description ?? data.error ?? 'token_refresh_failed'
    return { ok: false, error: msg }
  }
  return {
    ok: true,
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token?.trim() || refreshToken,
      expiresInSec: typeof data.expires_in === 'number' ? data.expires_in : null,
    },
  }
}

async function dataApiGet<T>(
  path: string,
  accessToken: string,
  cfg: TrueLayerConfig,
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const url = `${cfg.dataApiBase.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!r.ok) {
    let err = `upstream_${r.status}`
    try {
      const j = (await r.json()) as { error_description?: string; error?: string }
      err = j.error_description ?? j.error ?? err
    } catch {
      /* ignore */
    }
    return { ok: false, error: err, status: r.status }
  }
  return { ok: true, data: (await r.json()) as T }
}

export async function fetchTrueLayerAccounts(
  accessToken: string,
  cfg?: TrueLayerConfig,
): Promise<TrueLayerAccountRecord[]> {
  const resolved = cfg ?? getTrueLayerConfig()
  if (!resolved) return []
  const res = await dataApiGet<ResultsEnvelope<TrueLayerAccountRecord>>('/accounts', accessToken, resolved)
  if (!res.ok) return []
  return res.data.results ?? []
}

export async function fetchTrueLayerAccountBalance(
  accessToken: string,
  accountId: string,
  cfg?: TrueLayerConfig,
): Promise<TrueLayerBalanceRecord | null> {
  const resolved = cfg ?? getTrueLayerConfig()
  if (!resolved) return null
  const res = await dataApiGet<ResultsEnvelope<TrueLayerBalanceRecord>>(
    `/accounts/${encodeURIComponent(accountId)}/balance`,
    accessToken,
    resolved,
  )
  if (!res.ok) return null
  return res.data.results?.[0] ?? null
}

export async function fetchTrueLayerAccountsWithBalances(
  accessToken: string,
  cfg?: TrueLayerConfig,
): Promise<{ accounts: TrueLayerAccountRecord[]; balancesByAccountId: Map<string, TrueLayerBalanceRecord> }> {
  const accounts = await fetchTrueLayerAccounts(accessToken, cfg)
  const balancesByAccountId = new Map<string, TrueLayerBalanceRecord>()
  await Promise.all(
    accounts.map(async (account) => {
      const id = account.account_id?.trim()
      if (!id) return
      const balance = await fetchTrueLayerAccountBalance(accessToken, id, cfg)
      if (balance) balancesByAccountId.set(id, balance)
    }),
  )
  return { accounts, balancesByAccountId }
}

export function encryptTokenPair(tokens: TrueLayerTokenPair): {
  accessTokenEnc: string
  refreshTokenEnc: string | null
  expiresAt: Date | null
} {
  const expiresAt =
    tokens.expiresInSec != null && tokens.expiresInSec > 0
      ? new Date(Date.now() + tokens.expiresInSec * 1000)
      : null
  return {
    accessTokenEnc: encryptTrueLayerToken(tokens.accessToken),
    refreshTokenEnc: tokens.refreshToken ? encryptTrueLayerToken(tokens.refreshToken) : null,
    expiresAt,
  }
}

export function decryptAccessToken(accessTokenEnc: string): string {
  return decryptTrueLayerToken(accessTokenEnc)
}

export function decryptRefreshToken(refreshTokenEnc: string | null): string | null {
  if (!refreshTokenEnc?.trim()) return null
  return decryptTrueLayerToken(refreshTokenEnc)
}
