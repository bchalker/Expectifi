import { isValidIsoDateString } from './ageFromDob'
import type { DisplayCurrencyCode } from './displayCurrency'
import { residenceCountryToDisplayCurrency, setDisplayCurrencyCode } from './displayCurrency'
import type { CalculatorInputs, CalculatorUi } from './computeResults'
import { isOnboardingResidenceCountry } from './onboardingResidenceCountries'
import type { OnboardingRegionId } from './onboardingRegions'
import {
  findOnboardingRegion,
  normalizeOnboardingRegionId,
  ONBOARDING_REGION_OPTIONS,
} from './onboardingRegions'
import type { UserPrefs } from './userPrefs'
import { RETIRE_AGE_MIN, RETIRE_AGE_MAX } from './userPrefs'
import { pensionConfigForLocale } from './localePensionConfig'
import { normalizeCalculatorFilingStatus } from './filingStatus'
import { clampClaimAgeInRange } from './socialSecurity'
import { canWritePlanLocalStorage } from './planStorage/writeContext'
import { loadPlanProfile, profileHasOnboardingComplete, savePlanProfile } from './planStorage/profile'
import type { StoredPlanProfile } from './planStorage/types'
import { parseStoredUserProfile, type StoredUserProfile } from './storedUserProfile'
import {
  parseStoredContributions,
  serializeContributions,
  totalContributionsMonthly,
  type OnboardingContributionsState,
} from './onboardingContributions'

export type { StoredUserProfile } from './storedUserProfile'
export { parseStoredUserProfile } from './storedUserProfile'

export const USER_PROFILE_STORAGE_KEY = 'expectifi_user_profile'

/** Dispatched on `window` when profile is saved in this tab (see UserLocaleContext). */
export const USER_PROFILE_UPDATED_EVENT = 'expectifi:user-profile-updated'
const LEGACY_USER_PROFILE_KEYS = ['hwp_user_profile'] as const

export type OnboardingFormProfileSlice = {
  currentResidence: string
  locale?: OnboardingRegionId
  currency?: DisplayCurrencyCode
  dob: string
  householdIncome: number
  monthlyContribution: number
  includeSs: boolean
  ssAge: number
  ssBenefitMonthly: number
  includeSpouse: boolean
  spouseClaimMode: 'own' | 'spousal'
  spouseDob: string
  spouseSsAge: number
  spouseSsBenefitMonthly: number
  retireAge: number
  monthlyGoal: number
  contributions?: OnboardingContributionsState
}

function dobParts(iso: string): { birth_month?: number; birth_year?: number } {
  if (!isValidIsoDateString(iso)) return {}
  const [y, m] = iso.split('-').map(Number)
  return { birth_year: y, birth_month: m }
}

export function loadUserProfile(): StoredUserProfile | null {
  const fromPlan = loadPlanProfile()
  if (fromPlan) {
    const { onboardingComplete: _omit, ...rest } = fromPlan
    return rest
  }

  try {
    let raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
    if (!raw) {
      for (const legacy of LEGACY_USER_PROFILE_KEYS) {
        raw = localStorage.getItem(legacy)
        if (raw) break
      }
    }
    if (!raw) return null
    return parseStoredUserProfile(JSON.parse(raw))
  } catch {
    return null
  }
}

export function saveUserProfile(patch: Partial<StoredUserProfile>): StoredUserProfile {
  const current = loadUserProfile() ?? { version: 1 as const }
  const next: StoredUserProfile = { ...current, ...patch, version: 1 }
  if (!canWritePlanLocalStorage()) {
    return next
  }
  savePlanProfile({
    ...loadPlanProfile(),
    ...patch,
    version: 1,
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT))
  }
  return next
}

export function clearUserProfileStorage(): void {
  try {
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY)
    for (const legacy of LEGACY_USER_PROFILE_KEYS) {
      localStorage.removeItem(legacy)
    }
  } catch {
    /* ignore */
  }
}

export function hasStoredProfileStep0(profile: StoredUserProfile | null | undefined): boolean {
  return Boolean(profile?.country?.trim())
}

export function hasStoredProfileStep1(profile: StoredUserProfile | null | undefined): boolean {
  if (!hasStoredProfileStep0(profile)) return false
  if (!profile?.dob || !isValidIsoDateString(profile.dob)) return false
  return true
}

export function hasStoredProfileRetireAge(profile: StoredUserProfile | null | undefined): boolean {
  const age = profile?.target_retirement_age
  return age != null && age >= RETIRE_AGE_MIN && age <= RETIRE_AGE_MAX
}

export function saveRegionToProfile(regionId: OnboardingRegionId): StoredUserProfile {
  const region = findOnboardingRegion(regionId)
  if (!region) return saveUserProfile({})
  if (region.currency) setDisplayCurrencyCode(region.currency)
  return saveUserProfile({
    country: region.country,
    locale: region.locale,
    currency: region.currency,
  })
}

