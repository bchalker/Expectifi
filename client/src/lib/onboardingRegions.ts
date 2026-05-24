import type { DisplayCurrencyCode } from './displayCurrency'

export type OnboardingRegionId =
  | 'us'
  | 'uk'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'other-europe'
  | 'other'

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
  { id: 'uk', label: 'United Kingdom', country: 'United Kingdom', locale: 'uk', currency: 'GBP', flag: '🇬🇧' },
  { id: 'de', label: 'Germany', country: 'Germany', locale: 'de', currency: 'EUR', flag: '🇩🇪' },
  { id: 'fr', label: 'France', country: 'France', locale: 'fr', currency: 'EUR', flag: '🇫🇷' },
  { id: 'es', label: 'Spain', country: 'Spain', locale: 'es', currency: 'EUR', flag: '🇪🇸' },
  { id: 'it', label: 'Italy', country: 'Italy', locale: 'it', currency: 'EUR', flag: '🇮🇹' },
  {
    id: 'other-europe',
    label: 'Other Europe',
    country: 'Other Europe',
    locale: 'other-europe',
    currency: 'EUR',
    flag: '🇪🇺',
  },
  { id: 'other', label: 'Other', country: 'Other', locale: 'other', currency: 'USD', flag: '🌐' },
] as const

/** Grid order matching onboarding country picker layout. */
export const ONBOARDING_COUNTRY_GRID: readonly OnboardingRegionOption[] = [
  ONBOARDING_REGION_OPTIONS[1],
  ONBOARDING_REGION_OPTIONS[2],
  ONBOARDING_REGION_OPTIONS[3],
  ONBOARDING_REGION_OPTIONS[4],
  ONBOARDING_REGION_OPTIONS[5],
  ONBOARDING_REGION_OPTIONS[6],
  ONBOARDING_REGION_OPTIONS[0],
  ONBOARDING_REGION_OPTIONS[7],
]

export function findOnboardingRegion(id: string | null | undefined): OnboardingRegionOption | undefined {
  if (!id) return undefined
  return ONBOARDING_REGION_OPTIONS.find((r) => r.id === id)
}

export function regionCountryIsValid(country: string): boolean {
  const trimmed = country.trim()
  if (!trimmed) return false
  return ONBOARDING_REGION_OPTIONS.some((r) => r.country === trimmed)
}

/** Best-effort browser locale → region id for pre-selection. */
export function detectBrowserOnboardingRegion(): OnboardingRegionId | null {
  if (typeof navigator === 'undefined') return null
  const tags = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean) as string[]
  for (const tag of tags) {
    const lower = tag.toLowerCase()
    if (lower === 'en-us' || lower.endsWith('-us')) return 'us'
    if (lower === 'en-gb' || lower.endsWith('-gb')) return 'uk'
    if (lower.startsWith('de')) return 'de'
    if (lower.startsWith('fr')) return 'fr'
    if (lower.startsWith('es')) return 'es'
    if (lower.startsWith('it')) return 'it'
    const europePrefix =
      /^(en-ie|en-mt|nl|pt|pl|sv|da|no|fi|cs|sk|hu|ro|bg|hr|sl|et|lv|lt|el|mt|cy|lb|is|eu)/.test(lower)
    if (europePrefix) return 'other-europe'
  }
  return null
}

export function regionLabelForId(id: OnboardingRegionId): string {
  return findOnboardingRegion(id)?.label ?? 'your region'
}
