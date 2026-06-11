export type PreferenceStep = 0 | 1 | 2 | 3 | 4 | 5

export const STEP_WEIGHTS: readonly number[] = [0, 2, 4, 6, 8, 10]

export type ClimatePreferenceDirection =
  | 'warm_dry'
  | 'four_seasons'
  | 'cool_mild'
  | 'none'

export type DailyLifeFactorId =
  | 'english'
  | 'expat'
  | 'residency'
  | 'walkability'
  | 'publicTransport'
  | 'internet'
  | 'food'
  | 'distanceFromUS'
  | 'languageCurve'

export interface DailyLifeFactor {
  factor: DailyLifeFactorId
  step: PreferenceStep
}

export type CorePreferenceKey =
  | 'affordability'
  | 'taxEfficiency'
  | 'healthcareCost'
  | 'safety'
  | 'healthcareQuality'
  | 'airQuality'
  | 'disasterRisk'
  | 'climate'
  | 'qualityOfLife'
  | 'politicalStability'
  | 'socialLaws'

export interface RetirementPreferences {
  affordability: PreferenceStep
  taxEfficiency: PreferenceStep
  healthcareCost: PreferenceStep
  safety: PreferenceStep
  healthcareQuality: PreferenceStep
  airQuality: PreferenceStep
  disasterRisk: PreferenceStep
  climate: PreferenceStep
  qualityOfLife: PreferenceStep
  politicalStability: PreferenceStep
  socialLaws: PreferenceStep
  climatePreference: ClimatePreferenceDirection
  dailyLife: DailyLifeFactor[]
}

export const DEFAULT_PREFERENCES: RetirementPreferences = {
  affordability: 3,
  taxEfficiency: 3,
  healthcareCost: 3,
  safety: 5,
  healthcareQuality: 4,
  airQuality: 3,
  disasterRisk: 3,
  climate: 2,
  qualityOfLife: 4,
  politicalStability: 3,
  socialLaws: 3,
  climatePreference: 'none',
  dailyLife: [],
}

export interface WizardConfig {
  appId: 'retirement' | 'abroad-living' | string
  storageKey: string
}

export const RETIREMENT_WIZARD_CONFIG: WizardConfig = {
  appId: 'retirement',
  storageKey: 'retirement_preferences',
}

export const DAILY_LIFE_FACTOR_IDS: DailyLifeFactorId[] = [
  'english',
  'expat',
  'residency',
  'walkability',
  'publicTransport',
  'internet',
  'food',
  'distanceFromUS',
  'languageCurve',
]

/** Default weight when a daily life factor is first enabled. */
const DAILY_FACTOR_DEFAULT_STEP: PreferenceStep = 3

function clampStep(value: unknown): PreferenceStep {
  const n = typeof value === 'number' ? Math.round(value) : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(5, n)) as PreferenceStep
}

function normalizeClimatePreference(value: unknown): ClimatePreferenceDirection {
  if (
    value === 'warm_dry' ||
    value === 'four_seasons' ||
    value === 'cool_mild' ||
    value === 'none'
  ) {
    return value
  }
  return 'none'
}

function normalizeDailyLife(raw: unknown): DailyLifeFactor[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<DailyLifeFactorId>()
  const result: DailyLifeFactor[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    let factor = (item as DailyLifeFactor).factor
    if (factor === ('culture' as DailyLifeFactorId)) continue
    if (!DAILY_LIFE_FACTOR_IDS.includes(factor) || seen.has(factor)) continue
    seen.add(factor)
    result.push({
      factor,
      step: clampStep((item as DailyLifeFactor).step),
    })
  }
  return result
}

type LegacyRetirementPreferences = Partial<RetirementPreferences> & {
  healthcare?: PreferenceStep
}

export function normalizeRetirementPreferences(
  raw: LegacyRetirementPreferences | null | undefined,
): RetirementPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES, dailyLife: [] }

  const legacyHealthcare = raw.healthcare

  return {
    affordability: clampStep(raw.affordability ?? DEFAULT_PREFERENCES.affordability),
    taxEfficiency: clampStep(raw.taxEfficiency ?? DEFAULT_PREFERENCES.taxEfficiency),
    healthcareCost: clampStep(raw.healthcareCost ?? DEFAULT_PREFERENCES.healthcareCost),
    safety: clampStep(raw.safety ?? DEFAULT_PREFERENCES.safety),
    healthcareQuality: clampStep(
      raw.healthcareQuality ?? legacyHealthcare ?? DEFAULT_PREFERENCES.healthcareQuality,
    ),
    airQuality: clampStep(raw.airQuality ?? DEFAULT_PREFERENCES.airQuality),
    disasterRisk: clampStep(raw.disasterRisk ?? DEFAULT_PREFERENCES.disasterRisk),
    climate: clampStep(raw.climate ?? DEFAULT_PREFERENCES.climate),
    qualityOfLife: clampStep(raw.qualityOfLife ?? DEFAULT_PREFERENCES.qualityOfLife),
    politicalStability: clampStep(
      raw.politicalStability ?? DEFAULT_PREFERENCES.politicalStability,
    ),
    socialLaws: clampStep(raw.socialLaws ?? DEFAULT_PREFERENCES.socialLaws),
    climatePreference: normalizeClimatePreference(
      raw.climatePreference ?? DEFAULT_PREFERENCES.climatePreference,
    ),
    dailyLife: normalizeDailyLife(raw.dailyLife),
  }
}

export function loadRetirementPreferences(
  config: WizardConfig = RETIREMENT_WIZARD_CONFIG,
): RetirementPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(config.storageKey)
    if (!raw) return null
    return normalizeRetirementPreferences(JSON.parse(raw) as LegacyRetirementPreferences)
  } catch {
    return null
  }
}

export function saveRetirementPreferences(
  prefs: RetirementPreferences,
  config: WizardConfig = RETIREMENT_WIZARD_CONFIG,
): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(config.storageKey, JSON.stringify(normalizeRetirementPreferences(prefs)))
}

export function hasRetirementPreferences(
  config: WizardConfig = RETIREMENT_WIZARD_CONFIG,
): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(config.storageKey) != null
}

export function resetRetirementPreferences(
  config: WizardConfig = RETIREMENT_WIZARD_CONFIG,
): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(config.storageKey)
}

const DESTINATION_PREFS_OVERLAY_OPENED_KEY = 'retirement_destination_prefs_overlay_opened'

export const DESTINATION_PREFS_OVERLAY_OPENED_EVENT =
  'destination-prefs-overlay-opened'

export function hasOpenedDestinationPrefsOverlay(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DESTINATION_PREFS_OVERLAY_OPENED_KEY) === '1'
}

export function markDestinationPrefsOverlayOpened(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(DESTINATION_PREFS_OVERLAY_OPENED_KEY) === '1') return
  localStorage.setItem(DESTINATION_PREFS_OVERLAY_OPENED_KEY, '1')
  window.dispatchEvent(new CustomEvent(DESTINATION_PREFS_OVERLAY_OPENED_EVENT))
}

export function createDailyLifeFactor(factor: DailyLifeFactorId): DailyLifeFactor {
  return { factor, step: DAILY_FACTOR_DEFAULT_STEP }
}

export function resolveRetirementPreferences(
  config: WizardConfig = RETIREMENT_WIZARD_CONFIG,
): RetirementPreferences {
  return loadRetirementPreferences(config) ?? { ...DEFAULT_PREFERENCES, dailyLife: [] }
}
