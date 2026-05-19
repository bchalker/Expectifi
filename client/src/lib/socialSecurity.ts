import { SS_62, SS_67, SS_70 } from 'shared'
import { isValidIsoDateString } from './ageFromDob'
import type { CalculatorInputs } from './computeResults'

export const SS_STANDARD_AGES = [62, 67, 70] as const
export type SsClaimAge = (typeof SS_STANDARD_AGES)[number]
export const SS_CLAIM_AGE_MIN = 62
export const SS_CLAIM_AGE_MAX = 70

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export function clampClaimAge(age: number): number {
  return Math.min(SS_CLAIM_AGE_MAX, Math.max(SS_CLAIM_AGE_MIN, Math.round(age)))
}

export function normalizeClaimAge(age: number): SsClaimAge {
  const n = Math.round(age)
  if (n <= 62) return 62
  if (n >= 70) return 70
  if (n <= 64) return 62
  if (n <= 68) return 67
  return 70
}

export function monthYearAtClaimAge(dateOfBirth: string, claimAge: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOfBirth).trim())
  if (!m) return ''
  const y = Number(m[1]) + Math.round(claimAge)
  const mo = Number(m[2]) - 1
  if (!Number.isFinite(y) || mo < 0 || mo > 11) return ''
  return `${MONTHS_SHORT[mo]} ${y}`
}

export function formatSsAgeLabel(dateOfBirth: string, claimAge: number): string {
  const age = clampClaimAge(claimAge)
  const when = monthYearAtClaimAge(dateOfBirth, age)
  return when ? `At ${age} (${when})` : `At ${age}`
}

export type SsBenefitTriplet = { b62: number; b67: number; b70: number }

export function benefitAtClaimAge(estimates: SsBenefitTriplet, claimAge: number): number {
  const age = clampClaimAge(claimAge)
  if (age <= 62) return estimates.b62
  if (age >= 70) return estimates.b70
  if (age <= 67) {
    return Math.round(estimates.b62 + ((estimates.b67 - estimates.b62) * (age - 62)) / 5)
  }
  return Math.round(estimates.b67 + ((estimates.b70 - estimates.b67) * (age - 67)) / 3)
}

export function defaultUserEstimates(): SsBenefitTriplet {
  return { b62: SS_62, b67: SS_67, b70: SS_70 }
}

export function resolveUserEstimates(inputs: CalculatorInputs): SsBenefitTriplet {
  const d = defaultUserEstimates()
  return {
    b62: inputs.ssBenefit62 > 0 ? inputs.ssBenefit62 : d.b62,
    b67: inputs.ssBenefit67 > 0 ? inputs.ssBenefit67 : d.b67,
    b70: inputs.ssBenefit70 > 0 ? inputs.ssBenefit70 : d.b70,
  }
}

export function resolveSpouseEstimates(inputs: CalculatorInputs): SsBenefitTriplet {
  const scale = 0.5
  const user = resolveUserEstimates(inputs)
  const d = { b62: Math.round(user.b62 * scale), b67: Math.round(user.b67 * scale), b70: Math.round(user.b70 * scale) }
  return {
    b62: inputs.spouseBenefit62 > 0 ? inputs.spouseBenefit62 : d.b62,
    b67: inputs.spouseBenefit67 > 0 ? inputs.spouseBenefit67 : d.b67,
    b70: inputs.spouseBenefit70 > 0 ? inputs.spouseBenefit70 : d.b70,
  }
}

export function spousalBenefitTripletFromUser(user: SsBenefitTriplet): SsBenefitTriplet {
  return {
    b62: Math.round(user.b62 * 0.5),
    b67: Math.round(user.b67 * 0.5),
    b70: Math.round(user.b70 * 0.5),
  }
}

/** User entered all three SSA estimate fields in Configure. */
export function isSsConfigured(inputs: CalculatorInputs): boolean {
  return inputs.ssBenefit62 > 0 && inputs.ssBenefit67 > 0 && inputs.ssBenefit70 > 0
}

export type SpouseBenefitResolution = {
  monthly: number
  usedOwn: boolean
  ownAtClaim: number
  spousalAtClaim: number
  comparisonNote: string | null
}

export function resolveSpouseBenefit(inputs: CalculatorInputs, userEst: SsBenefitTriplet): SpouseBenefitResolution {
  const claimAge = normalizeClaimAge(inputs.spouseClaimAge)
  const spousalEst = spousalBenefitTripletFromUser(userEst)
  const spousalAtClaim = benefitAtClaimAge(spousalEst, claimAge)

  if (!inputs.spouseHasOwnEarnings) {
    return {
      monthly: spousalAtClaim,
      usedOwn: false,
      ownAtClaim: 0,
      spousalAtClaim,
      comparisonNote: null,
    }
  }

  const spouseEst = resolveSpouseEstimates(inputs)
  const ownAtClaim = benefitAtClaimAge(spouseEst, claimAge)
  const usedOwn = ownAtClaim >= spousalAtClaim
  let comparisonNote: string | null = null
  if (usedOwn) {
    comparisonNote = `Your spouse's own benefit (${fmtBenefit(ownAtClaim)}) exceeds their spousal benefit (${fmtBenefit(spousalAtClaim)}). Their own benefit will be used automatically.`
  } else {
    comparisonNote = `Your spouse's spousal benefit (${fmtBenefit(spousalAtClaim)}) exceeds their own benefit (${fmtBenefit(ownAtClaim)}). Spousal benefit will be used automatically.`
  }

  return {
    monthly: usedOwn ? ownAtClaim : spousalAtClaim,
    usedOwn,
    ownAtClaim,
    spousalAtClaim,
    comparisonNote,
  }
}

