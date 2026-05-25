import type { OnboardingRegionId } from './onboardingRegions'
import {
  normalizeOnboardingRegionId,
  ONBOARDING_REGION_OPTIONS,
} from './onboardingRegions'
import { loadUserProfile } from './userProfileStorage'

export type OpenBankingProvider = 'plaid' | 'truelayer'

const PLAID_ONBOARDING_REGIONS = new Set<OnboardingRegionId>(['us', 'ca'])

/** Plaid for US & Canada; TrueLayer for UK and EU launch countries. */
export function usesPlaidOpenBanking(locale: OnboardingRegionId | null | undefined): boolean {
  if (!locale) return true
  return PLAID_ONBOARDING_REGIONS.has(locale)
}

export function usesTrueLayerOpenBanking(locale: OnboardingRegionId | null | undefined): boolean {
  return !usesPlaidOpenBanking(locale)
}

export function getOpenBankingProvider(locale: OnboardingRegionId | null | undefined): OpenBankingProvider {
  return usesTrueLayerOpenBanking(locale) ? 'truelayer' : 'plaid'
}

const COUNTRY_ALIAS_LOCALE: Record<string, OnboardingRegionId> = {
  usa: 'us',
  'u.s.': 'us',
  'u.s.a.': 'us',
  'united states of america': 'us',
  ca: 'ca',
}

/** Map stored residence country → onboarding region id for open banking. */
export function openBankingLocaleFromCountry(country: string): OnboardingRegionId | null {
  const trimmed = country.trim()
  if (!trimmed) return null
  const match = ONBOARDING_REGION_OPTIONS.find((r) => r.country === trimmed)
  if (match) return match.locale
  const alias = COUNTRY_ALIAS_LOCALE[trimmed.toLowerCase()]
  if (alias) return alias
  return null
}

export type ResolveOpenBankingOptions = {
  /** Live calculator / config value — wins over stored profile when set. */
  residenceCountry?: string
}

/** Best residence string for provider routing (live inputs, then stored profile). */
export function resolveEffectiveResidenceCountry(live?: string): string {
  const trimmed = live?.trim()
  if (trimmed) return trimmed
  return loadUserProfile()?.country?.trim() ?? ''
}

export function resolveOpenBankingLocale(opts?: ResolveOpenBankingOptions): OnboardingRegionId {
  const country = resolveEffectiveResidenceCountry(opts?.residenceCountry)
  if (country) {
    const fromCountry = openBankingLocaleFromCountry(country)
    if (fromCountry) return fromCountry
  }
  const profile = loadUserProfile()
  const fromProfile = normalizeOnboardingRegionId(profile?.locale)
  if (fromProfile) return fromProfile
  return 'us'
}

export function preferTrueLayerForCurrentUser(residenceCountry?: string): boolean {
  return usesTrueLayerOpenBanking(resolveOpenBankingLocale({ residenceCountry }))
}
