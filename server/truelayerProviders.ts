import { isTrueLayerSandboxEnv } from './truelayerConfig.js'

/** Launch regions that use TrueLayer (UK + EU-5). */
export type TrueLayerUserRegion = 'uk' | 'de' | 'fr' | 'es' | 'it'

const REGION_IDS = new Set<string>(['uk', 'de', 'fr', 'es', 'it'])

export function parseTrueLayerUserRegion(raw: unknown): TrueLayerUserRegion {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (s === 'other-europe') return 'uk'
  if (REGION_IDS.has(s)) return s as TrueLayerUserRegion
  return 'uk'
}

const COUNTRY_ID: Record<TrueLayerUserRegion, string> = {
  uk: 'GB',
  es: 'ES',
  de: 'DE',
  fr: 'FR',
  it: 'IT',
}

const LANGUAGE_ID: Partial<Record<TrueLayerUserRegion, string>> = {
  es: 'es',
  de: 'de',
  fr: 'fr',
  it: 'it',
}

/** Live: one OB group per country. Sandbox: mock + UK only (EU OB groups break provider picker). */
const LIVE_PROVIDERS: Record<TrueLayerUserRegion, string> = {
  uk: 'uk-ob-all uk-oauth-all',
  es: 'es-ob-all',
  de: 'de-ob-all',
  fr: 'fr-ob-all',
  it: 'it-ob-all',
}

/** Sandbox mock bank only — mixing EU provider groups breaks the auth dialog. */
const SANDBOX_PROVIDERS = 'uk-cs-mock'

export type TrueLayerAuthLinkOptions = {
  providers: string
  countryId?: string
  languageId?: string
  providerId?: string
}

export function resolveTrueLayerAuthLinkOptions(region: TrueLayerUserRegion): TrueLayerAuthLinkOptions {
  if (isTrueLayerSandboxEnv()) {
    return {
      providers: SANDBOX_PROVIDERS,
      countryId: 'GB',
    }
  }
  return {
    providers: LIVE_PROVIDERS[region],
    countryId: COUNTRY_ID[region],
    languageId: LANGUAGE_ID[region],
  }
}
