import { touchLocalPlanStateSavedAt } from '../lib/planStorage/localSavedAt'

export type PreferenceStep =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10

/** Scoring weight for a 0–10 priority value (0.0–1.0). */
export function preferenceWeight(value: PreferenceStep): number {
  return value / 10
}

/**
 * @deprecated Use preferenceWeight(value) — legacy 0–5 step index weights.
 * Kept for any external imports; do not index with 0–10 values.
 */
export const STEP_WEIGHTS: readonly number[] = [0, 2, 4, 6, 8, 10]

export type ClimatePreferenceDirection =
  | 'warm_dry'
  | 'four_seasons'
  | 'cool_mild'
  | 'none'

export const CLIMATE_TEMP_MIN_F = 30
export const CLIMATE_TEMP_MAX_F = 100
export const DEFAULT_CLIMATE_TEMP_MIN_F = CLIMATE_TEMP_MIN_F
export const DEFAULT_CLIMATE_TEMP_MAX_F = CLIMATE_TEMP_MAX_F

export const PREFERENCES_STORAGE_VERSION = 2

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
  politicalStability: PreferenceStep
  socialLaws: PreferenceStep
  /** @deprecated Retained for migration; use climateTempMinF / climateTempMaxF. */
  climatePreference: ClimatePreferenceDirection
  climateTempMinF: number
  climateTempMaxF: number
  dailyLife: DailyLifeFactor[]
}

export const DEFAULT_PREFERENCES: RetirementPreferences = {
  affordability: 6,
  taxEfficiency: 6,
  healthcareCost: 6,
  safety: 10,
  healthcareQuality: 8,
  airQuality: 6,
  disasterRisk: 6,
  climate: 4,
  politicalStability: 6,
  socialLaws: 6,
  climatePreference: 'none',
  climateTempMinF: DEFAULT_CLIMATE_TEMP_MIN_F,
  climateTempMaxF: DEFAULT_CLIMATE_TEMP_MAX_F,
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

/** Default slider value when a daily life factor is first enabled. */
const DAILY_FACTOR_DEFAULT_STEP: PreferenceStep = 6

function clampStep(value: unknown): PreferenceStep {
  const n = typeof value === 'number' ? Math.round(value) : Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(10, n)) as PreferenceStep
}

