import type { OnboardingRegionId } from './onboardingRegions'
import {
  findOnboardingRegion,
  normalizeOnboardingRegionId,
  ONBOARDING_REGION_OPTIONS,
} from './onboardingRegions'

export type LocalePensionConfig = {
  stepTitle: string
  stepSubtitle: string
  includeToggleLabel: string
  claimQuestionLabel: string
  spouseClaimQuestionLabel: string
  spouseClaimModeQuestionLabel: string
  benefitHint: string
  claimAgeHint: string
  includeSpouseHint: string
  spouseClaimModeTooltip: string
  /** Shown beside the benefit field when set (e.g. national average). */
  averageBadge: string | null
  defaultBenefitMonthlyAt67: number
  claimAgeMin: number
  claimAgeMax: number
  defaultClaimAge: number
  claimMilestoneTicks: readonly number[]
}

const US_CONFIG: LocalePensionConfig = {
  stepTitle: 'Social Security',
  stepSubtitle: 'Help us estimate your benefits in retirement',
  includeToggleLabel: 'Include Social Security',
  claimQuestionLabel: 'When are you going to claim?',
  spouseClaimQuestionLabel: 'When will your spouse claim Social Security?',
  spouseClaimModeQuestionLabel: 'How will your spouse claim Social Security?',
  benefitHint:
    'Your estimated monthly benefit at your chosen claiming age. The average at 67 is around $1,800 — ssa.gov has a free estimator if you want your exact number.',
  claimAgeHint:
    'Claiming earlier means a smaller monthly check; waiting until 70 increases it. There is no single right answer — pick what fits your plan.',
  includeSpouseHint: 'Include your spouse to factor in their Social Security alongside yours.',
  spouseClaimModeTooltip:
    "Social Security pays whichever is higher — your spouse's own earned benefit or 50% of yours. Choose spousal benefit if your spouse had lower lifetime earnings.",
  averageBadge: null,
  defaultBenefitMonthlyAt67: 1_800,
  claimAgeMin: 62,
  claimAgeMax: 70,
  defaultClaimAge: 67,
  claimMilestoneTicks: [62, 64, 67, 70],
}

const CA_CONFIG: LocalePensionConfig = {
  stepTitle: 'Canada Pension Plan (CPP) / OAS',
  stepSubtitle: 'Help us estimate your public pension benefits in retirement',
  includeToggleLabel: 'Include Canada Pension Plan (CPP) / OAS',
  claimQuestionLabel: 'When do you plan to start CPP?',
  spouseClaimQuestionLabel: 'When will your spouse start CPP?',
  spouseClaimModeQuestionLabel: 'How will your spouse claim CPP?',
  benefitHint:
    'Estimate your CPP at canada.ca/en/services/benefits/publicpensions. Your amount depends on contributions and when you start.',
  claimAgeHint:
    'CPP can be claimed as early as 60 or as late as 70. Starting earlier means a smaller monthly payment.',
  includeSpouseHint: 'Include your spouse to factor in their CPP alongside yours.',
  spouseClaimModeTooltip:
    'Use your spouse’s own CPP estimate, or a simplified spousal share based on your benefit.',
  averageBadge: null,
  defaultBenefitMonthlyAt67: 750,
  claimAgeMin: 60,
  claimAgeMax: 70,
  defaultClaimAge: 65,
  claimMilestoneTicks: [60, 65, 70],
}

const BY_LOCALE: Record<OnboardingRegionId, LocalePensionConfig> = {
  us: US_CONFIG,
  ca: CA_CONFIG,
}

export function pensionConfigForLocale(
  locale: OnboardingRegionId | string | null | undefined,
): LocalePensionConfig {
  const id = normalizeOnboardingRegionId(locale) ?? 'us'
  return BY_LOCALE[id]
}

export function pensionConfigForResidenceCountry(country: string): LocalePensionConfig {
  const option = ONBOARDING_REGION_OPTIONS.find((r) => r.country === country.trim())
  return pensionConfigForLocale(findOnboardingRegion(option?.id)?.locale ?? 'us')
}
