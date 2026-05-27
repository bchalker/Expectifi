import type { DisplayCurrencyCode } from './displayCurrency'
import type { OnboardingRegionId } from './onboardingRegions'

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
  /** Persisted in expectifi/profile-v1 via planStorage (not in legacy JSON shape). */
  onboardingComplete?: boolean
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
