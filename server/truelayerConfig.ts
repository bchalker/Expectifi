export type TrueLayerConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
  clientOrigin: string
  authUrl: string
  tokenUrl: string
  dataApiBase: string
}

import {
  parseTrueLayerUserRegion,
  resolveTrueLayerAuthLinkOptions,
  type TrueLayerUserRegion,
} from './truelayerProviders.js'

/** Match permissions enabled in TrueLayer Console (accounts + balance + refresh). */
const DEFAULT_SCOPE = 'accounts balance offline_access'

function isLocalDevOrigin(origin: string): boolean {
  try {
    const u = new URL(origin)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

/**
 * OAuth redirect must match the browser origin (and Console allowlist exactly).
 * Pass `browserOrigin` from the client (window.location.origin) so Vite ports
 * like :5174 work when :5173 is taken. Production uses env only.
 */
export function resolveTrueLayerRedirectUri(browserOrigin?: string): string {
  const explicit = process.env.TRUELAYER_REDIRECT_URI?.trim()
  if (explicit) return explicit

  const fromBrowser = browserOrigin?.trim()
  if (fromBrowser && isLocalDevOrigin(fromBrowser)) {
    return `${fromBrowser.replace(/\/$/, '')}/api/truelayer/callback`
  }

  const clientOrigin = (process.env.CLIENT_ORIGIN || '').replace(/\/$/, '')
  const apiPublic = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '')
  if (clientOrigin && apiPublic && clientOrigin !== apiPublic) {
    return `${clientOrigin}/api/truelayer/callback`
  }
  const base = apiPublic || clientOrigin || 'http://localhost:3001'
  return `${base}/api/truelayer/callback`
}

export function isTrueLayerConfigured(): boolean {
  return getTrueLayerConfig() !== null
}

export function getTrueLayerConfig(): TrueLayerConfig | null {
  const clientId = process.env.TRUELAYER_CLIENT_ID?.trim()
  const clientSecret = process.env.TRUELAYER_CLIENT_SECRET?.trim()
  const redirectUri = resolveTrueLayerRedirectUri()
  if (!clientId || !clientSecret) return null

  const clientOrigin = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
  const sandbox = isTrueLayerSandboxEnv()
  const authHost = sandbox ? 'https://auth.truelayer-sandbox.com' : 'https://auth.truelayer.com'
  const dataApiBase = sandbox
    ? 'https://api.truelayer-sandbox.com/data/v1'
    : 'https://api.truelayer.com/data/v1'

  return {
    clientId,
    clientSecret,
    redirectUri,
    clientOrigin,
    authUrl: `${authHost}/`,
    tokenUrl: `${authHost}/connect/token`,
    dataApiBase,
  }
}

/** Sandbox OAuth clients only work against auth.truelayer-sandbox.com (not auth.truelayer.com). */
export function isTrueLayerSandboxEnv(): boolean {
  return process.env.TRUELAYER_ENV?.trim().toLowerCase() === 'sandbox'
}

export function buildTrueLayerAuthUrl(
  cfg: TrueLayerConfig,
  state: string,
  region: TrueLayerUserRegion = 'uk',
  userEmail?: string | null,
): string {
  const link = resolveTrueLayerAuthLinkOptions(region)
  const u = new URL(cfg.authUrl)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', cfg.clientId)
  u.searchParams.set('scope', DEFAULT_SCOPE)
  u.searchParams.set('redirect_uri', cfg.redirectUri)
  u.searchParams.set('providers', link.providers)
  u.searchParams.set('state', state)
  const email = userEmail?.trim()
  if (email) u.searchParams.set('user_email', email)
  if (link.countryId) u.searchParams.set('country_id', link.countryId)
  if (link.languageId) u.searchParams.set('language_id', link.languageId)
  if (link.providerId) u.searchParams.set('provider_id', link.providerId)
  return u.toString()
}

export { parseTrueLayerUserRegion } from './truelayerProviders.js'

export function logTrueLayerConfigAtStartup(): void {
  const cfg = getTrueLayerConfig()
  if (!cfg) {
    console.log('[truelayer] not configured (set TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET)')
    return
  }
  const sandbox = isTrueLayerSandboxEnv()
  const idLooksSandbox = cfg.clientId.toLowerCase().startsWith('sandbox-')
  const envLabel = sandbox ? 'sandbox' : 'live'
  console.log(
    `[truelayer] configured (${envLabel}) — auth ${new URL(cfg.authUrl).host} — redirect ${cfg.redirectUri}`,
  )
  console.log(
    `[truelayer] default redirect ${cfg.redirectUri} — local dev uses browser origin (?origin= on /api/truelayer/auth)`,
  )
  console.log(
    '[truelayer] GET /api/truelayer/setup for the URI to whitelist; add each localhost port you use (5173, 5174, …)',
  )
  if (sandbox && !idLooksSandbox) {
    console.warn(
      '[truelayer] TRUELAYER_ENV=sandbox but client_id does not start with sandbox- — use Sandbox credentials from TrueLayer Console (Live toggle off)',
    )
  }
  if (!sandbox && idLooksSandbox) {
    console.warn(
      '[truelayer] client_id looks like sandbox but TRUELAYER_ENV is not sandbox — set TRUELAYER_ENV=sandbox for local dev',
    )
  }
}
