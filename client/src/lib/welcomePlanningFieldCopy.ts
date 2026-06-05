export const WELCOME_PLANNING_PLACEHOLDERS = {
  householdIncome: 'e.g. 85,000',
  monthlyContribution: 'e.g. 1,500',
  monthlyIncomeGoal: 'e.g. 5,000',
  growthGoal: 'e.g. 1,500,000',
} as const

export const WELCOME_PLANNING_HINTS = {
  dob: 'We use your age to estimate how many years your money needs to work for you.',
  targetRetirementAge: 'Adjust to match your plan.',
  goalsAtRetirement:
    'Optional — helps us gauge progress toward your retirement portfolio target. Ballpark is fine.',
  monthlyContributionGoals:
    'Combined across all your retirement accounts.',
  goalsAiming:
    'We use these to show how close your plan gets you.',
} as const

export const WELCOME_PROFILE_MONTHLY_CONTRIBUTION_HINT =
  'Combined across all your retirement accounts.'

/** Profile step footer — age-band contextual hint (plain muted copy). */
export function welcomeProfileAgeContextCopy(age: number): string {
  if (age < 45) {
    return `At ${age}, time is your biggest asset. Consistent contributions now compound significantly by retirement.`
  }
  if (age <= 55) {
    return `At ${age}, you're in the prime accumulation window. Most financial planners target 10x your salary saved by retirement.`
  }
  if (age <= 62) {
    return `At ${age}, the final stretch matters most. Catch-up contributions and return assumptions have an outsized impact now.`
  }
  if (age <= 67) {
    return `At ${age}, you're close. Fine-tuning your draw strategy and tax sequencing can meaningfully affect your income.`
  }
  return `At ${age}, retirement may be near or already here. We'll focus on income sustainability and draw sequencing.`
}

/** @deprecated Use welcomeProfileAgeContextCopy */
export function welcomeAccumulationFooterCopy(age: number): string {
  return welcomeProfileAgeContextCopy(age)
}
