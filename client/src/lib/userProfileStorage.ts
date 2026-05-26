import { isValidIsoDateString } from './ageFromDob'
import type { DisplayCurrencyCode } from './displayCurrency'
import { residenceCountryToDisplayCurrency, setDisplayCurrencyCode } from './displayCurrency'
import type { CalculatorInputs } from './computeResults'
import { isOnboardingResidenceCountry } from './onboardingResidenceCountries'
import type { OnboardingRegionId } from './onboardingRegions'
import {
  findOnboardingRegion,
  normalizeOnboardingRegionId,
  ONBOARDING_REGION_OPTIONS,
} from './onboardingRegions'
import type { UserPrefs } from './userPrefs'
import { pensionConfigForLocale } from './localePensionConfig'
import { clampClaimAgeInRange } from './socialSecurity'

export const USER_PROFILE_STORAGE_KEY = 'expectifi_user_profile'

/** Dispatched on `window` when profile is saved in this tab (see UserLocaleContext). */
export const USER_PROFILE_UPDATED_EVENT = 'expectifi:user-profile-updated'
const LEGACY_USER_PROFILE_KEYS = ['hwp_user_profile'] as const

export type StoredUserProfile = {
  version: 1
  country?: string
  locale?: OnboardingRegionId
  currency?: DisplayCurrencyCode
  dob?: string
  birth_month?: number
  birth_year?: number
  household_income?: number
  monthly_contribution?: number
  include_social_security?: boolean
  ss_claim_age?: number
  ss_benefit_estimate?: number
  include_spouse?: boolean
  spouse_dob?: string
  spouse_birth_month?: number
  spouse_birth_year?: number
  spouse_claim_type?: 'own' | 'spousal'
  spouse_claim_age?: number
  spouse_benefit_estimate?: number
  target_retirement_age?: number
  monthly_income_goal?: number
  retirement_destination?: string
  welcome_banner_dismissed?: boolean
  transparency_note_seen?: boolean
}

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
}

function dobParts(iso: string): { birth_month?: number; birth_year?: number } {
  if (!isValidIsoDateString(iso)) return {}
  const [y, m] = iso.split('-').map(Number)
  return { birth_year: y, birth_month: m }
}

export function parseStoredUserProfile(raw: unknown): StoredUserProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.version !== 1) return null
  const profile: StoredUserProfile = { version: 1 }
  const str = (k: string) => (typeof o[k] === 'string' ? (o[k] as string).trim() : undefined)
  const num = (k: string) => {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim()) {
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }
    return undefined
  }
  const bool = (k: string) => (typeof o[k] === 'boolean' ? (o[k] as boolean) : undefined)

  profile.country = str('country')
  profile.locale = str('locale') as OnboardingRegionId | undefined
  profile.currency = str('currency') as DisplayCurrencyCode | undefined
  profile.dob = str('dob')
  profile.birth_month = num('birth_month')
  profile.birth_year = num('birth_year')
  profile.household_income = num('household_income')
  profile.monthly_contribution = num('monthly_contribution')
  profile.include_social_security = bool('include_social_security')
  profile.ss_claim_age = num('ss_claim_age')
  profile.ss_benefit_estimate = num('ss_benefit_estimate')
  profile.include_spouse = bool('include_spouse')
  profile.spouse_dob = str('spouse_dob')
  profile.spouse_birth_month = num('spouse_birth_month')
  profile.spouse_birth_year = num('spouse_birth_year')
  profile.spouse_claim_type =
    o.spouse_claim_type === 'own' || o.spouse_claim_type === 'spousal' ? o.spouse_claim_type : undefined
  profile.spouse_claim_age = num('spouse_claim_age')
  profile.spouse_benefit_estimate = num('spouse_benefit_estimate')
  profile.target_retirement_age = num('target_retirement_age')
  profile.monthly_income_goal = num('monthly_income_goal')
  profile.retirement_destination = str('retirement_destination')
  profile.welcome_banner_dismissed = bool('welcome_banner_dismissed')
  profile.transparency_note_seen = bool('transparency_note_seen')

  if (!profile.country && !profile.dob) return null
  return profile
}

export function loadUserProfile(): StoredUserProfile | null {
  try {
    let raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY)
    if (!raw) {
      for (const legacy of LEGACY_USER_PROFILE_KEYS) {
        raw = localStorage.getItem(legacy)
        if (raw) {
          localStorage.setItem(USER_PROFILE_STORAGE_KEY, raw)
          localStorage.removeItem(legacy)
          break
        }
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
  try {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(next))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(USER_PROFILE_UPDATED_EVENT))
    }
  } catch {
    /* quota / private mode */
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

export function saveProfileFromFormSlice(
  form: OnboardingFormProfileSlice,
  step: 'profile' | 'social-security' | 'income-goal',
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
      household_income: Math.max(0, Math.round(form.householdIncome)),
      monthly_contribution: Math.max(0, Math.round(form.monthlyContribution)),
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
  return {
    currentResidence: profile.country ?? '',
    locale,
    currency: profile.currency,
    dob: profile.dob ?? '',
    householdIncome: profile.household_income ?? 0,
    monthlyContribution: profile.monthly_contribution ?? 0,
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
  return patch
}

/** Prefer DB prefs on load; mirror into localStorage cache. */
export function mergeProfileWithDbPrefs(
  profile: StoredUserProfile | null,
  dbPrefs: UserPrefs | null | undefined,
): StoredUserProfile | null {
  if (!dbPrefs && !profile) return null
  const fromDb: Partial<StoredUserProfile> = dbPrefs
    ? {
        dob: dbPrefs.dob,
        target_retirement_age: dbPrefs.retirementAge,
        monthly_income_goal: dbPrefs.monthlyGoal,
        ss_claim_age: dbPrefs.ssClaimingAge,
        country: dbPrefs.residenceCountry,
      }
    : {}
  const merged = { version: 1 as const, ...profile, ...fromDb }
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
): 'profile' | 'accounts' {
  if (!hasStoredProfileStep0(profile) || !hasStoredProfileStep1(profile)) return 'profile'
  return 'accounts'
}

export const FINANCIAL_INPUT_KEYS = [
  'base401k',
  'baseSE401k',
  'baseTradIRA',
  'baseRoth',
  'baseHsa',
  'brkBal',
] as const satisfies readonly (keyof CalculatorInputs)[]

export function stripFinancialFields(inputs: CalculatorInputs): CalculatorInputs {
  return {
    ...inputs,
    base401k: 0,
    baseSE401k: 0,
    baseTradIRA: 0,
    baseRoth: 0,
    baseHsa: 0,
    brkBal: 0,
  }
}
