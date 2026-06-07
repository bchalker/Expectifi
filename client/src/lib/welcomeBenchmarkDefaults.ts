import type { CalculatorInputs } from './computeResults'
import { defaultUserEstimates } from './socialSecurity'

/** Approximate age-50 birth year (Jan 1). */
export function defaultWelcomeBirthIso(asOf: Date = new Date()): string {
  return `${asOf.getFullYear() - 50}-01-01`
}

/** Fidelity / SSA-style planning defaults for first-run welcome (editable). */
export const WELCOME_BENCHMARK = {
  age: 50,
  currentSavings: 320_000,
  householdIncomeAnnual: 85_000,
  monthlyContribution: 1_500,
  targetRetirementAge: 62,
  ssBenefitMonthlyAt67: 1_800,
  /** Retirement spending target — ~70% of household income, rounded. */
  monthlyIncomeGoal: 5_000,
} as const

function ssTripletFromMonthlyAt67(monthlyAt67: number): { b62: number; b67: number; b70: number } {
  const ref = defaultUserEstimates()
  const b67 = Math.round(monthlyAt67)
  return {
    b67,
    b62: Math.round((b67 * ref.b62) / ref.b67),
    b70: Math.round((b67 * ref.b70) / ref.b67),
  }
}

/** Patch calculator inputs with industry-average welcome defaults. */
export function welcomeBenchmarkInputsPatch(asOf: Date = new Date()): Partial<CalculatorInputs> {
  const ss = ssTripletFromMonthlyAt67(WELCOME_BENCHMARK.ssBenefitMonthlyAt67)
  return {
    dateOfBirth: defaultWelcomeBirthIso(asOf),
    targetRetirementAge: WELCOME_BENCHMARK.targetRetirementAge,
    base401k: WELCOME_BENCHMARK.currentSavings,
    baseSE401k: 0,
    baseTradIRA: 0,
    baseRoth: 0,
    baseHsa: 0,
    brkBal: 0,
    save: WELCOME_BENCHMARK.monthlyContribution * 12,
    monthlyIncomeGoal: WELCOME_BENCHMARK.monthlyIncomeGoal,
    ssAge: 67,
    spouseClaimAge: 67,
    ssBenefit62: ss.b62,
    ssBenefit67: ss.b67,
    ssBenefit70: ss.b70,
    married: false,
    spouseDateOfBirth: '',
    spouseHasOwnEarnings: true,
    spouseBenefit62: 0,
    spouseBenefit67: 0,
    spouseBenefit70: 0,
    other: WELCOME_BENCHMARK.householdIncomeAnnual,
  }
}

export function inputsNeedWelcomeBenchmarks(inputs: CalculatorInputs): boolean {
  return !inputs.dateOfBirth && inputs.base401k === 0 && inputs.targetRetirementAge === 0
}