/** True when the user has a saved planning profile (browser save or onboarding). */
export function hasPersistedPlanningProfile(): boolean {
  if (profileHasOnboardingComplete(loadPlanProfile())) return true
  return hasStoredProfileStep1(loadUserProfile())
}

/** Planning + SS fields from live calculator state (configure drawer, debounced persist). */
export function profilePatchFromCalculatorInputs(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
): Partial<StoredUserProfile> {
  const country = inputs.residenceCountry?.trim() ?? ''
  const locale =
    normalizeOnboardingRegionId(localeForResidenceCountry(country)) ??
    normalizeOnboardingRegionId(loadUserProfile()?.locale) ??
    'us'
  const region = findOnboardingRegion(locale)
  const pension = pensionConfigForLocale(locale)
  const dob = inputs.dateOfBirth?.trim() ?? ''
  const parts = isValidIsoDateString(dob) ? dobParts(dob) : {}
  const spouseDob = inputs.spouseDateOfBirth?.trim() ?? ''
  const spouseParts = isValidIsoDateString(spouseDob) ? dobParts(spouseDob) : {}

  return {
    country: country || region?.country,
    locale,
    currency: region?.currency,
    dob: dob || undefined,
    birth_month: parts.birth_month,
    birth_year: parts.birth_year,
    household_income: Math.max(0, Math.round(inputs.other)),
    monthly_contribution: Math.max(0, Math.round(inputs.save / 12)),
    target_retirement_age: inputs.targetRetirementAge,
    monthly_income_goal: inputs.monthlyIncomeGoal,
    include_social_security: ui.ssIncluded,
    ss_claim_age: clampClaimAgeInRange(inputs.ssAge, pension.claimAgeMin, pension.claimAgeMax),
    ss_benefit_estimate: Math.max(0, Math.round(inputs.ssBenefit67)),
    include_spouse: inputs.married,
    spouse_dob: inputs.married ? spouseDob || undefined : undefined,
    spouse_birth_month: inputs.married ? spouseParts.birth_month : undefined,
    spouse_birth_year: inputs.married ? spouseParts.birth_year : undefined,
    spouse_claim_type: inputs.married
      ? inputs.spouseHasOwnEarnings === false
        ? 'spousal'
        : 'own'
      : undefined,
    spouse_claim_age: inputs.married
      ? clampClaimAgeInRange(inputs.spouseClaimAge, pension.claimAgeMin, pension.claimAgeMax)
      : undefined,
    spouse_benefit_estimate: inputs.married
      ? Math.max(0, Math.round(inputs.spouseBenefit67))
      : undefined,
    filing_status: inputs.filingStatus,
  }
}

/** Merge calculator patch into expectifi/profile-v1 when a profile already exists. */
export function syncUserProfileFromCalculatorInputs(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
): void {
  if (!hasPersistedPlanningProfile() || !canWritePlanLocalStorage()) return
  saveUserProfile(profilePatchFromCalculatorInputs(inputs, ui))
}

export function planProfilePatchFromCalculatorInputs(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
): StoredPlanProfile | null {
  if (!hasPersistedPlanningProfile()) return null
  const existing = loadPlanProfile()
  const patch = profilePatchFromCalculatorInputs(inputs, ui)
  return {
    ...(existing ?? { version: 1 as const }),
    ...patch,
    version: 1,
    ...(existing?.onboardingComplete ? { onboardingComplete: true as const } : {}),
  }
}

/** Profile blob written on "Save my plan" (tier 1 → browser_saved). */
export function profileSnapshotForBrowserSave(
  inputs: CalculatorInputs,
  ui: CalculatorUi,
): StoredUserProfile & { onboardingComplete: true } {
  return {
    ...profilePatchFromCalculatorInputs(inputs, ui),
    version: 1,
    onboardingComplete: true,
  }
}

/** Keep locale/currency aligned when residence changes in profile (config drawer). */
function localeForResidenceCountry(country: string): OnboardingRegionId | undefined {
  const trimmed = country.trim()
  if (!trimmed) return undefined
  const match = ONBOARDING_REGION_OPTIONS.find((r) => r.country === trimmed)
  return match?.locale
}

export function saveResidenceCountryToProfile(country: string): StoredUserProfile {
  const trimmed = country.trim()
  const match = ONBOARDING_REGION_OPTIONS.find((r) => r.country === trimmed)
  if (match) return saveRegionToProfile(match.id)
  if (isOnboardingResidenceCountry(trimmed)) {
    const currency = residenceCountryToDisplayCurrency(trimmed)
    setDisplayCurrencyCode(currency)
    return saveUserProfile({ country: trimmed, currency })
  }
  return saveUserProfile({ country: trimmed })
}

