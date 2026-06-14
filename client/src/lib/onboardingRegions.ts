import type { DisplayCurrencyCode } from './displayCurrency'

/** Launch regions — United States and Canada only (Plaid open banking). */
export type OnboardingRegionId = 'us' | 'ca'

export const LAUNCH_ONBOARDING_REGION_IDS: readonly OnboardingRegionId[] = ['us', 'ca'] as const

export type OnboardingRegionOption = {
  id: OnboardingRegionId
  label: string
  country: string
  locale: OnboardingRegionId
  currency: DisplayCurrencyCode
  /** ISO 3166-1 alpha-2 for Flagpack. */
  iso: string
}

export const ONBOARDING_REGION_OPTIONS: readonly OnboardingRegionOption[] = [
  { id: 'us', label: 'United States', country: 'United States', locale: 'us', currency: 'USD', iso: 'US' },
  { id: 'ca', label: 'Canada', country: 'Canada', locale: 'ca', currency: 'CAD', iso: 'CA' },
] as const

/** Country picker grid (US & Canada). */
export const ONBOARDING_COUNTRY_GRID: readonly OnboardingRegionOption[] = ONBOARDING_REGION_OPTIONS

const LEGACY_LOCALE_MAP: Record<string, OnboardingRegionId> = {
  'other-europe': 'ca',
  uk: 'ca',
  de: 'ca',
  fr: 'ca',
  es: 'ca',
  it: 'ca',
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
  }
  return null
}

export function regionLabelForId(id: OnboardingRegionId): string {
  return findOnboardingRegion(id)?.label ?? 'your region'
}
