export const WELCOME_PLANNING_PLACEHOLDERS = {
  householdIncome: 'e.g. 85,000',
  monthlyContribution: 'e.g. 1,500',
  monthlyIncomeGoal: 'e.g. 5,000',
  growthGoal: 'e.g. 1,500,000',
} as const

export const WELCOME_PLANNING_HINTS = {
  dob: 'We use your age to estimate how many years your money needs to work for you.',
  targetRetirementAge:
    '67 is the full Social Security benefit age for most people born after 1960, but this is your plan — adjust it to match your vision.',
  goalsAtRetirement:
    'Optional — helps us gauge progress toward your retirement portfolio target. Ballpark is fine.',
} as const

export function welcomeAccumulationFooterCopy(age: number): string {
  return `At ${age}, you're in the prime accumulation window. Most financial planners target 10x your salary saved by retirement age.`
}