export function hasStoredContributionsStep(
  profile: StoredUserProfile | null | undefined,
): boolean {
  if (!profile) return false
  if (profile.onboarding_contributions && typeof profile.onboarding_contributions === 'object') {
    return true
  }
  return (profile.monthly_contribution ?? 0) > 0
}

export function saveProfileFromFormSlice(
  form: OnboardingFormProfileSlice,
  step: 'profile' | 'contributions' | 'social-security' | 'income-goal' | 'goals',
): StoredUserProfile {
  const dobPartsVal = dobParts(form.dob)
  const spouseParts = dobParts(form.spouseDob)
  const residenceLocale = localeForResidenceCountry(form.currentResidence)
  const base: Partial<StoredUserProfile> = {
    country: form.currentResidence,
    locale: residenceLocale ?? form.locale,
    currency: residenceLocale
      ? findOnboardingRegion(residenceLocale)?.currency ?? form.currency
      : form.currency,
  }

  if (step === 'profile') {
    return saveUserProfile({
      ...base,
      dob: form.dob,
      birth_month: dobPartsVal.birth_month,
      birth_year: dobPartsVal.birth_year,
      target_retirement_age: Math.round(form.retireAge),
    })
  }

  if (step === 'contributions') {
    const monthlyContribution =
      form.contributions != null
        ? totalContributionsMonthly(form.contributions)
        : Math.max(0, Math.round(form.monthlyContribution))
    return saveUserProfile({
      ...base,
      monthly_contribution: monthlyContribution,
      onboarding_contributions: form.contributions
        ? serializeContributions(form.contributions)
        : undefined,
    })
  }

  if (step === 'goals') {
    const monthlyContribution =
      form.contributions != null
        ? totalContributionsMonthly(form.contributions)
        : Math.max(0, Math.round(form.monthlyContribution))
    return saveUserProfile({
      ...base,
      monthly_contribution: monthlyContribution,
      onboarding_contributions: form.contributions
        ? serializeContributions(form.contributions)
        : undefined,
      target_retirement_age: Math.round(form.retireAge),
      monthly_income_goal: Math.max(0, Math.round(form.monthlyGoal)),
    })
  }

  if (step === 'social-security') {
    const pension = pensionConfigForLocale(residenceLocale ?? form.locale)
    return saveUserProfile({
      ...base,
      include_social_security: form.includeSs,
      ss_claim_age: clampClaimAgeInRange(form.ssAge, pension.claimAgeMin, pension.claimAgeMax),
      ss_benefit_estimate: Math.max(0, Math.round(form.ssBenefitMonthly)),
      include_spouse: form.includeSpouse,
      spouse_dob: form.includeSpouse ? form.spouseDob : '',
      spouse_birth_month: spouseParts.birth_month,
      spouse_birth_year: spouseParts.birth_year,
      spouse_claim_type: form.spouseClaimMode,
      spouse_claim_age: clampClaimAgeInRange(form.spouseSsAge, pension.claimAgeMin, pension.claimAgeMax),
      spouse_benefit_estimate: Math.max(0, Math.round(form.spouseSsBenefitMonthly)),
    })
  }

  return saveUserProfile({
    ...base,
    target_retirement_age: Math.round(form.retireAge),
    monthly_income_goal: Math.max(0, Math.round(form.monthlyGoal)),
  })
}

export function profileToFormDefaults(profile: StoredUserProfile | null): Partial<OnboardingFormProfileSlice> {
  if (!profile) return {}
  const spouseClaimMode = profile.spouse_claim_type === 'spousal' ? 'spousal' : 'own'
  const locale = normalizeOnboardingRegionId(profile.locale) ?? undefined
  const contributionRegion: 'us' | 'ca' = locale === 'ca' ? 'ca' : 'us'
  return {
    currentResidence: profile.country ?? '',
    locale,
    currency: profile.currency,
    dob: profile.dob ?? '',
    householdIncome: profile.household_income ?? 0,
    monthlyContribution: profile.monthly_contribution ?? 0,
    contributions: profile.onboarding_contributions
      ? parseStoredContributions(profile.onboarding_contributions, contributionRegion)
      : undefined,
    includeSs: profile.include_social_security ?? false,
    ssAge: profile.ss_claim_age
      ? clampClaimAgeInRange(
          profile.ss_claim_age,
          pensionConfigForLocale(locale).claimAgeMin,
          pensionConfigForLocale(locale).claimAgeMax,
        )
      : pensionConfigForLocale(locale).defaultClaimAge,
    ssBenefitMonthly: profile.ss_benefit_estimate ?? 0,
    includeSpouse: profile.include_spouse ?? false,
    spouseClaimMode,
    spouseDob: profile.spouse_dob ?? '',
    spouseSsAge: profile.spouse_claim_age
      ? clampClaimAgeInRange(
          profile.spouse_claim_age,
          pensionConfigForLocale(locale).claimAgeMin,
          pensionConfigForLocale(locale).claimAgeMax,
        )
      : pensionConfigForLocale(locale).defaultClaimAge,
    spouseSsBenefitMonthly: profile.spouse_benefit_estimate ?? 0,
    retireAge: profile.target_retirement_age ?? 0,
    monthlyGoal: profile.monthly_income_goal ?? 0,
  }
}

