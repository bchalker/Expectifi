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
  claimQuestionLabel: 'When do you plan to claim Social Security?',
  spouseClaimQuestionLabel: 'When will your spouse claim Social Security?',
  spouseClaimModeQuestionLabel: 'How will your spouse claim Social Security?',
  benefitHint:
    'Your estimated monthly benefit at your chosen claiming age. The average at 67 is around $1,800 — ssa.gov has a free estimator if you want your exact number.',
  claimAgeHint:
    'Claiming earlier means a smaller monthly check; waiting until 70 increases it. There is no single right answer — pick what fits your plan.',
  includeSpouseHint: 'Include your spouse to factor in their Social Security alongside yours.',
  spouseClaimModeTooltip:
    "Social Security pays whichever is higher — your spouse's own earned benefit or 50% of yours. Choose spousal benefit if your spouse had lower lifetime earnings.",
  averageBadge: 'Avg SS: ~$1,800/mo',
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
  averageBadge: 'Avg CPP: ~$750/mo',
  defaultBenefitMonthlyAt67: 750,
  claimAgeMin: 60,
  claimAgeMax: 70,
  defaultClaimAge: 65,
  claimMilestoneTicks: [60, 65, 70],
}

const UK_CONFIG: LocalePensionConfig = {
  ...US_CONFIG,
  stepTitle: 'State Pension',
  stepSubtitle: 'Help us estimate your State Pension in retirement',
  includeToggleLabel: 'Include State Pension',
  claimQuestionLabel: 'When do you plan to claim your State Pension?',
  spouseClaimQuestionLabel: 'When will your spouse claim State Pension?',
  spouseClaimModeQuestionLabel: 'How will your spouse claim State Pension?',
  benefitHint:
    'Your estimated monthly State Pension at your chosen age. Check your forecast at gov.uk/check-state-pension.',
  claimAgeHint: 'State Pension age is rising; pick the age you plan to start receiving benefits.',
  includeSpouseHint: 'Include your spouse to factor in their State Pension alongside yours.',
  spouseClaimModeTooltip:
    'Use your spouse’s own State Pension estimate, or a simplified amount based on your benefit.',
  averageBadge: null,
  defaultBenefitMonthlyAt67: 900,
}

const EU_GENERIC: Omit<LocalePensionConfig, 'stepTitle'> = {
  stepSubtitle: 'Help us estimate your public pension in retirement',
  includeToggleLabel: 'Include state pension',
  claimQuestionLabel: 'When do you plan to start your state pension?',
  spouseClaimQuestionLabel: 'When will your spouse start their state pension?',
  spouseClaimModeQuestionLabel: 'How will your spouse claim their pension?',
  benefitHint: 'Enter your expected monthly public pension at your chosen start age.',
  claimAgeHint: 'Pick the age you plan to start receiving your state pension.',
  includeSpouseHint: 'Include your spouse to factor in their pension alongside yours.',
  spouseClaimModeTooltip:
    'Use your spouse’s own pension estimate, or a simplified amount based on your benefit.',
  averageBadge: null,
  defaultBenefitMonthlyAt67: 1_200,
  claimAgeMin: 62,
  claimAgeMax: 70,
  defaultClaimAge: 67,
  claimMilestoneTicks: [62, 65, 67, 70],
}

const BY_LOCALE: Record<OnboardingRegionId, LocalePensionConfig> = {
  us: US_CONFIG,
  ca: CA_CONFIG,
  uk: UK_CONFIG,
  de: { ...EU_GENERIC, stepTitle: 'Gesetzliche Rente' },
  fr: { ...EU_GENERIC, stepTitle: 'Retraite de base' },
  es: { ...EU_GENERIC, stepTitle: 'Pensión pública' },
  it: { ...EU_GENERIC, stepTitle: 'Pensione pubblica (INPS)' },
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