function fmtBenefit(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}/mo`
}

export type HouseholdSsBreakdown = {
  userClaimAge: SsClaimAge
  spouseClaimAge: SsClaimAge
  userMonthly: number
  spouseMonthly: number
  totalMonthly: number
  userEstimates: SsBenefitTriplet
  spouseResolution: SpouseBenefitResolution | null
  spousalAtFraReadOnly: number | null
}

export function computeHouseholdSs(inputs: CalculatorInputs): HouseholdSsBreakdown {
  const userEst = resolveUserEstimates(inputs)
  const userClaimAge = normalizeClaimAge(inputs.ssAge)
  const userMonthly = benefitAtClaimAge(userEst, userClaimAge)

  if (!inputs.married) {
    return {
      userClaimAge,
      spouseClaimAge: 67,
      userMonthly,
      spouseMonthly: 0,
      totalMonthly: userMonthly,
      userEstimates: userEst,
      spouseResolution: null,
      spousalAtFraReadOnly: null,
    }
  }

  const spouseClaimAge = normalizeClaimAge(inputs.spouseClaimAge)
  const spouseResolution = resolveSpouseBenefit(inputs, userEst)
  const spousalAtFraReadOnly = inputs.spouseHasOwnEarnings ? null : Math.round(userEst.b67 * 0.5)

  return {
    userClaimAge,
    spouseClaimAge,
    userMonthly,
    spouseMonthly: spouseResolution.monthly,
    totalMonthly: userMonthly + spouseResolution.monthly,
    userEstimates: userEst,
    spouseResolution,
    spousalAtFraReadOnly,
  }
}

export type SurvivorCallout = {
  householdBothMonthly: number
  householdIfUserDiesFirst: number
  survivorIfUserClaims70: number
  userClaimAge: SsClaimAge
}

export function buildSurvivorCallout(
  portfolioMonthly: number,
  breakdown: HouseholdSsBreakdown,
): SurvivorCallout | null {
  if (!breakdown.spouseResolution) return null
  const { userMonthly, spouseMonthly, userEstimates, userClaimAge } = breakdown
  const householdBothMonthly = portfolioMonthly + userMonthly + spouseMonthly
  const survivorBenefit = Math.max(userMonthly, spouseMonthly)
  const householdIfUserDiesFirst = portfolioMonthly + survivorBenefit
  const userAt70 = benefitAtClaimAge(userEstimates, 70)
  const survivorIfUserClaims70 = portfolioMonthly + Math.max(userAt70, spouseMonthly)

  return {
    householdBothMonthly,
    householdIfUserDiesFirst,
    survivorIfUserClaims70,
    userClaimAge,
  }
}

export function normalizeSocialSecurityFields(
  raw: Partial<CalculatorInputs>,
  defaults: CalculatorInputs,
): Pick<
  CalculatorInputs,
  | 'ssAge'
  | 'spouseClaimAge'
  | 'ssBenefit62'
  | 'ssBenefit67'
  | 'ssBenefit70'
  | 'married'
  | 'spouseDateOfBirth'
  | 'spouseHasOwnEarnings'
  | 'spouseBenefit62'
  | 'spouseBenefit67'
  | 'spouseBenefit70'
> {
  const married = raw.married === true
  let spouseDob = typeof raw.spouseDateOfBirth === 'string' ? raw.spouseDateOfBirth : defaults.spouseDateOfBirth
  if (spouseDob && !isValidIsoDateString(spouseDob)) spouseDob = ''

  return {
    ssAge: normalizeClaimAge(typeof raw.ssAge === 'number' ? raw.ssAge : defaults.ssAge),
    spouseClaimAge: normalizeClaimAge(
      typeof raw.spouseClaimAge === 'number' ? raw.spouseClaimAge : defaults.spouseClaimAge,
    ),
    ssBenefit62: Math.max(0, typeof raw.ssBenefit62 === 'number' ? raw.ssBenefit62 : defaults.ssBenefit62),
    ssBenefit67: Math.max(0, typeof raw.ssBenefit67 === 'number' ? raw.ssBenefit67 : defaults.ssBenefit67),
    ssBenefit70: Math.max(0, typeof raw.ssBenefit70 === 'number' ? raw.ssBenefit70 : defaults.ssBenefit70),
    married,
    spouseDateOfBirth: spouseDob,
    spouseHasOwnEarnings: raw.spouseHasOwnEarnings !== false,
    spouseBenefit62: Math.max(0, typeof raw.spouseBenefit62 === 'number' ? raw.spouseBenefit62 : defaults.spouseBenefit62),
    spouseBenefit67: Math.max(0, typeof raw.spouseBenefit67 === 'number' ? raw.spouseBenefit67 : defaults.spouseBenefit67),
    spouseBenefit70: Math.max(0, typeof raw.spouseBenefit70 === 'number' ? raw.spouseBenefit70 : defaults.spouseBenefit70),
  }
}
