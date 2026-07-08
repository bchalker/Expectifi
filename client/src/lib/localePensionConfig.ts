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
  benefitFieldLabel: string
  spouseBenefitFieldLabel: string
  benefitHint: string
  /** When set, the hint renders this URL as a tappable link (matched in benefitHint copy). */
  benefitHintLinkUrl: string | null
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
  stepTitle: 'Guaranteed Income',
  stepSubtitle: 'Help us estimate your benefits in retirement',
  includeToggleLabel: 'Include guaranteed income',
  claimQuestionLabel: 'Claim at age',
  spouseClaimQuestionLabel: 'Claim at age',
  spouseClaimModeQuestionLabel: 'How will your spouse claim?',
  benefitFieldLabel: 'Expected monthly',
  spouseBenefitFieldLabel: 'Expected monthly',
  benefitHint:
    'Average retiree (at 67) receives about $2,100/month',
  benefitHintLinkUrl: 'https://www.ssa.gov/',
  claimAgeHint:
    'Claiming before 67 reduces your monthly check. Waiting until 70 increases it.',
  includeSpouseHint: 'Factor in their Social Security alongside yours.',
  spouseClaimModeTooltip:
    "SS pays whichever is higher — your spouse's own earned benefit or 50% of yours. Choose spousal if your spouse had lower lifetime earnings.",
  averageBadge: null,
  defaultBenefitMonthlyAt67: 1_800,
  claimAgeMin: 62,
  claimAgeMax: 70,
  defaultClaimAge: 67,
  claimMilestoneTicks: [62, 64, 67, 70],
}

const CA_CPP_CONFIG: Partial<LocalePensionConfig> = {
  claimQuestionLabel: 'Claim at age',
  spouseClaimQuestionLabel: 'Claim at age',
  spouseClaimModeQuestionLabel: 'How will your spouse claim?',
  benefitFieldLabel: 'Estimated monthly CPP benefit',
  spouseBenefitFieldLabel: 'Expected monthly benefit',
  benefitHint:
    'Your estimated monthly CPP benefit. Service Canada has a free estimator if you want your exact number.',
  benefitHintLinkUrl: 'https://www.canada.ca/en/services/benefits/publicpensions/cpp/cpp-benefit/amount.html',
  claimAgeHint:
    'Taking CPP before 65 reduces your monthly amount by 0.6% per month. Delaying past 65 increases it by 0.7% per month up to age 70.',
  includeSpouseHint: "Factor in their CPP alongside yours.",
}

export type OasPensionConfig = {
  startAgeHint: string
  benefitLabel: string
  benefitHint: string
  clawbackNote: string
  startAgeMin: number
  startAgeMax: number
  defaultStartAge: number
}

export const OAS_CONFIG: OasPensionConfig = {
  startAgeHint:
    'OAS begins at 65 but can be deferred up to age 70 for a 0.6% monthly increase per month.',
  benefitLabel: 'Estimated monthly OAS benefit',
  benefitHint: 'Your estimated monthly OAS benefit at your chosen start age.',
  clawbackNote: 'OAS may be clawed back if retirement income exceeds ~$90,000/yr.',
  startAgeMin: 65,
  startAgeMax: 70,
  defaultStartAge: 65,
}

const CA_CONFIG: LocalePensionConfig = {
  stepTitle: 'Guaranteed Income',
  stepSubtitle: 'Help us estimate your public pension benefits in retirement',
  includeToggleLabel: 'Include guaranteed income',
  claimQuestionLabel: CA_CPP_CONFIG.claimQuestionLabel!,
  spouseClaimQuestionLabel: CA_CPP_CONFIG.spouseClaimQuestionLabel!,
  spouseClaimModeQuestionLabel: CA_CPP_CONFIG.spouseClaimModeQuestionLabel!,
  benefitFieldLabel: CA_CPP_CONFIG.benefitFieldLabel!,
  spouseBenefitFieldLabel: CA_CPP_CONFIG.spouseBenefitFieldLabel!,
  benefitHint: CA_CPP_CONFIG.benefitHint!,
  benefitHintLinkUrl: CA_CPP_CONFIG.benefitHintLinkUrl!,
  claimAgeHint: CA_CPP_CONFIG.claimAgeHint!,
  includeSpouseHint: CA_CPP_CONFIG.includeSpouseHint!,
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
