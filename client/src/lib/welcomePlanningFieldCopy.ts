export const WELCOME_PLANNING_PLACEHOLDERS = {
  householdIncome: 'e.g. 85,000',
  monthlyContribution: 'e.g. 1,500',
  monthlyIncomeGoal: 'e.g. 5,000',
} as const

export const WELCOME_PLANNING_HINTS = {
  dob: 'We use your age to estimate how many years your money needs to work for you.',
  householdIncome:
    'Your combined pre-tax income. This helps us understand your current lifestyle and what retirement might look like.',
  monthlyContribution:
    "What you're putting away each month across all accounts. Even small amounts compound significantly over time.",
  targetRetirementAge:
    '67 is the full Social Security benefit age for most people born after 1960, but this is your plan — adjust it to match your vision.',
  monthlyIncomeGoal: 'A ballpark is fine.',
} as const
