import type { DisplayCurrencyCode } from './displayCurrency'

/** Launch regions — US/CA (Plaid), UK + EU-5 (TrueLayer). */
export type OnboardingRegionId = 'us' | 'ca' | 'uk' | 'de' | 'fr' | 'es' | 'it'

export const LAUNCH_ONBOARDING_REGION_IDS: readonly OnboardingRegionId[] = [
  'us',
  'ca',
  'uk',
  'de',
  'fr',
  'es',
  'it',
] as const

export type OnboardingRegionOption = {
  id: OnboardingRegionId
  label: string
  country: string
  locale: OnboardingRegionId
  currency: DisplayCurrencyCode
  /** Regional indicator emoji — Tabler has no country flags. */
  flag: string
}

export const ONBOARDING_REGION_OPTIONS: readonly OnboardingRegionOption[] = [
  { id: 'us', label: 'United States', country: 'United States', locale: 'us', currency: 'USD', flag: '🇺🇸' },
  { id: 'ca', label: 'Canada', country: 'Canada', locale: 'ca', currency: 'CAD', flag: '🇨🇦' },
  { id: 'uk', label: 'United Kingdom', country: 'United Kingdom', locale: 'uk', currency: 'GBP', flag: '🇬🇧' },
  { id: 'de', label: 'Germany', country: 'Germany', locale: 'de', currency: 'EUR', flag: '🇩🇪' },
  { id: 'fr', label: 'France', country: 'France', locale: 'fr', currency: 'EUR', flag: '🇫🇷' },
  { id: 'es', label: 'Spain', country: 'Spain', locale: 'es', currency: 'EUR', flag: '🇪🇸' },
  { id: 'it', label: 'Italy', country: 'Italy', locale: 'it', currency: 'EUR', flag: '🇮🇹' },
] as const

/** Country picker grid order (US & CA first, then UK/EU). */
export const ONBOARDING_COUNTRY_GRID: readonly OnboardingRegionOption[] = ONBOARDING_REGION_OPTIONS

const LEGACY_LOCALE_MAP: Record<string, OnboardingRegionId> = {
  'other-europe': 'uk',
  other: 'us',
}

/** Map stored profile locale (incl. legacy ids) to a launch region, or null. */
export function normalizeOnboardingRegionId(
  id: string | null | undefined,
): OnboardingRegionId | null {
  if (!id) return null
  const legacy = LEGACY_LOCALE_MAP[id]
  if (legacy) return legacy
  return LAUNCH_ONBOARDING_REGION_IDS.includes(id as OnboardingRegionId)
    ? (id as OnboardingRegionId)
    : null
}

export function findOnboardingRegion(id: string | null | undefined): OnboardingRegionOption | undefined {
  const normalized = normalizeOnboardingRegionId(id)
  if (!normalized) return undefined
  return ONBOARDING_REGION_OPTIONS.find((r) => r.id === normalized)
}

export function regionCountryIsValid(country: string): boolean {
  const trimmed = country.trim()
  if (!trimmed) return false
  return ONBOARDING_REGION_OPTIONS.some((r) => r.country === trimmed)
}

/** Browser locale → launch region for pre-selection; null if unsupported. */
export function detectBrowserOnboardingRegion(): OnboardingRegionId | null {
  if (typeof navigator === 'undefined') return null
  const tags = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean) as string[]
  for (const tag of tags) {
    const lower = tag.toLowerCase()
    if (lower === 'en-us' || lower.endsWith('-us')) return 'us'
    if (lower === 'en-ca' || lower.endsWith('-ca')) return 'ca'
    if (lower === 'en-gb' || lower.endsWith('-gb')) return 'uk'
    if (lower.startsWith('de')) return 'de'
    if (lower.startsWith('fr')) return 'fr'
    if (lower.startsWith('es')) return 'es'
    if (lower.startsWith('it')) return 'it'
  }
  return null
}

export function regionLabelForId(id: OnboardingRegionId): string {
  return findOnboardingRegion(id)?.label ?? 'your region'
}
