import type { OnboardingRegionId } from './onboardingRegions'
import { pensionConfigForLocale } from './localePensionConfig'
/** Salary-based pension estimate at reference age; falls back to locale average when income is missing. */
export function estimateSsMonthlyAt67FromAnnualIncome(
  annualIncome: number,
  locale?: OnboardingRegionId | string | null,
): number {
  const fallback = pensionConfigForLocale(locale).defaultBenefitMonthlyAt67
  if (annualIncome <= 0) return fallback
  if (locale === 'ca') {
    return Math.max(fallback, Math.round((annualIncome * 0.25) / 12))
  }
  return Math.round((annualIncome * 0.32) / 12)
}
