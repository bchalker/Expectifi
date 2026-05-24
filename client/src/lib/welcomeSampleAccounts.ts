import { WELCOME_BENCHMARK } from './welcomeBenchmarkDefaults'
import { resolveOnboardingAccountLocale, getLocaleAccountTypeOptions } from './onboardingAccountTypesByLocale'
import {
  newManualAccountEntry,
  type ManualAccountEntry,
  type OnboardingAccountType,
} from './manualAccountEntries'

/** Sample retirement account rows for “skip to dashboard” onboarding (no Social Security). */
export function buildWelcomeSampleAccountEntries(): ManualAccountEntry[] {
  const locale = resolveOnboardingAccountLocale()
  const options = getLocaleAccountTypeOptions(locale)
  const types = options.slice(0, 3).map((option) => option.id)
  const total = WELCOME_BENCHMARK.currentSavings
  const weights = [0.55, 0.25, 0.2]
  const rows: { type: OnboardingAccountType; balance: number }[] = types.map((type, index) => ({
    type,
    balance: Math.round(total * (weights[index] ?? 0)),
  }))
  return rows.map((row) => ({
    ...newManualAccountEntry(row.type),
    balance: row.balance,
  }))
}