export function profileToCalculatorPatch(profile: StoredUserProfile | null): Partial<CalculatorInputs> {
  if (!profile) return {}
  const patch: Partial<CalculatorInputs> = {}
  if (profile.country) patch.residenceCountry = profile.country
  if (profile.dob && isValidIsoDateString(profile.dob)) patch.dateOfBirth = profile.dob
  if (profile.household_income != null) patch.other = Math.max(0, profile.household_income)
  if (profile.monthly_contribution != null) patch.save = Math.max(0, profile.monthly_contribution) * 12
  if (profile.target_retirement_age != null) patch.targetRetirementAge = profile.target_retirement_age
  if (profile.monthly_income_goal != null) patch.monthlyIncomeGoal = profile.monthly_income_goal
  const locale = normalizeOnboardingRegionId(profile.locale) ?? localeForResidenceCountry(profile.country ?? '') ?? 'us'
  const pension = pensionConfigForLocale(locale)
  if (profile.ss_claim_age != null) {
    patch.ssAge = clampClaimAgeInRange(profile.ss_claim_age, pension.claimAgeMin, pension.claimAgeMax)
  }
  if (profile.include_spouse != null) patch.married = profile.include_spouse
  if (profile.spouse_dob) patch.spouseDateOfBirth = profile.spouse_dob
  if (profile.spouse_claim_age != null) {
    patch.spouseClaimAge = clampClaimAgeInRange(
      profile.spouse_claim_age,
      pension.claimAgeMin,
      pension.claimAgeMax,
    )
  }
  if (profile.spouse_claim_type != null) {
    patch.spouseHasOwnEarnings = profile.spouse_claim_type === 'own'
  }
  if (profile.filing_status) {
    patch.filingStatus = normalizeCalculatorFilingStatus(profile.filing_status)
  }
  return patch
}

/** Prefer DB prefs on load; mirror into localStorage cache. Local profile fills gaps only. */
export function mergeProfileWithDbPrefs(
  profile: StoredUserProfile | null,
  dbPrefs: UserPrefs | null | undefined,
): StoredUserProfile | null {
  if (!dbPrefs && !profile) return null
  const merged: StoredUserProfile = { version: 1 as const, ...(profile ?? {}) }
  if (dbPrefs) {
    if (!merged.dob?.trim() && dbPrefs.dob?.trim()) merged.dob = dbPrefs.dob
    if (
      !(merged.target_retirement_age != null && merged.target_retirement_age > 0) &&
      dbPrefs.retirementAge > 0
    ) {
      merged.target_retirement_age = dbPrefs.retirementAge
    }
    if (merged.monthly_income_goal == null && dbPrefs.monthlyGoal != null) {
      merged.monthly_income_goal = dbPrefs.monthlyGoal
    }
    if (merged.ss_claim_age == null && dbPrefs.ssClaimingAge != null) {
      merged.ss_claim_age = dbPrefs.ssClaimingAge
    }
    if (!merged.country?.trim() && dbPrefs.residenceCountry?.trim()) {
      merged.country = dbPrefs.residenceCountry
    }
  }
  const country = merged.country?.trim()
  if (country) {
    const locale = localeForResidenceCountry(country)
    if (locale) {
      merged.locale = locale
      const region = findOnboardingRegion(locale)
      if (region?.currency) {
        merged.currency = region.currency
        setDisplayCurrencyCode(region.currency)
      } else {
        const currency = residenceCountryToDisplayCurrency(country)
        merged.currency = currency
        setDisplayCurrencyCode(currency)
      }
    }
  }
  saveUserProfile(merged)
  return merged
}

export function resolveOnboardingStartStep(
  profile: StoredUserProfile | null,
  _opts?: { forceRegion?: boolean },
): 'profile' | 'contributions' | 'goals' {
  if (
    !hasStoredProfileStep0(profile) ||
    !hasStoredProfileStep1(profile) ||
    !hasStoredProfileRetireAge(profile)
  ) {
    return 'profile'
  }
  if (!hasStoredContributionsStep(profile)) {
    return 'contributions'
  }
  return 'goals'
}

export {
  FINANCIAL_INPUT_KEYS,
  stripCsvDerivedFromCalculatorInputs,
  stripFinancialFields,
} from './calculatorInputSanitize'