function clampClimateTemp(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(CLIMATE_TEMP_MIN_F, Math.min(CLIMATE_TEMP_MAX_F, n))
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

export function climatePreferenceToTempRange(
  direction: ClimatePreferenceDirection,
): { minF: number; maxF: number } {
  switch (direction) {
    case 'warm_dry':
      return { minF: 65, maxF: 85 }
    case 'four_seasons':
      return { minF: 42, maxF: 68 }
    case 'cool_mild':
      return { minF: 35, maxF: 58 }
    case 'none':
    default:
      return { minF: CLIMATE_TEMP_MIN_F, maxF: CLIMATE_TEMP_MAX_F }
  }
}

export function isClimateTempRangeUnset(minF: number, maxF: number): boolean {
  return minF <= CLIMATE_TEMP_MIN_F && maxF >= CLIMATE_TEMP_MAX_F
}

export function formatClimateTempRange(minF: number, maxF: number): string {
  return `${Math.round(minF)}°F – ${Math.round(maxF)}°F`
}

function migrateLegacyStep(value: unknown): PreferenceStep {
  const n = typeof value === 'number' ? Math.round(value) : Number(value)
  if (!Number.isFinite(n)) return 0
  if (n <= 5) return clampStep(n * 2)
  return clampStep(n)
}

function normalizeDailyLife(raw: unknown, legacySteps: boolean): DailyLifeFactor[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<DailyLifeFactorId>()
  const result: DailyLifeFactor[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    let factor = (item as DailyLifeFactor).factor
    if (factor === ('culture' as DailyLifeFactorId)) continue
    if (!DAILY_LIFE_FACTOR_IDS.includes(factor) || seen.has(factor)) continue
    seen.add(factor)
    const stepValue = (item as DailyLifeFactor).step
    result.push({
      factor,
      step: legacySteps ? migrateLegacyStep(stepValue) : clampStep(stepValue),
    })
  }
  return result
}

type LegacyRetirementPreferences = Partial<RetirementPreferences> & {
  healthcare?: PreferenceStep
  /** Ignored on load — removed from Fit score weighting (QoL sub-metrics scored separately). */
  qualityOfLife?: PreferenceStep
  _version?: number
}

function isLegacyPreferenceStorage(raw: LegacyRetirementPreferences): boolean {
  if (raw._version != null && raw._version >= PREFERENCES_STORAGE_VERSION) return false
  if (raw.climateTempMinF != null || raw.climateTempMaxF != null) return false

  const coreKeys: CorePreferenceKey[] = [
    'affordability',
    'taxEfficiency',
    'healthcareCost',
    'safety',
    'healthcareQuality',
    'airQuality',
    'disasterRisk',
    'climate',
    'politicalStability',
    'socialLaws',
  ]

  return coreKeys.some((key) => {
    const value = raw[key]
    return typeof value === 'number' && value >= 0 && value <= 5
  })
}

export function normalizeRetirementPreferences(
  raw: LegacyRetirementPreferences | null | undefined,
): RetirementPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFERENCES, dailyLife: [] }

  const legacy = isLegacyPreferenceStorage(raw)
  const step = legacy ? migrateLegacyStep : clampStep
  const legacyHealthcare = raw.healthcare
  const climatePreference = normalizeClimatePreference(
    raw.climatePreference ?? DEFAULT_PREFERENCES.climatePreference,
  )

  let climateTempMinF = clampClimateTemp(
    raw.climateTempMinF,
    DEFAULT_PREFERENCES.climateTempMinF,
  )
  let climateTempMaxF = clampClimateTemp(
    raw.climateTempMaxF,
    DEFAULT_PREFERENCES.climateTempMaxF,
  )

  if (legacy && raw.climateTempMinF == null && raw.climateTempMaxF == null) {
    const migrated = climatePreferenceToTempRange(climatePreference)
    climateTempMinF = migrated.minF
    climateTempMaxF = migrated.maxF
  }

  if (climateTempMinF > climateTempMaxF) {
    ;[climateTempMinF, climateTempMaxF] = [climateTempMaxF, climateTempMinF]
  }

  return {
    affordability: step(raw.affordability ?? DEFAULT_PREFERENCES.affordability),
    taxEfficiency: step(raw.taxEfficiency ?? DEFAULT_PREFERENCES.taxEfficiency),
    healthcareCost: step(raw.healthcareCost ?? DEFAULT_PREFERENCES.healthcareCost),
    safety: step(raw.safety ?? DEFAULT_PREFERENCES.safety),
    healthcareQuality: step(
      raw.healthcareQuality ?? legacyHealthcare ?? DEFAULT_PREFERENCES.healthcareQuality,
    ),
    airQuality: step(raw.airQuality ?? DEFAULT_PREFERENCES.airQuality),
    disasterRisk: step(raw.disasterRisk ?? DEFAULT_PREFERENCES.disasterRisk),
    climate: step(raw.climate ?? DEFAULT_PREFERENCES.climate),
    politicalStability: step(
      raw.politicalStability ?? DEFAULT_PREFERENCES.politicalStability,
    ),
    socialLaws: step(raw.socialLaws ?? DEFAULT_PREFERENCES.socialLaws),
    climatePreference,
    climateTempMinF,
    climateTempMaxF,
    dailyLife: normalizeDailyLife(raw.dailyLife, legacy),
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
  options?: { skipServerSync?: boolean },
): void {
  if (typeof window === 'undefined') return
  const normalized = normalizeRetirementPreferences(prefs)
  localStorage.setItem(
    config.storageKey,
    JSON.stringify({ ...normalized, _version: PREFERENCES_STORAGE_VERSION }),
  )
  touchLocalPlanStateSavedAt()
  if (!options?.skipServerSync) {
    void import('../lib/planStateServerSync').then(
      ({ queuePlanStateServerSync, flushPlanStateServerSync }) => {
        queuePlanStateServerSync()
        flushPlanStateServerSync()
      },
    )
  }
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
