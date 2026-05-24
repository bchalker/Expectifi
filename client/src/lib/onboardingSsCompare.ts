import { WELCOME_BENCHMARK } from './welcomeBenchmarkDefaults'

/** Salary-based SS estimate at age 67; falls back to $1,800 when income is missing. */
export function estimateSsMonthlyAt67FromAnnualIncome(annualIncome: number): number {
  if (annualIncome <= 0) return WELCOME_BENCHMARK.ssBenefitMonthlyAt67
  return Math.round((annualIncome * 0.32) / 12)
}
